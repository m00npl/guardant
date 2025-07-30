export interface MetricsData {
    timestamp: number;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    statusCode?: number;
    errorMessage?: string;
    region: string;
}
export interface AggregatedMetrics {
    serviceId: string;
    nestId: string;
    timestamp: number;
    period: 'minute' | 'hour' | 'day';
    region: string;
    totalChecks: number;
    upChecks: number;
    downChecks: number;
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    statusCodes: Record<number, number>;
    errorMessages: Record<string, number>;
}
export declare class MetricsAggregator {
    private storage;
    constructor();
    /**
     * Add new metric data point
     */
    aggregate(nestId: string, serviceId: string, data: MetricsData, timestamp: number): Promise<void>;
    /**
     * Get hourly aggregated metrics
     */
    getHourlyMetrics(nestId: string, serviceId: string): Promise<AggregatedMetrics[]>;
    /**
     * Get recent metrics for a service
     */
    getRecentMetrics(nestId: string, serviceId: string, minutes?: number): Promise<MetricsData[]>;
    /**
     * Clear old metrics data
     */
    cleanup(olderThanHours?: number): Promise<void>;
}
//# sourceMappingURL=metrics-aggregator.d.ts.map