"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheProfiles = exports.cacheMiddleware = void 0;
/**
 * Cache control middleware for public API responses
 */
const cacheMiddleware = (maxAge = 30) => {
    return async (c, next) => {
        await next();
        // Only cache successful responses
        if (c.res.status === 200) {
            c.header('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`);
            c.header('ETag', `W/"${Date.now()}"`);
        }
        else {
            c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    };
};
exports.cacheMiddleware = cacheMiddleware;
/**
 * Cache control for different types of endpoints
 */
exports.cacheProfiles = {
    // Status data - cache for 30 seconds
    status: (0, exports.cacheMiddleware)(30),
    // Historical data - cache for 5 minutes
    history: (0, exports.cacheMiddleware)(300),
    // Incidents - cache for 1 minute
    incidents: (0, exports.cacheMiddleware)(60),
    // Static data (nest info) - cache for 10 minutes
    static: (0, exports.cacheMiddleware)(600),
};
//# sourceMappingURL=cache.js.map