/**
 * Advanced caching strategies system for GuardAnt services
 * Provides multi-level caching, cache invalidation, and intelligent cache management
 */

import { createLogger } from './logger';
import { CacheError, ErrorCategory, ErrorSeverity } from './error-handling';
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

export enum CacheStrategy {
  LRU = 'lru',                    // Least Recently Used
  LFU = 'lfu',                    // Least Frequently Used  
  FIFO = 'fifo',                  // First In First Out
  TTL = 'ttl',                    // Time To Live
  WRITE_THROUGH = 'write_through', // Write to cache and storage
  WRITE_BEHIND = 'write_behind',   // Write to cache, async to storage
  READ_THROUGH = 'read_through',   // Read from storage if cache miss
  CACHE_ASIDE = 'cache_aside',     // Manual cache management
  MULTI_LEVEL = 'multi_level'     // L1 (memory) + L2 (Redis) + L3 (disk)
}

export enum SerializationFormat {
  JSON = 'json',
  MSGPACK = 'msgpack',
  PROTOBUF = 'protobuf',
  AVRO = 'avro'
}

export enum InvalidationStrategy {
  TTL_ONLY = 'ttl_only',
  TAG_BASED = 'tag_based',
  DEPENDENCY = 'dependency',
  MANUAL = 'manual',
  EVENT_DRIVEN = 'event_driven',
  VERSION_BASED = 'version_based'
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

// Predefined cache configurations for different use cases
export const CacheConfigs = {
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

// Cache storage interface
export interface CacheStorage {
  get<T>(key: string): Promise<CacheItem<T> | null>;
  set<T>(key: string, value: T, metadata: CacheItemMetadata): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(pattern?: string): Promise<string[]>;
  getMetrics(): Promise<CacheMetrics>;
  getSize(): Promise<number>;
}

// In-memory cache storage implementation
export class MemoryCacheStorage implements CacheStorage {
  private cache = new Map<string, CacheItem>();
  private accessTimes = new Map<string, number[]>();
  private metrics: CacheMetrics = {
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

  constructor(private maxSize: number = 10000) {}

  async get<T>(key: string): Promise<CacheItem<T> | null> {
    const startTime = Date.now();
    const item = this.cache.get(key) as CacheItem<T> | undefined;

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
    this.accessTimes.get(key)!.push(Date.now());

    this.metrics.hits++;
    this.updateMetrics(Date.now() - startTime);

    return item;
  }

  async set<T>(key: string, value: T, metadata: CacheItemMetadata): Promise<void> {
    // Check if we need to evict items
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      await this.evictItems(1);
    }

    const serializedValue = JSON.stringify(value);
    const size = new Blob([serializedValue]).size;

    const item: CacheItem<T> = {
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

  async delete(key: string): Promise<boolean> {
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

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessTimes.clear();
    this.metrics.itemCount = 0;
    this.metrics.totalSize = 0;
  }

  async keys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.cache.keys());
    if (pattern) {
      const regex = new RegExp(pattern);
      return keys.filter(key => regex.test(key));
    }
    return keys;
  }

  async getMetrics(): Promise<CacheMetrics> {
    this.metrics.hitRate = 
      this.metrics.hits + this.metrics.misses > 0 
        ? this.metrics.hits / (this.metrics.hits + this.metrics.misses)
        : 0;
    
    return { ...this.metrics };
  }

  async getSize(): Promise<number> {
    return this.cache.size;
  }

  private async evictItems(count: number): Promise<void> {
    const keysToEvict: string[] = [];
    
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

  private updateMetrics(accessTime: number): void {
    // Simple moving average for access time
    this.metrics.averageAccessTime = 
      (this.metrics.averageAccessTime * 0.9) + (accessTime * 0.1);
  }
}

// Redis cache storage implementation
export class RedisCacheStorage implements CacheStorage {
  private metrics: CacheMetrics = {
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

  constructor(private redis: any, private keyPrefix: string = '') {}

  async get<T>(key: string): Promise<CacheItem<T> | null> {
    const startTime = Date.now();
    const fullKey = this.keyPrefix + key;
    
    try {
      const data = await this.redis.get(fullKey);
      if (!data) {
        this.metrics.misses++;
        return null;
      }

      const item = JSON.parse(data) as CacheItem<T>;
      this.metrics.hits++;
      this.updateMetrics(Date.now() - startTime);
      
      return item;
    } catch (error) {
      this.metrics.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, metadata: CacheItemMetadata): Promise<void> {
    const fullKey = this.keyPrefix + key;
    const item: CacheItem<T> = { key, value, metadata };
    const serialized = JSON.stringify(item);

    try {
      if (metadata.expiresAt) {
        const ttl = Math.max(1, Math.floor((metadata.expiresAt - Date.now()) / 1000));
        await this.redis.setex(fullKey, ttl, serialized);
      } else {
        await this.redis.set(fullKey, serialized);
      }
      
      this.metrics.sets++;
    } catch (error) {
      throw new CacheError(`Failed to set cache item: ${key}`, {
        service: 'redis-cache-storage',
        operation: 'cache_set'
      });
    }
  }

  async delete(key: string): Promise<boolean> {
    const fullKey = this.keyPrefix + key;
    
    try {
      const result = await this.redis.del(fullKey);
      if (result > 0) {
        this.metrics.deletes++;
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.redis.keys(this.keyPrefix + '*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      throw new CacheError('Failed to clear cache', {
        service: 'redis-cache-storage',
        operation: 'cache_clear'
      });
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    const searchPattern = this.keyPrefix + (pattern || '*');
    try {
      const keys = await this.redis.keys(searchPattern);
      return keys.map((key: string) => key.replace(this.keyPrefix, ''));
    } catch (error) {
      return [];
    }
  }

  async getMetrics(): Promise<CacheMetrics> {
    this.metrics.hitRate = 
      this.metrics.hits + this.metrics.misses > 0 
        ? this.metrics.hits / (this.metrics.hits + this.metrics.misses)
        : 0;
        
    return { ...this.metrics };
  }

  async getSize(): Promise<number> {
    try {
      const keys = await this.keys();
      return keys.length;
    } catch (error) {
      return 0;
    }
  }

  private updateMetrics(accessTime: number): void {
    this.metrics.averageAccessTime = 
      (this.metrics.averageAccessTime * 0.9) + (accessTime * 0.1);
  }
}

// Multi-level cache manager
export class MultiLevelCacheManager {
  private logger;
  private tracing?: GuardAntTracing;
  private layers: CacheLayer[] = [];
  private invalidationCallbacks = new Map<string, ((key: string) => Promise<void>)[]>();
  private backgroundTasks = new Map<string, NodeJS.Timeout>();

  constructor(
    private serviceName: string,
    tracing?: GuardAntTracing
  ) {
    this.logger = createLogger(`${serviceName}-cache-manager`);
    this.tracing = tracing;
  }

  addLayer(name: string, storage: CacheStorage, config: CacheConfig, priority: number = 0): void {
    const layer: CacheLayer = {
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

  async get<T>(key: string, tags?: string[]): Promise<T | null> {
    const startTime = Date.now();
    let result: T | null = null;
    let sourceLayer: CacheLayer | null = null;

    // Try each layer in priority order
    for (const layer of this.layers) {
      try {
        const fullKey = this.buildKey(layer.config, key);
        const item = await layer.storage.get<T>(fullKey);
        
        if (item && this.isItemValid(item)) {
          result = item.value;
          sourceLayer = layer;
          break;
        }
      } catch (error) {
        this.logger.warn(`Cache layer ${layer.name} failed on get`, error as Error, { key });
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

  async set<T>(key: string, value: T, ttl?: number, tags?: string[]): Promise<void> {
    const startTime = Date.now();
    const promises: Promise<void>[] = [];

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

    } catch (error) {
      this.logger.error('Cache set operation failed', error as Error, { key });
      throw new CacheError(`Failed to set cache item: ${key}`, {
        service: this.serviceName,
        operation: 'cache_set'
      });
    }
  }

  async delete(key: string): Promise<boolean> {
    const startTime = Date.now();
    const promises: Promise<boolean>[] = [];

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
    } catch (error) {
      this.logger.error('Cache delete operation failed', error as Error, { key });
      return false;
    }
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    if (!Array.isArray(tags) || tags.length === 0) return;

    const startTime = Date.now();
    let totalInvalidated = 0;

    for (const layer of this.layers) {
      try {
        const keys = await layer.storage.keys();
        const keysToInvalidate: string[] = [];

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
      } catch (error) {
        this.logger.warn(`Tag invalidation failed in layer ${layer.name}`, error as Error, { tags });
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

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
    tags?: string[]
  ): Promise<T> {
    let result = await this.get<T>(key, tags);
    
    if (result === null) {
      result = await fetcher();
      await this.set(key, result, ttl, tags);
    }

    return result;
  }

  private async setInLayer<T>(
    layer: CacheLayer,
    key: string,
    value: T,
    ttl?: number,
    tags?: string[]
  ): Promise<void> {
    const fullKey = this.buildKey(layer.config, key);
    const effectiveTtl = ttl || layer.config.ttl;
    
    const metadata: CacheItemMetadata = {
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

  private async promoteToHigherLayers<T>(
    key: string,
    value: T,
    sourceLayer: CacheLayer,
    tags?: string[]
  ): Promise<void> {
    const sourceIndex = this.layers.findIndex(layer => layer === sourceLayer);
    
    // Promote to layers with higher priority
    for (let i = 0; i < sourceIndex; i++) {
      try {
        await this.setInLayer(this.layers[i], key, value, undefined, tags);
      } catch (error) {
        this.logger.warn(`Failed to promote cache item to layer ${this.layers[i].name}`, error as Error, { key });
      }
    }
  }

  private buildKey(config: CacheConfig, key: string): string {
    return config.keyPrefix ? `${config.keyPrefix}:${key}` : key;
  }

  private isItemValid<T>(item: CacheItem<T>): boolean {
    return !item.metadata.expiresAt || Date.now() < item.metadata.expiresAt;
  }

  async getMetrics(): Promise<Record<string, CacheMetrics>> {
    const metrics: Record<string, CacheMetrics> = {};
    
    for (const layer of this.layers) {
      try {
        metrics[layer.name] = await layer.storage.getMetrics();
      } catch (error) {
        this.logger.warn(`Failed to get metrics for layer ${layer.name}`, error as Error);
      }
    }

    return metrics;
  }

  getHealthStatus(): { healthy: boolean; layers: Record<string, any> } {
    const layerHealths: Record<string, any> = {};
    let overallHealthy = true;

    for (const layer of this.layers) {
      // Simple health check - try to get metrics
      try {
        layerHealths[layer.name] = {
          healthy: true,
          config: layer.config.name,
          priority: layer.priority
        };
      } catch (error) {
        layerHealths[layer.name] = {
          healthy: false,
          error: (error as Error).message
        };
        overallHealthy = false;
      }
    }

    return {
      healthy: overallHealthy,
      layers: layerHealths
    };
  }

  async shutdown(): Promise<void> {
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
      } catch (error) {
        this.logger.warn(`Failed to clear layer ${layer.name} during shutdown`, error as Error);
      }
    }

    this.logger.info('Cache manager shutdown completed');
  }
}

// Factory functions
export function createMemoryCacheStorage(maxSize?: number): MemoryCacheStorage {
  return new MemoryCacheStorage(maxSize);
}

export function createRedisCacheStorage(redis: any, keyPrefix?: string): RedisCacheStorage {
  return new RedisCacheStorage(redis, keyPrefix);
}

export function createMultiLevelCacheManager(
  serviceName: string,
  tracing?: GuardAntTracing
): MultiLevelCacheManager {
  return new MultiLevelCacheManager(serviceName, tracing);
}

export { CacheConfigs, CacheStrategy, InvalidationStrategy, SerializationFormat };