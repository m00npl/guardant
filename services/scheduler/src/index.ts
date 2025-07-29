import Redis from 'ioredis';
import amqp from 'amqplib';
import { createLogger } from '../../../shared/logger';
import { startHeartbeatListener } from './heartbeat-listener';

const logger = createLogger('monitoring-scheduler');

interface ScheduledService {
  id: string;
  nestId: string;
  name: string;
  type: string;
  target: string;
  config: any;
  interval: number;
  monitoring?: {
    regions: string[];
  };
  lastCheck?: number;
  nextCheck: number;
  stats: {
    checksScheduled: number;
    checksCompleted: number;
    checksFailed: number;
    lastSuccess?: number;
    lastFailure?: number;
    averageResponseTime?: number;
    uptime?: number;
  };
  enabled: boolean;
  priority: 'high' | 'normal' | 'low';
}

// Configuration
const config = {
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  checkInterval: 5000, // Check every 5 seconds
};

// Services
let redis: Redis;
let rabbitmqConnection: amqp.Connection | null = null;
let rabbitmqChannel: amqp.Channel | null = null;

// Scheduled services
const scheduledServices = new Map<string, ScheduledService>();
let schedulerInterval: NodeJS.Timeout | null = null;

// URL deduplication
const urlToServices = new Map<string, Set<string>>(); // URL -> Set of service IDs
const pendingChecks = new Map<string, number>(); // URL -> timestamp of last check
const CHECK_CACHE_TTL = 30000; // 30 seconds cache

// Connect to Redis
async function connectToRedis() {
  const redisUrl = new URL(config.redisUrl);
  redis = new Redis({
    host: redisUrl.hostname,
    port: parseInt(redisUrl.port) || 6379,
    password: redisUrl.password || undefined,
  });
  
  await redis.ping();
  logger.info('✅ Connected to Redis');
}

// Connect to RabbitMQ
async function connectToRabbitMQ() {
  rabbitmqConnection = await amqp.connect(config.rabbitmqUrl);
  rabbitmqChannel = await rabbitmqConnection.createChannel();
  
  // Declare exchange
  await rabbitmqChannel.assertExchange('worker_commands', 'direct');
  
  logger.info('✅ Connected to RabbitMQ');
}

// Get cache key for URL
function getCacheKey(service: ScheduledService): string {
  // Create unique key based on URL and check parameters
  const params = {
    url: service.target,
    type: service.type,
    method: service.config?.method || 'GET',
    headers: service.config?.headers || {},
  };
  return JSON.stringify(params);
}

// Send check command to workers
async function sendCheckCommand(service: ScheduledService) {
  if (!rabbitmqChannel) return;
  
  const cacheKey = getCacheKey(service);
  const lastCheck = pendingChecks.get(cacheKey);
  
  // Check if we recently checked this URL
  if (lastCheck && (Date.now() - lastCheck) < CHECK_CACHE_TTL) {
    logger.debug('⏭️  Skipping check (cached)', { 
      serviceId: service.id,
      target: service.target,
      cacheAge: Date.now() - lastCheck 
    });
    
    // Get cached result from Redis
    const cachedResult = await redis.get(`check:cache:${cacheKey}`);
    if (cachedResult) {
      await propagateResult(JSON.parse(cachedResult), service.id);
    }
    return;
  }
  
  // Mark as pending
  pendingChecks.set(cacheKey, Date.now());
  
  const command = {
    command: 'check_service_once',
    data: {
      serviceId: service.id,
      nestId: service.nestId,
      type: service.type,
      target: service.target,
      config: service.config || {},
      regions: service.monitoring?.regions || [],
      cacheKey, // Include cache key for result processing
    },
    timestamp: Date.now(),
  };
  
  // Determine routing based on regions
  const regions = service.monitoring?.regions || [];
  if (regions.length > 0) {
    // Send to specific regions
    for (const region of regions) {
      await rabbitmqChannel.publish(
        'worker_commands',
        `check_service_once.${region}`,
        Buffer.from(JSON.stringify(command)),
        { persistent: true }
      );
      
      logger.debug('📤 Sent region-specific check', { 
        serviceId: service.id,
        region,
        target: service.target 
      });
    }
  } else {
    // Send to any available worker
    await rabbitmqChannel.publish(
      'worker_commands',
      'check_service_once',
      Buffer.from(JSON.stringify(command)),
      { persistent: true }
    );
    
    logger.debug('📤 Sent global check command', { 
      serviceId: service.id,
      target: service.target 
    });
  }
}

// Propagate cached result to service
async function propagateResult(result: any, serviceId: string) {
  const service = scheduledServices.get(serviceId);
  if (!service) return;
  
  // Update service stats as if it was checked
  service.stats.checksCompleted++;
  globalStats.totalChecksCompleted++;
  
  if (result.status === 'up') {
    service.stats.lastSuccess = Date.now();
  } else {
    service.stats.lastFailure = Date.now();
    service.stats.checksFailed++;
  }
  
  await redis.hset('scheduler:services', serviceId, JSON.stringify(service));
  
  logger.debug('📋 Used cached result', { 
    serviceId,
    status: result.status 
  });
}

// Global stats
const globalStats = {
  totalChecksScheduled: 0,
  totalChecksCompleted: 0,
  totalChecksFailed: 0,
  startTime: Date.now(),
  workersConnected: 0,
};

// Scheduler loop
async function schedulerLoop() {
  const now = Date.now();
  
  // Sort by priority
  const sortedServices = Array.from(scheduledServices.entries()).sort(([, a], [, b]) => {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
  
  for (const [serviceId, service] of sortedServices) {
    if (!service.enabled) continue;
    
    if (now >= service.nextCheck) {
      try {
        await sendCheckCommand(service);
        service.lastCheck = now;
        service.nextCheck = now + (service.interval * 1000);
        service.stats.checksScheduled++;
        globalStats.totalChecksScheduled++;
        
        // Update in Redis
        await redis.hset(`scheduler:services`, serviceId, JSON.stringify(service));
        
        // Update global stats
        await updateGlobalStats();
      } catch (error) {
        logger.error('Failed to send check command', error, { serviceId });
        service.stats.checksFailed++;
        globalStats.totalChecksFailed++;
      }
    }
  }
}

// Update global statistics
async function updateGlobalStats() {
  await redis.hset('scheduler:stats', 'global', JSON.stringify({
    ...globalStats,
    uptime: Date.now() - globalStats.startTime,
    servicesManaged: scheduledServices.size,
    lastUpdate: Date.now(),
  }));
}

// Load services from Redis
async function loadServices() {
  try {
    logger.info('📋 Loading services from Redis...');
    
    // Get all scheduled services
    const services = await redis.hgetall('scheduler:services');
    
    for (const [serviceId, data] of Object.entries(services)) {
      try {
        const service = JSON.parse(data);
        scheduledServices.set(serviceId, service);
      } catch (error) {
        logger.error('Failed to parse service data', error, { serviceId });
      }
    }
    
    // Also load from services:* keys if scheduler:services is empty
    if (scheduledServices.size === 0) {
      const serviceKeys = await redis.keys('services:*');
      
      for (const key of serviceKeys) {
        const servicesData = await redis.get(key);
        if (servicesData) {
          const services = JSON.parse(servicesData);
          for (const service of services) {
            if (service.isActive) {
              await addService(service);
            }
          }
        }
      }
    }
    
    logger.info(`✅ Loaded ${scheduledServices.size} services`);
  } catch (error) {
    logger.error('Failed to load services', error);
  }
}

// Add or update service
async function addService(service: any) {
  const existingService = scheduledServices.get(service.id);
  
  const scheduledService: ScheduledService = {
    id: service.id,
    nestId: service.nestId,
    name: service.name,
    type: service.type,
    target: service.target,
    config: service.config,
    interval: service.interval,
    monitoring: service.monitoring,
    nextCheck: Date.now() + 1000, // Start checking in 1 second
    stats: existingService?.stats || {
      checksScheduled: 0,
      checksCompleted: 0,
      checksFailed: 0,
    },
    enabled: service.isActive !== false,
    priority: service.priority || 'normal',
  };
  
  scheduledServices.set(service.id, scheduledService);
  await redis.hset('scheduler:services', service.id, JSON.stringify(scheduledService));
  
  logger.info('➕ Added service to scheduler', { 
    serviceId: service.id, 
    name: service.name,
    interval: service.interval,
    priority: scheduledService.priority
  });
}

// Remove service
async function removeService(serviceId: string) {
  scheduledServices.delete(serviceId);
  await redis.hdel('scheduler:services', serviceId);
  
  logger.info('➖ Removed service from scheduler', { serviceId });
}

// Listen for commands from admin API
async function listenForCommands() {
  if (!rabbitmqChannel) return;
  
  // Create queue for scheduler
  const q = await rabbitmqChannel.assertQueue('scheduler_commands', { durable: true });
  
  // Bind to relevant routing keys
  await rabbitmqChannel.bindQueue(q.queue, 'worker_commands', 'monitor_service');
  await rabbitmqChannel.bindQueue(q.queue, 'worker_commands', 'stop_monitoring');
  
  await rabbitmqChannel.consume(q.queue, async (msg) => {
    if (!msg) return;
    
    try {
      const message = JSON.parse(msg.content.toString());
      logger.info('📨 Received command', { command: message.command });
      
      switch (message.command) {
        case 'monitor_service':
          await addService(message.data);
          break;
          
        case 'stop_monitoring':
          await removeService(message.data.serviceId);
          break;
      }
      
      rabbitmqChannel!.ack(msg);
    } catch (error) {
      logger.error('Failed to process command', error);
      rabbitmqChannel!.nack(msg, false, false);
    }
  });
  
  logger.info('👂 Listening for commands');
}

// Listen for check results from workers
async function listenForResults() {
  if (!rabbitmqChannel) return;
  
  // Create queue for results
  const q = await rabbitmqChannel.assertQueue('scheduler_results', { durable: true });
  
  // Create exchange for results if not exists
  await rabbitmqChannel.assertExchange('monitoring_results', 'direct');
  await rabbitmqChannel.bindQueue(q.queue, 'monitoring_results', 'check_completed');
  
  await rabbitmqChannel.consume(q.queue, async (msg) => {
    if (!msg) return;
    
    try {
      const result = JSON.parse(msg.content.toString());
      
      // Cache the result if cache key provided
      if (result.cacheKey) {
        await redis.setex(
          `check:cache:${result.cacheKey}`,
          CHECK_CACHE_TTL / 1000, // TTL in seconds
          JSON.stringify({
            status: result.status,
            responseTime: result.responseTime,
            timestamp: result.timestamp,
          })
        );
        
        // Find all services monitoring this URL
        const cacheKey = result.cacheKey;
        for (const [serviceId, service] of scheduledServices) {
          if (getCacheKey(service) === cacheKey) {
            await updateServiceStats(service, result);
          }
        }
      } else {
        // Single service update (backward compatibility)
        const service = scheduledServices.get(result.serviceId);
        if (service) {
          await updateServiceStats(service, result);
        }
      }
      
      rabbitmqChannel!.ack(msg);
    } catch (error) {
      logger.error('Failed to process result', error);
      rabbitmqChannel!.nack(msg, false, false);
    }
  });
  
  logger.info('👂 Listening for check results');
}

// Update service statistics
async function updateServiceStats(service: ScheduledService, result: any) {
  // Update statistics
  service.stats.checksCompleted++;
  globalStats.totalChecksCompleted++;
  
  if (result.status === 'up') {
    service.stats.lastSuccess = Date.now();
    if (result.responseTime) {
      // Update average response time
      const currentAvg = service.stats.averageResponseTime || 0;
      const totalChecks = service.stats.checksCompleted;
      service.stats.averageResponseTime = 
        (currentAvg * (totalChecks - 1) + result.responseTime) / totalChecks;
    }
  } else {
    service.stats.lastFailure = Date.now();
    service.stats.checksFailed++;
    globalStats.totalChecksFailed++;
  }
  
  // Calculate uptime
  const total = service.stats.checksCompleted;
  const successful = total - service.stats.checksFailed;
  service.stats.uptime = (successful / total) * 100;
  
  // Update in Redis
  await redis.hset('scheduler:services', service.id, JSON.stringify(service));
  await updateGlobalStats();
  
  logger.debug('📊 Updated stats for service', { 
    serviceId: service.id,
    status: result.status,
    uptime: service.stats.uptime.toFixed(2) + '%'
  });
}

// Start scheduler
async function start() {
  try {
    logger.info('🚀 Starting monitoring scheduler...');
    
    // Connect to services
    await connectToRedis();
    await connectToRabbitMQ();
    
    // Load existing services
    await loadServices();
    
    // Start listening for commands
    await listenForCommands();
    
    // Start listening for results
    await listenForResults();
    
    // Start heartbeat listener
    await startHeartbeatListener(rabbitmqChannel!);
    
    // Start scheduler loop
    schedulerInterval = setInterval(schedulerLoop, config.checkInterval);
    
    // Log stats every minute
    setInterval(async () => {
      const stats = await redis.hget('scheduler:stats', 'global');
      if (stats) {
        const globalData = JSON.parse(stats);
        logger.info('📊 Scheduler statistics', {
          totalScheduled: globalData.totalChecksScheduled,
          totalCompleted: globalData.totalChecksCompleted,
          totalFailed: globalData.totalChecksFailed,
          successRate: ((globalData.totalChecksCompleted - globalData.totalChecksFailed) / 
                       globalData.totalChecksCompleted * 100).toFixed(2) + '%',
          servicesManaged: globalData.servicesManaged,
          uptime: Math.floor(globalData.uptime / 1000 / 60) + ' minutes'
        });
      }
    }, 60000);
    
    logger.info('✅ Monitoring scheduler started');
    logger.info(`⏰ Checking services every ${config.checkInterval}ms`);
    logger.info(`📊 Managing ${scheduledServices.size} services`);
    
    // Handle graceful shutdown
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error('Failed to start scheduler', error);
    process.exit(1);
  }
}

// Shutdown
async function shutdown() {
  logger.info('🛑 Shutting down scheduler...');
  
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }
  
  if (rabbitmqConnection) {
    await rabbitmqConnection.close();
  }
  
  if (redis) {
    redis.disconnect();
  }
  
  process.exit(0);
}

// Start the scheduler
start().catch((error) => {
  logger.error('Scheduler startup failed', error);
  process.exit(1);
});