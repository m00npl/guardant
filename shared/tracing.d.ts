/**
 * OpenTelemetry distributed tracing system for GuardAnt services
 * Provides comprehensive tracing across all microservices
 */
import { SpanKind } from '@opentelemetry/api';
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
declare class TracingManager {
    private sdk;
    private tracer;
    private serviceName;
    private initialized;
    constructor(serviceName: string);
    /**
     * Initialize OpenTelemetry tracing
     */
    initialize(config: TraceConfig): void;
    /**
     * Get the tracer instance
     */
    getTracer(): Tracer;
    /**
     * Create a new span
     */
    startSpan(options: SpanOptions): Span;
    /**
     * Get current active span
     */
    getActiveSpan(): Span | undefined;
    /**
     * Execute function with span context
     */
    withSpan<T>(spanOptions: SpanOptions, fn: (span: Span) => Promise<T> | T): Promise<T>;
    /**
     * Add attributes to current span
     */
    addSpanAttributes(attributes: Record<string, string | number | boolean>): void;
    /**
     * Add event to current span
     */
    addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void;
    /**
     * Get trace context for propagation
     */
    getTraceContext(): TracingContext | null;
    /**
     * Create child span from trace context
     */
    createSpanFromContext(traceContext: TracingContext, spanOptions: Omit<SpanOptions, 'parentSpan'>): Span;
    /**
     * Shutdown tracing
     */
    shutdown(): Promise<void>;
}
export declare class GuardAntTracing {
    private tracingManager;
    constructor(serviceName: string);
    initialize(config: TraceConfig): void;
    traceHttpRequest<T>(method: string, path: string, handler: (span: Span) => Promise<T> | T, attributes?: Record<string, string | number | boolean>): Promise<T>;
    traceDbOperation<T>(operation: string, table: string, handler: (span: Span) => Promise<T> | T, attributes?: Record<string, string | number | boolean>): Promise<T>;
    traceServiceCheck<T>(serviceId: string, serviceType: string, nestId: string, handler: (span: Span) => Promise<T> | T): Promise<T>;
    traceMessagePublish<T>(exchange: string, routingKey: string, handler: (span: Span) => Promise<T> | T): Promise<T>;
    traceMessageConsume<T>(queue: string, handler: (span: Span) => Promise<T> | T): Promise<T>;
    traceBusinessEvent<T>(eventType: string, handler: (span: Span) => Promise<T> | T, attributes?: Record<string, string | number | boolean>): Promise<T>;
    tracePayment<T>(paymentType: string, amount: string, currency: string, handler: (span: Span) => Promise<T> | T): Promise<T>;
    traceWorkerJob<T>(jobType: string, jobId: string, handler: (span: Span) => Promise<T> | T): Promise<T>;
    addEvent(name: string, attributes?: Record<string, string | number | boolean>): void;
    addAttributes(attributes: Record<string, string | number | boolean>): void;
    getTraceContext(): TracingContext | null;
    shutdown(): Promise<void>;
}
export declare function createTracingMiddleware(tracing: GuardAntTracing): (c: any, next: any) => Promise<any>;
export declare function createExpressTracingMiddleware(tracing: GuardAntTracing): (req: any, res: any, next: any) => void;
export declare const defaultTracingConfig: Partial<TraceConfig>;
export declare function getTracing(serviceName: string): GuardAntTracing;
export declare function initializeTracing(serviceName: string, config?: Partial<TraceConfig>): GuardAntTracing;
export { TracingManager };
//# sourceMappingURL=tracing.d.ts.map