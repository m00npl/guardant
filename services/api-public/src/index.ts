import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { statusRoutes } from './routes/status';
import { registrationApi } from './routes/worker-registration';
import type { ApiResponse } from './types';
import { createLogger, createRequestLogger } from '../../../shared/logger';
import { HealthChecker, commonHealthChecks, createHealthEndpoints, createHealthMiddleware } from '../../../shared/health';
import { getMetricsCollector, createMetricsMiddleware } from '../../../shared/metrics';
import { initializeTracing, createTracingMiddleware } from '../../../shared/tracing';
import { redis, redisPubSub, redisService } from './utils/redis';

// Initialize logger
const logger = createLogger('api-public');

// Initialize health checker
const healthChecker = new HealthChecker('api-public', '1.0.0');

// Initialize metrics collector
const metricsCollector = getMetricsCollector('guardant_public_api');

// Initialize tracing
const tracing = initializeTracing('guardant-public-api', {
  serviceVersion: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
});

// Initialize Hono app
const app = new Hono();

// Global middleware
app.use('*', corsMiddleware);
app.use('*', createHealthMiddleware(healthChecker));
app.use('*', createMetricsMiddleware(metricsCollector));
app.use('*', createTracingMiddleware(tracing));

// Structured request logging
app.use('*', (c, next) => {
  const startTime = performance.now();
  const requestId = c.req.header('x-request-id') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create request-scoped logger
  const requestLogger = logger.child({
    requestId,
    userAgent: c.req.header('user-agent'),
    ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
  });

  // Log request start
  requestLogger.info('Request started', {
    method: c.req.method,
    path: c.req.path,
    query: c.req.query(),
    subdomain: c.req.header('host')?.split('.')[0],
  });

  // Store logger and request ID in context
  c.set('logger', requestLogger);
  c.set('requestId', requestId);
  c.res.headers.set('x-request-id', requestId);

  return next().then(() => {
    const duration = performance.now() - startTime;
    
    requestLogger.httpRequest(
      c.req.method,
      c.req.path,
      c.res.status,
      duration,
      { requestId }
    );
  }).catch((error) => {
    const duration = performance.now() - startTime;
    
    requestLogger.error('Request failed', error, {
      requestId,
      method: c.req.method,
      path: c.req.path,
      duration,
    });

    throw error;
  });
});

// Health check endpoints
const healthEndpoints = createHealthEndpoints(healthChecker);
app.get('/health', healthEndpoints.basic);
app.get('/health/detailed', healthEndpoints.detailed);
app.get('/health/ready', healthEndpoints.ready);
app.get('/health/live', healthEndpoints.live);

// Metrics endpoint
app.get('/metrics', (c) => {
  const metrics = metricsCollector.generatePrometheusMetrics();
  return c.text(metrics, 200, {
    'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
  });
});

// Metrics JSON endpoint (for debugging)
app.get('/metrics/json', (c) => {
  const metrics = metricsCollector.getMetricsJSON();
  return c.json(metrics);
});

// API routes
app.route('/api/status', statusRoutes);
app.route('/api/public/workers', registrationApi);

// Root endpoint - API info
app.get('/', (c) => {
  return c.json<ApiResponse>({
    success: true,
    data: {
      name: 'GuardAnt Public API',
      description: 'Public API for GuardAnt status pages',
      version: '1.0.0',
      endpoints: {
        status: 'POST /api/status/page (body: {subdomain})',
        history: 'POST /api/status/history (body: {subdomain, serviceId, period?})',
        events: 'GET /api/status/:subdomain/events (SSE stream)',
        rss: 'GET /api/status/:subdomain/rss (RSS feed)',
        widget: 'GET /api/status/:subdomain/widget.js?theme=light&services=all&compact=false',
        widgetConfig: 'POST /api/status/widget-config (body: {subdomain, theme?, services?, compact?})',
      },
      documentation: 'https://docs.guardant.me/api/public',
    },
    timestamp: Date.now(),
  });
});

// 404 handler
app.notFound((c) => {
  return c.json<ApiResponse>({
    success: false,
    error: 'Endpoint not found',
    timestamp: Date.now(),
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json<ApiResponse>({
    success: false,
    error: 'Internal server error',
    timestamp: Date.now(),
  }, 500);
});

// Initialize health checks
async function setupHealthChecks() {
  // Redis health check
  healthChecker.addCheck('redis', commonHealthChecks.redis(redis));
  healthChecker.addCheck('redis-pubsub', commonHealthChecks.redis(redisPubSub));
  
  // Redis service health check (custom)
  healthChecker.addCheck('redis-service', commonHealthChecks.storage(
    async () => {
      // Test basic functionality
      await redisService.getNestBySubdomain('health-check-test');
    },
    'redis-service'
  ));

  logger.info('Health checks configured', {
    component: 'health',
    checks: ['redis', 'redis-pubsub', 'redis-service']
  });
}

// Start server
const port = process.env.PORT || 3002;

// Setup health checks on startup
setupHealthChecks().catch(error => {
  logger.error('Failed to setup health checks', error);
});

console.log(`🚀 GuardAnt Public API starting on port ${port}...`);
console.log(`🐜 Ready to serve status data from WorkerAnt colonies!`);

export default {
  port,
  fetch: app.fetch,
};