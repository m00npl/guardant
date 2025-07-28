/**
 * OpenTelemetry distributed tracing system for GuardAnt services
 * Provides comprehensive tracing across all microservices
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import type { Span, Tracer } from '@opentelemetry/api';

export interface TraceConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  jaegerEndpoint?: string;
  enableConsoleExporter?: boolean;
  enableJaegerExporter?: boolean;
  sampleRatio?: number;
}

export interface SpanOptions {
  name: string;
  kind?: SpanKind;
  attributes?: Record<string, string | number | boolean>;
  parentSpan?: Span;
}

export interface TracingContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage?: Record<string, string>;
}

class TracingManager {
  private sdk: NodeSDK | null = null;
  private tracer: Tracer | null = null;
  private serviceName: string;
  private initialized: boolean = false;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Initialize OpenTelemetry tracing
   */
  initialize(config: TraceConfig): void {
    if (this.initialized) {
      console.warn('Tracing already initialized');
      return;
    }

    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment || 'development',
    });

    // Configure exporters
    const exporters = [];
    
    if (config.enableConsoleExporter) {
      exporters.push(new ConsoleSpanExporter());
    }

    if (config.enableJaegerExporter && config.jaegerEndpoint) {
      exporters.push(new JaegerExporter({
        endpoint: config.jaegerEndpoint,
      }));
    }

    // If no exporters specified, use console in development
    if (exporters.length === 0 && process.env.NODE_ENV !== 'production') {
      exporters.push(new ConsoleSpanExporter());
    }

    this.sdk = new NodeSDK({
      resource,
      traceExporter: exporters.length > 0 ? exporters[0] : undefined,
      instrumentations: [getNodeAutoInstrumentations({
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
      metricReader: new PrometheusExporter({
        port: 0, // Don't start HTTP server for metrics
      }),
    });

    try {
      this.sdk.start();
      this.tracer = trace.getTracer(config.serviceName, config.serviceVersion);
      this.initialized = true;
      
      console.log(`🔍 OpenTelemetry tracing initialized for ${config.serviceName}`);
    } catch (error) {
      console.error('Failed to initialize OpenTelemetry:', error);
    }
  }

  /**
   * Get the tracer instance
   */
  getTracer(): Tracer {
    if (!this.tracer) {
      throw new Error('Tracing not initialized. Call initialize() first.');
    }
    return this.tracer;
  }

  /**
   * Create a new span
   */
  startSpan(options: SpanOptions): Span {
    const tracer = this.getTracer();
    
    const spanOptions: any = {
      kind: options.kind || SpanKind.INTERNAL,
      attributes: {
        'service.name': this.serviceName,
        ...options.attributes,
      },
    };

    // Set parent context if provided
    if (options.parentSpan) {
      const parentContext = trace.setSpan(context.active(), options.parentSpan);
      return tracer.startSpan(options.name, spanOptions, parentContext);
    }

    return tracer.startSpan(options.name, spanOptions);
  }

  /**
   * Get current active span
   */
  getActiveSpan(): Span | undefined {
    return trace.getActiveSpan();
  }

  /**
   * Execute function with span context
   */
  async withSpan<T>(
    spanOptions: SpanOptions,
    fn: (span: Span) => Promise<T> | T
  ): Promise<T> {
    const span = this.startSpan(spanOptions);
    
    try {
      const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Add attributes to current span
   */
  addSpanAttributes(attributes: Record<string, string | number | boolean>): void {
    const span = this.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  /**
   * Add event to current span
   */
  addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
    const span = this.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  /**
   * Get trace context for propagation
   */
  getTraceContext(): TracingContext | null {
    const span = this.getActiveSpan();
    if (!span) return null;

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
  createSpanFromContext(
    traceContext: TracingContext,
    spanOptions: Omit<SpanOptions, 'parentSpan'>
  ): Span {
    // In a real implementation, you'd reconstruct the parent context
    // from the trace context. For now, just create a regular span.
    return this.startSpan(spanOptions);
  }

  /**
   * Shutdown tracing
   */
  async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      this.initialized = false;
      console.log('🔍 OpenTelemetry tracing shut down');
    }
  }
}

// Business-specific tracing helpers
export class GuardAntTracing {
  private tracingManager: TracingManager;

  constructor(serviceName: string) {
    this.tracingManager = new TracingManager(serviceName);
  }

  initialize(config: TraceConfig): void {
    this.tracingManager.initialize(config);
  }

  // HTTP request tracing
  async traceHttpRequest<T>(
    method: string,
    path: string,
    handler: (span: Span) => Promise<T> | T,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    return this.tracingManager.withSpan({
      name: `HTTP ${method} ${path}`,
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': method,
        'http.route': path,
        'http.scheme': 'http',
        ...attributes,
      },
    }, handler);
  }

  // Database operation tracing
  async traceDbOperation<T>(
    operation: string,
    table: string,
    handler: (span: Span) => Promise<T> | T,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    return this.tracingManager.withSpan({
      name: `DB ${operation} ${table}`,
      kind: SpanKind.CLIENT,
      attributes: {
        'db.operation': operation,
        'db.collection.name': table,
        'db.system': 'redis',
        ...attributes,
      },
    }, handler);
  }

  // Service monitoring tracing
  async traceServiceCheck<T>(
    serviceId: string,
    serviceType: string,
    nestId: string,
    handler: (span: Span) => Promise<T> | T
  ): Promise<T> {
    return this.tracingManager.withSpan({
      name: `Monitor ${serviceType} service`,
      kind: SpanKind.INTERNAL,
      attributes: {
        'guardant.service.id': serviceId,
        'guardant.service.type': serviceType,
        'guardant.nest.id': nestId,
        'guardant.operation': 'service_check',
      },
    }, handler);
  }

  // RabbitMQ messaging tracing
  async traceMessagePublish<T>(
    exchange: string,
    routingKey: string,
    handler: (span: Span) => Promise<T> | T
  ): Promise<T> {
    return this.tracingManager.withSpan({
      name: `Publish to ${exchange}`,
      kind: SpanKind.PRODUCER,
      attributes: {
        'messaging.system': 'rabbitmq',
        'messaging.destination': exchange,
        'messaging.destination_kind': 'topic',
        'messaging.rabbitmq.routing_key': routingKey,
      },
    }, handler);
  }

  async traceMessageConsume<T>(
    queue: string,
    handler: (span: Span) => Promise<T> | T
  ): Promise<T> {
    return this.tracingManager.withSpan({
      name: `Consume from ${queue}`,
      kind: SpanKind.CONSUMER,
      attributes: {
        'messaging.system': 'rabbitmq',
        'messaging.source': queue,
        'messaging.operation': 'receive',
      },
    }, handler);
  }

  // Business event tracing
  async traceBusinessEvent<T>(
    eventType: string,
    handler: (span: Span) => Promise<T> | T,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    return this.tracingManager.withSpan({
      name: `Business Event: ${eventType}`,
      kind: SpanKind.INTERNAL,
      attributes: {
        'guardant.event.type': eventType,
        'guardant.event.category': 'business',
        ...attributes,
      },
    }, handler);
  }

  // Payment processing tracing
  async tracePayment<T>(
    paymentType: string,
    amount: string,
    currency: string,
    handler: (span: Span) => Promise<T> | T
  ): Promise<T> {
    return this.tracingManager.withSpan({
      name: `Payment ${paymentType}`,
      kind: SpanKind.INTERNAL,
      attributes: {
        'guardant.payment.type': paymentType,
        'guardant.payment.amount': amount,
        'guardant.payment.currency': currency,
      },
    }, handler);
  }

  // Worker job tracing
  async traceWorkerJob<T>(
    jobType: string,
    jobId: string,
    handler: (span: Span) => Promise<T> | T
  ): Promise<T> {
    return this.tracingManager.withSpan({
      name: `Worker Job: ${jobType}`,
      kind: SpanKind.INTERNAL,
      attributes: {
        'guardant.job.type': jobType,
        'guardant.job.id': jobId,
        'guardant.worker.queue': jobType,
      },
    }, handler);
  }

  // Utility methods
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
    this.tracingManager.addSpanEvent(name, attributes);
  }

  addAttributes(attributes: Record<string, string | number | boolean>): void {
    this.tracingManager.addSpanAttributes(attributes);
  }

  getTraceContext(): TracingContext | null {
    return this.tracingManager.getTraceContext();
  }

  async shutdown(): Promise<void> {
    await this.tracingManager.shutdown();
  }
}

// Middleware factory for HTTP frameworks
export function createTracingMiddleware(tracing: GuardAntTracing) {
  return (c: any, next: any) => {
    const method = c.req.method;
    const path = c.req.path;
    const requestId = c.req.header('x-request-id') || `req_${Date.now()}`;

    return tracing.traceHttpRequest(
      method,
      path,
      async (span) => {
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
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
      {
        'http.request_id': requestId,
      }
    );
  };
}

// Express-style middleware
export function createExpressTracingMiddleware(tracing: GuardAntTracing) {
  return (req: any, res: any, next: any) => {
    const method = req.method;
    const path = req.route?.path || req.path || req.url;
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;

    tracing.traceHttpRequest(
      method,
      path,
      async (span) => {
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
        res.end = function(...args: any[]) {
          span.setAttributes({
            'http.status_code': res.statusCode,
          });
          originalEnd.apply(res, args);
        };

        next();
      },
      {
        'http.request_id': requestId,
      }
    ).catch(next);
  };
}

// Default configuration
export const defaultTracingConfig: Partial<TraceConfig> = {
  environment: process.env.NODE_ENV || 'development',
  enableConsoleExporter: process.env.NODE_ENV !== 'production',
  enableJaegerExporter: !!process.env.JAEGER_ENDPOINT,
  jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  sampleRatio: parseFloat(process.env.OTEL_TRACE_SAMPLE_RATIO || '1.0'),
};

// Global tracing instances
const tracingInstances = new Map<string, GuardAntTracing>();

export function getTracing(serviceName: string): GuardAntTracing {
  if (!tracingInstances.has(serviceName)) {
    tracingInstances.set(serviceName, new GuardAntTracing(serviceName));
  }
  return tracingInstances.get(serviceName)!;
}

// Initialize tracing for service
export function initializeTracing(serviceName: string, config?: Partial<TraceConfig>): GuardAntTracing {
  const tracing = getTracing(serviceName);
  
  const fullConfig: TraceConfig = {
    serviceName,
    serviceVersion: '1.0.0',
    ...defaultTracingConfig,
    ...config,
  };
  
  tracing.initialize(fullConfig);
  return tracing;
}

export { TracingManager };