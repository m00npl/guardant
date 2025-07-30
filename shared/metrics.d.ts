/**
 * Prometheus metrics collection system for GuardAnt services
 * Provides comprehensive metrics for monitoring and observability
 */
export interface MetricLabels {
    [key: string]: string | number;
}
export interface HistogramBuckets {
    buckets: number[];
}
export interface MetricDefinition {
    name: string;
    help: string;
    type: 'counter' | 'gauge' | 'histogram' | 'summary';
    labels?: string[];
    buckets?: number[];
}
export interface MetricValue {
    value: number;
    labels?: MetricLabels;
    timestamp?: number;
}
export interface PrometheusMetric {
    name: string;
    help: string;
    type: string;
    values: MetricValue[];
}
export declare class MetricsCollector {
    private serviceName;
    private metrics;
    private counters;
    private gauges;
    private histograms;
    private startTime;
    constructor(serviceName: string);
    private initializeDefaultMetrics;
    private getLabelKey;
    registerCounter(name: string, help: string, labelNames?: string[]): void;
    registerGauge(name: string, help: string, labelNames?: string[]): void;
    registerHistogram(name: string, help: string, labelNames?: string[], buckets?: number[]): void;
    incrementCounter(name: string, value?: number, labels?: MetricLabels): void;
    setGauge(name: string, value: number, labels?: MetricLabels): void;
    incrementGauge(name: string, value?: number, labels?: MetricLabels): void;
    decrementGauge(name: string, value?: number, labels?: MetricLabels): void;
    observeHistogram(name: string, value: number, labels?: MetricLabels): void;
    startTimer(name: string, labels?: MetricLabels): () => void;
    updateSystemMetrics(): void;
    recordNestRegistration(): void;
    recordServiceAdd(nestId: string, serviceType: string): void;
    recordMonitoringCheck(nestId: string, serviceId: string, status: string, region: string, duration: number, serviceType: string): void;
    updateServiceCounts(nestId: string, upCount: number, downCount: number): void;
    recordRedisOperation(operation: string, duration: number, success: boolean): void;
    recordRabbitMQMessage(queue: string, operation: 'publish' | 'consume'): void;
    setRabbitMQQueueSize(queue: string, size: number): void;
    recordWorkerJob(queue: string, duration: number, status: 'completed' | 'failed'): void;
    setWorkerActiveJobs(queue: string, count: number): void;
    recordHTTPRequest(method: string, route: string, statusCode: number, duration: number): void;
    incrementHTTPRequestsInFlight(): void;
    decrementHTTPRequestsInFlight(): void;
    generatePrometheusMetrics(): string;
    getMetricsJSON(): any;
    reset(): void;
}
export declare function createMetricsMiddleware(metricsCollector: MetricsCollector): (c: any, next: any) => any;
export declare function createExpressMetricsMiddleware(metricsCollector: MetricsCollector): (req: any, res: any, next: any) => void;
export declare function getMetricsCollector(serviceName: string): MetricsCollector;
//# sourceMappingURL=metrics.d.ts.map