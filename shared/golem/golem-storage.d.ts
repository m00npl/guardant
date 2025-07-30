import { CacheManager, type CacheStats } from "./cache-manager";
export interface StoredData {
    timestamp: number;
    data: any;
    entityKey?: string;
}
export interface GolemConfig {
    chainId: number;
    httpUrl: string;
    wsUrl: string;
    privateKeyPath?: string;
}
export declare class GolemStorage {
    private client;
    private logger;
    private isConnected;
    private config;
    private cacheManager;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectInterval;
    private serverId;
    private conflictResolutionMode;
    constructor(config?: Partial<GolemConfig>);
    private generateServerId;
    private setupPrivateKey;
    private initializeClient;
    waitForConnection(timeoutMs?: number): Promise<boolean>;
    storeData(key: string, data: any, ttl?: number): Promise<string | null>;
    retrieveData(key: string): Promise<StoredData | null>;
    private retrieveDataWithoutCache;
    private shouldResolveConflict;
    updateData(entityKey: string, data: any): Promise<boolean>;
    deleteData(entityKey: string): Promise<boolean>;
    isReady(): boolean;
    syncCache(): Promise<{
        synced: number;
        failed: number;
    }>;
    getCacheStats(): CacheStats;
    clearCache(): void;
    getCacheManager(): CacheManager;
    private startAutoSync;
    private performAutoSync;
    private startReconnectionAttempts;
    private onReconnected;
    stopReconnectionAttempts(): void;
    checkConnectionHealth(): Promise<boolean>;
    getStatus(): {
        connected: boolean;
        config: GolemConfig;
        cacheStats: CacheStats;
        reconnectAttempts: number;
        serverId: string;
    };
}
export declare const golemStorage: GolemStorage;
//# sourceMappingURL=golem-storage.d.ts.map