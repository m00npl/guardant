interface CachedCheckResult {
    id: string;
    serviceId: string;
    nestId: string;
    timestamp: number;
    region: string;
    status: 'up' | 'down' | 'degraded';
    responseTime: number;
    statusCode?: number;
    error?: string;
    retryCount: number;
    nextRetryAt: number;
}
interface LocalCacheConfig {
    cacheDir?: string;
    maxRetries?: number;
    retryDelayMs?: number;
    maxCacheSize?: number;
    rabbitmqUrl?: string;
    flushIntervalMs?: number;
}
export declare class LocalCache {
    private config;
    private cache;
    private rabbitmqConnection;
    private rabbitmqChannel;
    private retryQueue;
    private flushTimer;
    private isConnected;
    constructor(config?: LocalCacheConfig);
    private initializeCache;
    private connectRabbitMQ;
    private scheduleReconnect;
    /**
     * Store check result - either send to RabbitMQ or cache locally if connection failed
     */
    storeCheckResult(result: Omit<CachedCheckResult, 'retryCount' | 'nextRetryAt'>): Promise<void>;
    private sendToRabbitMQ;
    private addToCache;
    /**
     * Process all cached results and try to send them to RabbitMQ
     */
    private processCachedResults;
    private startFlushTimer;
    /**
     * Save cache to disk for persistence across worker restarts
     */
    private saveCacheToDisk;
    /**
     * Load cache from disk on startup
     */
    private loadCacheFromDisk;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        totalEntries: number;
        pendingRetries: number;
        failedEntries: number;
        isConnected: boolean;
        oldestEntry?: number;
        newestEntry?: number;
    };
    /**
     * Force flush all cached results
     */
    forceFlush(): Promise<void>;
    /**
     * Clear all cached data
     */
    clearCache(): Promise<void>;
    /**
     * Graceful shutdown
     */
    shutdown(): Promise<void>;
}
export declare const localCache: LocalCache;
export {};
//# sourceMappingURL=local-cache.d.ts.map