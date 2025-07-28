import { cors } from 'hono/cors';

// CORS configuration for public API
export const corsMiddleware = cors({
  origin: (origin) => {
    // Allow all guardant.me subdomains
    if (origin?.includes('.guardant.me') || origin?.includes('localhost')) {
      return origin;
    }
    
    // Allow requests without origin (e.g., mobile apps, curl)
    if (!origin) {
      return '*';
    }
    
    // For custom domains, we'll need to check against nest settings
    // For now, allow all origins for public status pages
    return origin;
  },
  allowHeaders: [
    'Origin',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Requested-With',
    'Cache-Control',
  ],
  allowMethods: ['GET', 'OPTIONS'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
  credentials: false,
  maxAge: 86400, // 24 hours
});