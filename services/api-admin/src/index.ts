// Log startup immediately
console.log(`🏁 Admin API module loading at ${new Date().toISOString()}`);
console.log(`🏁 Process: PID ${process.pid}, PPID ${process.ppid}`);
console.log(`🏁 Import meta:`, { 
  main: import.meta.main, 
  url: import.meta.url,
  dir: import.meta.dir 
});

// Global flag to prevent double server start
let globalServerStarted = false;
const globalStartupId = Math.random().toString(36).substring(7);

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import amqp from 'amqplib';
import { createLogger, createRequestLogger, PerformanceTimer } from '/app/shared/logger';
import { HealthChecker, commonHealthChecks, createHealthEndpoints, createHealthMiddleware } from '/app/shared/health';
import { deploymentApi } from './deployment-api';
import { workersApi } from './routes/workers';
import { getMetricsCollector, createMetricsMiddleware } from '/app/shared/metrics';
import { initializeTracing, createTracingMiddleware } from '/app/shared/tracing';
import { 
  ErrorManager, 
  createErrorMiddleware,
  ValidationError,
  NotFoundError,
  DatabaseError,
  ExternalServiceError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  BusinessLogicError,
  GuardAntError,
  ErrorCategory,
  ErrorSeverity
} from '/app/shared/error-handling';
import { createRetryManager, RetryConfigs } from '/app/shared/retry';
import { createCircuitBreakerManager, CircuitBreakerConfigs } from '/app/shared/circuit-breaker';
import { createDLQManager, DLQConfigs } from '/app/shared/dead-letter-queue';
import { golemStorage } from '/app/packages/golem-base-l3/src/index';
import { getConfig, ConfigManager } from '/app/shared/config-manager';
import { 
  AuthManager, 
  RedisAuthStorage, 
  createAuthMiddleware,
  createPermissionMiddleware,
  createNestOwnershipMiddleware,
  getAuthUser,
  type AuthConfig,
  type NestUser,
  type UserRole 
} from '/app/packages/auth-system/src/index';
import { setupAuthManager } from './auth-setup';
import { platformRoutes } from './platform-routes-simple';
import { platformPointsRoutes } from './platform-points-routes';
import { createSubdomainRoutes } from './routes/subdomain';
import {
  PaymentManager,
  RedisPaymentStorage,
  WalletConnector,
  createWalletConnector,
  getAllPlans,
  getPlan,
  formatETH,
  type GolemL2Config,
  type HoleskyConfig,
  type SubscriptionTier,
  type WalletType,
  type WalletInfo
} from '/app/packages/payments/src/index';
// Temporary - inline types until workspace is fixed
interface Nest {
  id: string;
  subdomain: string;
  name: string;
  email: string;
  walletAddress: string;
  subscription: {
    tier: 'free' | 'pro' | 'unlimited';
    servicesLimit: number;
    validUntil: number;
  };
  settings: {
    isPublic: boolean;
    timezone: string;
    language: string;
  };
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'suspended' | 'cancelled';
}

interface Service {
  id: string;
  nestId: string;
  name: string;
  type: 'web' | 'tcp' | 'ping' | 'github' | 'uptime-api' | 'keyword' | 'heartbeat' | 'port';
  target: string;
  interval: number;
  config: Record<string, any>;
  notifications: {
    webhooks: string[];
    emails: string[];
  };
  tags: string[];
  isActive: boolean;
  monitoring: {
    regions: string[];
    strategy: 'closest' | 'all-selected' | 'round-robin' | 'failover';
    minRegions?: number;
    maxRegions?: number;
  };
  createdAt: number;
  updatedAt: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface MonitoringRegion {
  id: string;
  name: string;
  continent: string;
  country: string;
  city: string;
  coordinates: { lat: number; lng: number };
  available: boolean;
}

// Initialize service logger
const logger = createLogger('api-admin');

// Configuration manager
let config: ConfigManager;

// Declare variables - will be initialized after config loads
let redis: Redis;
let errorManager: any;
let retryManager: any;
let circuitBreakerManager: any;
let dlqManager: any;
let tracing: any;
let healthChecker: any;
let metricsCollector: any;

// Create advanced Redis wrapper with circuit breaker, retry, and metrics
let redisWithMetrics: any = {
  async get(key: string) {
    return redisCircuitBreaker.execute(
      async () => {
        const result = await retryManager.retryRedisOperation(
          () => redis.get(key),
          `redis_get_${key}`
        );
        
        if (!result.success) {
          throw result.error || new DatabaseError('get', { service: 'api-admin', operation: 'redis_get' });
        }
        
        metricsCollector.recordRedisOperation('get', 0, true);
        return result.data;
      },
      // Fallback - return null for cache misses
      async () => {
        logger.warn('Redis get fallback - returning null', { key });
        return null;
      }
    );
  },
  
  async set(key: string, value: string) {
    const result = await redisCircuitBreaker.execute(
      async () => {
        const result = await retryManager.retryRedisOperation(
          () => redis.set(key, value),
          `redis_set_${key}`
        );
        
        if (!result.success) {
          throw result.error || new DatabaseError('set', { service: 'api-admin', operation: 'redis_set' });
        }
        
        metricsCollector.recordRedisOperation('set', 0, true);
        return result.data;
      }
    );

    if (!result.success) {
      metricsCollector.recordRedisOperation('set', 0, false);
      throw result.error || new DatabaseError('set', { service: 'api-admin', operation: 'redis_set' });
    }

    return result.data;
  },

  async setex(key: string, seconds: number, value: string) {
    const result = await redisCircuitBreaker.execute(
      async () => {
        const result = await retryManager.retryRedisOperation(
          () => redis.setex(key, seconds, value),
          `redis_setex_${key}`
        );
        
        if (!result.success) {
          throw result.error || new DatabaseError('setex', { service: 'api-admin', operation: 'redis_setex' });
        }
        
        metricsCollector.recordRedisOperation('setex', 0, true);
        return result.data;
      }
    );

    if (!result.success) {
      metricsCollector.recordRedisOperation('setex', 0, false);
      throw result.error || new DatabaseError('setex', { service: 'api-admin', operation: 'redis_setex' });
    }

    return result.data;
  },

  async del(key: string) {
    const result = await redisCircuitBreaker.execute(
      async () => {
        const result = await retryManager.retryRedisOperation(
          () => redis.del(key),
          `redis_del_${key}`
        );
        
        if (!result.success) {
          throw result.error || new DatabaseError('del', { service: 'api-admin', operation: 'redis_del' });
        }
        
        metricsCollector.recordRedisOperation('del', 0, true);
        return result.data;
      }
    );

    if (!result.success) {
      metricsCollector.recordRedisOperation('del', 0, false);
      throw result.error || new DatabaseError('del', { service: 'api-admin', operation: 'redis_del' });
    }

    return result.data;
  },

  // Pass through methods with basic error handling
  async ping() {
    const result = await redisCircuitBreaker.execute(() => redis.ping());
    if (!result.success) {
      throw result.error || new DatabaseError('ping', { service: 'api-admin', operation: 'redis_ping' });
    }
    return result.data;
  },

  async keys(pattern: string) {
    const result = await redisCircuitBreaker.execute(() => redis.keys(pattern));
    if (!result.success) {
      throw result.error || new DatabaseError('keys', { service: 'api-admin', operation: 'redis_keys' });
    }
    return result.data;
  },

  pipeline: () => redis.pipeline(),
};

// RabbitMQ configuration
let rabbitmqConfig: any;
let rabbitmqConnection: amqp.Connection | null = null;
let rabbitmqChannel: amqp.Channel | null = null;

// Redis key generators
const keys = {
  nest: (nestId: string) => `nest:${nestId}`,
  nestBySubdomain: (subdomain: string) => `nest:subdomain:${subdomain}`,
  nestByEmail: (email: string) => `nest:email:${email}`,
  nestPassword: (nestId: string) => `nest:password:${nestId}`,
  services: (nestId: string) => `services:${nestId}`,
  serviceStatus: (nestId: string, serviceId: string) => `status:${nestId}:${serviceId}`,
  serviceMetrics: (nestId: string, serviceId: string) => `metrics:${nestId}:${serviceId}`,
  serviceHistory: (nestId: string, serviceId: string, date: string) => `history:${nestId}:${serviceId}:${date}`,
  incidentHistory: (nestId: string) => `incidents:${nestId}`,
};

// Hybrid Redis + Golem L3 storage implementation
const hybridStorage = {
  async createNest(nest: Nest) {
    // Write to Redis for fast access
    const pipeline = redis.pipeline();
    pipeline.set(keys.nest(nest.id), JSON.stringify(nest));
    pipeline.set(keys.nestBySubdomain(nest.subdomain), nest.id);
    pipeline.set(keys.nestByEmail(nest.email), nest.id);
    await pipeline.exec();
    
    // Write to Golem L3 for persistent storage
    try {
      await golemStorage.createNest(nest);
      console.log(`📦 Nest ${nest.id} stored on Golem L3`);
    } catch (error) {
      console.warn('⚠️ Failed to store nest on Golem L3:', error.message);
    }
  },
  
  async getNest(id: string): Promise<Nest | null> {
    const nestData = await redis.get(keys.nest(id));
    return nestData ? JSON.parse(nestData) : null;
  },
  
  async getNestByEmail(email: string): Promise<Nest | null> {
    const nestId = await redis.get(keys.nestByEmail(email));
    if (!nestId) return null;
    return this.getNest(nestId);
  },
  
  async getNestBySubdomain(subdomain: string): Promise<Nest | null> {
    const nestId = await redis.get(keys.nestBySubdomain(subdomain));
    if (!nestId) return null;
    return this.getNest(nestId);
  },
  
  async storeNestPassword(nestId: string, passwordHash: string) {
    await redis.set(keys.nestPassword(nestId), passwordHash);
  },
  
  async getNestPassword(nestId: string): Promise<string> {
    return (await redis.get(keys.nestPassword(nestId))) || '';
  },
  
  async getServicesByNest(nestId: string): Promise<Service[]> {
    const servicesData = await redis.get(keys.services(nestId));
    const services = servicesData ? JSON.parse(servicesData) : [];
    
    // Fetch monitoring status from scheduler for each service
    const schedulerServices = await redis.hgetall('scheduler:services');
    console.log('📊 Scheduler services count:', Object.keys(schedulerServices).length);
    
    // Enhance services with lastCheck data
    for (const service of services) {
      // Try to get status from scheduler first
      const schedulerData = schedulerServices[service.id];
      if (schedulerData) {
        try {
          const schedulerService = JSON.parse(schedulerData);
          service.lastCheck = {
            status: schedulerService.stats?.lastSuccess && 
                    (Date.now() - schedulerService.stats.lastSuccess < 300000) ? 'up' : 
                    schedulerService.stats?.lastFailure ? 'down' : 'pending',
            responseTime: schedulerService.stats?.averageResponseTime || 0,
            timestamp: schedulerService.stats?.lastSuccess || schedulerService.stats?.lastFailure || null
          };
          service.statistics = {
            uptime: schedulerService.stats?.uptime || 0,
            checksCompleted: schedulerService.stats?.checksCompleted || 0,
            checksFailed: schedulerService.stats?.checksFailed || 0
          };
        } catch (e) {
          console.warn('Failed to parse scheduler data for service:', service.id, e);
        }
      }
      
      // Fallback to service status if no scheduler data
      if (!service.lastCheck) {
        const statusData = await redis.get(keys.serviceStatus(nestId, service.id));
        if (statusData) {
          try {
            const status = JSON.parse(statusData);
            service.lastCheck = {
              status: status.status || 'pending',
              responseTime: status.responseTime || 0,
              timestamp: status.lastChecked || null
            };
          } catch (e) {
            console.warn('Failed to parse status data for service:', service.id, e);
          }
        }
      }
      
      // Default if no status data at all
      if (!service.lastCheck) {
        service.lastCheck = {
          status: 'pending',
          responseTime: 0,
          timestamp: null
        };
      }
    }
    
    return services;
  },
  
  async createService(service: Service) {
    const services = await this.getServicesByNest(service.nestId);
    services.push(service);
    
    const pipeline = redis.pipeline();
    pipeline.set(keys.services(service.nestId), JSON.stringify(services));
    
    // Create initial service status for Public API
    const initialStatus = {
      id: service.id,
      nestId: service.nestId,
      name: service.name,
      type: service.type,
      target: service.target,
      status: 'unknown',
      responseTime: null,
      lastChecked: null,
      regions: (service.monitoring?.regions || []).map(regionId => ({
        id: regionId,
        status: 'pending',
        responseTime: null,
        lastChecked: null,
      })),
      createdAt: service.createdAt,
      isActive: service.isActive,
    };
    pipeline.set(keys.serviceStatus(service.nestId, service.id), JSON.stringify(initialStatus));
    
    await pipeline.exec();
  },
  
  async updateService(nestId: string, serviceId: string, updates: Partial<Service>): Promise<Service | null> {
    const services = await this.getServicesByNest(nestId);
    const serviceIndex = services.findIndex(s => s.id === serviceId);
    
    if (serviceIndex === -1) return null;
    
    services[serviceIndex] = { ...services[serviceIndex], ...updates, updatedAt: Date.now() };
    await redis.set(keys.services(nestId), JSON.stringify(services));
    
    return services[serviceIndex];
  },
  
  async deleteService(nestId: string, serviceId: string): Promise<boolean> {
    const services = await this.getServicesByNest(nestId);
    const filteredServices = services.filter(s => s.id !== serviceId);
    
    if (filteredServices.length === services.length) return false;
    
    const pipeline = redis.pipeline();
    pipeline.set(keys.services(nestId), JSON.stringify(filteredServices));
    pipeline.del(keys.serviceStatus(nestId, serviceId));
    await pipeline.exec();
    
    return true;
  }
};

// RabbitMQ service for worker communication
const rabbitmqService = {
  async connectToRabbitMQ() {
    const timer = new PerformanceTimer(logger, 'RabbitMQ connection', { component: 'rabbitmq' });
    
    try {
      logger.info('Connecting to RabbitMQ', { 
        component: 'rabbitmq',
        url: rabbitmqConfig.url 
      });

      rabbitmqConnection = await amqp.connect(rabbitmqConfig.url);
      rabbitmqChannel = await rabbitmqConnection.createChannel();
      
      // Declare exchanges and queues
      await rabbitmqChannel.assertExchange(rabbitmqConfig.workerCommandsExchange, 'direct');
      await rabbitmqChannel.assertQueue(rabbitmqConfig.workerResultsQueue, { durable: true });
      
      // Start consuming worker results
      await this.startWorkerResultsConsumer();
      
      timer.finish();
      logger.info('RabbitMQ connected and configured', { 
        component: 'rabbitmq',
        exchange: rabbitmqConfig.workerCommandsExchange,
        queue: rabbitmqConfig.workerResultsQueue
      });
    } catch (error) {
      timer.finishWithError(error as Error);
      logger.error('RabbitMQ connection failed', error as Error, { component: 'rabbitmq' });
      throw error;
    }
  },

  async startWorkerResultsConsumer() {
    if (!rabbitmqChannel) return;
    
    logger.info('Starting worker results consumer', { 
      component: 'rabbitmq',
      queue: rabbitmqConfig.workerResultsQueue 
    });
    
    await rabbitmqChannel.consume(rabbitmqConfig.workerResultsQueue, async (message) => {
      if (!message) return;
      
      const startTime = performance.now();
      try {
        const workerResult = JSON.parse(message.content.toString());
        
        logger.debug('Processing worker result', {
          component: 'rabbitmq',
          serviceId: workerResult.serviceId,
          nestId: workerResult.nestId,
          status: workerResult.status
        });

        await this.processWorkerResult(workerResult);
        rabbitmqChannel?.ack(message);

        const duration = performance.now() - startTime;
        logger.debug('Worker result processed successfully', {
          component: 'rabbitmq',
          serviceId: workerResult.serviceId,
          duration
        });
      } catch (error) {
        const duration = performance.now() - startTime;
        logger.error('Error processing worker result', error as Error, { 
          component: 'rabbitmq',
          duration 
        });
        rabbitmqChannel?.nack(message, false, false);
      }
    });
  },

  async processWorkerResult(result: any) {
    const { serviceId, nestId, regionId, status, responseTime, timestamp, error } = result;
    
    // Update service status in Redis
    const statusKey = keys.serviceStatus(nestId, serviceId);
    const currentStatus = await redis.get(statusKey);
    
    if (currentStatus) {
      const serviceStatus = JSON.parse(currentStatus);
      const previousStatus = serviceStatus.status;
      
      // Update overall service status
      serviceStatus.status = status;
      serviceStatus.responseTime = responseTime;
      serviceStatus.lastChecked = timestamp;
      
      // Update regional status
      if (serviceStatus.regions && Array.isArray(serviceStatus.regions)) {
        const regionIndex = serviceStatus.regions.findIndex((r: any) => r.id === regionId);
        if (regionIndex !== -1) {
          serviceStatus.regions[regionIndex] = {
            id: regionId,
            status,
            responseTime,
            lastChecked: timestamp,
            error: error || null,
          };
        }
      }
      
      await redis.set(statusKey, JSON.stringify(serviceStatus));
      
      // Store metrics for historical data
      const metricsKey = keys.serviceMetrics(nestId, serviceId);
      const metrics = {
        timestamp,
        status,
        responseTime,
        regionId,
      };
      
      // Store in sorted set for time-series data (keep last 24 hours)
      await redis.zadd(metricsKey, timestamp, JSON.stringify(metrics));
      await redis.zremrangebyscore(metricsKey, '-inf', timestamp - 24 * 60 * 60 * 1000);
      
      // Store daily aggregated history
      const date = new Date(timestamp).toISOString().split('T')[0];
      const historyKey = keys.serviceHistory(nestId, serviceId, date);
      const historyData = await redis.get(historyKey) || '{}';
      const history = JSON.parse(historyData);
      
      if (!history.checks) history.checks = 0;
      if (!history.totalResponseTime) history.totalResponseTime = 0;
      if (!history.uptime) history.uptime = 0;
      if (!history.downtime) history.downtime = 0;
      
      history.checks++;
      history.totalResponseTime += responseTime || 0;
      
      if (status === 'up') {
        history.uptime++;
      } else {
        history.downtime++;
      }
      
      history.avgResponseTime = Math.round(history.totalResponseTime / history.checks);
      history.uptimePercentage = Math.round((history.uptime / history.checks) * 100);
      
      await redis.setex(historyKey, 7 * 24 * 60 * 60, JSON.stringify(history)); // Keep for 7 days
      
      // Track incidents
      if (previousStatus === 'up' && status === 'down') {
        // New incident started
        const incidentKey = keys.incidentHistory(nestId);
        const incident = {
          id: `incident-${Date.now()}`,
          serviceId,
          startTime: timestamp,
          status: 'active',
          regionId,
          error: error || 'Service is down',
        };
        await redis.zadd(incidentKey, timestamp, JSON.stringify(incident));
      } else if (previousStatus === 'down' && status === 'up') {
        // Incident resolved
        const incidentKey = keys.incidentHistory(nestId);
        const incidents = await redis.zrange(incidentKey, -10, -1);
        
        for (const incidentData of incidents) {
          const incident = JSON.parse(incidentData);
          if (incident.serviceId === serviceId && incident.status === 'active') {
            incident.status = 'resolved';
            incident.endTime = timestamp;
            incident.duration = timestamp - incident.startTime;
            await redis.zadd(incidentKey, incident.startTime, JSON.stringify(incident));
            break;
          }
        }
      }
      
      // Publish SSE update to Public API
      await redis.publish(`sse:${nestId}`, JSON.stringify({
        type: 'service_update',
        serviceId,
        status: serviceStatus,
        timestamp: Date.now(),
      }));
    }
  },

  async sendWorkerCommand(command: string, data: any) {
    console.log('📤 Attempting to send worker command:', { command, serviceId: data.serviceId });
    
    if (!rabbitmqChannel) {
      console.error('❌ RabbitMQ channel not available');
      logger.warn('RabbitMQ not connected, skipping worker command', { 
        component: 'rabbitmq',
        command 
      });
      return;
    }
    
    const message = JSON.stringify({ command, data, timestamp: Date.now() });
    await rabbitmqChannel.publish(
      rabbitmqConfig.workerCommandsExchange, 
      command, 
      Buffer.from(message),
      { persistent: true }
    );
    
    console.log('✅ Worker command sent successfully:', { command, exchange: rabbitmqConfig.workerCommandsExchange });

    // Record metrics
    metricsCollector.recordRabbitMQMessage(rabbitmqConfig.workerCommandsExchange, 'publish');
  },

  async requestServiceMonitoring(service: Service) {
    try {
      await this.sendWorkerCommand('monitor_service', {
        serviceId: service.id,
        nestId: service.nestId,
        type: service.type,
        target: service.target,
        config: service.config,
        regions: service.monitoring?.regions || [],
        interval: service.interval,
      });
    } catch (error) {
      console.warn('⚠️ Failed to request service monitoring:', error.message);
    }
  },

  async stopServiceMonitoring(nestId: string, serviceId: string) {
    try {
      await this.sendWorkerCommand('stop_monitoring', {
        nestId,
        serviceId,
      });
    } catch (error) {
      console.warn('⚠️ Failed to stop service monitoring:', error.message);
    }
  }
};

// Health checker and metrics will be initialized after config loads
// Removed duplicate declarations here

// Error handling systems already declared above

// Circuit breakers - will be created after config loads
let redisCircuitBreaker: any;
let rabbitmqCircuitBreaker: any;
let golemCircuitBreaker: any;
let ethereumCircuitBreaker: any;

// TODO: Custom error handlers will be added after initialization

// Initialize Hono app
const app = new Hono();

// Routes will be added dynamically after initialization
let routesInitialized = false;
// app.use('*', createHealthMiddleware(healthChecker));
// app.use('*', createMetricsMiddleware(metricsCollector));
// app.use('*', createTracingMiddleware(tracing));

// TODO: Error handling middleware will be added after initialization
// app.use('*', createErrorMiddleware(errorManager));

// Request logging middleware will be added in startServer()
/*
app.use('*', (c, next) => {
  const startTime = performance.now();
  const requestId = c.req.header('x-request-id') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create request-scoped logger
  const requestLogger = logger.child({
    requestId,
    userAgent: c.req.header('user-agent'),
    ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
  });

  // Log request start
  requestLogger.info('Request started', {
    method: c.req.method,
    path: c.req.path,
    query: c.req.query(),
  });

  // Store logger and request ID in context
  c.set('logger', requestLogger);
  c.set('requestId', requestId);
  c.res.headers.set('x-request-id', requestId);

  return next().then(() => {
    const duration = performance.now() - startTime;
    
    requestLogger.httpRequest(
      c.req.method,
      c.req.path,
      c.res.status,
      duration,
      { requestId }
    );
  }).catch((error) => {
    const duration = performance.now() - startTime;
    
    requestLogger.error('Request failed', error, {
      requestId,
      method: c.req.method,
      path: c.req.path,
      duration,
    });

    throw error;
  });
});
*/

// Authentication and payment systems - will be initialized after config loads
let authConfig: AuthConfig;
let authManager: AuthManager;
let holeskyConfig: HoleskyConfig;
let paymentStorage: RedisPaymentStorage;
let paymentManager: PaymentManager;
let walletConnector: WalletConnector;

// Middleware will be added in startServer()

// Authentication middleware for protected routes - will be initialized after authManager
let authMiddleware: any;
let nestOwnershipMiddleware: any;

// Available regions
const availableRegions: MonitoringRegion[] = [
  { id: 'eu-west-1', name: 'Europe West (Frankfurt)', continent: 'Europe', country: 'Germany', city: 'Frankfurt', coordinates: { lat: 50.1109, lng: 8.6821 }, available: true },
  { id: 'eu-central-1', name: 'Europe Central (Warsaw)', continent: 'Europe', country: 'Poland', city: 'Warsaw', coordinates: { lat: 52.2297, lng: 21.0122 }, available: true },
  { id: 'eu-west-2', name: 'Europe West (London)', continent: 'Europe', country: 'United Kingdom', city: 'London', coordinates: { lat: 51.5074, lng: -0.1278 }, available: true },
  { id: 'us-east-1', name: 'US East (Virginia)', continent: 'North America', country: 'United States', city: 'Ashburn', coordinates: { lat: 39.0458, lng: -77.4874 }, available: true },
  { id: 'us-west-1', name: 'US West (California)', continent: 'North America', country: 'United States', city: 'San Francisco', coordinates: { lat: 37.7749, lng: -122.4194 }, available: true },
  { id: 'ca-central-1', name: 'Canada Central (Toronto)', continent: 'North America', country: 'Canada', city: 'Toronto', coordinates: { lat: 43.6532, lng: -79.3832 }, available: true },
  { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', continent: 'Asia', country: 'Singapore', city: 'Singapore', coordinates: { lat: 1.3521, lng: 103.8198 }, available: false },
  { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)', continent: 'Asia', country: 'Japan', city: 'Tokyo', coordinates: { lat: 35.6762, lng: 139.6503 }, available: false },
  { id: 'ap-south-1', name: 'Asia Pacific (Mumbai)', continent: 'Asia', country: 'India', city: 'Mumbai', coordinates: { lat: 19.0760, lng: 72.8777 }, available: false },
  { id: 'sa-east-1', name: 'South America (São Paulo)', continent: 'South America', country: 'Brazil', city: 'São Paulo', coordinates: { lat: -23.5558, lng: -46.6396 }, available: false },
];


// Helper functions
const extractNestId = (c: any): string => {
  try {
    const user = getAuthUser(c);
    console.log('🔍 extractNestId - user:', user);
    console.log('🔍 extractNestId - context keys:', Object.keys(c.var || {}));
    console.log('🔍 extractNestId - nestId:', user?.nestId);
    return user?.nestId || '';
  } catch (error) {
    console.error('🔥 extractNestId error:', error);
    return '';
  }
};

// Health endpoints placeholder - will be initialized later
let healthEndpoints: any = {
  basic: (c: any) => c.text('OK', 200),
  detailed: (c: any) => c.json({ status: 'initializing' }, 503),
  ready: (c: any) => c.text('Not Ready', 503),
  live: (c: any) => c.text('OK', 200)
};

// Move health check endpoints to registerApiEndpoints function

// Placeholder for moved endpoints
/*
app.get('/health', (c) => {
*/
// Endpoints moved to registerApiEndpoints function

// Function to register all API endpoints
// This is called from startServer() after middleware is initialized
function registerApiEndpoints(app: any) {
  console.log('📝 Registering API endpoints...');
  
  // Health check endpoints - with fallback for when healthChecker is not yet initialized
  app.get('/health', (c) => {
    if (!healthChecker) {
      return c.text('OK', 200);
    }
    return healthEndpoints.basic(c);
  });
  app.get('/health/detailed', (c) => {
    if (!healthChecker) {
      return c.json({ status: 'initializing' }, 503);
    }
    return healthEndpoints.detailed(c);
  });
  app.get('/health/ready', (c) => {
    if (!healthChecker) {
      return c.text('Not Ready', 503);
    }
    return healthEndpoints.ready(c);
  });
  app.get('/health/live', (c) => {
    if (!healthChecker) {
      return c.text('OK', 200);
    }
    return healthEndpoints.live(c);
  });

  // Metrics endpoint
  app.get('/metrics', (c) => {
    const metrics = metricsCollector.generatePrometheusMetrics();
    return c.text(metrics, 200, {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
    });
  });

  // Metrics JSON endpoint (for debugging)
  app.get('/metrics/json', (c) => {
    const metrics = metricsCollector.getMetricsJSON();
    return c.json(metrics);
  });

  // Error handling system status
  app.get('/system/error-status', (c) => {
    return c.json({
      circuitBreakers: circuitBreakerManager.getAllMetrics(),
      errorCounts: {
        redis: errorManager.getErrorCount('REDIS_ERROR'),
        rabbitmq: errorManager.getErrorCount('RABBITMQ_ERROR'),
        database: errorManager.getErrorCount('DATABASE_ERROR'),
        validation: errorManager.getErrorCount('VALIDATION_ERROR'),
      },
      dlqStats: dlqManager.getAllStats(),
    });
  });

  // Circuit breaker control endpoints
  app.post('/system/circuit-breaker/:name/reset', (c) => {
    const name = c.req.param('name');
    const breaker = circuitBreakerManager.getCircuitBreaker(name);
    
    if (!breaker) {
      return c.json({ error: 'Circuit breaker not found' }, 404);
    }
    
    breaker.reset();
    return c.json({ success: true, message: `Circuit breaker ${name} reset` });
  });

  app.post('/system/circuit-breaker/:name/force-state', async (c) => {
    const name = c.req.param('name');
    const { state, reason } = await c.req.json();
    const breaker = circuitBreakerManager.getCircuitBreaker(name);
    
    if (!breaker) {
      return c.json({ error: 'Circuit breaker not found' }, 404);
    }
    
    breaker.forceState(state, reason || 'manual');
    return c.json({ success: true, message: `Circuit breaker ${name} set to ${state}` });
  });

  // Root endpoint for debugging
  app.get('/', (c) => {
    return c.json<ApiResponse>({
      success: true,
      data: {
        service: 'GuardAnt Admin API',
        version: '1.0.0',
        endpoints: {
          health: 'GET /health',
          auth: 'POST /api/admin/auth/*',
          services: 'POST /api/admin/services/*',
          subscription: 'POST /api/admin/subscription/*',
          platform: 'POST /api/admin/platform/*'
        }
      }
    });
  });
  
  // Authentication routes
  app.post('/api/admin/auth/register', async (c) => {
  const requestLogger = c.get('logger');
  
  return tracing.traceBusinessEvent('user_registration', async (span) => {
    try {
      const body = await c.req.json();
      const { name, subdomain, email, password, walletAddress } = body;

      // Validate input data
      if (!name || !subdomain || !email || !password) {
        throw new ValidationError('Missing required fields: name, subdomain, email, password', {
          service: 'api-admin',
          operation: 'user_registration',
          requestId: c.get('requestId')
        }, 'required_fields');
      }

      if (!/^[a-z0-9-]+$/.test(subdomain)) {
        throw new ValidationError('Subdomain must contain only lowercase letters, numbers, and hyphens', {
          service: 'api-admin',
          operation: 'user_registration',
          requestId: c.get('requestId')
        }, 'subdomain_format');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new ValidationError('Invalid email format', {
          service: 'api-admin',
          operation: 'user_registration',
          requestId: c.get('requestId')
        }, 'email_format');
      }

      // Add tracing attributes
      span.setAttributes({
        'guardant.registration.subdomain': subdomain,
        'guardant.registration.email': email,
        'guardant.registration.has_wallet': !!walletAddress,
      });

      requestLogger.info('Registration attempt', { 
        subdomain, 
        email, 
        name,
        hasWalletAddress: !!walletAddress
      });

      // Check if subdomain is already taken - trace this DB operation
      const existingNest = await tracing.traceDbOperation('get', 'nest_by_subdomain', async (dbSpan) => {
        dbSpan.setAttributes({
          'guardant.subdomain': subdomain,
        });
        return await hybridStorage.getNestBySubdomain(subdomain);
      });

      if (existingNest) {
        span.addEvent('registration_failed', { reason: 'subdomain_taken' });
        requestLogger.warn('Registration failed - subdomain taken', { subdomain });
        throw new BusinessLogicError('Subdomain is already taken', {
          service: 'api-admin',
          operation: 'user_registration',
          requestId: c.get('requestId'),
          metadata: { subdomain }
        }, 'SUBDOMAIN_TAKEN');
      }

    // Create new nest
    const nest: Nest = {
      id: uuidv4(),
      subdomain,
      name,
      email,
      walletAddress,
      subscription: {
        tier: 'free',
        servicesLimit: 3,
        validUntil: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days trial
      },
      settings: {
        isPublic: true,
        timezone: 'UTC',
        language: 'en',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
    };

      // Store nest - trace this operation
      await tracing.traceDbOperation('create', 'nest', async (dbSpan) => {
        dbSpan.setAttributes({
          'guardant.nest.id': nest.id,
          'guardant.nest.subdomain': nest.subdomain,
        });
        return await hybridStorage.createNest(nest);
      });

      // Create user with auth system - trace this operation
      const userRole: UserRole = 'owner';
      const authResult = await tracing.traceBusinessEvent('user_creation', async (authSpan) => {
        authSpan.setAttributes({
          'guardant.user.email': email,
          'guardant.user.role': userRole,
          'guardant.nest.id': nest.id,
        });
        return await authManager.createUser(nest.id, email, password, name, userRole);
      });

      if (!authResult.success) {
        span.addEvent('registration_failed', { reason: 'user_creation_failed' });
        throw new AuthenticationError({
          service: 'api-admin',
          operation: 'user_registration', 
          requestId: c.get('requestId'),
          metadata: { email, reason: authResult.error }
        }, authResult.error || 'Failed to create user account');
      }

      // Create free subscription for new nest - trace this operation
      try {
        const subscriptionResult = await tracing.tracePayment('subscription_creation', '0', 'eth', async (paymentSpan) => {
          paymentSpan.setAttributes({
            'guardant.subscription.tier': 'free',
            'guardant.nest.id': nest.id,
          });
          return await paymentManager.createSubscription(
            nest.id,
            'free',
            'eth',
            false
          );
        });
        
        if (!subscriptionResult.success) {
          span.addEvent('subscription_creation_failed', { error: subscriptionResult.error });
          requestLogger.warn('Failed to create free subscription', { 
            nestId: nest.id,
            error: subscriptionResult.error 
          });
        } else {
          span.addEvent('subscription_created', { subscriptionId: subscriptionResult.subscription?.id });
          requestLogger.info('Free subscription created', { 
            nestId: nest.id,
            subscriptionId: subscriptionResult.subscription?.id
        });
      }
    } catch (error) {
      span.addEvent('subscription_creation_error', { error: (error as Error).message });
      requestLogger.error('Failed to create subscription', error as Error, { nestId: nest.id });
    }

      // Log successful registration
      span.addEvent('registration_completed', { 
        nestId: nest.id,
        subdomain: nest.subdomain,
      });

      requestLogger.businessEvent('nest_registered', { 
        nestId: nest.id,
        subdomain,
        email
      });

      // Record metrics
      metricsCollector.recordNestRegistration();

      return c.json<ApiResponse>({
        success: true,
        data: { 
          nest, 
          user: authResult.user,
          tokens: authResult.tokens 
        }
      });
    } catch (error: any) {
      requestLogger.error('Registration failed with error', error, { 
        endpoint: '/api/auth/register' 
      });
      return c.json<ApiResponse>({ success: false, error: error.message }, 500);
    }
  });
});

app.post('/api/admin/auth/login', async (c) => {
  const requestLogger = c.get('logger');
  
  return tracing.traceBusinessEvent('user_login', async (span) => {
    let email: string | undefined;
    try {
      const body = await c.req.json();
      ({ email } = body);
      const { password } = body;

      // Extract device info
      const userAgent = c.req.header('User-Agent') || 'Unknown';
      const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || '127.0.0.1';

      // Add tracing attributes
      span.setAttributes({
        'guardant.login.email': email,
        'guardant.login.user_agent': userAgent,
        'guardant.login.ip': ip,
      });

      requestLogger.info('Login attempt', { email, userAgent, ip });
      
      console.log('🔐 DEBUG: About to call authManager.login');
      console.log('🔐 DEBUG: authManager type:', authManager.constructor.name);
      console.log('🔐 DEBUG: Email:', email);
      console.log('🔐 DEBUG: Password length:', password?.length);

      // Authenticate user - trace this operation
      const authResult = await tracing.traceBusinessEvent('authentication', async (authSpan) => {
        authSpan.setAttributes({
          'guardant.auth.email': email,
          'guardant.auth.method': 'password',
        });
        console.log('🔐 DEBUG: Inside tracing, calling authManager.login...');
        const result = await authManager.login(email, password, {
          userAgent,
          ip,
        });
        console.log('🔐 DEBUG: authManager.login returned:', { success: result.success, error: result.error });
        return result;
      });

      if (!authResult.success) {
        span.addEvent('login_failed', { reason: 'invalid_credentials' });
        requestLogger.warn('Login failed', { email, reason: authResult.error });
        return c.json<ApiResponse>({ 
        success: false, 
        error: authResult.error,
        requiresTwoFactor: authResult.requiresTwoFactor,
        isAccountLocked: authResult.isAccountLocked,
        lockoutExpiresAt: authResult.lockoutExpiresAt,
        }, 401);
      }

      // Get nest information - trace this DB operation
      const nest = await tracing.traceDbOperation('get', 'nest', async (dbSpan) => {
        dbSpan.setAttributes({
          'guardant.nest.id': authResult.user!.nestId,
        });
        return await hybridStorage.getNest(authResult.user!.nestId);
      });

      // Log successful login
      span.addEvent('login_successful', { 
        userId: authResult.user!.id,
        nestId: authResult.user!.nestId,
      });

      requestLogger.businessEvent('user_login_success', {
        userId: authResult.user!.id,
        nestId: authResult.user!.nestId,
        email,
      });

      return c.json<ApiResponse>({
        success: true,
        data: { 
          nest, 
          user: authResult.user,
          tokens: authResult.tokens,
          session: authResult.session 
        }
      });
    } catch (error: any) {
      span.addEvent('login_error', { error: error.message });
      requestLogger.error('Login failed with error', error, { email });
      return c.json<ApiResponse>({ success: false, error: error.message }, 500);
    }
  });
});

// Token refresh endpoint
app.post('/api/admin/auth/refresh', async (c) => {
  try {
    const body = await c.req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return c.json<ApiResponse>({ success: false, error: 'Refresh token required' }, 400);
    }

    const authResult = await authManager.refreshToken(refreshToken);

    if (!authResult.success) {
      return c.json<ApiResponse>({ success: false, error: authResult.error }, 401);
    }

    return c.json<ApiResponse>({
      success: true,
      data: { tokens: authResult.tokens }
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

// Session check endpoint
app.get('/api/admin/auth/check', authMiddleware, async (c) => {
  try {
    const user = getAuthUser(c);
    if (!user) {
      return c.json<ApiResponse>({ success: false, error: 'Not authenticated' }, 401);
    }

    return c.json<ApiResponse>({
      success: true,
      data: { 
        valid: true,
        userId: user.id,
        nestId: user.nestId,
        email: user.email
      }
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

// Logout endpoint
app.post('/api/admin/auth/logout', authMiddleware, async (c) => {
  try {
    const user = getAuthUser(c);
    if (!user) {
      return c.json<ApiResponse>({ success: false, error: 'Not authenticated' }, 401);
    }

    await authManager.logout(user.sessionId);

    return c.json<ApiResponse>({
      success: true,
      data: { message: 'Logged out successfully' }
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

// Public routes (before JWT middleware)
// Regions endpoint should be public for frontend
app.post('/api/admin/regions/list', async (c) => {
  return c.json<ApiResponse>({
    success: true,
    data: availableRegions
  });
});

// Subscription plans endpoint (public)
app.post('/api/admin/subscription/plans', async (c) => {
  try {
    const plans = getAllPlans();
    return c.json<ApiResponse>({
      success: true,
      data: plans
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

// Protected routes - middleware will be applied after initialization

// Nest management
app.post('/api/admin/nest/profile', async (c) => {
  try {
    const nestId = extractNestId(c);
    const nest = await hybridStorage.getNest(nestId);
    
    if (!nest) {
      return c.json<ApiResponse>({ success: false, error: 'Nest not found' }, 404);
    }

    return c.json<ApiResponse>({
      success: true,
      data: nest
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

// Service management routes
app.post('/api/admin/services/list', async (c) => {
  try {
    const nestId = extractNestId(c);
    if (!nestId) {
      console.log('❌ No nestId found - user not authenticated');
      return c.json<ApiResponse>({ success: false, error: 'Authentication required' }, 401);
    }
    
    const services = await hybridStorage.getServicesByNest(nestId);
    
    return c.json<ApiResponse>({
      success: true,
      data: services
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

app.post('/api/admin/services/create', async (c) => {
  const requestLogger = c.get('logger');
  
  return tracing.traceBusinessEvent('service_creation', async (span) => {
    const nestId = extractNestId(c);
    
    try {
      const serviceData = await c.req.json();

      // Add tracing attributes
      span.setAttributes({
        'guardant.service.type': serviceData.type,
        'guardant.service.name': serviceData.name,
        'guardant.nest.id': nestId,
        'guardant.service.regions_count': serviceData.monitoring?.regions?.length || 0,
      });

      requestLogger.info('Service creation attempt', { 
        nestId, 
        serviceType: serviceData.type,
        serviceName: serviceData.name 
      });

      // Check subscription limits - trace this DB operation
      const nest = await tracing.traceDbOperation('get', 'nest', async (dbSpan) => {
        dbSpan.setAttributes({ 'guardant.nest.id': nestId });
        return await hybridStorage.getNest(nestId);
      });
      
      if (!nest) {
        span.addEvent('service_creation_failed', { reason: 'nest_not_found' });
        return c.json<ApiResponse>({ success: false, error: 'Nest not found' }, 404);
      }

      // Get current subscription and check limits - trace this operation
      const subscriptionStatus = await tracing.traceBusinessEvent('subscription_check', async (subSpan) => {
        subSpan.setAttributes({ 'guardant.nest.id': nestId });
        return await paymentManager.getSubscriptionStatus(nestId);
      });
      if (!subscriptionStatus || !subscriptionStatus.plan) {
        span.addEvent('service_creation_failed', { reason: 'no_active_subscription' });
        return c.json<ApiResponse>({ 
          success: false, 
          error: 'No active subscription found. Please upgrade your plan.' 
        }, 400);
      }

      // Get existing services - trace this DB operation
      const existingServices = await tracing.traceDbOperation('list', 'services_by_nest', async (dbSpan) => {
        dbSpan.setAttributes({ 'guardant.nest.id': nestId });
        return await hybridStorage.getServicesByNest(nestId);
      });

      const serviceLimit = subscriptionStatus.plan.limits.services;
      
      if (serviceLimit !== -1 && existingServices.length >= serviceLimit) {
        span.addEvent('service_creation_failed', { 
          reason: 'service_limit_reached',
          current_services: existingServices.length,
          service_limit: serviceLimit,
        });
        return c.json<ApiResponse>({ 
          success: false, 
          error: `Service limit reached (${serviceLimit}). Upgrade your subscription to add more watchers.` 
        }, 400);
      }

      // Ensure monitoring object exists with default regions
      if (!serviceData.monitoring) {
        serviceData.monitoring = { regions: ['eu-west-1'] }; // Default region
      }
      if (!serviceData.monitoring.regions || !Array.isArray(serviceData.monitoring.regions)) {
        serviceData.monitoring.regions = ['eu-west-1']; // Default region
      }
      
      // Validate regions
      const invalidRegions = serviceData.monitoring.regions.filter(
        regionId => !availableRegions.find(r => r.id === regionId && r.available)
      );
      if (invalidRegions.length > 0) {
        span.addEvent('service_creation_failed', { 
          reason: 'invalid_regions',
          invalid_regions: invalidRegions,
        });
        return c.json<ApiResponse>({ 
          success: false, 
          error: `Invalid or unavailable regions: ${invalidRegions.join(', ')}` 
        }, 400);
      }

      // Create service
      const service: Service = {
        id: uuidv4(),
        nestId,
        name: serviceData.name,
        type: serviceData.type,
        target: serviceData.target,
        interval: serviceData.interval,
        config: serviceData.config || {},
        notifications: serviceData.notifications || { webhooks: [], emails: [] },
        tags: serviceData.tags || [],
        isActive: true,
        monitoring: serviceData.monitoring,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Store service - trace this DB operation
      await tracing.traceDbOperation('create', 'service', async (dbSpan) => {
        dbSpan.setAttributes({
          'guardant.service.id': service.id,
          'guardant.service.type': service.type,
          'guardant.service.name': service.name,
          'guardant.nest.id': nestId,
        });
        return await hybridStorage.createService(service);
      });

      // Update subscription usage - trace this operation
      try {
        if (subscriptionStatus.subscription) {
          await tracing.traceDbOperation('update', 'subscription_usage', async (dbSpan) => {
            dbSpan.setAttributes({
              'guardant.subscription.id': subscriptionStatus.subscription!.id,
              'guardant.subscription.services_count': existingServices.length + 1,
            });
            subscriptionStatus.subscription!.usage.services = existingServices.length + 1;
            subscriptionStatus.subscription!.usage.lastUpdated = Date.now();
            return await paymentStorage.updateSubscription(subscriptionStatus.subscription!);
          });
        }
      } catch (error) {
        span.addEvent('subscription_usage_update_failed', { error: (error as Error).message });
        console.warn('⚠️ Failed to update subscription usage:', (error as Error).message);
      }

      // Request monitoring from workers via RabbitMQ - trace this messaging operation
      await tracing.traceMessagePublish('worker_commands', 'monitor_service', async (msgSpan) => {
        msgSpan.setAttributes({
          'guardant.service.id': service.id,
          'guardant.service.type': service.type,
          'guardant.nest.id': nestId,
        });
        return await rabbitmqService.requestServiceMonitoring(service);
      });

      // Log successful service creation
      span.addEvent('service_created', {
        service_id: service.id,
        service_type: service.type,
        service_name: service.name,
      });

      requestLogger.businessEvent('service_created', {
        serviceId: service.id,
        nestId,
        serviceType: service.type,
        serviceName: service.name,
      });

      // Record metrics
      metricsCollector.recordServiceAdd(nestId, service.type);

      return c.json<ApiResponse>({
        success: true,
        data: service
      });
    } catch (error: any) {
      span.addEvent('service_creation_error', { error: error.message });
      requestLogger.error('Service creation failed with error', error, { nestId });
      return c.json<ApiResponse>({ success: false, error: error.message }, 500);
    }
  });
});

app.post('/api/admin/services/update', async (c) => {
  try {
    const nestId = extractNestId(c);
    const body = await c.req.json();
    const { id, ...serviceData } = body;

    // Ensure monitoring object exists
    if (serviceData.monitoring && serviceData.monitoring.regions) {
      // Validate regions only if provided
      const invalidRegions = serviceData.monitoring.regions.filter(
        regionId => !availableRegions.find(r => r.id === regionId && r.available)
      );
      if (invalidRegions.length > 0) {
        return c.json<ApiResponse>({ 
          success: false, 
          error: `Invalid or unavailable regions: ${invalidRegions.join(', ')}` 
        }, 400);
      }
    }

    const updatedService = await hybridStorage.updateService(nestId, id, serviceData);
    if (!updatedService) {
      return c.json<ApiResponse>({ success: false, error: 'Service not found' }, 404);
    }

    // Update monitoring configuration via RabbitMQ
    await rabbitmqService.requestServiceMonitoring(updatedService);

    return c.json<ApiResponse>({
      success: true,
      data: updatedService
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

app.post('/api/admin/services/delete', async (c) => {
  try {
    const nestId = extractNestId(c);
    const body = await c.req.json();
    const { id } = body;

    const deleted = await hybridStorage.deleteService(nestId, id);
    if (!deleted) {
      return c.json<ApiResponse>({ success: false, error: 'Service not found' }, 404);
    }

    // Update subscription usage
    try {
      const subscriptionStatus = await paymentManager.getSubscriptionStatus(nestId);
      if (subscriptionStatus?.subscription) {
        const remainingServices = await hybridStorage.getServicesByNest(nestId);
        subscriptionStatus.subscription.usage.services = remainingServices.length;
        subscriptionStatus.subscription.usage.lastUpdated = Date.now();
        await paymentStorage.updateSubscription(subscriptionStatus.subscription);
      }
    } catch (error) {
      console.warn('⚠️ Failed to update subscription usage:', error.message);
    }

    // Stop monitoring via RabbitMQ
    await rabbitmqService.stopServiceMonitoring(nestId, id);

    return c.json<ApiResponse>({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

// Service count endpoint
app.post('/api/admin/services/count', async (c) => {
  try {
    const nestId = extractNestId(c);
    const services = await hybridStorage.getServicesByNest(nestId);
    
    return c.json<ApiResponse>({
      success: true,
      data: { count: services.length }
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

// Service detail endpoint
app.get('/api/admin/services/:id/detail', async (c) => {
  try {
    const nestId = extractNestId(c);
    const serviceId = c.req.param('id');
    
    // Get service configuration
    const services = await hybridStorage.getServicesByNest(nestId);
    const service = services.find(s => s.id === serviceId);
    
    if (!service) {
      return c.json<ApiResponse>({ success: false, error: 'Service not found' }, 404);
    }
    
    // Get monitoring data from scheduler
    const schedulerData = await redis.hget('scheduler:services', serviceId);
    let schedulerService = null;
    if (schedulerData) {
      try {
        schedulerService = JSON.parse(schedulerData);
      } catch (e) {
        console.warn('Failed to parse scheduler data for service:', serviceId);
      }
    }
    
    // Get recent check results
    const recentChecks = await redis.lrange(`service:${serviceId}:checks`, 0, 100);
    const history = recentChecks.map(check => {
      try {
        return JSON.parse(check);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    
    // Calculate statistics
    const stats = schedulerService?.stats || {
      checksScheduled: 0,
      checksCompleted: 0,
      checksFailed: 0,
      lastSuccess: null,
      lastFailure: null,
      averageResponseTime: 0,
      uptime: 0
    };
    
    // Calculate uptime percentage
    const uptime = stats.checksCompleted > 0 
      ? ((stats.checksCompleted - stats.checksFailed) / stats.checksCompleted) * 100 
      : 0;
    
    // Get incidents (failures)
    const incidents = [];
    let incidentStart = null;
    history.forEach((check, index) => {
      if (check.status === 'down' && !incidentStart) {
        incidentStart = {
          id: `incident-${check.timestamp}`,
          startTime: check.timestamp,
          reason: check.error || 'Service unavailable',
          affectedRegions: [check.region || 'unknown']
        };
      } else if (check.status === 'up' && incidentStart) {
        incidents.push({
          ...incidentStart,
          endTime: check.timestamp,
          status: 'resolved'
        });
        incidentStart = null;
      }
    });
    
    // Add ongoing incident if any
    if (incidentStart) {
      incidents.push({
        ...incidentStart,
        status: 'ongoing'
      });
    }
    
    // Prepare response
    const detailData = {
      id: service.id,
      name: service.name,
      type: service.type,
      target: service.target,
      interval: service.interval,
      isActive: service.isActive,
      monitoring: service.monitoring || {
        regions: ['eu-west-1'],
        strategy: 'all-selected'
      },
      statistics: {
        uptime: Number(uptime.toFixed(2)),
        avgResponseTime: Math.round(stats.averageResponseTime || 0),
        totalChecks: stats.checksCompleted || 0,
        failedChecks: stats.checksFailed || 0,
        lastDowntime: stats.lastFailure || null
      },
      lastCheck: service.lastCheck || (stats.lastSuccess || stats.lastFailure ? {
        status: stats.lastSuccess && (!stats.lastFailure || stats.lastSuccess > stats.lastFailure) ? 'up' : 'down',
        responseTime: stats.averageResponseTime || 0,
        timestamp: stats.lastSuccess || stats.lastFailure
      } : null),
      history: history.slice(0, 48).map(check => ({
        timestamp: check.timestamp,
        status: check.status,
        responseTime: check.responseTime || 0,
        region: check.region || 'unknown'
      })),
      incidents: incidents.slice(0, 10) // Last 10 incidents
    };
    
    return c.json<ApiResponse>({
      success: true,
      data: detailData
    });
  } catch (error: any) {
    console.error('Error fetching service detail:', error);
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

// Regions endpoint moved to public section above

// Subscription management (protected routes)
app.post('/api/admin/subscription/create', async (c) => {
  try {
    const nestId = extractNestId(c);
    const body = await c.req.json();
    const { planId, isYearly, paymentMethod, walletAddress } = body;

    if (!planId) {
      return c.json<ApiResponse>({ success: false, error: 'Plan ID required' }, 400);
    }

    const result = await paymentManager.createSubscription(
      nestId,
      planId,
      paymentMethod || 'eth',
      isYearly || false,
      walletAddress
    );

    if (!result.success) {
      return c.json<ApiResponse>({ success: false, error: result.error }, 400);
    }

    return c.json<ApiResponse>({
      success: true,
      data: result.subscription
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

app.post('/api/admin/subscription/status', async (c) => {
  try {
    const nestId = extractNestId(c);
    const status = await paymentManager.getSubscriptionStatus(nestId);

    if (!status) {
      return c.json<ApiResponse>({ 
        success: false, 
        error: 'No subscription found' 
      }, 404);
    }

    return c.json<ApiResponse>({
      success: true,
      data: status
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

app.post('/api/admin/subscription/upgrade', async (c) => {
  try {
    const nestId = extractNestId(c);
    const body = await c.req.json();
    const { planId, isYearly } = body;

    if (!planId) {
      return c.json<ApiResponse>({ success: false, error: 'Plan ID required' }, 400);
    }

    const result = await paymentManager.upgradeSubscription(
      nestId,
      planId,
      isYearly || false,
      body.walletAddress
    );

    if (!result.success) {
      return c.json<ApiResponse>({ success: false, error: result.error }, 400);
    }

    return c.json<ApiResponse>({
      success: true,
      data: result.transaction
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

app.post('/api/admin/subscription/cancel', async (c) => {
  try {
    const nestId = extractNestId(c);
    const body = await c.req.json();
    const { immediately } = body;

    const result = await paymentManager.cancelSubscription(
      nestId,
      immediately || false
    );

    if (!result.success) {
      return c.json<ApiResponse>({ success: false, error: result.error }, 400);
    }

    return c.json<ApiResponse>({
      success: true,
      message: immediately ? 'Subscription cancelled immediately' : 'Subscription will be cancelled at period end'
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

app.post('/api/admin/subscription/billing', async (c) => {
  try {
    const nestId = extractNestId(c);
    const result = await paymentManager.processUsageBilling(nestId);

    if (!result.success) {
      return c.json<ApiResponse>({ success: false, error: result.error }, 400);
    }

    return c.json<ApiResponse>({
      success: true,
      data: result.billing,
      message: 'Usage billing processed'
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

app.post('/api/admin/subscription/transactions', async (c) => {
  try {
    const nestId = extractNestId(c);
    const body = await c.req.json();
    const { limit } = body;

    const transactions = await paymentStorage.getTransactionsByNest(nestId, limit || 20);

    return c.json<ApiResponse>({
      success: true,
      data: transactions
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

// Wallet connection endpoints
app.post('/api/admin/wallet/detect', async (c) => {
  try {
    const availableWallets = await walletConnector.detectWallets();
    
    return c.json<ApiResponse>({
      success: true,
      data: availableWallets
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

app.post('/api/admin/wallet/connect', async (c) => {
  try {
    const body = await c.req.json();
    const { walletType } = body;
    
    if (!walletType) {
      return c.json<ApiResponse>({ success: false, error: 'Wallet type required' }, 400);
    }
    
    const walletInfo = await paymentManager.connectWallet(walletType as WalletType);
    
    return c.json<ApiResponse>({
      success: true,
      data: walletInfo
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

app.post('/api/admin/wallet/info', async (c) => {
  try {
    const walletInfo = paymentManager.getConnectedWallet();
    
    if (!walletInfo) {
      return c.json<ApiResponse>({ 
        success: false, 
        error: 'No wallet connected' 
      }, 404);
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: walletInfo
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

// Dashboard metrics
app.post('/api/admin/dashboard/stats', async (c) => {
  try {
    const nestId = extractNestId(c);
    const services = await hybridStorage.getServicesByNest(nestId);

    // Calculate basic stats
    const totalWatchers = services.length;
    const activeWatchers = services.filter(s => s.isActive).length;
    
    // Get real monitoring data from Redis
    let incidents = 0;
    let totalResponseTime = 0;
    let totalChecks = 0;
    let totalUptime = 0;
    let activeColonies = 0;
    
    // Process each service to get real metrics
    for (const service of services) {
      if (!service.isActive) continue;
      
      // Get service status from Redis
      const statusKey = keys.serviceStatus(service.nestId, service.id);
      const statusData = await redis.get(statusKey);
      
      if (statusData) {
        try {
          const status = JSON.parse(statusData);
          
          // Count incidents (services that are down or degraded)
          if (status.status === 'down' || status.status === 'degraded') {
            incidents++;
          }
          
          // Calculate average response time
          if (status.responseTime && status.responseTime > 0) {
            totalResponseTime += status.responseTime;
            totalChecks++;
          }
          
          // Count active regions for this service
          if (status.regions && Array.isArray(status.regions)) {
            activeColonies += status.regions.filter((r: any) => r.status === 'up').length;
          }
          
          // Calculate uptime (simplified - percentage of services that are up)
          if (status.status === 'up') {
            totalUptime++;
          }
        } catch (error) {
          console.error('Error parsing service status:', error);
        }
      }
    }
    
    // Get worker count from Redis
    const workers = await redis.hgetall('workers:heartbeat');
    let busyWorkerAnts = 0;
    const coloniesStatus: any[] = [];
    const workersByRegion: { [region: string]: number } = {};
    
    Object.entries(workers).forEach(([workerId, data]) => {
      try {
        const worker = JSON.parse(data);
        const isAlive = (Date.now() - worker.lastSeen) < 60000; // 1 minute timeout
        if (isAlive) {
          busyWorkerAnts++;
          // Group workers by region
          const region = worker.region || 'unknown';
          workersByRegion[region] = (workersByRegion[region] || 0) + 1;
        }
      } catch (error) {
        console.error('Error parsing worker data:', error);
      }
    });
    
    // Convert worker regions to colonies status
    const regionMap: { [key: string]: { name: string, area: string } } = {
      'us-east-1': { name: 'US East', area: 'North America' },
      'us-west-1': { name: 'US West', area: 'North America' },
      'eu-west-1': { name: 'EU West', area: 'Europe' },
      'eu-central-1': { name: 'EU Central', area: 'Europe' },
      'ap-southeast-1': { name: 'Asia Pacific', area: 'Singapore' },
      'ap-northeast-1': { name: 'Asia Pacific', area: 'Tokyo' }
    };
    
    Object.entries(workersByRegion).forEach(([region, count]) => {
      const regionInfo = regionMap[region] || { name: region, area: 'Unknown' };
      coloniesStatus.push({
        id: region,
        name: regionInfo.name,
        region: regionInfo.area,
        activeWorkers: count,
        status: count > 0 ? 'active' : 'inactive'
      });
    });
    
    // Calculate final metrics
    const avgResponseTime = totalChecks > 0 ? Math.round(totalResponseTime / totalChecks) : 0;
    const uptime = activeWatchers > 0 ? Math.round((totalUptime / activeWatchers) * 100) : 100;
    
    // Get recent activity
    const recentActivity: any[] = [];
    
    // Get recent service checks
    const recentChecks = await redis.zrange('recent:checks', -10, -1, 'WITHSCORES');
    for (let i = 0; i < recentChecks.length; i += 2) {
      try {
        const checkData = JSON.parse(recentChecks[i]);
        const timestamp = parseInt(recentChecks[i + 1]);
        recentActivity.push({
          id: `check-${timestamp}`,
          type: 'watcher_check',
          message: `${checkData.serviceName} checked successfully`,
          timestamp,
          status: checkData.status === 'up' ? 'success' : 'error'
        });
      } catch (error) {
        // Skip invalid entries
      }
    }
    
    // Add worker join events
    Object.entries(workers).forEach(([workerId, data]) => {
      try {
        const worker = JSON.parse(data);
        // If worker joined in last hour
        if (worker.firstSeen && (Date.now() - worker.firstSeen) < 3600000) {
          recentActivity.push({
            id: `worker-${workerId}`,
            type: 'worker_joined',
            message: `New worker ant joined ${regionMap[worker.region]?.name || worker.region} colony`,
            timestamp: worker.firstSeen,
            status: 'success'
          });
        }
      } catch (error) {
        // Skip invalid entries
      }
    });
    
    // Sort activity by timestamp
    recentActivity.sort((a, b) => b.timestamp - a.timestamp);
    
    const stats = {
      totalWatchers,
      activeWatchers,
      totalServices: totalWatchers, // Alias for frontend compatibility
      activeServices: activeWatchers, // Alias for frontend compatibility
      incidents,
      avgResponseTime,
      uptime,
      activeColonies: coloniesStatus.length,
      busyWorkerAnts,
      coloniesStatus,
      recentActivity: recentActivity.slice(0, 10) // Limit to 10 most recent
    };

    return c.json<ApiResponse>({
      success: true,
      data: stats
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

// Widget management
app.post('/api/admin/widget/config', async (c) => {
  try {
    const nestId = extractNestId(c);
    const body = await c.req.json();
    const { theme = 'light', services = [], compact = false } = body;

    // Get nest data
    const nest = await hybridStorage.getNest(nestId);
    if (!nest) {
      return c.json<ApiResponse>({ success: false, error: 'Nest not found' }, 404);
    }

    // Get available services
    const allServices = await hybridStorage.getServicesByNest(nestId);
    const availableServices = allServices.map(service => ({
      id: service.id,
      name: service.name,
      type: service.type
    }));

    // Generate widget configuration
    const baseUrl = process.env.PUBLIC_API_URL || 'http://localhost:3002';
    const queryParams = new URLSearchParams({
      theme,
      services: services.length > 0 ? services.join(',') : 'all',
      compact: compact.toString()
    }).toString();
    
    const embedCode = `<!-- GuardAnt Status Widget -->
<div data-guardant="${nest.subdomain}"></div>
<script src="${baseUrl}/api/status/${nest.subdomain}/widget.js?${queryParams}" async></script>`;

    const iframeCode = `<!-- GuardAnt Status Widget (iframe) -->
<iframe src="https://${nest.subdomain}.guardant.me/embed?theme=${theme}&compact=${compact}" width="100%" height="${compact ? '120' : '300'}" frameborder="0" scrolling="no"></iframe>`;

    return c.json<ApiResponse>({
      success: true,
      data: {
        subdomain: nest.subdomain,
        nestName: nest.name,
        isPublic: nest.settings.isPublic,
        availableServices,
        config: { theme, services, compact },
        embedCode,
        iframeCode,
        widgetUrl: `${baseUrl}/api/status/${nest.subdomain}/widget.js?${queryParams}`,
        previewUrl: `${baseUrl}/api/status/${nest.subdomain}/widget.js?${queryParams}&preview=true`
      }
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

app.post('/api/admin/widget/preview', async (c) => {
  try {
    const nestId = extractNestId(c);
    const body = await c.req.json();
    const { theme = 'light', services = [], compact = false } = body;

    // Get nest data 
    const nest = await hybridStorage.getNest(nestId);
    if (!nest) {
      return c.json<ApiResponse>({ success: false, error: 'Nest not found' }, 404);
    }

    // Get services data for preview
    const allServices = await hybridStorage.getServicesByNest(nestId);
    let previewServices = allServices;
    
    if (services.length > 0) {
      previewServices = allServices.filter(service => services.includes(service.id));
    }

    // Transform services for preview (similar to public API)
    const transformedServices = previewServices.map(service => ({
      id: service.id,
      name: service.name,
      type: service.type,
      status: 'up', // Mock status for preview
      responseTime: Math.floor(Math.random() * 200) + 50, // Mock response time
      lastChecked: Date.now()
    }));

    // Generate preview HTML
    const previewHTML = generateWidgetPreviewHTML(nest, transformedServices, { theme, compact });

    return c.json<ApiResponse>({
      success: true,
      data: {
        html: previewHTML,
        services: transformedServices.length,
        theme,
        compact
      }
    });
  } catch (error: any) {
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

// WorkerAnt status
app.post('/api/admin/worker-ants/status', async (c) => {
  try {
    // Get worker heartbeats from Redis
    const workers = await redis.hgetall('workers:heartbeat');
    
    // Group workers by region
    const workersByRegion: Record<string, { count: number; activeJobs: number }> = {};
    
    // Initialize all regions with 0 counts
    availableRegions.forEach(region => {
      workersByRegion[region.id] = { count: 0, activeJobs: 0 };
    });
    
    // Count active workers per region
    Object.entries(workers).forEach(([id, data]) => {
      try {
        const worker = JSON.parse(data);
        const isAlive = (Date.now() - worker.lastSeen) < 60000; // 1 minute timeout
        
        if (isAlive && worker.region) {
          if (!workersByRegion[worker.region]) {
            workersByRegion[worker.region] = { count: 0, activeJobs: 0 };
          }
          workersByRegion[worker.region].count++;
          // Active jobs are the number of checks completed in the last minute
          workersByRegion[worker.region].activeJobs += worker.checksCompleted || 0;
        }
      } catch (error) {
        console.error('Error parsing worker data:', error);
      }
    });
    
    // Convert to array format
    const workerAnts = Object.entries(workersByRegion).map(([region, data]) => ({
      region,
      count: data.count,
      activeJobs: data.activeJobs
    }));
    
    return c.json<ApiResponse>({
      success: true,
      data: workerAnts
    });
  } catch (error: any) {
    console.error('Error getting worker status:', error);
    return c.json<ApiResponse>({ success: false, error: error.message }, 500);
  }
});

} // End of registerApiEndpoints function

// Track if startServer was already called
let startServerCalled = false;

// Initialize storage and start server
async function startServer() {
  console.log(`🚦 [${startupId}] Starting server initialization...`);
  
  // Check global flag first
  if (globalServerStarted) {
    console.error(`❌ [${startupId}] Server already started globally! Preventing duplicate execution.`);
    return;
  }
  
  // Check if already called
  if (startServerCalled) {
    console.error(`❌ [${startupId}] startServer already called! Preventing duplicate execution.`);
    return;
  }
  startServerCalled = true;
  globalServerStarted = true;
  
  try {
    // Initialize configuration
    console.log(`📋 [${startupId}] Loading configuration...`);
    config = await getConfig('api-admin');
    
    // Debug port configuration
    const configPort = config.get('port');
    const envPort = process.env.PORT;
    console.log(`🔍 Port configuration:`, {
      configPort,
      envPort,
      parsedEnvPort: envPort ? parseInt(envPort, 10) : undefined,
      defaultPort: 3001
    });
    
    const port = configPort || parseInt(process.env.PORT || '3002', 10);
    
    // Initialize Redis with config
    // Parse Redis URL (e.g., redis://redis:6379 or redis://user:pass@redis:6379)
    const redisUrl = config.get('redisUrl') || 'redis://redis:6379';
    const url = new URL(redisUrl);
    
    const redisConfig = {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      maxRetriesPerRequest: null,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      lazyConnect: true,
    };
    redis = new Redis(redisConfig);
    
    // Redis connection event logging
    redis.on('connect', () => {
      logger.info('Connected to Redis', { component: 'redis' });
    });

    redis.on('error', (error) => {
      logger.error('Redis connection error', error, { component: 'redis' });
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed', { component: 'redis' });
    });
    
    // Test Redis connection
    await redis.ping();
    console.log('✅ Redis storage initialized');
    
    // Initialize tracing with config
    tracing = initializeTracing('guardant-admin-api', {
      serviceVersion: '1.0.0',
      environment: config.get('nodeEnv') || 'development',
      jaegerEndpoint: config.get('jaegerEndpoint'),
    });
    
    // Initialize health checker and metrics
    healthChecker = new HealthChecker('api-admin', '1.0.0'); 
    metricsCollector = getMetricsCollector('guardant_admin_api');
    
    // Update health endpoints with actual implementation
    healthEndpoints = createHealthEndpoints(healthChecker);
    
    // Initialize error handling systems
    errorManager = new ErrorManager('api-admin', tracing);
    retryManager = createRetryManager('api-admin', tracing);
    circuitBreakerManager = createCircuitBreakerManager('api-admin', tracing);
    dlqManager = createDLQManager('api-admin', tracing);
    
    // Create circuit breakers
    redisCircuitBreaker = circuitBreakerManager.createCircuitBreaker(
      'redis',
      CircuitBreakerConfigs.DATABASE
    );
    rabbitmqCircuitBreaker = circuitBreakerManager.createCircuitBreaker(
      'rabbitmq',
      CircuitBreakerConfigs.EXTERNAL_API
    );
    golemCircuitBreaker = circuitBreakerManager.createCircuitBreaker(
      'golem-l3',
      CircuitBreakerConfigs.BLOCKCHAIN
    );
    ethereumCircuitBreaker = circuitBreakerManager.createCircuitBreaker(
      'ethereum',
      CircuitBreakerConfigs.BLOCKCHAIN
    );
    
    // Initialize authentication with config
    authConfig = {
      jwt: {
        accessTokenSecret: config.getRequired('jwtSecret'),
        refreshTokenSecret: config.getRequired('refreshSecret'),
        accessTokenTtl: 15 * 60, // 15 minutes
        refreshTokenTtl: 7 * 24 * 60 * 60, // 7 days
        issuer: 'guardant-api-admin',
        audience: 'guardant-client',
      },
      password: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: false,
        preventReuse: 5,
      },
      security: {
        maxFailedAttempts: 5,
        lockoutDuration: 15 * 60, // 15 minutes
        sessionTimeout: 24 * 60 * 60, // 24 hours
        maxActiveSessions: 5,
      },
      rateLimiting: {
        loginAttempts: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          maxAttempts: 5,
        },
        apiRequests: {
          windowMs: 60 * 1000, // 1 minute
          maxRequests: 100,
        },
      },
    };
    authManager = setupAuthManager(redis);
    
    // Initialize authentication middleware now that authManager is ready
    authMiddleware = createAuthMiddleware(authManager);
    nestOwnershipMiddleware = createNestOwnershipMiddleware('nestId');
    
    // Initialize payment system with config
    // Golem Base L2 "Erech" configuration
    holeskyConfig = {
      rpcUrl: config.get('golemL2HttpUrl') || 'https://execution.holesky.l2.gobas.me',
      chainId: 393530, // Golem Base L2 "Erech"
      contracts: {
        subscriptionManager: '0x0000000000000000000000000000000000000000',
        paymentProcessor: '0x0000000000000000000000000000000000000000',
        usdcToken: '0x0000000000000000000000000000000000000000', // TODO: Deploy USDC on L2
        usdtToken: '0x0000000000000000000000000000000000000000', // TODO: Deploy USDT on L2
      },
      wallet: {
        privateKey: config.get('golemPrivateKey') || '0x0000000000000000000000000000000000000000000000000000000000000001',
        address: config.get('golemWalletAddress') || '0x0000000000000000000000000000000000000000',
      },
      acceptedTokens: {
        ETH: true,
        USDC: false, // Enable after deployment
        USDT: false, // Enable after deployment
      },
    };
    paymentStorage = new RedisPaymentStorage(redis);
    
    // Initialize wallet connector
    walletConnector = createWalletConnector({
      chainId: holeskyConfig.chainId,
      rpcUrl: holeskyConfig.rpcUrl,
      supportedWallets: ['metamask', 'walletconnect', 'coinbase', 'trust', 'brave', 'rainbow'],
    });
    
    paymentManager = new PaymentManager(holeskyConfig, paymentStorage, walletConnector);
    
    // RabbitMQ configuration from config
    rabbitmqConfig = {
      url: config.get('rabbitmqUrl') || 'amqp://localhost:5672',
      workerResultsQueue: 'worker_results',
      workerCommandsExchange: 'worker_commands',
    };
    console.log('📡 RabbitMQ configuration:', {
      url: rabbitmqConfig.url,
      exchange: rabbitmqConfig.workerCommandsExchange,
      queue: rabbitmqConfig.workerResultsQueue
    });
    
    // Initialize Golem L3 storage
    if (config.get('golemEnabled')) {
      try {
        await golemStorage.initialize();
        console.log('✅ Golem L3 storage initialized');
      } catch (golemError) {
        console.warn('⚠️ Golem L3 initialization failed, using memory fallback:', golemError.message);
      }
    }
    
    // Connect to RabbitMQ (optional)
    try {
      console.log('🔄 Attempting to connect to RabbitMQ...');
      await rabbitmqService.connectToRabbitMQ();
      console.log('✅ RabbitMQ worker communication initialized');
    } catch (rabbitmqError) {
      console.error('❌ RabbitMQ connection failed:', rabbitmqError);
      console.warn('⚠️ RabbitMQ connection failed, continuing without worker communication:', rabbitmqError.message);
    }

    // Setup health checks after all services are initialized
    healthChecker.addCheck('redis', commonHealthChecks.redis(redis));
    
    if (rabbitmqConnection && rabbitmqChannel) {
      healthChecker.addCheck('rabbitmq', commonHealthChecks.rabbitmq(rabbitmqConnection, rabbitmqChannel));
    }

    healthChecker.addCheck('golem-storage', commonHealthChecks.storage(
      async () => {
        // Test Golem storage with a simple operation
        await golemStorage.get('health-check-test');
      },
      'golem-l3'
    ));

    logger.info('Health checks configured', {
      component: 'health',
      checks: Array.from(healthChecker['checks'].keys())
    });
    
    // Apply CORS middleware first
    app.use('*', cors());
    
    // Add request logging middleware
    app.use('*', (c, next) => {
      const startTime = performance.now();
      const requestId = c.req.header('x-request-id') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create request-scoped logger
      const requestLogger = logger.child({
        requestId,
        userAgent: c.req.header('user-agent'),
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      });

      // Log request start
      requestLogger.info('Request started', {
        method: c.req.method,
        path: c.req.path,
        query: c.req.query(),
      });

      // Store logger and request ID in context
      c.set('logger', requestLogger);
      c.set('requestId', requestId);
      c.res.headers.set('x-request-id', requestId);

      return next().then(() => {
        const duration = performance.now() - startTime;
        
        requestLogger.httpRequest(
          c.req.method,
          c.req.path,
          c.res.status,
          duration,
          { requestId }
        );
      }).catch((error) => {
        const duration = performance.now() - startTime;
        
        requestLogger.error('Request failed', error, {
          requestId,
          method: c.req.method,
          path: c.req.path,
          duration,
        });

        throw error;
      });
    });
    
    // Set global context for all routes
    app.use('*', (c, next) => {
      c.set('storage', hybridStorage);
      c.set('authManager', authManager);
      c.set('paymentManager', paymentManager);
      c.set('redis', redis);
      return next();
    });
    
    // Apply authentication middleware to all /api/admin/* routes except auth endpoints
    // This must be done after authManager is initialized
    app.use('/api/admin/*', async (c, next) => {
      // Skip auth for login/register/refresh endpoints
      const path = c.req.path;
      console.log('🔐 Auth middleware check for path:', path);
      console.log('🔍 Has Authorization header?', !!c.req.header('Authorization'));
      
      if (path.includes('/auth/login') || 
          path.includes('/auth/register') || 
          path.includes('/auth/refresh') ||
          path.includes('/regions/list') ||
          path.includes('/subscription/plans')) {
        console.log('🔓 Skipping auth for public endpoint');
        return next();
      }
      
      console.log('🔒 Applying auth middleware');
      console.log('🔍 AuthManager exists?', !!authManager);
      console.log('🔍 AuthMiddleware exists?', !!authMiddleware);
      
      if (!authMiddleware) {
        console.error('❌ authMiddleware not initialized!');
        return c.json({ success: false, error: 'Auth system not ready' }, 503);
      }
      
      // Apply auth middleware and check user context
      try {
        const result = await authMiddleware(c, async () => {
          console.log('✅ Auth middleware passed');
          console.log('🔍 User in context:', c.get('user'));
          console.log('🔍 Context vars:', Object.keys(c.var || {}));
          return next();
        });
        
        console.log('🔍 Auth middleware result:', result?.status);
        return result;
      } catch (error) {
        console.error('❌ Auth middleware error:', error);
        return c.json({ success: false, error: 'Authentication failed' }, 401);
      }
    });
    
    // Register all API endpoints after middleware is set up
    registerApiEndpoints(app);
    
    // Add middleware to provide redis to platform routes
    platformRoutes.use('*', async (c, next) => {
      c.set('redis', redis);
      c.set('storage', hybridStorage);
      await next();
    });
    
    // Add middleware to provide redis to platform points routes
    platformPointsRoutes.use('*', async (c, next) => {
      c.set('redis', redis);
      c.set('storage', hybridStorage);
      await next();
    });
    
    // Mount platform admin routes
    app.route('/api/admin/platform', platformRoutes);
    
    // Mount platform points routes
    app.route('/api/admin/platform', platformPointsRoutes);
    
    // Mount deployment API (only in development/staging)
    if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEPLOYMENT_API === 'true') {
      app.route('/api/admin/deployment', deploymentApi);
      console.log('🚀 Deployment API enabled at /api/admin/deployment');
    }
    
    // Mount workers API
    app.route('/api/admin/workers', workersApi);
    console.log('👷 Workers API enabled at /api/admin/workers');
    
    // Mount subdomain management routes
    const subdomainRoutes = createSubdomainRoutes({ redis, hybridStorage });
    app.route('/api/admin/subdomain', subdomainRoutes);
    console.log('🌐 Subdomain API enabled at /api/admin/subdomain');
    
    console.log(`🚀 Admin API starting on port ${port}...`);
    console.log(`🐜 Ready to manage ant colonies with hybrid storage!`);
    console.log('🔐 Configuration loaded:', config.getSafeConfig());
    
    // Start server
    console.log(`🔍 Attempting to start server on hostname: 0.0.0.0, port: ${port}`);
    console.log(`🔍 Port type: ${typeof port}, value: ${port}`);
    
    // Check if we're in Docker
    const fs = require('fs');
    const isDocker = process.env.DOCKER === 'true' || fs.existsSync('/.dockerenv');
    console.log(`🐳 Running in Docker: ${isDocker}`);
    
    try {
      const serverPort = parseInt(String(port), 10);
      console.log(`🔢 Parsed port: ${serverPort}`);
      
      // Check current process info
      console.log(`🔍 Process info:`, {
        pid: process.pid,
        ppid: process.ppid,
        platform: process.platform,
        arch: process.arch,
        versions: process.versions
      });
      
      // Check if another process might be using the port
      try {
        const { execSync } = require('child_process');
        const processes = execSync('ps aux').toString();
        console.log(`🔍 Running processes with 'bun':`);
        processes.split('\n').filter(line => line.includes('bun')).forEach(line => {
          console.log(line);
        });
        
        // Try to check what's on port 4000
        try {
          const portCheck = execSync('netstat -tulpn | grep :4000 || true').toString();
          console.log(`🔍 Port 4000 usage:`, portCheck || 'Not found');
        } catch (e) {
          console.log(`🔍 Could not check port with netstat`);
        }
      } catch (e) {
        console.log(`🔍 Could not check processes`);
      }
      
      // Wait a bit to ensure all resources are ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Skip port check - it might be causing issues with Bun
      console.log(`⚡ Skipping port check, attempting direct bind...`);
      
      // First, try a simple test server on a random port
      console.log(`🧪 Testing if we can bind to any port...`);
      let testPort = null;
      try {
        const testServer = Bun.serve({
          port: 0, // Let Bun choose a random port
          fetch: () => new Response('test'),
        });
        testPort = testServer.port;
        console.log(`✅ Test server successfully bound to port ${testPort}`);
        testServer.stop();
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (testError) {
        console.error(`❌ Cannot bind to ANY port! Error:`, testError);
      }
      
      // If specific port fails, try using a random port as fallback
      const useRandomPort = process.env.USE_RANDOM_PORT === 'true';
      
      // Force specific port configuration
      const finalPort = parseInt(String(serverPort), 10);
      console.log(`🎯 Forcing server to use port: ${finalPort}`);
      
      let server;
      try {
        server = Bun.serve({
          port: finalPort,
          hostname: '0.0.0.0',
          fetch: app.fetch,
          error(error) {
            console.error('🚨 Request error:', error);
            return new Response('Internal Server Error', { status: 500 });
          },
        });
        console.log(`✅ Server started on port ${finalPort}`);
      } catch (error) {
        console.error(`❌ Failed to start on port ${finalPort}:`, error);
        
        // Try with just hostname without explicit binding
        try {
          console.log(`🔄 Trying alternative server configuration...`);
          server = Bun.serve({
            port: finalPort,
            hostname: '0.0.0.0',
            fetch: app.fetch,
          });
          console.log(`✅ Alternative server configuration successful`);
        } catch (altError) {
          console.error(`❌ Alternative configuration also failed:`, altError);
          
          // Final attempt - let Bun choose everything
          try {
            console.log(`🔄 Final attempt - using minimal configuration...`);
            server = Bun.serve({
              port: finalPort,
              fetch: app.fetch,
            });
            console.log(`✅ Minimal configuration successful`);
          } catch (finalError) {
            console.error(`💀 All server start attempts failed:`, finalError);
            throw new Error(`Cannot start server on port ${finalPort}: ${finalError.message}`);
          }
        }
      }
      
      
      if (!server) {
        throw new Error('Server failed to initialize');
      }
      
      console.log(`✅ Server started successfully!`);
      console.log(`📡 Server details:`, {
        hostname: server.hostname,
        port: server.port,
        url: server.url,
        development: server.development
      });
      
      // If using random port, log it prominently
      if (server.port !== serverPort || serverPort === 0) {
        console.log(`⚠️  IMPORTANT: Server is running on DYNAMIC PORT ${server.port}`);
        console.log(`✅  Access the server internally at: http://localhost:${server.port}`);
        console.log(`✅  Access from host at: http://localhost:4040`);
        
        // Write port to file for external scripts
        try {
          const fs = require('fs');
          fs.writeFileSync('/tmp/admin-api-port.txt', server.port.toString());
          fs.chmodSync('/tmp/admin-api-port.txt', 0o644);
          console.log(`📝 Port ${server.port} written to /tmp/admin-api-port.txt`);
        } catch (e) {
          console.log(`⚠️  Could not write port file:`, e.message);
        }
      }
      
      // Keep the process alive
      process.on('SIGINT', () => {
        console.log('👋 Shutting down server...');
        server.stop();
        process.exit(0);
      });
    } catch (serverError) {
      console.error('🔥 Server start error:', serverError);
      console.error('🔥 Error details:', {
        name: serverError.name,
        message: serverError.message,
        code: serverError.code,
        errno: serverError.errno,
        syscall: serverError.syscall,
        address: serverError.address,
        port: serverError.port,
        stack: serverError.stack
      });
      
      // Check if port is in use
      if (serverError.code === 'EADDRINUSE' || serverError.message.includes('in use')) {
        console.error(`❌ Port ${port} is already in use!`);
        
        // Try to find what's using the port (Linux/Docker specific)
        try {
          const { execSync } = require('child_process');
          const portCheck = execSync(`lsof -i :${port} 2>/dev/null || true`).toString();
          console.log('🔍 Port usage:', portCheck || 'Could not determine');
        } catch (e) {
          console.log('🔍 Could not check port usage');
        }
      }
      
      throw serverError;
    }
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
}

// Redis event handlers are set up during initialization

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📛 Closing connections...');
  if (redis) await redis.disconnect();
  await golemStorage.disconnect();
  if (rabbitmqConnection) {
    await rabbitmqConnection.close();
  }
  if (config) {
    await config.shutdown();
  }
});

// Widget preview HTML generator
function generateWidgetPreviewHTML(nest: Nest, services: any[], options: { theme: string; compact: boolean }): string {
  const themeClass = options.theme === 'dark' ? 'guardant-dark' : 'guardant-light';
  const baseStyles = `font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
    border-radius: 8px; border: 1px solid; padding: 12px; font-size: 13px; line-height: 1.4; 
    ${options.theme === 'dark' ? 
      'background: #1f2937; color: #f9fafb; border-color: #374151;' :
      'background: #ffffff; color: #111827; border-color: #d1d5db;'}`;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'up': return '#10b981';
      case 'down': return '#ef4444';
      case 'degraded': return '#f59e0b';
      case 'maintenance': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'up': return 'Operational';
      case 'down': return 'Down';
      case 'degraded': return 'Degraded';
      case 'maintenance': return 'Maintenance';
      default: return 'Unknown';
    }
  };

  // Calculate overall status
  const upServices = services.filter(s => s.status === 'up').length;
  const overallStatus = upServices === services.length ? 'up' : 'degraded';
  const statusColor = getStatusColor(overallStatus);
  const statusText = getStatusText(overallStatus);

  if (options.compact) {
    return `<div class="guardant-widget guardant-compact ${themeClass}" style="${baseStyles} max-width: 300px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${statusColor};"></div>
        <span style="font-weight: 500;">${nest.name}</span>
        <span style="color: ${statusColor};">${statusText}</span>
      </div>
      <div style="font-size: 11px; opacity: 0.7; margin-top: 2px;">${services.length} services monitored</div>
    </div>`;
  }

  const servicesHTML = services.map(service => {
    const serviceColor = getStatusColor(service.status);
    const serviceText = getStatusText(service.status);
    return `<div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid ${options.theme === 'dark' ? '#374151' : '#e5e7eb'};">
      <span>${service.name}</span>
      <span style="color: ${serviceColor}; font-weight: 500;">${serviceText}</span>
    </div>`;
  }).join('');

  return `<div class="guardant-widget guardant-full ${themeClass}" style="${baseStyles} max-width: 400px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid ${options.theme === 'dark' ? '#374151' : '#e5e7eb'};">
      <h3 style="margin: 0; font-size: 16px;">${nest.name} Status</h3>
      <div style="display: flex; align-items: center; gap: 6px;">
        <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${statusColor};"></div>
        <span style="color: ${statusColor}; font-weight: 500;">${statusText}</span>
      </div>
    </div>
    <div>${servicesHTML}</div>
    <div style="text-align: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid ${options.theme === 'dark' ? '#374151' : '#e5e7eb'};">
      <a href="https://${nest.subdomain}.guardant.me" target="_blank" style="color: #6366f1; text-decoration: none; font-size: 12px;">View full status page →</a>
    </div>
  </div>`;
}

// Generate unique startup ID to detect multiple starts
const startupId = Math.random().toString(36).substring(7);
console.log(`🔑 Startup ID: ${startupId}`);

// Global flag to prevent multiple starts - use a more robust mechanism
const GLOBAL_SERVER_STATE_KEY = '__GUARDANT_ADMIN_SERVER_STARTED__';
if (!(global as any)[GLOBAL_SERVER_STATE_KEY]) {
  (global as any)[GLOBAL_SERVER_STATE_KEY] = false;
}

// Always start server when running with Bun
const shouldStart = import.meta.main || process.env.DOCKER === 'true';

if (shouldStart) {
  console.log(`🚀 [${startupId}] Starting server (main: ${import.meta.main}, docker: ${process.env.DOCKER})...`);
  
  // Double-check with global state
  if (!(global as any)[GLOBAL_SERVER_STATE_KEY]) {
    console.log(`🚀 [${startupId}] Starting server for the first time...`);
    (global as any)[GLOBAL_SERVER_STATE_KEY] = true;
    
    startServer().catch(error => {
      console.error(`💥 [${startupId}] Server start failed:`, error);
      (global as any)[GLOBAL_SERVER_STATE_KEY] = false; // Reset on failure
      process.exit(1);
    });
  } else {
    console.log(`⚠️ [${startupId}] Server already started by another instance!`);
    console.log(`⚠️ This suggests the module is being loaded multiple times.`);
  }
} else {
  console.log(`📦 [${startupId}] Loaded as module, not starting server`);
}

// Don't export app to prevent Bun's automatic server detection
// export default app;