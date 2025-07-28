import type { Context, Next } from 'hono';

/**
 * Cache control middleware for public API responses
 */
export const cacheMiddleware = (maxAge: number = 30) => {
  return async (c: Context, next: Next) => {
    await next();
    
    // Only cache successful responses
    if (c.res.status === 200) {
      c.header('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`);
      c.header('ETag', `W/"${Date.now()}"`);
    } else {
      c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  };
};

/**
 * Cache control for different types of endpoints
 */
export const cacheProfiles = {
  // Status data - cache for 30 seconds
  status: cacheMiddleware(30),
  
  // Historical data - cache for 5 minutes
  history: cacheMiddleware(300),
  
  // Incidents - cache for 1 minute
  incidents: cacheMiddleware(60),
  
  // Static data (nest info) - cache for 10 minutes
  static: cacheMiddleware(600),
};