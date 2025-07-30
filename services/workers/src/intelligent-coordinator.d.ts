import type { MonitoringRegion } from '/app/packages/shared-types/src/index';
/**
 * Intelligent Monitoring Coordinator
 * Routes monitoring tasks to optimal WorkerAnts based on user preferences and geography
 */
export declare class IntelligentCoordinator {
    private redis;
    private monitoringQueue;
    private availableRegions;
    constructor(redisConfig: any);
    /**
     * Initialize available monitoring regions
     */
    private initializeRegions;
    /**
     * Get all available monitoring regions
     */
    getAvailableRegions(): Promise<MonitoringRegion[]>;
    /**
     * Schedule monitoring with user-defined region preferences
     */
    scheduleMonitoringTasks(): Promise<void>;
    /**
     * Route monitoring task based on user preferences
     */
    private routeMonitoring;
    /**
     * Queue monitoring job for specific region
     */
    private queueRegionalMonitoring;
    /**
     * Get all user-selected regions that have available WorkerAnts
     */
    private getAllSelectedRegions;
    /**
     * Get closest regions to the target service
     */
    private getClosestRegions;
    /**
     * Get regions using round-robin strategy
     */
    private getRoundRobinRegions;
    /**
     * Get regions using failover strategy (primary + backup)
     */
    private getFailoverRegions;
    /**
     * Get additional regions when min requirements not met
     */
    private getAdditionalRegions;
    /**
     * Find best WorkerAnt in specific region
     */
    private findBestWorkerAntInRegion;
    /**
     * Calculate WorkerAnt suitability score
     */
    private calculateWorkerAntScore;
    /**
     * Map WorkerAnt location to monitoring region
     */
    private mapWorkerAntToRegion;
    /**
     * Check if region has available WorkerAnts
     */
    private hasAvailableWorkerAntInRegion;
    /**
     * Get all active WorkerAnts from Redis
     */
    private getActiveWorkerAnts;
    /**
     * Estimate service location from target URL/IP
     */
    private estimateServiceLocation;
    /**
     * Calculate distance between two coordinates
     */
    private calculateDistance;
    private calculatePriority;
    private shouldMonitorNow;
    private isWithinLimits;
    private getActiveNests;
}
export declare const intelligentCoordinator: IntelligentCoordinator;
//# sourceMappingURL=intelligent-coordinator.d.ts.map