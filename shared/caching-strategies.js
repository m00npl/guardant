"use strict";
/**
 * Advanced caching strategies system for GuardAnt services
 * Provides multi-level caching, cache invalidation, and intelligent cache management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiLevelCacheManager = exports.RedisCacheStorage = exports.MemoryCacheStorage = exports.CacheConfigs = exports.InvalidationStrategy = exports.SerializationFormat = exports.CacheStrategy = void 0;
exports.createMemoryCacheStorage = createMemoryCacheStorage;
exports.createRedisCacheStorage = createRedisCacheStorage;
exports.createMultiLevelCacheManager = createMultiLevelCacheManager;
const logger_1 = require("./logger");
const error_handling_1 = require("./error-handling");
var CacheStrategy;
(function (CacheStrategy) {
    CacheStrategy["LRU"] = "lru";
    CacheStrategy["LFU"] = "lfu";
    CacheStrategy["FIFO"] = "fifo";
    CacheStrategy["TTL"] = "ttl";
    CacheStrategy["WRITE_THROUGH"] = "write_through";
    CacheStrategy["WRITE_BEHIND"] = "write_behind";
    CacheStrategy["READ_THROUGH"] = "read_through";
    CacheStrategy["CACHE_ASIDE"] = "cache_aside";
    CacheStrategy["MULTI_LEVEL"] = "multi_level"; // L1 (memory) + L2 (Redis) + L3 (disk)
})(CacheStrategy || (exports.CacheStrategy = CacheStrategy = {}));
var SerializationFormat;
(function (SerializationFormat) {
    SerializationFormat["JSON"] = "json";
    SerializationFormat["MSGPACK"] = "msgpack";
    SerializationFormat["PROTOBUF"] = "protobuf";
    SerializationFormat["AVRO"] = "avro";
})(SerializationFormat || (exports.SerializationFormat = SerializationFormat = {}));
var InvalidationStrategy;
(function (InvalidationStrategy) {
    InvalidationStrategy["TTL_ONLY"] = "ttl_only";
    InvalidationStrategy["TAG_BASED"] = "tag_based";
    InvalidationStrategy["DEPENDENCY"] = "dependency";
    InvalidationStrategy["MANUAL"] = "manual";
    InvalidationStrategy["EVENT_DRIVEN"] = "event_driven";
    InvalidationStrategy["VERSION_BASED"] = "version_based";
})(InvalidationStrategy || (exports.InvalidationStrategy = InvalidationStrategy = {}));
// Predefined cache configurations for different use cases
exports.CacheConfigs = {
    // Hot data - frequently accessed, short TTL
    HOT_DATA: {
        name: 'hot_data',
        strategy: CacheStrategy.LRU,
        ttl: 60000, // 1 minute
        maxSize: 10000,
        compressionEnabled: false,
        serializationFormat: SerializationFormat.JSON,
        invalidationStrategy: InvalidationStrategy.TTL_ONLY,
        backgroundRefresh: true,
        staleWhileRevalidate: true,
        keyPrefix: 'hot',
        tags: ['hot', 'frequent']
    },
    // Warm data - moderately accessed, medium TTL
    WARM_DATA: {
        name: 'warm_data',
        strategy: CacheStrategy.LFU,
        ttl: 300000, // 5 minutes
        maxSize: 50000,
        compressionEnabled: true,
        serializationFormat: SerializationFormat.JSON,
        invalidationStrategy: InvalidationStrategy.TAG_BASED,
        backgroundRefresh: false,
        staleWhileRevalidate: false,
        keyPrefix: 'warm',
        tags: ['warm', 'moderate']
    },
    // Cold data - rarely accessed, long TTL
    COLD_DATA: {
        name: 'cold_data',
        strategy: CacheStrategy.FIFO,
        ttl: 3600000, // 1 hour
        maxSize: 100000,
        compressionEnabled: true,
        serializationFormat: SerializationFormat.MSGPACK,
        invalidationStrategy: InvalidationStrategy.TTL_ONLY,
        backgroundRefresh: false,
        staleWhileRevalidate: false,
        keyPrefix: 'cold',
        tags: ['cold', 'archive']
    },
    // Session data - user-specific, medium TTL
    SESSION_DATA: {
        name: 'session_data',
        strategy: CacheStrategy.TTL,
        ttl: 900000, // 15 minutes
        maxSize: 20000,
        compressionEnabled: false,
        serializationFormat: SerializationFormat.JSON,
        invalidationStrategy: InvalidationStrategy.MANUAL,
        backgroundRefresh: false,
        staleWhileRevalidate: false,
        keyPrefix: 'session',
        tags: ['session', 'user']
    },
    // API responses - cacheable HTTP responses
    API_RESPONSE: {
        name: 'api_response',
        strategy: CacheStrategy.WRITE_THROUGH,
        ttl: 120000, // 2 minutes
        maxSize: 30000,
        compressionEnabled: true,
        serializationFormat: SerializationFormat.JSON,
        invalidationStrategy: InvalidationStrategy.TAG_BASED,
        backgroundRefresh: true,
        staleWhileRevalidate: true,
        keyPrefix: 'api',
        tags: ['api', 'response']
    },
    // Database query results
    QUERY_CACHE: {
        name: 'query_cache',
        strategy: CacheStrategy.READ_THROUGH,
        ttl: 600000, // 10 minutes
        maxSize: 25000,
        compressionEnabled: true,
        serializationFormat: SerializationFormat.JSON,
        invalidationStrategy: InvalidationStrategy.DEPENDENCY,
        backgroundRefresh: true,
        staleWhileRevalidate: false,
        keyPrefix: 'query',
        tags: ['database', 'query']
    },
    // Configuration data - rarely changes
    CONFIG_DATA: {
        name: 'config_data',
        strategy: CacheStrategy.TTL,
        ttl: 7200000, // 2 hours
        maxSize: 5000,
        compressionEnabled: false,
        serializationFormat: SerializationFormat.JSON,
        invalidationStrategy: InvalidationStrategy.VERSION_BASED,
        warmupOnStart: true,
        backgroundRefresh: false,
        staleWhileRevalidate: false,
        keyPrefix: 'config',
        tags: ['config', 'settings']
    },
    // Monitoring data - high volume, short TTL
    MONITORING_DATA: {
        name: 'monitoring_data',
        strategy: CacheStrategy.FIFO,
        ttl: 30000, // 30 seconds
        maxSize: 100000,
        compressionEnabled: true,
        serializationFormat: SerializationFormat.MSGPACK,
        invalidationStrategy: InvalidationStrategy.TTL_ONLY,
        backgroundRefresh: false,
        staleWhileRevalidate: false,
        keyPrefix: 'monitor',
        tags: ['monitoring', 'metrics']
    },
    // Static content - long-lived, high compression
    STATIC_CONTENT: {
        name: 'static_content',
        strategy: CacheStrategy.LFU,
        ttl: 86400000, // 24 hours
        maxSize: 50000,
        compressionEnabled: true,
        serializationFormat: SerializationFormat.PROTOBUF,
        invalidationStrategy: InvalidationStrategy.VERSION_BASED,
        warmupOnStart: false,
        backgroundRefresh: false,
        staleWhileRevalidate: false,
        keyPrefix: 'static',
        tags: ['static', 'content']
    }
};
// In-memory cache storage implementation
class MemoryCacheStorage {
    constructor(maxSize = 10000) {
        this.maxSize = maxSize;
        this.cache = new Map();
        this.accessTimes = new Map();
        this.metrics = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            hitRate: 0,
            averageAccessTime: 0,
            totalSize: 0,
            itemCount: 0,
            memoryUsage: 0
        };
    }
    async get(key) {
        const startTime = Date.now();
        const item = this.cache.get(key);
        if (!item) {
            this.metrics.misses++;
            return null;
        }
        // Check if expired
        if (item.metadata.expiresAt && Date.now() > item.metadata.expiresAt) {
            this.cache.delete(key);
            this.metrics.misses++;
            this.metrics.evictions++;
            return null;
        }
        // Update access metadata
        item.metadata.lastAccessedAt = Date.now();
        item.metadata.accessCount++;
        // Track access times for LRU/LFU
        if (!this.accessTimes.has(key)) {
            this.accessTimes.set(key, []);
        }
        this.accessTimes.get(key).push(Date.now());
        this.metrics.hits++;
        this.updateMetrics(Date.now() - startTime);
        return item;
    }
    async set(key, value, metadata) {
        // Check if we need to evict items
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            await this.evictItems(1);
        }
        const serializedValue = JSON.stringify(value);
        const size = new Blob([serializedValue]).size;
        const item = {
            key,
            value,
            metadata: {
                ...metadata,
                size,
                createdAt: Date.now(),
                lastAccessedAt: Date.now()
            }
        };
        this.cache.set(key, item);
        this.metrics.sets++;
        this.metrics.itemCount = this.cache.size;
        this.metrics.totalSize += size;
    }
    async delete(key) {
        const item = this.cache.get(key);
        if (item) {
            this.cache.delete(key);
            this.accessTimes.delete(key);
            this.metrics.deletes++;
            this.metrics.itemCount = this.cache.size;
            this.metrics.totalSize -= item.metadata.size;
            return true;
        }
        return false;
    }
    async clear() {
        this.cache.clear();
        this.accessTimes.clear();
        this.metrics.itemCount = 0;
        this.metrics.totalSize = 0;
    }
    async keys(pattern) {
        const keys = Array.from(this.cache.keys());
        if (pattern) {
            const regex = new RegExp(pattern);
            return keys.filter(key => regex.test(key));
        }
        return keys;
    }
    async getMetrics() {
        this.metrics.hitRate =
            this.metrics.hits + this.metrics.misses > 0
                ? this.metrics.hits / (this.metrics.hits + this.metrics.misses)
                : 0;
        return { ...this.metrics };
    }
    async getSize() {
        return this.cache.size;
    }
    async evictItems(count) {
        const keysToEvict = [];
        // Simple LRU eviction
        const sortedByAccess = Array.from(this.cache.entries())
            .sort((a, b) => a[1].metadata.lastAccessedAt - b[1].metadata.lastAccessedAt);
        for (let i = 0; i < Math.min(count, sortedByAccess.length); i++) {
            keysToEvict.push(sortedByAccess[i][0]);
        }
        for (const key of keysToEvict) {
            await this.delete(key);
            this.metrics.evictions++;
        }
    }
    updateMetrics(accessTime) {
        // Simple moving average for access time
        this.metrics.averageAccessTime =
            (this.metrics.averageAccessTime * 0.9) + (accessTime * 0.1);
    }
}
exports.MemoryCacheStorage = MemoryCacheStorage;
// Redis cache storage implementation
class RedisCacheStorage {
    constructor(redis, keyPrefix = '') {
        this.redis = redis;
        this.keyPrefix = keyPrefix;
        this.metrics = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            hitRate: 0,
            averageAccessTime: 0,
            totalSize: 0,
            itemCount: 0,
            memoryUsage: 0
        };
    }
    async get(key) {
        const startTime = Date.now();
        const fullKey = this.keyPrefix + key;
        try {
            const data = await this.redis.get(fullKey);
            if (!data) {
                this.metrics.misses++;
                return null;
            }
            const item = JSON.parse(data);
            this.metrics.hits++;
            this.updateMetrics(Date.now() - startTime);
            return item;
        }
        catch (error) {
            this.metrics.misses++;
            return null;
        }
    }
    async set(key, value, metadata) {
        const fullKey = this.keyPrefix + key;
        const item = { key, value, metadata };
        const serialized = JSON.stringify(item);
        try {
            if (metadata.expiresAt) {
                const ttl = Math.max(1, Math.floor((metadata.expiresAt - Date.now()) / 1000));
                await this.redis.setex(fullKey, ttl, serialized);
            }
            else {
                await this.redis.set(fullKey, serialized);
            }
            this.metrics.sets++;
        }
        catch (error) {
            throw new error_handling_1.CacheError(`Failed to set cache item: ${key}`, {
                service: 'redis-cache-storage',
                operation: 'cache_set'
            });
        }
    }
    async delete(key) {
        const fullKey = this.keyPrefix + key;
        try {
            const result = await this.redis.del(fullKey);
            if (result > 0) {
                this.metrics.deletes++;
                return true;
            }
            return false;
        }
        catch (error) {
            return false;
        }
    }
    async clear() {
        try {
            const keys = await this.redis.keys(this.keyPrefix + '*');
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }
        catch (error) {
            throw new error_handling_1.CacheError('Failed to clear cache', {
                service: 'redis-cache-storage',
                operation: 'cache_clear'
            });
        }
    }
    async keys(pattern) {
        const searchPattern = this.keyPrefix + (pattern || '*');
        try {
            const keys = await this.redis.keys(searchPattern);
            return keys.map((key) => key.replace(this.keyPrefix, ''));
        }
        catch (error) {
            return [];
        }
    }
    async getMetrics() {
        this.metrics.hitRate =
            this.metrics.hits + this.metrics.misses > 0
                ? this.metrics.hits / (this.metrics.hits + this.metrics.misses)
                : 0;
        return { ...this.metrics };
    }
    async getSize() {
        try {
            const keys = await this.keys();
            return keys.length;
        }
        catch (error) {
            return 0;
        }
    }
    updateMetrics(accessTime) {
        this.metrics.averageAccessTime =
            (this.metrics.averageAccessTime * 0.9) + (accessTime * 0.1);
    }
}
exports.RedisCacheStorage = RedisCacheStorage;
// Multi-level cache manager
class MultiLevelCacheManager {
    constructor(serviceName, tracing) {
        this.serviceName = serviceName;
        this.layers = [];
        this.invalidationCallbacks = new Map();
        this.backgroundTasks = new Map();
        this.logger = (0, logger_1.createLogger)(`${serviceName}-cache-manager`);
        this.tracing = tracing;
    }
    addLayer(name, storage, config, priority = 0) {
        const layer = {
            name,
            priority,
            storage,
            config
        };
        this.layers.push(layer);
        this.layers.sort((a, b) => b.priority - a.priority); // Higher priority first
        this.logger.info('Cache layer added', {
            name,
            priority,
            strategy: config.strategy,
            ttl: config.ttl
        });
    }
    async get(key, tags) {
        const startTime = Date.now();
        let result = null;
        let sourceLayer = null;
        // Try each layer in priority order
        for (const layer of this.layers) {
            try {
                const fullKey = this.buildKey(layer.config, key);
                const item = await layer.storage.get(fullKey);
                if (item && this.isItemValid(item)) {
                    result = item.value;
                    sourceLayer = layer;
                    break;
                }
            }
            catch (error) {
                this.logger.warn(`Cache layer ${layer.name} failed on get`, error, { key });
            }
        }
        // If found in lower priority layer, promote to higher layers
        if (result && sourceLayer) {
            await this.promoteToHigherLayers(key, result, sourceLayer, tags);
        }
        const duration = Date.now() - startTime;
        this.logger.debug('Cache get operation', {
            key,
            hit: !!result,
            sourceLayer: sourceLayer?.name,
            duration,
            layers: this.layers.length
        });
        if (this.tracing) {
            this.tracing.addEvent('cache_get', {
                'cache.key': key,
                'cache.hit': (!!result).toString(),
                'cache.source_layer': sourceLayer?.name || 'none',
                'cache.duration_ms': duration.toString()
            });
        }
        return result;
    }
    async set(key, value, ttl, tags) {
        const startTime = Date.now();
        const promises = [];
        for (const layer of this.layers) {
            const promise = this.setInLayer(layer, key, value, ttl, tags);
            promises.push(promise);
        }
        try {
            await Promise.all(promises);
            const duration = Date.now() - startTime;
            this.logger.debug('Cache set operation', {
                key,
                layers: this.layers.length,
                duration
            });
            if (this.tracing) {
                this.tracing.addEvent('cache_set', {
                    'cache.key': key,
                    'cache.layers_count': this.layers.length.toString(),
                    'cache.duration_ms': duration.toString()
                });
            }
        }
        catch (error) {
            this.logger.error('Cache set operation failed', error, { key });
            throw new error_handling_1.CacheError(`Failed to set cache item: ${key}`, {
                service: this.serviceName,
                operation: 'cache_set'
            });
        }
    }
    async delete(key) {
        const startTime = Date.now();
        const promises = [];
        for (const layer of this.layers) {
            const fullKey = this.buildKey(layer.config, key);
            promises.push(layer.storage.delete(fullKey));
        }
        try {
            const results = await Promise.all(promises);
            const deleted = results.some(result => result);
            const duration = Date.now() - startTime;
            this.logger.debug('Cache delete operation', {
                key,
                deleted,
                layers: this.layers.length,
                duration
            });
            return deleted;
        }
        catch (error) {
            this.logger.error('Cache delete operation failed', error, { key });
            return false;
        }
    }
    async invalidateByTags(tags) {
        if (!Array.isArray(tags) || tags.length === 0)
            return;
        const startTime = Date.now();
        let totalInvalidated = 0;
        for (const layer of this.layers) {
            try {
                const keys = await layer.storage.keys();
                const keysToInvalidate = [];
                // Find keys with matching tags
                for (const key of keys) {
                    const item = await layer.storage.get(key);
                    if (item && item.metadata.tags) {
                        const hasMatchingTag = tags.some(tag => item.metadata.tags.includes(tag));
                        if (hasMatchingTag) {
                            keysToInvalidate.push(key);
                        }
                    }
                }
                // Delete keys with matching tags
                for (const key of keysToInvalidate) {
                    await layer.storage.delete(key);
                    totalInvalidated++;
                }
            }
            catch (error) {
                this.logger.warn(`Tag invalidation failed in layer ${layer.name}`, error, { tags });
            }
        }
        const duration = Date.now() - startTime;
        this.logger.info('Cache invalidation by tags completed', {
            tags,
            invalidated: totalInvalidated,
            duration
        });
        if (this.tracing) {
            this.tracing.addEvent('cache_invalidate_tags', {
                'cache.tags': tags.join(','),
                'cache.invalidated_count': totalInvalidated.toString(),
                'cache.duration_ms': duration.toString()
            });
        }
    }
    async getOrSet(key, fetcher, ttl, tags) {
        let result = await this.get(key, tags);
        if (result === null) {
            result = await fetcher();
            await this.set(key, result, ttl, tags);
        }
        return result;
    }
    async setInLayer(layer, key, value, ttl, tags) {
        const fullKey = this.buildKey(layer.config, key);
        const effectiveTtl = ttl || layer.config.ttl;
        const metadata = {
            createdAt: Date.now(),
            expiresAt: effectiveTtl > 0 ? Date.now() + effectiveTtl : undefined,
            lastAccessedAt: Date.now(),
            accessCount: 0,
            size: JSON.stringify(value).length,
            tags: [...(layer.config.tags || []), ...(tags || [])],
            version: 1,
            compressed: layer.config.compressionEnabled || false
        };
        await layer.storage.set(fullKey, value, metadata);
    }
    async promoteToHigherLayers(key, value, sourceLayer, tags) {
        const sourceIndex = this.layers.findIndex(layer => layer === sourceLayer);
        // Promote to layers with higher priority
        for (let i = 0; i < sourceIndex; i++) {
            try {
                await this.setInLayer(this.layers[i], key, value, undefined, tags);
            }
            catch (error) {
                this.logger.warn(`Failed to promote cache item to layer ${this.layers[i].name}`, error, { key });
            }
        }
    }
    buildKey(config, key) {
        return config.keyPrefix ? `${config.keyPrefix}:${key}` : key;
    }
    isItemValid(item) {
        return !item.metadata.expiresAt || Date.now() < item.metadata.expiresAt;
    }
    async getMetrics() {
        const metrics = {};
        for (const layer of this.layers) {
            try {
                metrics[layer.name] = await layer.storage.getMetrics();
            }
            catch (error) {
                this.logger.warn(`Failed to get metrics for layer ${layer.name}`, error);
            }
        }
        return metrics;
    }
    getHealthStatus() {
        const layerHealths = {};
        let overallHealthy = true;
        for (const layer of this.layers) {
            // Simple health check - try to get metrics
            try {
                layerHealths[layer.name] = {
                    healthy: true,
                    config: layer.config.name,
                    priority: layer.priority
                };
            }
            catch (error) {
                layerHealths[layer.name] = {
                    healthy: false,
                    error: error.message
                };
                overallHealthy = false;
            }
        }
        return {
            healthy: overallHealthy,
            layers: layerHealths
        };
    }
    async shutdown() {
        this.logger.info('Shutting down cache manager', {
            layers: this.layers.length
        });
        // Clear background tasks
        for (const [key, timeout] of this.backgroundTasks) {
            clearTimeout(timeout);
        }
        this.backgroundTasks.clear();
        // Clear all layers
        for (const layer of this.layers) {
            try {
                await layer.storage.clear();
            }
            catch (error) {
                this.logger.warn(`Failed to clear layer ${layer.name} during shutdown`, error);
            }
        }
        this.logger.info('Cache manager shutdown completed');
    }
}
exports.MultiLevelCacheManager = MultiLevelCacheManager;
// Factory functions
function createMemoryCacheStorage(maxSize) {
    return new MemoryCacheStorage(maxSize);
}
function createRedisCacheStorage(redis, keyPrefix) {
    return new RedisCacheStorage(redis, keyPrefix);
}
function createMultiLevelCacheManager(serviceName, tracing) {
    return new MultiLevelCacheManager(serviceName, tracing);
}
//# sourceMappingURL=caching-strategies.js.map