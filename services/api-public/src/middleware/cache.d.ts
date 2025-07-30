import type { Context, Next } from 'hono';
/**
 * Cache control middleware for public API responses
 */
export declare const cacheMiddleware: (maxAge?: number) => (c: Context, next: Next) => Promise<void>;
/**
 * Cache control for different types of endpoints
 */
export declare const cacheProfiles: {
    status: (c: Context, next: Next) => Promise<void>;
    history: (c: Context, next: Next) => Promise<void>;
    incidents: (c: Context, next: Next) => Promise<void>;
    static: (c: Context, next: Next) => Promise<void>;
};
//# sourceMappingURL=cache.d.ts.map