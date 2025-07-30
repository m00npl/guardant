"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const cors_1 = require("./middleware/cors");
const status_1 = require("./routes/status");
const worker_registration_1 = require("./routes/worker-registration");
const install_1 = require("./routes/install");
const logger_1 = require("../../../shared/logger");
const health_1 = require("../../../shared/health");
const metrics_1 = require("../../../shared/metrics");
const tracing_1 = require("../../../shared/tracing");
const redis_1 = require("./utils/redis");
// Initialize logger
const logger = (0, logger_1.createLogger)('api-public');
// Initialize health checker
const healthChecker = new health_1.HealthChecker('api-public', '1.0.0');
// Initialize metrics collector
const metricsCollector = (0, metrics_1.getMetricsCollector)('guardant_public_api');
// Initialize tracing
const tracing = (0, tracing_1.initializeTracing)('guardant-public-api', {
    serviceVersion: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
});
// Initialize Hono app
const app = new hono_1.Hono();
// Global middleware
app.use('*', cors_1.corsMiddleware);
app.use('*', (0, health_1.createHealthMiddleware)(healthChecker));
app.use('*', (0, metrics_1.createMetricsMiddleware)(metricsCollector));
app.use('*', (0, tracing_1.createTracingMiddleware)(tracing));
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
        requestLogger.httpRequest(c.req.method, c.req.path, c.res.status, duration, { requestId });
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
const healthEndpoints = (0, health_1.createHealthEndpoints)(healthChecker);
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
app.route('/api/status', status_1.statusRoutes);
app.route('/api/public/workers', worker_registration_1.registrationApi);
app.route('/install', install_1.installRoutes);
// Root endpoint - API info
app.get('/', (c) => {
    return c.json({
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
    return c.json({
        success: false,
        error: 'Endpoint not found',
        timestamp: Date.now(),
    }, 404);
});
// Error handler
app.onError((err, c) => {
    console.error('Unhandled error:', err);
    return c.json({
        success: false,
        error: 'Internal server error',
        timestamp: Date.now(),
    }, 500);
});
// Initialize health checks
async function setupHealthChecks() {
    // Redis health check
    healthChecker.addCheck('redis', health_1.commonHealthChecks.redis(redis_1.redis));
    healthChecker.addCheck('redis-pubsub', health_1.commonHealthChecks.redis(redis_1.redisPubSub));
    // Redis service health check (custom)
    healthChecker.addCheck('redis-service', health_1.commonHealthChecks.storage(async () => {
        // Test basic functionality
        await redis_1.redisService.getNestBySubdomain('health-check-test');
    }, 'redis-service'));
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
exports.default = {
    port,
    fetch: app.fetch,
};
//# sourceMappingURL=index.js.map