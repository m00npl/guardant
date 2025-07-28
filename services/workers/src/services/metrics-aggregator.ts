// GuardAnt Metrics Aggregator
// Aggregates monitoring data for storage and analysis

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

export class MetricsAggregator {
  private storage = new Map<string, MetricsData[]>();

  constructor() {}

  /**
   * Add new metric data point
   */
  async aggregate(
    nestId: string,
    serviceId: string,
    data: MetricsData,
    timestamp: number
  ): Promise<void> {
    const key = `${nestId}:${serviceId}`;
    
    if (!this.storage.has(key)) {
      this.storage.set(key, []);
    }
    
    const metrics = this.storage.get(key)!;
    metrics.push({
      ...data,
      timestamp
    });

    // Keep only last 1000 data points to prevent memory issues
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }

    console.log(`📊 Aggregated metric for ${nestId}:${serviceId} - ${data.status} (${data.responseTime}ms)`);
  }

  /**
   * Get hourly aggregated metrics
   */
  async getHourlyMetrics(nestId: string, serviceId: string): Promise<AggregatedMetrics[]> {
    const key = `${nestId}:${serviceId}`;
    const metrics = this.storage.get(key) || [];
    
    if (metrics.length === 0) {
      return [];
    }

    // Group by hour
    const hourlyGroups = new Map<number, MetricsData[]>();
    
    for (const metric of metrics) {
      const hourTimestamp = Math.floor(metric.timestamp / (1000 * 60 * 60)) * (1000 * 60 * 60);
      
      if (!hourlyGroups.has(hourTimestamp)) {
        hourlyGroups.set(hourTimestamp, []);
      }
      
      hourlyGroups.get(hourTimestamp)!.push(metric);
    }

    // Aggregate each hour
    const aggregated: AggregatedMetrics[] = [];
    
    for (const [hourTimestamp, hourMetrics] of hourlyGroups) {
      const regions = [...new Set(hourMetrics.map(m => m.region))];
      
      for (const region of regions) {
        const regionMetrics = hourMetrics.filter(m => m.region === region);
        
        const upChecks = regionMetrics.filter(m => m.status === 'up').length;
        const downChecks = regionMetrics.filter(m => m.status === 'down').length;
        const responseTimes = regionMetrics
          .filter(m => m.responseTime !== undefined)
          .map(m => m.responseTime!);
        
        const statusCodes: Record<number, number> = {};
        const errorMessages: Record<string, number> = {};
        
        for (const metric of regionMetrics) {
          if (metric.statusCode) {
            statusCodes[metric.statusCode] = (statusCodes[metric.statusCode] || 0) + 1;
          }
          if (metric.errorMessage) {
            errorMessages[metric.errorMessage] = (errorMessages[metric.errorMessage] || 0) + 1;
          }
        }

        aggregated.push({
          serviceId,
          nestId,
          timestamp: hourTimestamp,
          period: 'hour',
          region,
          totalChecks: regionMetrics.length,
          upChecks,
          downChecks,
          avgResponseTime: responseTimes.length > 0 
            ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
            : 0,
          minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
          maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
          statusCodes,
          errorMessages,
        });
      }
    }

    return aggregated.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get recent metrics for a service
   */
  async getRecentMetrics(
    nestId: string,
    serviceId: string,
    minutes: number = 60
  ): Promise<MetricsData[]> {
    const key = `${nestId}:${serviceId}`;
    const metrics = this.storage.get(key) || [];
    
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    
    return metrics.filter(m => m.timestamp >= cutoffTime);
  }

  /**
   * Clear old metrics data
   */
  async cleanup(olderThanHours: number = 24): Promise<void> {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    
    for (const [key, metrics] of this.storage.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp >= cutoffTime);
      
      if (filteredMetrics.length === 0) {
        this.storage.delete(key);
      } else {
        this.storage.set(key, filteredMetrics);
      }
    }

    console.log(`🧹 Cleaned up metrics older than ${olderThanHours} hours`);
  }
}