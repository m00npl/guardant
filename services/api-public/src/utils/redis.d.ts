import Redis from 'ioredis';
export declare const redis: Redis;
export declare const redisPubSub: Redis;
export declare const keys: {
    serviceStatus: (nestId: string, serviceId: string) => string;
    nestServices: (nestId: string) => string;
    nest: (nestId: string) => string;
    nestBySubdomain: (subdomain: string) => string;
    metrics: (nestId: string, serviceId: string, period: string) => string;
    incidents: (nestId: string) => string;
    activeIncidents: (nestId: string) => string;
    maintenance: (nestId: string) => string;
    regionStatus: (nestId: string, serviceId: string, regionId: string) => string;
    sseConnections: (nestId: string) => string;
};
export declare class RedisService {
    /**
     * Get nest data by subdomain
     */
    getNestBySubdomain(subdomain: string): Promise<any | null>;
    /**
     * Get service status data
     */
    getServiceStatus(nestId: string, serviceId: string): Promise<any | null>;
    /**
     * Get all services for a nest
     */
    getAllServiceStatuses(nestId: string): Promise<any[]>;
    /**
     * Get incidents for a nest
     */
    getIncidents(nestId: string, limit?: number): Promise<any[]>;
    /**
     * Get maintenance windows for a nest
     */
    getMaintenanceWindows(nestId: string): Promise<any[]>;
    /**
     * Publish SSE update
     */
    publishSSEUpdate(nestId: string, data: any): Promise<void>;
    /**
     * Subscribe to SSE updates for a nest
     */
    subscribeToSSEUpdates(nestId: string, callback: (data: any) => void): () => void;
}
export declare const redisService: RedisService;
//# sourceMappingURL=redis.d.ts.map