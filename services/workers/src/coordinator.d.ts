/**
 * Coordinator odpowiedzialny za rozdzielanie zadań między workerami
 * Może działać jako osobny serwis lub być częścią API
 */
export declare class MonitoringCoordinator {
    private redis;
    private monitoringQueue;
    constructor(redisConfig: any);
    /**
     * Schedules monitoring tasks for all active services
     * This method is called periodically (e.g., every minute)
     */
    scheduleMonitoringTasks(): Promise<void>;
    /**
     * Queue a monitoring job with intelligent routing
     */
    private queueMonitoringJob;
    /**
     * Determine optimal region for monitoring
     */
    private getOptimalRegion;
    /**
     * Calculate job priority based on subscription tier
     */
    private calculatePriority;
    /**
     * Determine required worker capabilities
     */
    private getRequiredCapabilities;
    /**
     * Check if service should be monitored now
     */
    private shouldMonitorNow;
    /**
     * Check if nest is within subscription limits
     */
    private isWithinLimits;
    /**
     * Get all active nests (simplified for MVP)
     */
    private getActiveNests;
    /**
     * Get worker statistics
     */
    getWorkerStats(): Promise<{
        queue: {
            [index: string]: number;
        };
        workers: number;
        regions: {
            'eu-west': {
                workers: number;
                jobs: number;
            };
            'us-east': {
                workers: number;
                jobs: number;
            };
            'ap-south': {
                workers: number;
                jobs: number;
            };
        };
    }>;
    /**
     * Get regional distribution statistics
     */
    private getRegionalStats;
    /**
     * Manually trigger monitoring for a specific service
     */
    triggerMonitoring(nestId: string, serviceId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Pause monitoring for a nest
     */
    pauseNest(nestId: string): Promise<void>;
    /**
     * Resume monitoring for a nest
     */
    resumeNest(nestId: string): Promise<void>;
}
export declare const coordinator: MonitoringCoordinator;
//# sourceMappingURL=coordinator.d.ts.map