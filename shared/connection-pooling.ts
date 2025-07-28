/**
 * Advanced connection pooling system for GuardAnt services
 * Provides optimized connection management for Redis, databases, and external APIs
 */

import { createLogger } from './logger';
import { NetworkError, ErrorCategory, ErrorSeverity } from './error-handling';
import type { GuardAntTracing } from './tracing';
import { createCircuitBreakerManager, CircuitBreakerConfigs } from './circuit-breaker';

export interface ConnectionPoolConfig {
  name: string;
  minConnections: number;
  maxConnections: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
  maxLifetimeMs: number;
  validateConnection: boolean;
  validateOnBorrow: boolean;
  validateOnReturn: boolean;
  testQuery?: string;
  reconnectOnFailure: boolean;
  maxReconnectAttempts: number;
  reconnectDelayMs: number;
  healthCheckIntervalMs: number;
  enableMetrics: boolean;
}

export interface ConnectionPoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  pendingRequests: number;
  totalAcquired: number;
  totalReleased: number;
  totalCreated: number;
  totalDestroyed: number;
  totalErrors: number;
  averageAcquireTime: number;
  averageConnectionLifetime: number;
}

export interface PooledConnection<T = any> {
  id: string;
  connection: T;
  createdAt: number;
  lastUsedAt: number;
  activeTime: number;
  useCount: number;
  isHealthy: boolean;
}

export interface ConnectionFactory<T> {
  create(): Promise<T>;
  validate(connection: T): Promise<boolean>;
  destroy(connection: T): Promise<void>;
  reset?(connection: T): Promise<void>;
}

// Predefined connection pool configurations
export const ConnectionPoolConfigs = {
  // Redis connection pool (high-performance caching)
  REDIS: {
    name: 'redis',
    minConnections: 2,
    maxConnections: 20,
    acquireTimeoutMs: 5000,
    idleTimeoutMs: 300000, // 5 minutes
    maxLifetimeMs: 1800000, // 30 minutes
    validateConnection: true,
    validateOnBorrow: true,
    validateOnReturn: false,
    testQuery: 'PING',
    reconnectOnFailure: true,
    maxReconnectAttempts: 5,
    reconnectDelayMs: 1000,
    healthCheckIntervalMs: 30000,
    enableMetrics: true
  },

  // Database connection pool (persistent storage)
  DATABASE: {
    name: 'database',
    minConnections: 1,
    maxConnections: 10,
    acquireTimeoutMs: 10000,
    idleTimeoutMs: 600000, // 10 minutes
    maxLifetimeMs: 3600000, // 1 hour
    validateConnection: true,
    validateOnBorrow: true,
    validateOnReturn: true,
    testQuery: 'SELECT 1',
    reconnectOnFailure: true,
    maxReconnectAttempts: 3,
    reconnectDelayMs: 2000,
    healthCheckIntervalMs: 60000,
    enableMetrics: true
  },

  // RabbitMQ connection pool (message queuing)
  RABBITMQ: {
    name: 'rabbitmq',
    minConnections: 1,
    maxConnections: 5,
    acquireTimeoutMs: 15000,
    idleTimeoutMs: 900000, // 15 minutes
    maxLifetimeMs: 7200000, // 2 hours
    validateConnection: true,
    validateOnBorrow: true,
    validateOnReturn: false,
    reconnectOnFailure: true,
    maxReconnectAttempts: 10,
    reconnectDelayMs: 5000,
    healthCheckIntervalMs: 45000,
    enableMetrics: true
  },

  // HTTP client pool (external APIs)
  HTTP_CLIENT: {
    name: 'http_client',
    minConnections: 0,
    maxConnections: 50,
    acquireTimeoutMs: 3000,
    idleTimeoutMs: 120000, // 2 minutes
    maxLifetimeMs: 600000, // 10 minutes
    validateConnection: false,
    validateOnBorrow: false,
    validateOnReturn: false,
    reconnectOnFailure: false,
    maxReconnectAttempts: 0,
    reconnectDelayMs: 0,
    healthCheckIntervalMs: 0,
    enableMetrics: true
  },

  // Ethereum RPC pool (blockchain interactions)
  ETHEREUM_RPC: {
    name: 'ethereum_rpc',
    minConnections: 1,
    maxConnections: 8,
    acquireTimeoutMs: 30000,
    idleTimeoutMs: 300000, // 5 minutes
    maxLifetimeMs: 1800000, // 30 minutes
    validateConnection: true,
    validateOnBorrow: true,
    validateOnReturn: false,
    testQuery: '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}',
    reconnectOnFailure: true,
    maxReconnectAttempts: 5,
    reconnectDelayMs: 3000,
    healthCheckIntervalMs: 60000,
    enableMetrics: true
  },

  // Golem Base L3 pool (decentralized storage)
  GOLEM_L3: {
    name: 'golem_l3',
    minConnections: 1,
    maxConnections: 3,
    acquireTimeoutMs: 60000,
    idleTimeoutMs: 600000, // 10 minutes
    maxLifetimeMs: 3600000, // 1 hour
    validateConnection: true,
    validateOnBorrow: true,
    validateOnReturn: false,
    reconnectOnFailure: true,
    maxReconnectAttempts: 3,
    reconnectDelayMs: 10000,
    healthCheckIntervalMs: 120000,
    enableMetrics: true
  }
};

export class ConnectionPool<T> {
  private logger;
  private tracing?: GuardAntTracing;
  private circuitBreaker;
  
  private connections = new Map<string, PooledConnection<T>>();
  private availableConnections: string[] = [];
  private waitingRequests: Array<{
    resolve: (connection: PooledConnection<T>) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  
  private metrics: ConnectionPoolMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    pendingRequests: 0,
    totalAcquired: 0,
    totalReleased: 0,
    totalCreated: 0,
    totalDestroyed: 0,
    totalErrors: 0,
    averageAcquireTime: 0,
    averageConnectionLifetime: 0
  };
  
  private acquireTimes: number[] = [];
  private connectionLifetimes: number[] = [];
  private healthCheckInterval?: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(
    private factory: ConnectionFactory<T>,
    private config: ConnectionPoolConfig,
    private serviceName: string,
    tracing?: GuardAntTracing
  ) {
    this.logger = createLogger(`${serviceName}-connection-pool-${config.name}`);
    this.tracing = tracing;
    this.circuitBreaker = createCircuitBreakerManager(serviceName, tracing);
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    this.logger.info('Initializing connection pool', {
      name: this.config.name,
      minConnections: this.config.minConnections,
      maxConnections: this.config.maxConnections
    });

    // Create minimum connections
    for (let i = 0; i < this.config.minConnections; i++) {
      try {
        await this.createConnection();
      } catch (error) {
        this.logger.warn(`Failed to create initial connection ${i + 1}`, error as Error);
      }
    }

    // Start health check if enabled
    if (this.config.healthCheckIntervalMs > 0) {
      this.startHealthCheck();
    }

    this.logger.info('Connection pool initialized', {
      name: this.config.name,
      initialConnections: this.connections.size
    });
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async createConnection(): Promise<PooledConnection<T>> {
    const connectionId = this.generateConnectionId();
    const startTime = Date.now();

    try {
      const connection = await this.circuitBreaker.execute(
        this.config.name,
        () => this.factory.create(),
        CircuitBreakerConfigs.DATABASE
      );

      const pooledConnection: PooledConnection<T> = {
        id: connectionId,
        connection,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        activeTime: 0,
        useCount: 0,
        isHealthy: true
      };

      this.connections.set(connectionId, pooledConnection);
      this.availableConnections.push(connectionId);
      
      this.metrics.totalConnections++;
      this.metrics.idleConnections++;
      this.metrics.totalCreated++;

      const duration = Date.now() - startTime;
      this.logger.debug('Connection created', {
        connectionId,
        duration,
        totalConnections: this.connections.size
      });

      if (this.tracing) {
        this.tracing.addEvent('connection_created', {
          'pool.name': this.config.name,
          'connection.id': connectionId,
          'pool.total_connections': this.connections.size.toString(),
          'connection.creation_time_ms': duration.toString()
        });
      }

      return pooledConnection;

    } catch (error) {
      this.metrics.totalErrors++;
      this.logger.error('Failed to create connection', error as Error, { connectionId });
      throw new NetworkError(`Failed to create connection for pool ${this.config.name}`, {
        service: this.serviceName,
        operation: 'connection_creation'
      });
    }
  }

  private async destroyConnection(connectionId: string): Promise<void> {
    const pooledConnection = this.connections.get(connectionId);
    if (!pooledConnection) return;

    try {
      await this.factory.destroy(pooledConnection.connection);
      
      this.connections.delete(connectionId);
      const availableIndex = this.availableConnections.indexOf(connectionId);
      if (availableIndex > -1) {
        this.availableConnections.splice(availableIndex, 1);
        this.metrics.idleConnections--;
      } else {
        this.metrics.activeConnections--;
      }
      
      this.metrics.totalConnections--;
      this.metrics.totalDestroyed++;

      // Track connection lifetime
      const lifetime = Date.now() - pooledConnection.createdAt;
      this.connectionLifetimes.push(lifetime);
      if (this.connectionLifetimes.length > 100) {
        this.connectionLifetimes.shift();
      }
      this.metrics.averageConnectionLifetime = 
        this.connectionLifetimes.reduce((a, b) => a + b, 0) / this.connectionLifetimes.length;

      this.logger.debug('Connection destroyed', {
        connectionId,
        lifetime,
        useCount: pooledConnection.useCount,
        totalConnections: this.connections.size
      });

    } catch (error) {
      this.logger.error('Failed to destroy connection', error as Error, { connectionId });
    }
  }

  private async validateConnection(pooledConnection: PooledConnection<T>): Promise<boolean> {
    if (!this.config.validateConnection) return true;

    try {
      const isValid = await this.factory.validate(pooledConnection.connection);
      pooledConnection.isHealthy = isValid;
      return isValid;
    } catch (error) {
      this.logger.warn('Connection validation failed', error as Error, {
        connectionId: pooledConnection.id
      });
      pooledConnection.isHealthy = false;
      return false;
    }
  }

  private isConnectionExpired(pooledConnection: PooledConnection<T>): boolean {
    const now = Date.now();
    const age = now - pooledConnection.createdAt;
    const idle = now - pooledConnection.lastUsedAt;
    
    return age > this.config.maxLifetimeMs || idle > this.config.idleTimeoutMs;
  }

  private async processWaitingRequests(): Promise<void> {
    while (this.waitingRequests.length > 0 && this.availableConnections.length > 0) {
      const request = this.waitingRequests.shift()!;
      const connectionId = this.availableConnections.shift()!;
      const pooledConnection = this.connections.get(connectionId);

      if (pooledConnection) {
        // Validate connection if required
        if (this.config.validateOnBorrow) {
          const isValid = await this.validateConnection(pooledConnection);
          if (!isValid) {
            await this.destroyConnection(connectionId);
            // Try to create a new connection
            try {
              const newConnection = await this.createConnection();
              this.availableConnections.push(newConnection.id);
            } catch (error) {
              request.reject(error as Error);
            }
            continue;
          }
        }

        pooledConnection.lastUsedAt = Date.now();
        pooledConnection.useCount++;
        this.metrics.activeConnections++;
        this.metrics.idleConnections--;
        this.metrics.totalAcquired++;

        const acquireTime = Date.now() - request.timestamp;
        this.acquireTimes.push(acquireTime);
        if (this.acquireTimes.length > 100) {
          this.acquireTimes.shift();
        }
        this.metrics.averageAcquireTime = 
          this.acquireTimes.reduce((a, b) => a + b, 0) / this.acquireTimes.length;

        request.resolve(pooledConnection);
      } else {
        request.reject(new Error('Connection not found in pool'));
      }
    }

    this.metrics.pendingRequests = this.waitingRequests.length;
  }

  async acquire(): Promise<PooledConnection<T>> {
    if (this.isShuttingDown) {
      throw new Error('Connection pool is shutting down');
    }

    const startTime = Date.now();

    return new Promise<PooledConnection<T>>(async (resolve, reject) => {
      // Check if we have available connections
      if (this.availableConnections.length > 0) {
        const connectionId = this.availableConnections.shift()!;
        const pooledConnection = this.connections.get(connectionId);

        if (pooledConnection) {
          // Check if connection is expired
          if (this.isConnectionExpired(pooledConnection)) {
            await this.destroyConnection(connectionId);
            // Fall through to create new connection or wait
          } else {
            // Validate connection if required
            if (this.config.validateOnBorrow) {
              const isValid = await this.validateConnection(pooledConnection);
              if (!isValid) {
                await this.destroyConnection(connectionId);
                // Fall through to create new connection or wait
              } else {
                pooledConnection.lastUsedAt = Date.now();
                pooledConnection.useCount++;
                this.metrics.activeConnections++;
                this.metrics.idleConnections--;
                this.metrics.totalAcquired++;

                const acquireTime = Date.now() - startTime;
                this.acquireTimes.push(acquireTime);
                if (this.acquireTimes.length > 100) {
                  this.acquireTimes.shift();
                }
                this.metrics.averageAcquireTime = 
                  this.acquireTimes.reduce((a, b) => a + b, 0) / this.acquireTimes.length;

                return resolve(pooledConnection);
              }
            } else {
              pooledConnection.lastUsedAt = Date.now();
              pooledConnection.useCount++;
              this.metrics.activeConnections++;
              this.metrics.idleConnections--;
              this.metrics.totalAcquired++;

              const acquireTime = Date.now() - startTime;
              this.acquireTimes.push(acquireTime);
              if (this.acquireTimes.length > 100) {
                this.acquireTimes.shift();
              }
              this.metrics.averageAcquireTime = 
                this.acquireTimes.reduce((a, b) => a + b, 0) / this.acquireTimes.length;

              return resolve(pooledConnection);
            }
          }
        }
      }

      // Try to create new connection if we haven't reached the limit
      if (this.connections.size < this.config.maxConnections) {
        try {
          const newConnection = await this.createConnection();
          newConnection.lastUsedAt = Date.now();
          newConnection.useCount++;
          
          // Remove from available connections
          const index = this.availableConnections.indexOf(newConnection.id);
          if (index > -1) {
            this.availableConnections.splice(index, 1);
          }
          
          this.metrics.activeConnections++;
          this.metrics.idleConnections--;
          this.metrics.totalAcquired++;

          const acquireTime = Date.now() - startTime;
          this.acquireTimes.push(acquireTime);
          if (this.acquireTimes.length > 100) {
            this.acquireTimes.shift();
          }
          this.metrics.averageAcquireTime = 
            this.acquireTimes.reduce((a, b) => a + b, 0) / this.acquireTimes.length;

          return resolve(newConnection);
        } catch (error) {
          return reject(error);
        }
      }

      // Add to waiting queue with timeout
      const request = { resolve, reject, timestamp: Date.now() };
      this.waitingRequests.push(request);
      this.metrics.pendingRequests = this.waitingRequests.length;

      // Set timeout
      setTimeout(() => {
        const index = this.waitingRequests.indexOf(request);
        if (index > -1) {
          this.waitingRequests.splice(index, 1);
          this.metrics.pendingRequests = this.waitingRequests.length;
          reject(new Error(`Connection acquire timeout after ${this.config.acquireTimeoutMs}ms`));
        }
      }, this.config.acquireTimeoutMs);
    });
  }

  async release(pooledConnection: PooledConnection<T>): Promise<void> {
    const connectionId = pooledConnection.id;
    
    if (!this.connections.has(connectionId)) {
      this.logger.warn('Attempting to release unknown connection', { connectionId });
      return;
    }

    try {
      // Validate connection on return if configured
      if (this.config.validateOnReturn) {
        const isValid = await this.validateConnection(pooledConnection);
        if (!isValid) {
          await this.destroyConnection(connectionId);
          return;
        }
      }

      // Reset connection if factory supports it
      if (this.factory.reset) {
        await this.factory.reset(pooledConnection.connection);
      }

      // Check if connection should be retired
      if (this.isConnectionExpired(pooledConnection)) {
        await this.destroyConnection(connectionId);
        
        // Create replacement if we're below minimum
        if (this.connections.size < this.config.minConnections) {
          try {
            await this.createConnection();
          } catch (error) {
            this.logger.warn('Failed to create replacement connection', error as Error);
          }
        }
        return;
      }

      // Return to available pool
      this.availableConnections.push(connectionId);
      this.metrics.activeConnections--;
      this.metrics.idleConnections++;
      this.metrics.totalReleased++;

      this.logger.debug('Connection released', {
        connectionId,
        useCount: pooledConnection.useCount,
        availableConnections: this.availableConnections.length
      });

      // Process waiting requests
      await this.processWaitingRequests();

    } catch (error) {
      this.logger.error('Error releasing connection', error as Error, { connectionId });
      await this.destroyConnection(connectionId);
    }
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      if (this.isShuttingDown) return;

      this.logger.debug('Running connection pool health check', {
        totalConnections: this.connections.size,
        availableConnections: this.availableConnections.length
      });

      // Check available connections
      const connectionsToDestroy: string[] = [];
      
      for (const connectionId of this.availableConnections) {
        const pooledConnection = this.connections.get(connectionId);
        if (pooledConnection) {
          if (this.isConnectionExpired(pooledConnection)) {
            connectionsToDestroy.push(connectionId);
          } else if (this.config.validateConnection) {
            const isValid = await this.validateConnection(pooledConnection);
            if (!isValid) {
              connectionsToDestroy.push(connectionId);
            }
          }
        }
      }

      // Destroy unhealthy/expired connections
      for (const connectionId of connectionsToDestroy) {
        await this.destroyConnection(connectionId);
      }

      // Ensure we have minimum connections
      while (this.connections.size < this.config.minConnections) {
        try {
          await this.createConnection();
        } catch (error) {
          this.logger.warn('Failed to create connection during health check', error as Error);
          break;
        }
      }

    }, this.config.healthCheckIntervalMs);
  }

  getMetrics(): ConnectionPoolMetrics {
    return { ...this.metrics };
  }

  getHealth(): { healthy: boolean; details: any } {
    const totalConnections = this.connections.size;
    const healthyConnections = Array.from(this.connections.values())
      .filter(conn => conn.isHealthy).length;
    
    return {
      healthy: totalConnections > 0 && healthyConnections >= this.config.minConnections,
      details: {
        name: this.config.name,
        totalConnections,
        healthyConnections,
        availableConnections: this.availableConnections.length,
        activeConnections: this.metrics.activeConnections,
        pendingRequests: this.metrics.pendingRequests,
        averageAcquireTime: this.metrics.averageAcquireTime,
        totalErrors: this.metrics.totalErrors
      }
    };
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    this.logger.info('Shutting down connection pool', {
      name: this.config.name,
      connections: this.connections.size
    });

    // Stop health check
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Reject all waiting requests
    for (const request of this.waitingRequests) {
      request.reject(new Error('Connection pool is shutting down'));
    }
    this.waitingRequests.length = 0;

    // Destroy all connections
    const connectionIds = Array.from(this.connections.keys());
    for (const connectionId of connectionIds) {
      await this.destroyConnection(connectionId);
    }

    this.logger.info('Connection pool shutdown completed', {
      name: this.config.name
    });
  }
}

// Specialized connection factories
export class RedisConnectionFactory implements ConnectionFactory<any> {
  constructor(private connectionString: string) {}

  async create(): Promise<any> {
    // This would use ioredis or similar
    const Redis = require('ioredis');
    const redis = new Redis(this.connectionString);
    await redis.ping();
    return redis;
  }

  async validate(connection: any): Promise<boolean> {
    try {
      await connection.ping();
      return true;
    } catch {
      return false;
    }
  }

  async destroy(connection: any): Promise<void> {
    await connection.quit();
  }

  async reset(connection: any): Promise<void> {
    // Redis connections don't need reset
  }
}

export class HttpConnectionFactory implements ConnectionFactory<any> {
  constructor(private baseUrl: string, private options: any = {}) {}

  async create(): Promise<any> {
    // This would create an HTTP client (axios, fetch, etc.)
    return {
      baseUrl: this.baseUrl,
      options: this.options,
      createdAt: Date.now()
    };
  }

  async validate(connection: any): Promise<boolean> {
    // HTTP connections are stateless, always valid
    return true;
  }

  async destroy(connection: any): Promise<void> {
    // Nothing to destroy for HTTP connections
  }
}

// Connection pool manager
export class ConnectionPoolManager {
  private pools = new Map<string, ConnectionPool<any>>();
  private logger;

  constructor(private serviceName: string, private tracing?: GuardAntTracing) {
    this.logger = createLogger(`${serviceName}-connection-pool-manager`);
  }

  createPool<T>(
    name: string,
    factory: ConnectionFactory<T>,
    config: ConnectionPoolConfig
  ): ConnectionPool<T> {
    if (this.pools.has(name)) {
      throw new Error(`Connection pool '${name}' already exists`);
    }

    const pool = new ConnectionPool(factory, config, this.serviceName, this.tracing);
    this.pools.set(name, pool);

    this.logger.info('Connection pool created', { name, config });
    return pool;
  }

  getPool<T>(name: string): ConnectionPool<T> | undefined {
    return this.pools.get(name) as ConnectionPool<T> | undefined;
  }

  getAllMetrics(): Record<string, ConnectionPoolMetrics> {
    const metrics: Record<string, ConnectionPoolMetrics> = {};
    for (const [name, pool] of this.pools) {
      metrics[name] = pool.getMetrics();
    }
    return metrics;
  }

  getOverallHealth(): { healthy: boolean; pools: Record<string, any> } {
    const poolHealths: Record<string, any> = {};
    let overallHealthy = true;

    for (const [name, pool] of this.pools) {
      const health = pool.getHealth();
      poolHealths[name] = health;
      if (!health.healthy) {
        overallHealthy = false;
      }
    }

    return {
      healthy: overallHealthy,
      pools: poolHealths
    };
  }

  async shutdownAll(): Promise<void> {
    this.logger.info('Shutting down all connection pools', {
      totalPools: this.pools.size
    });

    const shutdownPromises = Array.from(this.pools.values()).map(pool => pool.shutdown());
    await Promise.all(shutdownPromises);
    
    this.pools.clear();
    this.logger.info('All connection pools shut down');
  }
}

// Factory functions
export function createConnectionPool<T>(
  factory: ConnectionFactory<T>,
  config: ConnectionPoolConfig,
  serviceName: string,
  tracing?: GuardAntTracing
): ConnectionPool<T> {
  return new ConnectionPool(factory, config, serviceName, tracing);
}

export function createConnectionPoolManager(
  serviceName: string,
  tracing?: GuardAntTracing
): ConnectionPoolManager {
  return new ConnectionPoolManager(serviceName, tracing);
}

export function createRedisConnectionFactory(connectionString: string): RedisConnectionFactory {
  return new RedisConnectionFactory(connectionString);
}

export function createHttpConnectionFactory(baseUrl: string, options?: any): HttpConnectionFactory {
  return new HttpConnectionFactory(baseUrl, options);
}

export { ConnectionPoolConfigs };