"use strict";
/**
 * Prometheus metrics collection system for GuardAnt services
 * Provides comprehensive metrics for monitoring and observability
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollector = void 0;
exports.createMetricsMiddleware = createMetricsMiddleware;
exports.createExpressMetricsMiddleware = createExpressMetricsMiddleware;
exports.getMetricsCollector = getMetricsCollector;
class MetricsCollector {
    constructor(serviceName) {
        this.serviceName = serviceName;
        this.metrics = new Map();
        this.counters = new Map();
        this.gauges = new Map();
        this.histograms = new Map();
        this.startTime = Date.now();
        // Initialize default metrics
        this.initializeDefaultMetrics();
    }
    initializeDefaultMetrics() {
        // Process metrics
        this.registerGauge('process_start_time_seconds', 'Start time of the process since unix epoch in seconds.');
        this.registerGauge('process_resident_memory_bytes', 'Resident memory size in bytes.');
        this.registerGauge('process_heap_bytes', 'Process heap size in bytes.');
        this.registerCounter('process_cpu_seconds_total', 'Total user and system CPU time spent in seconds.');
        // HTTP metrics
        this.registerCounter('http_requests_total', 'Total number of HTTP requests.', ['method', 'route', 'status_code']);
        this.registerHistogram('http_request_duration_seconds', 'HTTP request latency in seconds.', ['method', 'route'], [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]);
        this.registerGauge('http_requests_in_flight', 'Current number of HTTP requests being processed.');
        // Business metrics
        this.registerCounter('guardant_nests_total', 'Total number of nests (tenants) registered.');
        this.registerCounter('guardant_services_total', 'Total number of services being monitored.', ['nest_id', 'service_type']);
        this.registerCounter('guardant_monitoring_checks_total', 'Total number of monitoring checks performed.', ['nest_id', 'service_id', 'status', 'region']);
        this.registerHistogram('guardant_monitoring_duration_seconds', 'Time spent performing monitoring checks.', ['service_type', 'region'], [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30]);
        this.registerGauge('guardant_services_up', 'Number of services currently up.', ['nest_id']);
        this.registerGauge('guardant_services_down', 'Number of services currently down.', ['nest_id']);
        // Redis metrics
        this.registerCounter('redis_operations_total', 'Total number of Redis operations.', ['operation', 'status']);
        this.registerHistogram('redis_operation_duration_seconds', 'Time spent on Redis operations.', ['operation'], [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]);
        // RabbitMQ metrics
        this.registerCounter('rabbitmq_messages_total', 'Total number of RabbitMQ messages.', ['queue', 'operation']);
        this.registerGauge('rabbitmq_queue_size', 'Current size of RabbitMQ queues.', ['queue']);
        // Worker metrics (for worker service)
        this.registerGauge('guardant_worker_jobs_active', 'Current number of active jobs.', ['queue']);
        this.registerCounter('guardant_worker_jobs_completed_total', 'Total number of completed jobs.', ['queue', 'status']);
        this.registerHistogram('guardant_worker_job_duration_seconds', 'Time spent processing jobs.', ['queue'], [0.1, 0.5, 1, 5, 10, 30, 60, 300]);
        // Set initial values
        this.setGauge('process_start_time_seconds', this.startTime / 1000);
    }
    getLabelKey(labels) {
        if (!labels || Object.keys(labels).length === 0) {
            return '';
        }
        return Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}="${value}"`)
            .join(',');
    }
    // Register metrics
    registerCounter(name, help, labelNames = []) {
        this.metrics.set(name, {
            name: `${this.serviceName}_${name}`,
            help,
            type: 'counter',
            values: []
        });
        this.counters.set(name, new Map());
    }
    registerGauge(name, help, labelNames = []) {
        this.metrics.set(name, {
            name: `${this.serviceName}_${name}`,
            help,
            type: 'gauge',
            values: []
        });
        this.gauges.set(name, new Map());
    }
    registerHistogram(name, help, labelNames = [], buckets = [0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0]) {
        this.metrics.set(name, {
            name: `${this.serviceName}_${name}`,
            help,
            type: 'histogram',
            values: []
        });
        this.histograms.set(name, new Map());
    }
    // Counter operations
    incrementCounter(name, value = 1, labels) {
        const counterMap = this.counters.get(name);
        if (!counterMap)
            return;
        const labelKey = this.getLabelKey(labels);
        const currentValue = counterMap.get(labelKey) || 0;
        counterMap.set(labelKey, currentValue + value);
    }
    // Gauge operations
    setGauge(name, value, labels) {
        const gaugeMap = this.gauges.get(name);
        if (!gaugeMap)
            return;
        const labelKey = this.getLabelKey(labels);
        gaugeMap.set(labelKey, value);
    }
    incrementGauge(name, value = 1, labels) {
        const gaugeMap = this.gauges.get(name);
        if (!gaugeMap)
            return;
        const labelKey = this.getLabelKey(labels);
        const currentValue = gaugeMap.get(labelKey) || 0;
        gaugeMap.set(labelKey, currentValue + value);
    }
    decrementGauge(name, value = 1, labels) {
        this.incrementGauge(name, -value, labels);
    }
    // Histogram operations
    observeHistogram(name, value, labels) {
        const histogramMap = this.histograms.get(name);
        if (!histogramMap)
            return;
        const labelKey = this.getLabelKey(labels);
        let histogram = histogramMap.get(labelKey);
        if (!histogram) {
            histogram = { count: 0, sum: 0, buckets: new Map() };
            histogramMap.set(labelKey, histogram);
        }
        histogram.count++;
        histogram.sum += value;
        // Default buckets if not specified during registration
        const buckets = [0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0, Infinity];
        for (const bucket of buckets) {
            if (value <= bucket) {
                const currentCount = histogram.buckets.get(bucket) || 0;
                histogram.buckets.set(bucket, currentCount + 1);
            }
        }
    }
    // Timer helper for histograms
    startTimer(name, labels) {
        const startTime = performance.now();
        return () => {
            const duration = (performance.now() - startTime) / 1000; // Convert to seconds
            this.observeHistogram(name, duration, labels);
        };
    }
    // Update system metrics
    updateSystemMetrics() {
        const memUsage = process.memoryUsage();
        this.setGauge('process_resident_memory_bytes', memUsage.rss);
        this.setGauge('process_heap_bytes', memUsage.heapUsed);
        // Get CPU usage (approximation)
        const cpuUsage = process.cpuUsage();
        const totalCpuTime = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
        this.setGauge('process_cpu_seconds_total', totalCpuTime);
    }
    // Business metric helpers
    recordNestRegistration() {
        this.incrementCounter('guardant_nests_total');
    }
    recordServiceAdd(nestId, serviceType) {
        this.incrementCounter('guardant_services_total', 1, { nest_id: nestId, service_type: serviceType });
    }
    recordMonitoringCheck(nestId, serviceId, status, region, duration, serviceType) {
        this.incrementCounter('guardant_monitoring_checks_total', 1, {
            nest_id: nestId,
            service_id: serviceId,
            status,
            region
        });
        this.observeHistogram('guardant_monitoring_duration_seconds', duration, {
            service_type: serviceType,
            region
        });
    }
    updateServiceCounts(nestId, upCount, downCount) {
        this.setGauge('guardant_services_up', upCount, { nest_id: nestId });
        this.setGauge('guardant_services_down', downCount, { nest_id: nestId });
    }
    recordRedisOperation(operation, duration, success) {
        this.incrementCounter('redis_operations_total', 1, {
            operation,
            status: success ? 'success' : 'error'
        });
        this.observeHistogram('redis_operation_duration_seconds', duration, { operation });
    }
    recordRabbitMQMessage(queue, operation) {
        this.incrementCounter('rabbitmq_messages_total', 1, { queue, operation });
    }
    setRabbitMQQueueSize(queue, size) {
        this.setGauge('rabbitmq_queue_size', size, { queue });
    }
    recordWorkerJob(queue, duration, status) {
        this.incrementCounter('guardant_worker_jobs_completed_total', 1, { queue, status });
        this.observeHistogram('guardant_worker_job_duration_seconds', duration, { queue });
    }
    setWorkerActiveJobs(queue, count) {
        this.setGauge('guardant_worker_jobs_active', count, { queue });
    }
    // HTTP request tracking
    recordHTTPRequest(method, route, statusCode, duration) {
        this.incrementCounter('http_requests_total', 1, {
            method: method.toUpperCase(),
            route,
            status_code: statusCode.toString()
        });
        this.observeHistogram('http_request_duration_seconds', duration, {
            method: method.toUpperCase(),
            route
        });
    }
    incrementHTTPRequestsInFlight() {
        this.incrementGauge('http_requests_in_flight');
    }
    decrementHTTPRequestsInFlight() {
        this.decrementGauge('http_requests_in_flight');
    }
    // Generate Prometheus format output
    generatePrometheusMetrics() {
        this.updateSystemMetrics();
        const lines = [];
        for (const [metricName, metric] of this.metrics) {
            lines.push(`# HELP ${metric.name} ${metric.help}`);
            lines.push(`# TYPE ${metric.name} ${metric.type}`);
            if (metric.type === 'counter') {
                const counterMap = this.counters.get(metricName);
                if (counterMap) {
                    for (const [labelKey, value] of counterMap) {
                        const labels = labelKey ? `{${labelKey}}` : '';
                        lines.push(`${metric.name}${labels} ${value}`);
                    }
                }
            }
            else if (metric.type === 'gauge') {
                const gaugeMap = this.gauges.get(metricName);
                if (gaugeMap) {
                    for (const [labelKey, value] of gaugeMap) {
                        const labels = labelKey ? `{${labelKey}}` : '';
                        lines.push(`${metric.name}${labels} ${value}`);
                    }
                }
            }
            else if (metric.type === 'histogram') {
                const histogramMap = this.histograms.get(metricName);
                if (histogramMap) {
                    for (const [labelKey, histogram] of histogramMap) {
                        const baseLabels = labelKey ? labelKey + ',' : '';
                        // Bucket counts
                        for (const [bucket, count] of histogram.buckets) {
                            const bucketLabel = bucket === Infinity ? '+Inf' : bucket.toString();
                            lines.push(`${metric.name}_bucket{${baseLabels}le="${bucketLabel}"} ${count}`);
                        }
                        // Total count and sum
                        lines.push(`${metric.name}_count{${labelKey}} ${histogram.count}`);
                        lines.push(`${metric.name}_sum{${labelKey}} ${histogram.sum}`);
                    }
                }
            }
        }
        return lines.join('\n') + '\n';
    }
    // Get metrics as JSON (for debugging)
    getMetricsJSON() {
        this.updateSystemMetrics();
        const result = {};
        for (const [metricName, metric] of this.metrics) {
            result[metricName] = {
                type: metric.type,
                help: metric.help,
                values: {}
            };
            if (metric.type === 'counter') {
                const counterMap = this.counters.get(metricName);
                if (counterMap) {
                    for (const [labelKey, value] of counterMap) {
                        result[metricName].values[labelKey || 'default'] = value;
                    }
                }
            }
            else if (metric.type === 'gauge') {
                const gaugeMap = this.gauges.get(metricName);
                if (gaugeMap) {
                    for (const [labelKey, value] of gaugeMap) {
                        result[metricName].values[labelKey || 'default'] = value;
                    }
                }
            }
            else if (metric.type === 'histogram') {
                const histogramMap = this.histograms.get(metricName);
                if (histogramMap) {
                    for (const [labelKey, histogram] of histogramMap) {
                        result[metricName].values[labelKey || 'default'] = {
                            count: histogram.count,
                            sum: histogram.sum,
                            buckets: Object.fromEntries(histogram.buckets)
                        };
                    }
                }
            }
        }
        return result;
    }
    // Reset all metrics (useful for testing)
    reset() {
        this.counters.clear();
        this.gauges.clear();
        this.histograms.clear();
        this.initializeDefaultMetrics();
    }
}
exports.MetricsCollector = MetricsCollector;
// Middleware factories
function createMetricsMiddleware(metricsCollector) {
    return (c, next) => {
        const startTime = performance.now();
        // Increment in-flight requests
        metricsCollector.incrementHTTPRequestsInFlight();
        return next().then(() => {
            const duration = (performance.now() - startTime) / 1000; // Convert to seconds
            metricsCollector.recordHTTPRequest(c.req.method, c.req.path, c.res.status, duration);
            metricsCollector.decrementHTTPRequestsInFlight();
        }).catch((error) => {
            const duration = (performance.now() - startTime) / 1000;
            metricsCollector.recordHTTPRequest(c.req.method, c.req.path, 500, // Assume 500 for unhandled errors
            duration);
            metricsCollector.decrementHTTPRequestsInFlight();
            throw error;
        });
    };
}
// Express-style middleware for other frameworks
function createExpressMetricsMiddleware(metricsCollector) {
    return (req, res, next) => {
        const startTime = performance.now();
        metricsCollector.incrementHTTPRequestsInFlight();
        const originalEnd = res.end;
        res.end = function (...args) {
            const duration = (performance.now() - startTime) / 1000;
            metricsCollector.recordHTTPRequest(req.method, req.route?.path || req.path || req.url, res.statusCode, duration);
            metricsCollector.decrementHTTPRequestsInFlight();
            originalEnd.apply(res, args);
        };
        next();
    };
}
// Global metrics collector instance factory
const metricsCollectors = new Map();
function getMetricsCollector(serviceName) {
    if (!metricsCollectors.has(serviceName)) {
        metricsCollectors.set(serviceName, new MetricsCollector(serviceName));
    }
    return metricsCollectors.get(serviceName);
}
// Default export for backwards compatibility
//# sourceMappingURL=metrics.js.map