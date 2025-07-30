"use strict";
/**
 * OpenTelemetry distributed tracing system for GuardAnt services
 * Provides comprehensive tracing across all microservices
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TracingManager = exports.defaultTracingConfig = exports.GuardAntTracing = void 0;
exports.createTracingMiddleware = createTracingMiddleware;
exports.createExpressTracingMiddleware = createExpressTracingMiddleware;
exports.getTracing = getTracing;
exports.initializeTracing = initializeTracing;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_jaeger_1 = require("@opentelemetry/exporter-jaeger");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const exporter_prometheus_1 = require("@opentelemetry/exporter-prometheus");
const api_1 = require("@opentelemetry/api");
class TracingManager {
    constructor(serviceName) {
        this.sdk = null;
        this.tracer = null;
        this.initialized = false;
        this.serviceName = serviceName;
    }
    /**
     * Initialize OpenTelemetry tracing
     */
    initialize(config) {
        if (this.initialized) {
            console.warn('Tracing already initialized');
            return;
        }
        const resource = new resources_1.Resource({
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion || '1.0.0',
            [semantic_conventions_1.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment || 'development',
        });
        // Configure exporters
        const exporters = [];
        if (config.enableConsoleExporter) {
            exporters.push(new sdk_trace_base_1.ConsoleSpanExporter());
        }
        if (config.enableJaegerExporter && config.jaegerEndpoint) {
            exporters.push(new exporter_jaeger_1.JaegerExporter({
                endpoint: config.jaegerEndpoint,
            }));
        }
        // If no exporters specified, use console in development
        if (exporters.length === 0 && process.env.NODE_ENV !== 'production') {
            exporters.push(new sdk_trace_base_1.ConsoleSpanExporter());
        }
        this.sdk = new sdk_node_1.NodeSDK({
            resource,
            traceExporter: exporters.length > 0 ? exporters[0] : undefined,
            instrumentations: [(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
                    // Disable some instrumentations that might be too verbose
                    '@opentelemetry/instrumentation-fs': {
                        enabled: false,
                    },
                    // Enable HTTP instrumentation for requests between services
                    '@opentelemetry/instrumentation-http': {
                        enabled: true,
                        requestHook: (span, request) => {
                            span.setAttributes({
                                'http.user_agent': request.headers?.['user-agent'] || '',
                                'guardant.request_id': request.headers?.['x-request-id'] || '',
                            });
                        },
                    },
                    // Enable Redis instrumentation
                    '@opentelemetry/instrumentation-redis': {
                        enabled: true,
                    },
                    // Enable Express/HTTP frameworks
                    '@opentelemetry/instrumentation-express': {
                        enabled: true,
                    },
                })],
            metricReader: new exporter_prometheus_1.PrometheusExporter({
                port: 0, // Don't start HTTP server for metrics
            }),
        });
        try {
            this.sdk.start();
            this.tracer = api_1.trace.getTracer(config.serviceName, config.serviceVersion);
            this.initialized = true;
            console.log(`🔍 OpenTelemetry tracing initialized for ${config.serviceName}`);
        }
        catch (error) {
            console.error('Failed to initialize OpenTelemetry:', error);
        }
    }
    /**
     * Get the tracer instance
     */
    getTracer() {
        if (!this.tracer) {
            throw new Error('Tracing not initialized. Call initialize() first.');
        }
        return this.tracer;
    }
    /**
     * Create a new span
     */
    startSpan(options) {
        const tracer = this.getTracer();
        const spanOptions = {
            kind: options.kind || api_1.SpanKind.INTERNAL,
            attributes: {
                'service.name': this.serviceName,
                ...options.attributes,
            },
        };
        // Set parent context if provided
        if (options.parentSpan) {
            const parentContext = api_1.trace.setSpan(api_1.context.active(), options.parentSpan);
            return tracer.startSpan(options.name, spanOptions, parentContext);
        }
        return tracer.startSpan(options.name, spanOptions);
    }
    /**
     * Get current active span
     */
    getActiveSpan() {
        return api_1.trace.getActiveSpan();
    }
    /**
     * Execute function with span context
     */
    async withSpan(spanOptions, fn) {
        const span = this.startSpan(spanOptions);
        try {
            const result = await api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), () => fn(span));
            span.setStatus({ code: api_1.SpanStatusCode.OK });
            return result;
        }
        catch (error) {
            span.recordException(error);
            span.setStatus({
                code: api_1.SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Add attributes to current span
     */
    addSpanAttributes(attributes) {
        const span = this.getActiveSpan();
        if (span) {
            span.setAttributes(attributes);
        }
    }
    /**
     * Add event to current span
     */
    addSpanEvent(name, attributes) {
        const span = this.getActiveSpan();
        if (span) {
            span.addEvent(name, attributes);
        }
    }
    /**
     * Get trace context for propagation
     */
    getTraceContext() {
        const span = this.getActiveSpan();
        if (!span)
            return null;
        const spanContext = span.spanContext();
        return {
            traceId: spanContext.traceId,
            spanId: spanContext.spanId,
            parentSpanId: undefined, // Would need to get from parent
        };
    }
    /**
     * Create child span from trace context
     */
    createSpanFromContext(traceContext, spanOptions) {
        // In a real implementation, you'd reconstruct the parent context
        // from the trace context. For now, just create a regular span.
        return this.startSpan(spanOptions);
    }
    /**
     * Shutdown tracing
     */
    async shutdown() {
        if (this.sdk) {
            await this.sdk.shutdown();
            this.initialized = false;
            console.log('🔍 OpenTelemetry tracing shut down');
        }
    }
}
exports.TracingManager = TracingManager;
// Business-specific tracing helpers
class GuardAntTracing {
    constructor(serviceName) {
        this.tracingManager = new TracingManager(serviceName);
    }
    initialize(config) {
        this.tracingManager.initialize(config);
    }
    // HTTP request tracing
    async traceHttpRequest(method, path, handler, attributes) {
        return this.tracingManager.withSpan({
            name: `HTTP ${method} ${path}`,
            kind: api_1.SpanKind.SERVER,
            attributes: {
                'http.method': method,
                'http.route': path,
                'http.scheme': 'http',
                ...attributes,
            },
        }, handler);
    }
    // Database operation tracing
    async traceDbOperation(operation, table, handler, attributes) {
        return this.tracingManager.withSpan({
            name: `DB ${operation} ${table}`,
            kind: api_1.SpanKind.CLIENT,
            attributes: {
                'db.operation': operation,
                'db.collection.name': table,
                'db.system': 'redis',
                ...attributes,
            },
        }, handler);
    }
    // Service monitoring tracing
    async traceServiceCheck(serviceId, serviceType, nestId, handler) {
        return this.tracingManager.withSpan({
            name: `Monitor ${serviceType} service`,
            kind: api_1.SpanKind.INTERNAL,
            attributes: {
                'guardant.service.id': serviceId,
                'guardant.service.type': serviceType,
                'guardant.nest.id': nestId,
                'guardant.operation': 'service_check',
            },
        }, handler);
    }
    // RabbitMQ messaging tracing
    async traceMessagePublish(exchange, routingKey, handler) {
        return this.tracingManager.withSpan({
            name: `Publish to ${exchange}`,
            kind: api_1.SpanKind.PRODUCER,
            attributes: {
                'messaging.system': 'rabbitmq',
                'messaging.destination': exchange,
                'messaging.destination_kind': 'topic',
                'messaging.rabbitmq.routing_key': routingKey,
            },
        }, handler);
    }
    async traceMessageConsume(queue, handler) {
        return this.tracingManager.withSpan({
            name: `Consume from ${queue}`,
            kind: api_1.SpanKind.CONSUMER,
            attributes: {
                'messaging.system': 'rabbitmq',
                'messaging.source': queue,
                'messaging.operation': 'receive',
            },
        }, handler);
    }
    // Business event tracing
    async traceBusinessEvent(eventType, handler, attributes) {
        return this.tracingManager.withSpan({
            name: `Business Event: ${eventType}`,
            kind: api_1.SpanKind.INTERNAL,
            attributes: {
                'guardant.event.type': eventType,
                'guardant.event.category': 'business',
                ...attributes,
            },
        }, handler);
    }
    // Payment processing tracing
    async tracePayment(paymentType, amount, currency, handler) {
        return this.tracingManager.withSpan({
            name: `Payment ${paymentType}`,
            kind: api_1.SpanKind.INTERNAL,
            attributes: {
                'guardant.payment.type': paymentType,
                'guardant.payment.amount': amount,
                'guardant.payment.currency': currency,
            },
        }, handler);
    }
    // Worker job tracing
    async traceWorkerJob(jobType, jobId, handler) {
        return this.tracingManager.withSpan({
            name: `Worker Job: ${jobType}`,
            kind: api_1.SpanKind.INTERNAL,
            attributes: {
                'guardant.job.type': jobType,
                'guardant.job.id': jobId,
                'guardant.worker.queue': jobType,
            },
        }, handler);
    }
    // Utility methods
    addEvent(name, attributes) {
        this.tracingManager.addSpanEvent(name, attributes);
    }
    addAttributes(attributes) {
        this.tracingManager.addSpanAttributes(attributes);
    }
    getTraceContext() {
        return this.tracingManager.getTraceContext();
    }
    async shutdown() {
        await this.tracingManager.shutdown();
    }
}
exports.GuardAntTracing = GuardAntTracing;
// Middleware factory for HTTP frameworks
function createTracingMiddleware(tracing) {
    return (c, next) => {
        const method = c.req.method;
        const path = c.req.path;
        const requestId = c.req.header('x-request-id') || `req_${Date.now()}`;
        return tracing.traceHttpRequest(method, path, async (span) => {
            // Add request-specific attributes
            span.setAttributes({
                'http.request_id': requestId,
                'http.user_agent': c.req.header('user-agent') || '',
                'guardant.service.type': 'api',
            });
            // Store span in context for later use
            c.set('traceSpan', span);
            c.set('traceId', span.spanContext().traceId);
            try {
                await next();
                // Add response attributes
                span.setAttributes({
                    'http.status_code': c.res.status,
                    'http.response.size': c.res.headers.get('content-length') || 0,
                });
                return c.res;
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        }, {
            'http.request_id': requestId,
        });
    };
}
// Express-style middleware
function createExpressTracingMiddleware(tracing) {
    return (req, res, next) => {
        const method = req.method;
        const path = req.route?.path || req.path || req.url;
        const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
        tracing.traceHttpRequest(method, path, async (span) => {
            // Add request-specific attributes
            span.setAttributes({
                'http.request_id': requestId,
                'http.user_agent': req.headers['user-agent'] || '',
                'guardant.service.type': 'api',
            });
            // Store span in request for later use
            req.traceSpan = span;
            req.traceId = span.spanContext().traceId;
            // Override res.end to add response attributes
            const originalEnd = res.end;
            res.end = function (...args) {
                span.setAttributes({
                    'http.status_code': res.statusCode,
                });
                originalEnd.apply(res, args);
            };
            next();
        }, {
            'http.request_id': requestId,
        }).catch(next);
    };
}
// Default configuration
exports.defaultTracingConfig = {
    environment: process.env.NODE_ENV || 'development',
    enableConsoleExporter: process.env.NODE_ENV !== 'production',
    enableJaegerExporter: !!process.env.JAEGER_ENDPOINT,
    jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    sampleRatio: parseFloat(process.env.OTEL_TRACE_SAMPLE_RATIO || '1.0'),
};
// Global tracing instances
const tracingInstances = new Map();
function getTracing(serviceName) {
    if (!tracingInstances.has(serviceName)) {
        tracingInstances.set(serviceName, new GuardAntTracing(serviceName));
    }
    return tracingInstances.get(serviceName);
}
// Initialize tracing for service
function initializeTracing(serviceName, config) {
    const tracing = getTracing(serviceName);
    const fullConfig = {
        serviceName,
        serviceVersion: '1.0.0',
        ...exports.defaultTracingConfig,
        ...config,
    };
    tracing.initialize(fullConfig);
    return tracing;
}
//# sourceMappingURL=tracing.js.map