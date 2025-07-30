/**
 * Advanced caching strategies system for GuardAnt services
 * Provides multi-level caching, cache invalidation, and intelligent cache management
 */
import type { GuardAntTracing } from './tracing';
export interface CacheConfig {
    name: string;
    strategy: CacheStrategy;
    ttl: number;
    maxSize?: number;
    compressionEnabled?: boolean;
    serializationFormat?: SerializationFormat;
    invalidationStrategy?: InvalidationStrategy;
    warmupOnStart?: boolean;
    backgroundRefresh?: boolean;
    staleWhileRevalidate?: boolean;
    keyPrefix?: string;
    tags?: string[];
}
export declare enum CacheStrategy {
    LRU = "lru",// Least Recently Used
    LFU = "lfu",// Least Frequently Used  
    FIFO = "fifo",// First In First Out
    TTL = "ttl",// Time To Live
    WRITE_THROUGH = "write_through",// Write to cache and storage
    WRITE_BEHIND = "write_behind",// Write to cache, async to storage
    READ_THROUGH = "read_through",// Read from storage if cache miss
    CACHE_ASIDE = "cache_aside",// Manual cache management
    MULTI_LEVEL = "multi_level"
}
export declare enum SerializationFormat {
    JSON = "json",
    MSGPACK = "msgpack",
    PROTOBUF = "protobuf",
    AVRO = "avro"
}
export declare enum InvalidationStrategy {
    TTL_ONLY = "ttl_only",
    TAG_BASED = "tag_based",
    DEPENDENCY = "dependency",
    MANUAL = "manual",
    EVENT_DRIVEN = "event_driven",
    VERSION_BASED = "version_based"
}
export interface CacheItem<T = any> {
    key: string;
    value: T;
    metadata: CacheItemMetadata;
}
export interface CacheItemMetadata {
    createdAt: number;
    expiresAt?: number;
    lastAccessedAt: number;
    accessCount: number;
    size: number;
    tags: string[];
    version: number;
    compressed: boolean;
    dependencies?: string[];
}
export interface CacheMetrics {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    evictions: number;
    hitRate: number;
    averageAccessTime: number;
    totalSize: number;
    itemCount: number;
    memoryUsage: number;
}
export interface CacheLayer {
    name: string;
    priority: number;
    storage: CacheStorage;
    config: CacheConfig;
}
export declare const CacheConfigs: {
    HOT_DATA: {
        name: string;
        strategy: CacheStrategy;
        ttl: number;
        maxSize: number;
        compressionEnabled: boolean;
        serializationFormat: SerializationFormat;
        invalidationStrategy: InvalidationStrategy;
        backgroundRefresh: boolean;
        staleWhileRevalidate: boolean;
        keyPrefix: string;
        tags: string[];
    };
    WARM_DATA: {
        name: string;
        strategy: CacheStrategy;
        ttl: number;
        maxSize: number;
        compressionEnabled: boolean;
        serializationFormat: SerializationFormat;
        invalidationStrategy: InvalidationStrategy;
        backgroundRefresh: boolean;
        staleWhileRevalidate: boolean;
        keyPrefix: string;
        tags: string[];
    };
    COLD_DATA: {
        name: string;
        strategy: CacheStrategy;
        ttl: number;
        maxSize: number;
        compressionEnabled: boolean;
        serializationFormat: SerializationFormat;
        invalidationStrategy: InvalidationStrategy;
        backgroundRefresh: boolean;
        staleWhileRevalidate: boolean;
        keyPrefix: string;
        tags: string[];
    };
    SESSION_DATA: {
        name: string;
        strategy: CacheStrategy;
        ttl: number;
        maxSize: number;
        compressionEnabled: boolean;
        serializationFormat: SerializationFormat;
        invalidationStrategy: InvalidationStrategy;
        backgroundRefresh: boolean;
        staleWhileRevalidate: boolean;
        keyPrefix: string;
        tags: string[];
    };
    API_RESPONSE: {
        name: string;
        strategy: CacheStrategy;
        ttl: number;
        maxSize: number;
        compressionEnabled: boolean;
        serializationFormat: SerializationFormat;
        invalidationStrategy: InvalidationStrategy;
        backgroundRefresh: boolean;
        staleWhileRevalidate: boolean;
        keyPrefix: string;
        tags: string[];
    };
    QUERY_CACHE: {
        name: string;
        strategy: CacheStrategy;
        ttl: number;
        maxSize: number;
        compressionEnabled: boolean;
        serializationFormat: SerializationFormat;
        invalidationStrategy: InvalidationStrategy;
        backgroundRefresh: boolean;
        staleWhileRevalidate: boolean;
        keyPrefix: string;
        tags: string[];
    };
    CONFIG_DATA: {
        name: string;
        strategy: CacheStrategy;
        ttl: number;
        maxSize: number;
        compressionEnabled: boolean;
        serializationFormat: SerializationFormat;
        invalidationStrategy: InvalidationStrategy;
        warmupOnStart: boolean;
        backgroundRefresh: boolean;
        staleWhileRevalidate: boolean;
        keyPrefix: string;
        tags: string[];
    };
    MONITORING_DATA: {
        name: string;
        strategy: CacheStrategy;
        ttl: number;
        maxSize: number;
        compressionEnabled: boolean;
        serializationFormat: SerializationFormat;
        invalidationStrategy: InvalidationStrategy;
        backgroundRefresh: boolean;
        staleWhileRevalidate: boolean;
        keyPrefix: string;
        tags: string[];
    };
    STATIC_CONTENT: {
        name: string;
        strategy: CacheStrategy;
        ttl: number;
        maxSize: number;
        compressionEnabled: boolean;
        serializationFormat: SerializationFormat;
        invalidationStrategy: InvalidationStrategy;
        warmupOnStart: boolean;
        backgroundRefresh: boolean;
        staleWhileRevalidate: boolean;
        keyPrefix: string;
        tags: string[];
    };
};
export interface CacheStorage {
    get<T>(key: string): Promise<CacheItem<T> | null>;
    set<T>(key: string, value: T, metadata: CacheItemMetadata): Promise<void>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    keys(pattern?: string): Promise<string[]>;
    getMetrics(): Promise<CacheMetrics>;
    getSize(): Promise<number>;
}
export declare class MemoryCacheStorage implements CacheStorage {
    private maxSize;
    private cache;
    private accessTimes;
    private metrics;
    constructor(maxSize?: number);
    get<T>(key: string): Promise<CacheItem<T> | null>;
    set<T>(key: string, value: T, metadata: CacheItemMetadata): Promise<void>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    keys(pattern?: string): Promise<string[]>;
    getMetrics(): Promise<CacheMetrics>;
    getSize(): Promise<number>;
    private evictItems;
    private updateMetrics;
}
export declare class RedisCacheStorage implements CacheStorage {
    private redis;
    private keyPrefix;
    private metrics;
    constructor(redis: any, keyPrefix?: string);
    get<T>(key: string): Promise<CacheItem<T> | null>;
    set<T>(key: string, value: T, metadata: CacheItemMetadata): Promise<void>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    keys(pattern?: string): Promise<string[]>;
    getMetrics(): Promise<CacheMetrics>;
    getSize(): Promise<number>;
    private updateMetrics;
}
export declare class MultiLevelCacheManager {
    private serviceName;
    private logger;
    private tracing?;
    private layers;
    private invalidationCallbacks;
    private backgroundTasks;
    constructor(serviceName: string, tracing?: GuardAntTracing);
    addLayer(name: string, storage: CacheStorage, config: CacheConfig, priority?: number): void;
    get<T>(key: string, tags?: string[]): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number, tags?: string[]): Promise<void>;
    delete(key: string): Promise<boolean>;
    invalidateByTags(tags: string[]): Promise<void>;
    getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl?: number, tags?: string[]): Promise<T>;
    private setInLayer;
    private promoteToHigherLayers;
    private buildKey;
    private isItemValid;
    getMetrics(): Promise<Record<string, CacheMetrics>>;
    getHealthStatus(): {
        healthy: boolean;
        layers: Record<string, any>;
    };
    shutdown(): Promise<void>;
}
export declare function createMemoryCacheStorage(maxSize?: number): MemoryCacheStorage;
export declare function createRedisCacheStorage(redis: any, keyPrefix?: string): RedisCacheStorage;
export declare function createMultiLevelCacheManager(serviceName: string, tracing?: GuardAntTracing): MultiLevelCacheManager;
export { CacheConfigs, CacheStrategy, InvalidationStrategy, SerializationFormat };
//# sourceMappingURL=caching-strategies.d.ts.map