/**
 * Advanced rate limiting system with per-tenant and per-endpoint controls
 * Supports sliding window, token bucket, and fixed window algorithms
 */
import type { GuardAntTracing } from './tracing';
export declare enum RateLimitAlgorithm {
    SLIDING_WINDOW = "sliding_window",
    TOKEN_BUCKET = "token_bucket",
    FIXED_WINDOW = "fixed_window",
    LEAKY_BUCKET = "leaky_bucket"
}
export interface RateLimitConfig {
    algorithm: RateLimitAlgorithm;
    windowSizeMs: number;
    maxRequests: number;
    burstLimit?: number;
    refillRate?: number;
    blockDurationMs?: number;
    skipSuccessfulRequests?: boolean;
    skipOptions?: boolean;
    keyGenerator?: (context: RateLimitContext) => string;
    customMessage?: string;
}
export interface RateLimitContext {
    ip: string;
    userAgent: string;
    nestId?: string;
    userId?: string;
    endpoint: string;
    method: string;
    requestId: string;
}
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalHits: number;
    retryAfter?: number;
}
export interface RateLimitStatus {
    key: string;
    hits: number;
    remaining: number;
    resetTime: number;
    blocked: boolean;
    blockedUntil?: number;
}
export declare const RateLimitConfigs: {
    GLOBAL: {
        algorithm: RateLimitAlgorithm;
        windowSizeMs: number;
        maxRequests: number;
        blockDurationMs: number;
    };
    TENANT: {
        algorithm: RateLimitAlgorithm;
        windowSizeMs: number;
        maxRequests: number;
        blockDurationMs: number;
        keyGenerator: (ctx: RateLimitContext) => string;
    };
    AUTH: {
        algorithm: RateLimitAlgorithm;
        windowSizeMs: number;
        maxRequests: number;
        blockDurationMs: number;
        keyGenerator: (ctx: RateLimitContext) => string;
    };
    REGISTRATION: {
        algorithm: RateLimitAlgorithm;
        windowSizeMs: number;
        maxRequests: number;
        blockDurationMs: number;
        keyGenerator: (ctx: RateLimitContext) => string;
    };
    PUBLIC_API: {
        algorithm: RateLimitAlgorithm;
        windowSizeMs: number;
        maxRequests: number;
        burstLimit: number;
        refillRate: number;
        keyGenerator: (ctx: RateLimitContext) => string;
    };
    ADMIN: {
        algorithm: RateLimitAlgorithm;
        windowSizeMs: number;
        maxRequests: number;
        blockDurationMs: number;
        keyGenerator: (ctx: RateLimitContext) => string;
    };
    SERVICE_MANAGEMENT: {
        algorithm: RateLimitAlgorithm;
        windowSizeMs: number;
        maxRequests: number;
        blockDurationMs: number;
        keyGenerator: (ctx: RateLimitContext) => string;
    };
    PAYMENT: {
        algorithm: RateLimitAlgorithm;
        windowSizeMs: number;
        maxRequests: number;
        blockDurationMs: number;
        keyGenerator: (ctx: RateLimitContext) => string;
    };
    MONITORING: {
        algorithm: RateLimitAlgorithm;
        windowSizeMs: number;
        maxRequests: number;
        burstLimit: number;
        refillRate: number;
        keyGenerator: (ctx: RateLimitContext) => string;
    };
};
export interface RateLimitStorage {
    get(key: string): Promise<any>;
    set(key: string, value: any, ttlMs?: number): Promise<void>;
    increment(key: string, amount?: number, ttlMs?: number): Promise<number>;
    delete(key: string): Promise<boolean>;
    exists(key: string): Promise<boolean>;
}
export declare class RedisRateLimitStorage implements RateLimitStorage {
    private redis;
    constructor(redis: any);
    get(key: string): Promise<any>;
    set(key: string, value: any, ttlMs?: number): Promise<void>;
    increment(key: string, amount?: number, ttlMs?: number): Promise<number>;
    delete(key: string): Promise<boolean>;
    exists(key: string): Promise<boolean>;
}
export declare class MemoryRateLimitStorage implements RateLimitStorage {
    private store;
    get(key: string): Promise<any>;
    set(key: string, value: any, ttlMs?: number): Promise<void>;
    increment(key: string, amount?: number, ttlMs?: number): Promise<number>;
    delete(key: string): Promise<boolean>;
    exists(key: string): Promise<boolean>;
}
export declare class RateLimiter {
    private storage;
    private serviceName;
    private logger;
    private tracing?;
    constructor(storage: RateLimitStorage, serviceName: string, tracing?: GuardAntTracing);
    private generateKey;
    private slidingWindowCheck;
    private fixedWindowCheck;
    private tokenBucketCheck;
    checkLimit(config: RateLimitConfig, context: RateLimitContext): Promise<RateLimitResult>;
    getStatus(config: RateLimitConfig, context: RateLimitContext): Promise<RateLimitStatus>;
    resetLimit(config: RateLimitConfig, context: RateLimitContext): Promise<boolean>;
    getAllLimits(): Promise<RateLimitStatus[]>;
}
export declare function createRateLimitMiddleware(rateLimiter: RateLimiter, configs: Record<string, RateLimitConfig>): (c: any, next: any) => Promise<any>;
export declare function createRateLimiter(storage: RateLimitStorage, serviceName: string, tracing?: GuardAntTracing): RateLimiter;
export declare function createRedisRateLimitStorage(redis: any): RedisRateLimitStorage;
export declare function createMemoryRateLimitStorage(): MemoryRateLimitStorage;
export { RateLimitAlgorithm, RateLimitConfigs };
//# sourceMappingURL=rate-limiting.d.ts.map