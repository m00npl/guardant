import Redis from 'ioredis';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Important for BullMQ compatibility
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  lazyConnect: true,
};

// Main Redis connection for data access
export const redis = new Redis(redisConfig);

// Separate connection for pub/sub (recommended by ioredis)
export const redisPubSub = new Redis(redisConfig);

// Redis key generators
export const keys = {
  // Service status keys
  serviceStatus: (nestId: string, serviceId: string) => `status:${nestId}:${serviceId}`,
  nestServices: (nestId: string) => `status:${nestId}:*`,
  
  // Nest data
  nest: (nestId: string) => `nest:${nestId}`,
  nestBySubdomain: (subdomain: string) => `nest:subdomain:${subdomain}`,
  
  // Metrics
  metrics: (nestId: string, serviceId: string, period: string) => `metrics:${nestId}:${serviceId}:${period}:*`,
  
  // Incidents
  incidents: (nestId: string) => `incidents:${nestId}:*`,
  activeIncidents: (nestId: string) => `incidents:active:${nestId}`,
  
  // Maintenance
  maintenance: (nestId: string) => `maintenance:${nestId}:*`,
  
  // Regional data
  regionStatus: (nestId: string, serviceId: string, regionId: string) => `region:${nestId}:${serviceId}:${regionId}`,
  
  // SSE connections tracking
  sseConnections: (nestId: string) => `sse:${nestId}`,
};

// Utility functions
export class RedisService {
  /**
   * Get nest data by subdomain
   */
  async getNestBySubdomain(subdomain: string): Promise<any | null> {
    try {
      const nestId = await redis.get(keys.nestBySubdomain(subdomain));
      if (!nestId) return null;
      
      const nestData = await redis.get(keys.nest(nestId));
      return nestData ? JSON.parse(nestData) : null;
    } catch (error) {
      console.error('Error getting nest by subdomain:', error);
      return null;
    }
  }

  /**
   * Get service status data
   */
  async getServiceStatus(nestId: string, serviceId: string): Promise<any | null> {
    try {
      const statusData = await redis.get(keys.serviceStatus(nestId, serviceId));
      return statusData ? JSON.parse(statusData) : null;
    } catch (error) {
      console.error('Error getting service status:', error);
      return null;
    }
  }

  /**
   * Get all services for a nest
   */
  async getAllServiceStatuses(nestId: string): Promise<any[]> {
    try {
      const pattern = keys.nestServices(nestId);
      const serviceKeys = await redis.keys(pattern);
      
      if (serviceKeys.length === 0) return [];
      
      const pipeline = redis.pipeline();
      serviceKeys.forEach(key => pipeline.get(key));
      
      const results = await pipeline.exec();
      
      return results
        ?.map(([err, data]) => {
          if (err || !data) return null;
          try {
            return JSON.parse(data as string);
          } catch {
            return null;
          }
        })
        .filter(Boolean) || [];
    } catch (error) {
      console.error('Error getting all service statuses:', error);
      return [];
    }
  }

  /**
   * Get incidents for a nest
   */
  async getIncidents(nestId: string, limit: number = 50): Promise<any[]> {
    try {
      const pattern = keys.incidents(nestId);
      const incidentKeys = await redis.keys(pattern);
      
      if (incidentKeys.length === 0) return [];
      
      const pipeline = redis.pipeline();
      incidentKeys.forEach(key => pipeline.get(key));
      
      const results = await pipeline.exec();
      
      const incidents = results
        ?.map(([err, data]) => {
          if (err || !data) return null;
          try {
            return JSON.parse(data as string);
          } catch {
            return null;
          }
        })
        .filter(Boolean) || [];
      
      // Sort by startedAt descending and limit
      return incidents
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting incidents:', error);
      return [];
    }
  }

  /**
   * Get maintenance windows for a nest
   */
  async getMaintenanceWindows(nestId: string): Promise<any[]> {
    try {
      const pattern = keys.maintenance(nestId);
      const maintenanceKeys = await redis.keys(pattern);
      
      if (maintenanceKeys.length === 0) return [];
      
      const pipeline = redis.pipeline();
      maintenanceKeys.forEach(key => pipeline.get(key));
      
      const results = await pipeline.exec();
      
      const maintenanceWindows = results
        ?.map(([err, data]) => {
          if (err || !data) return null;
          try {
            return JSON.parse(data as string);
          } catch {
            return null;
          }
        })
        .filter(Boolean) || [];
      
      // Sort by scheduledStart descending
      return maintenanceWindows.sort((a, b) => b.scheduledStart - a.scheduledStart);
    } catch (error) {
      console.error('Error getting maintenance windows:', error);
      return [];
    }
  }

  /**
   * Publish SSE update
   */
  async publishSSEUpdate(nestId: string, data: any): Promise<void> {
    try {
      await redisPubSub.publish(`sse:${nestId}`, JSON.stringify({
        type: 'update',
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Error publishing SSE update:', error);
    }
  }

  /**
   * Subscribe to SSE updates for a nest
   */
  subscribeToSSEUpdates(nestId: string, callback: (data: any) => void): () => void {
    const channel = `sse:${nestId}`;
    
    redisPubSub.subscribe(channel);
    redisPubSub.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const data = JSON.parse(message);
          callback(data);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      }
    });

    // Return unsubscribe function
    return () => {
      redisPubSub.unsubscribe(channel);
    };
  }
}

// Export singleton instance
export const redisService = new RedisService();

// Handle Redis connection events
redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redisPubSub.on('connect', () => {
  console.log('✅ Redis pub/sub connected');
});

redisPubSub.on('error', (error) => {
  console.error('❌ Redis pub/sub error:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📛 Closing Redis connections...');
  await redis.disconnect();
  await redisPubSub.disconnect();
});