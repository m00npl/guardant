export interface CacheEntry {
    key: string;
    data: any;
    timestamp: number;
    synced: boolean;
    entityKey?: string;
}
export interface CacheStats {
    totalEntries: number;
    unsyncedEntries: number;
    cacheSize: number;
    lastSync: string | null;
    enabled: boolean;
}
export interface SyncLogEntry {
    timestamp: string;
    success: boolean;
    synced: number;
    failed: number;
    duration: number;
    error?: string;
    details?: string;
}
export declare class CacheManager {
    private cachePath;
    private cache;
    private logger;
    private syncInProgress;
    private syncLog;
    private maxSyncLogEntries;
    constructor();
    private ensureCacheDirectory;
    private loadCache;
    private saveCache;
    private loadSyncLog;
    private saveSyncLogEntry;
    store(key: string, data: any): void;
    get(key: string): CacheEntry | null;
    remove(key: string): boolean;
    markAsSynced(key: string, entityKey?: string): void;
    getByPattern(pattern: string): CacheEntry[];
    getUnsyncedEntries(): CacheEntry[];
    syncWithGolemBase(golemStorage: any): Promise<{
        synced: number;
        failed: number;
    }>;
    getStats(): CacheStats;
    getSyncHistory(): SyncLogEntry[];
    cleanup(maxAgeHours?: number): number;
    clear(): void;
    getCacheInfo(): {
        path: string;
        size: number;
        entries: number;
        unsyncedEntries: number;
        lastModified: string | null;
    };
}
//# sourceMappingURL=cache-manager.d.ts.map