"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisService = exports.RedisService = exports.keys = exports.redisPubSub = exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
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
exports.redis = new ioredis_1.default(redisConfig);
// Separate connection for pub/sub (recommended by ioredis)
exports.redisPubSub = new ioredis_1.default(redisConfig);
// Redis key generators
exports.keys = {
    // Service status keys
    serviceStatus: (nestId, serviceId) => `status:${nestId}:${serviceId}`,
    nestServices: (nestId) => `status:${nestId}:*`,
    // Nest data
    nest: (nestId) => `nest:${nestId}`,
    nestBySubdomain: (subdomain) => `nest:subdomain:${subdomain}`,
    // Metrics
    metrics: (nestId, serviceId, period) => `metrics:${nestId}:${serviceId}:${period}:*`,
    // Incidents
    incidents: (nestId) => `incidents:${nestId}:*`,
    activeIncidents: (nestId) => `incidents:active:${nestId}`,
    // Maintenance
    maintenance: (nestId) => `maintenance:${nestId}:*`,
    // Regional data
    regionStatus: (nestId, serviceId, regionId) => `region:${nestId}:${serviceId}:${regionId}`,
    // SSE connections tracking
    sseConnections: (nestId) => `sse:${nestId}`,
};
// Utility functions
class RedisService {
    /**
     * Get nest data by subdomain
     */
    async getNestBySubdomain(subdomain) {
        try {
            const nestId = await exports.redis.get(exports.keys.nestBySubdomain(subdomain));
            if (!nestId)
                return null;
            const nestData = await exports.redis.get(exports.keys.nest(nestId));
            return nestData ? JSON.parse(nestData) : null;
        }
        catch (error) {
            console.error('Error getting nest by subdomain:', error);
            return null;
        }
    }
    /**
     * Get service status data
     */
    async getServiceStatus(nestId, serviceId) {
        try {
            const statusData = await exports.redis.get(exports.keys.serviceStatus(nestId, serviceId));
            return statusData ? JSON.parse(statusData) : null;
        }
        catch (error) {
            console.error('Error getting service status:', error);
            return null;
        }
    }
    /**
     * Get all services for a nest
     */
    async getAllServiceStatuses(nestId) {
        try {
            const pattern = exports.keys.nestServices(nestId);
            const serviceKeys = await exports.redis.keys(pattern);
            if (serviceKeys.length === 0)
                return [];
            const pipeline = exports.redis.pipeline();
            serviceKeys.forEach(key => pipeline.get(key));
            const results = await pipeline.exec();
            return results
                ?.map(([err, data]) => {
                if (err || !data)
                    return null;
                try {
                    return JSON.parse(data);
                }
                catch {
                    return null;
                }
            })
                .filter(Boolean) || [];
        }
        catch (error) {
            console.error('Error getting all service statuses:', error);
            return [];
        }
    }
    /**
     * Get incidents for a nest
     */
    async getIncidents(nestId, limit = 50) {
        try {
            const pattern = exports.keys.incidents(nestId);
            const incidentKeys = await exports.redis.keys(pattern);
            if (incidentKeys.length === 0)
                return [];
            const pipeline = exports.redis.pipeline();
            incidentKeys.forEach(key => pipeline.get(key));
            const results = await pipeline.exec();
            const incidents = results
                ?.map(([err, data]) => {
                if (err || !data)
                    return null;
                try {
                    return JSON.parse(data);
                }
                catch {
                    return null;
                }
            })
                .filter(Boolean) || [];
            // Sort by startedAt descending and limit
            return incidents
                .sort((a, b) => b.startedAt - a.startedAt)
                .slice(0, limit);
        }
        catch (error) {
            console.error('Error getting incidents:', error);
            return [];
        }
    }
    /**
     * Get maintenance windows for a nest
     */
    async getMaintenanceWindows(nestId) {
        try {
            const pattern = exports.keys.maintenance(nestId);
            const maintenanceKeys = await exports.redis.keys(pattern);
            if (maintenanceKeys.length === 0)
                return [];
            const pipeline = exports.redis.pipeline();
            maintenanceKeys.forEach(key => pipeline.get(key));
            const results = await pipeline.exec();
            const maintenanceWindows = results
                ?.map(([err, data]) => {
                if (err || !data)
                    return null;
                try {
                    return JSON.parse(data);
                }
                catch {
                    return null;
                }
            })
                .filter(Boolean) || [];
            // Sort by scheduledStart descending
            return maintenanceWindows.sort((a, b) => b.scheduledStart - a.scheduledStart);
        }
        catch (error) {
            console.error('Error getting maintenance windows:', error);
            return [];
        }
    }
    /**
     * Publish SSE update
     */
    async publishSSEUpdate(nestId, data) {
        try {
            await exports.redisPubSub.publish(`sse:${nestId}`, JSON.stringify({
                type: 'update',
                data,
                timestamp: Date.now(),
            }));
        }
        catch (error) {
            console.error('Error publishing SSE update:', error);
        }
    }
    /**
     * Subscribe to SSE updates for a nest
     */
    subscribeToSSEUpdates(nestId, callback) {
        const channel = `sse:${nestId}`;
        exports.redisPubSub.subscribe(channel);
        exports.redisPubSub.on('message', (receivedChannel, message) => {
            if (receivedChannel === channel) {
                try {
                    const data = JSON.parse(message);
                    callback(data);
                }
                catch (error) {
                    console.error('Error parsing SSE message:', error);
                }
            }
        });
        // Return unsubscribe function
        return () => {
            exports.redisPubSub.unsubscribe(channel);
        };
    }
}
exports.RedisService = RedisService;
// Export singleton instance
exports.redisService = new RedisService();
// Handle Redis connection events
exports.redis.on('connect', () => {
    console.log('✅ Redis connected');
});
exports.redis.on('error', (error) => {
    console.error('❌ Redis connection error:', error);
});
exports.redisPubSub.on('connect', () => {
    console.log('✅ Redis pub/sub connected');
});
exports.redisPubSub.on('error', (error) => {
    console.error('❌ Redis pub/sub error:', error);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('📛 Closing Redis connections...');
    await exports.redis.disconnect();
    await exports.redisPubSub.disconnect();
});
//# sourceMappingURL=redis.js.map