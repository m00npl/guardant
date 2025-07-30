"use strict";
/**
 * Advanced rate limiting system with per-tenant and per-endpoint controls
 * Supports sliding window, token bucket, and fixed window algorithms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = exports.MemoryRateLimitStorage = exports.RedisRateLimitStorage = exports.RateLimitConfigs = exports.RateLimitAlgorithm = void 0;
exports.createRateLimitMiddleware = createRateLimitMiddleware;
exports.createRateLimiter = createRateLimiter;
exports.createRedisRateLimitStorage = createRedisRateLimitStorage;
exports.createMemoryRateLimitStorage = createMemoryRateLimitStorage;
const logger_1 = require("./logger");
const error_handling_1 = require("./error-handling");
var RateLimitAlgorithm;
(function (RateLimitAlgorithm) {
    RateLimitAlgorithm["SLIDING_WINDOW"] = "sliding_window";
    RateLimitAlgorithm["TOKEN_BUCKET"] = "token_bucket";
    RateLimitAlgorithm["FIXED_WINDOW"] = "fixed_window";
    RateLimitAlgorithm["LEAKY_BUCKET"] = "leaky_bucket";
})(RateLimitAlgorithm || (exports.RateLimitAlgorithm = RateLimitAlgorithm = {}));
// Predefined rate limit configurations for different use cases
exports.RateLimitConfigs = {
    // Global API limits (very lenient)
    GLOBAL: {
        algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
        windowSizeMs: 60000, // 1 minute
        maxRequests: 1000,
        blockDurationMs: 60000 // 1 minute block
    },
    // Per tenant limits (moderate)
    TENANT: {
        algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
        windowSizeMs: 60000, // 1 minute
        maxRequests: 100,
        blockDurationMs: 300000, // 5 minute block
        keyGenerator: (ctx) => `tenant:${ctx.nestId}:${ctx.endpoint}`
    },
    // Authentication endpoints (strict)
    AUTH: {
        algorithm: RateLimitAlgorithm.FIXED_WINDOW,
        windowSizeMs: 900000, // 15 minutes
        maxRequests: 5,
        blockDurationMs: 900000, // 15 minute block
        keyGenerator: (ctx) => `auth:${ctx.ip}:${ctx.endpoint}`
    },
    // Registration (very strict)
    REGISTRATION: {
        algorithm: RateLimitAlgorithm.FIXED_WINDOW,
        windowSizeMs: 3600000, // 1 hour
        maxRequests: 3,
        blockDurationMs: 3600000, // 1 hour block
        keyGenerator: (ctx) => `register:${ctx.ip}`
    },
    // Public API (lenient but controlled)
    PUBLIC_API: {
        algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
        windowSizeMs: 60000,
        maxRequests: 60,
        burstLimit: 10,
        refillRate: 1, // 1 token per second
        keyGenerator: (ctx) => `public:${ctx.ip}:${ctx.nestId || 'unknown'}`
    },
    // Admin operations (moderate)
    ADMIN: {
        algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
        windowSizeMs: 60000,
        maxRequests: 50,
        blockDurationMs: 600000, // 10 minute block
        keyGenerator: (ctx) => `admin:${ctx.nestId}:${ctx.userId}`
    },
    // Service management (moderate)
    SERVICE_MANAGEMENT: {
        algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
        windowSizeMs: 300000, // 5 minutes
        maxRequests: 20,
        blockDurationMs: 600000, // 10 minute block
        keyGenerator: (ctx) => `service:${ctx.nestId}:${ctx.endpoint}`
    },
    // Payment operations (strict)
    PAYMENT: {
        algorithm: RateLimitAlgorithm.FIXED_WINDOW,
        windowSizeMs: 300000, // 5 minutes
        maxRequests: 5,
        blockDurationMs: 1800000, // 30 minute block
        keyGenerator: (ctx) => `payment:${ctx.nestId}:${ctx.userId}`
    },
    // Metrics and monitoring (lenient)
    MONITORING: {
        algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
        windowSizeMs: 60000,
        maxRequests: 200,
        burstLimit: 50,
        refillRate: 3,
        keyGenerator: (ctx) => `monitor:${ctx.nestId || ctx.ip}`
    }
};
// Redis-based storage implementation
class RedisRateLimitStorage {
    constructor(redis) {
        this.redis = redis;
    }
    async get(key) {
        const value = await this.redis.get(`ratelimit:${key}`);
        return value ? JSON.parse(value) : null;
    }
    async set(key, value, ttlMs) {
        const serialized = JSON.stringify(value);
        if (ttlMs) {
            await this.redis.setex(`ratelimit:${key}`, Math.ceil(ttlMs / 1000), serialized);
        }
        else {
            await this.redis.set(`ratelimit:${key}`, serialized);
        }
    }
    async increment(key, amount = 1, ttlMs) {
        const fullKey = `ratelimit:${key}`;
        const result = await this.redis.incrby(fullKey, amount);
        if (ttlMs && result === amount) {
            // Set TTL only if this is the first increment
            await this.redis.expire(fullKey, Math.ceil(ttlMs / 1000));
        }
        return result;
    }
    async delete(key) {
        const result = await this.redis.del(`ratelimit:${key}`);
        return result > 0;
    }
    async exists(key) {
        const result = await this.redis.exists(`ratelimit:${key}`);
        return result === 1;
    }
}
exports.RedisRateLimitStorage = RedisRateLimitStorage;
// In-memory storage for testing/development
class MemoryRateLimitStorage {
    constructor() {
        this.store = new Map();
    }
    async get(key) {
        const entry = this.store.get(`ratelimit:${key}`);
        if (!entry)
            return null;
        if (entry.expiry && Date.now() > entry.expiry) {
            this.store.delete(`ratelimit:${key}`);
            return null;
        }
        return entry.value;
    }
    async set(key, value, ttlMs) {
        const entry = {
            value,
            expiry: ttlMs ? Date.now() + ttlMs : undefined
        };
        this.store.set(`ratelimit:${key}`, entry);
    }
    async increment(key, amount = 1, ttlMs) {
        const fullKey = `ratelimit:${key}`;
        const entry = this.store.get(fullKey);
        const currentValue = entry?.value || 0;
        const newValue = currentValue + amount;
        await this.set(key, newValue, ttlMs);
        return newValue;
    }
    async delete(key) {
        return this.store.delete(`ratelimit:${key}`);
    }
    async exists(key) {
        const entry = this.store.get(`ratelimit:${key}`);
        if (!entry)
            return false;
        if (entry.expiry && Date.now() > entry.expiry) {
            this.store.delete(`ratelimit:${key}`);
            return false;
        }
        return true;
    }
}
exports.MemoryRateLimitStorage = MemoryRateLimitStorage;
// Main rate limiter class
class RateLimiter {
    constructor(storage, serviceName, tracing) {
        this.storage = storage;
        this.serviceName = serviceName;
        this.logger = (0, logger_1.createLogger)(`${serviceName}-rate-limiter`);
        this.tracing = tracing;
    }
    generateKey(config, context) {
        if (config.keyGenerator) {
            return config.keyGenerator(context);
        }
        // Default key generation
        const parts = [context.endpoint];
        if (context.nestId)
            parts.push(`nest:${context.nestId}`);
        if (context.userId)
            parts.push(`user:${context.userId}`);
        parts.push(`ip:${context.ip}`);
        return parts.join(':');
    }
    async slidingWindowCheck(key, config, now) {
        const windowStart = now - config.windowSizeMs;
        const windowKey = `sw:${key}`;
        // Get current window data
        const windowData = await this.storage.get(windowKey) || [];
        // Filter out old requests
        const validRequests = windowData.filter((timestamp) => timestamp > windowStart);
        // Check if limit exceeded
        const allowed = validRequests.length < config.maxRequests;
        if (allowed) {
            // Add current request
            validRequests.push(now);
            await this.storage.set(windowKey, validRequests, config.windowSizeMs);
        }
        const resetTime = Math.min(...validRequests) + config.windowSizeMs;
        return {
            allowed,
            remaining: Math.max(0, config.maxRequests - validRequests.length - (allowed ? 0 : 1)),
            resetTime,
            totalHits: validRequests.length,
            retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000)
        };
    }
    async fixedWindowCheck(key, config, now) {
        const windowStart = Math.floor(now / config.windowSizeMs) * config.windowSizeMs;
        const windowKey = `fw:${key}:${windowStart}`;
        const hits = await this.storage.increment(windowKey, 1, config.windowSizeMs);
        const allowed = hits <= config.maxRequests;
        const resetTime = windowStart + config.windowSizeMs;
        return {
            allowed,
            remaining: Math.max(0, config.maxRequests - hits),
            resetTime,
            totalHits: hits,
            retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000)
        };
    }
    async tokenBucketCheck(key, config, now) {
        const bucketKey = `tb:${key}`;
        const bucketData = await this.storage.get(bucketKey) || {
            tokens: config.maxRequests,
            lastRefill: now
        };
        const refillRate = config.refillRate || 1;
        const timePassed = now - bucketData.lastRefill;
        const tokensToAdd = Math.floor((timePassed / 1000) * refillRate);
        bucketData.tokens = Math.min(config.burstLimit || config.maxRequests, bucketData.tokens + tokensToAdd);
        bucketData.lastRefill = now;
        const allowed = bucketData.tokens >= 1;
        if (allowed) {
            bucketData.tokens -= 1;
        }
        await this.storage.set(bucketKey, bucketData, config.windowSizeMs);
        const resetTime = now + Math.ceil((1 - bucketData.tokens) / refillRate) * 1000;
        return {
            allowed,
            remaining: Math.floor(bucketData.tokens),
            resetTime,
            totalHits: config.maxRequests - Math.floor(bucketData.tokens),
            retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000)
        };
    }
    async checkLimit(config, context) {
        const now = Date.now();
        const key = this.generateKey(config, context);
        // Check if currently blocked
        const blockKey = `block:${key}`;
        const blockedUntil = await this.storage.get(blockKey);
        if (blockedUntil && now < blockedUntil) {
            return {
                allowed: false,
                remaining: 0,
                resetTime: blockedUntil,
                totalHits: config.maxRequests + 1,
                retryAfter: Math.ceil((blockedUntil - now) / 1000)
            };
        }
        let result;
        try {
            switch (config.algorithm) {
                case RateLimitAlgorithm.SLIDING_WINDOW:
                    result = await this.slidingWindowCheck(key, config, now);
                    break;
                case RateLimitAlgorithm.FIXED_WINDOW:
                    result = await this.fixedWindowCheck(key, config, now);
                    break;
                case RateLimitAlgorithm.TOKEN_BUCKET:
                    result = await this.tokenBucketCheck(key, config, now);
                    break;
                default:
                    throw new Error(`Unsupported rate limit algorithm: ${config.algorithm}`);
            }
            // If request is denied and block duration is configured, set block
            if (!result.allowed && config.blockDurationMs) {
                const blockUntil = now + config.blockDurationMs;
                await this.storage.set(blockKey, blockUntil, config.blockDurationMs);
                result.retryAfter = Math.ceil(config.blockDurationMs / 1000);
            }
            // Log rate limit events
            if (!result.allowed) {
                this.logger.warn('Rate limit exceeded', new error_handling_1.RateLimitError(context, config.maxRequests, Math.floor(config.windowSizeMs / 1000)), {
                    key,
                    algorithm: config.algorithm,
                    hits: result.totalHits,
                    limit: config.maxRequests,
                    endpoint: context.endpoint,
                    nestId: context.nestId,
                    userId: context.userId
                });
                if (this.tracing) {
                    this.tracing.addEvent('rate_limit_exceeded', {
                        'rate_limit.key': key,
                        'rate_limit.hits': result.totalHits.toString(),
                        'rate_limit.limit': config.maxRequests.toString(),
                        'rate_limit.algorithm': config.algorithm,
                    });
                }
            }
            return result;
        }
        catch (error) {
            this.logger.error('Rate limiter error', error, { key, context });
            // On error, allow the request (fail open)
            return {
                allowed: true,
                remaining: config.maxRequests,
                resetTime: now + config.windowSizeMs,
                totalHits: 0
            };
        }
    }
    async getStatus(config, context) {
        const key = this.generateKey(config, context);
        const now = Date.now();
        // Check current usage
        const result = await this.checkLimit(config, context);
        // Check if blocked
        const blockKey = `block:${key}`;
        const blockedUntil = await this.storage.get(blockKey);
        return {
            key,
            hits: result.totalHits,
            remaining: result.remaining,
            resetTime: result.resetTime,
            blocked: !!blockedUntil && now < blockedUntil,
            blockedUntil: blockedUntil || undefined
        };
    }
    async resetLimit(config, context) {
        const key = this.generateKey(config, context);
        // Delete all keys related to this limit
        const promises = [
            this.storage.delete(`sw:${key}`),
            this.storage.delete(`fw:${key}`),
            this.storage.delete(`tb:${key}`),
            this.storage.delete(`block:${key}`)
        ];
        const results = await Promise.all(promises);
        const deleted = results.some(result => result);
        if (deleted) {
            this.logger.info('Rate limit reset', { key, context });
            if (this.tracing) {
                this.tracing.addEvent('rate_limit_reset', {
                    'rate_limit.key': key,
                });
            }
        }
        return deleted;
    }
    // Get all active rate limits (for monitoring)
    async getAllLimits() {
        // This would require scanning Redis keys, which is expensive
        // In production, you'd want to maintain a separate index
        // For now, return empty array
        return [];
    }
}
exports.RateLimiter = RateLimiter;
// Middleware factory for HTTP frameworks
function createRateLimitMiddleware(rateLimiter, configs) {
    return async (c, next) => {
        const method = c.req.method;
        const path = c.req.path;
        // Skip OPTIONS requests if configured
        if (method === 'OPTIONS') {
            const config = Object.values(configs).find(cfg => !cfg.skipOptions);
            if (!config) {
                return next();
            }
        }
        // Build context
        const context = {
            ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1',
            userAgent: c.req.header('user-agent') || 'unknown',
            nestId: c.get('nestId'),
            userId: c.get('userId'),
            endpoint: path,
            method,
            requestId: c.get('requestId') || 'unknown'
        };
        // Find applicable rate limit config
        let applicableConfig = null;
        let configName = '';
        // Check for specific endpoint configs first
        for (const [name, config] of Object.entries(configs)) {
            if (path.includes(name.toLowerCase()) || name === 'global') {
                applicableConfig = config;
                configName = name;
                break;
            }
        }
        if (!applicableConfig) {
            // Use global config as fallback
            applicableConfig = configs.GLOBAL || exports.RateLimitConfigs.GLOBAL;
            configName = 'GLOBAL';
        }
        // Check rate limit
        const result = await rateLimiter.checkLimit(applicableConfig, context);
        // Set rate limit headers
        c.res.headers.set('X-RateLimit-Limit', applicableConfig.maxRequests.toString());
        c.res.headers.set('X-RateLimit-Remaining', result.remaining.toString());
        c.res.headers.set('X-RateLimit-Reset', Math.floor(result.resetTime / 1000).toString());
        c.res.headers.set('X-RateLimit-Policy', `${applicableConfig.maxRequests};w=${Math.floor(applicableConfig.windowSizeMs / 1000)};comment="${configName}"`);
        if (!result.allowed) {
            if (result.retryAfter) {
                c.res.headers.set('Retry-After', result.retryAfter.toString());
            }
            return c.json({
                error: applicableConfig.customMessage || 'Rate limit exceeded',
                code: 'RATE_LIMIT_EXCEEDED',
                details: {
                    limit: applicableConfig.maxRequests,
                    windowSeconds: Math.floor(applicableConfig.windowSizeMs / 1000),
                    retryAfter: result.retryAfter
                }
            }, 429);
        }
        return next();
    };
}
// Factory functions
function createRateLimiter(storage, serviceName, tracing) {
    return new RateLimiter(storage, serviceName, tracing);
}
function createRedisRateLimitStorage(redis) {
    return new RedisRateLimitStorage(redis);
}
function createMemoryRateLimitStorage() {
    return new MemoryRateLimitStorage();
}
//# sourceMappingURL=rate-limiting.js.map