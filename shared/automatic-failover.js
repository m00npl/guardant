"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailoverManager = exports.FailoverConfigs = exports.FailoverTrigger = exports.FailoverStatus = exports.FailoverType = void 0;
const logger_1 = require("./logger");
// Failover Types and Status
var FailoverType;
(function (FailoverType) {
    FailoverType["ACTIVE_ACTIVE"] = "active_active";
    FailoverType["ACTIVE_PASSIVE"] = "active_passive";
    FailoverType["GEOGRAPHIC"] = "geographic";
    FailoverType["DATABASE"] = "database";
    FailoverType["LOAD_BALANCER"] = "load_balancer";
    FailoverType["CUSTOM"] = "custom";
})(FailoverType || (exports.FailoverType = FailoverType = {}));
var FailoverStatus;
(function (FailoverStatus) {
    FailoverStatus["HEALTHY"] = "healthy";
    FailoverStatus["DEGRADED"] = "degraded";
    FailoverStatus["FAILED"] = "failed";
    FailoverStatus["FAILING_OVER"] = "failing_over";
    FailoverStatus["FAILED_OVER"] = "failed_over";
    FailoverStatus["RECOVERING"] = "recovering";
})(FailoverStatus || (exports.FailoverStatus = FailoverStatus = {}));
var FailoverTrigger;
(function (FailoverTrigger) {
    FailoverTrigger["HEALTH_CHECK_FAILURE"] = "health_check_failure";
    FailoverTrigger["PERFORMANCE_DEGRADATION"] = "performance_degradation";
    FailoverTrigger["MANUAL"] = "manual";
    FailoverTrigger["SCHEDULED"] = "scheduled";
    FailoverTrigger["DISASTER"] = "disaster";
    FailoverTrigger["MAINTENANCE"] = "maintenance";
})(FailoverTrigger || (exports.FailoverTrigger = FailoverTrigger = {}));
// Failover Configurations
exports.FailoverConfigs = {
    LOCAL: {
        enabled: true,
        globalSettings: {
            defaultHealthCheckInterval: 30000,
            defaultTimeout: 5000,
            maxConcurrentFailovers: 5,
            globalFailoverDelay: 30,
            enableCircuitBreaker: true,
        },
        monitoringSettings: {
            enableRealTimeMonitoring: true,
            metricsCollectionInterval: 60,
            retentionDays: 30,
            enableTracing: true,
        },
        alertSettings: {
            enableAlerts: false,
            channels: [],
            escalationPolicy: {
                levels: [],
                autoEscalate: false,
                escalationDelay: 300,
            },
            alertThresholds: [],
        },
        reportingSettings: {
            autoGenerateReports: false,
            reportSchedule: "weekly",
            retentionDays: 90,
            exportFormats: ["json"],
        },
    },
    STAGING: {
        enabled: true,
        globalSettings: {
            defaultHealthCheckInterval: 15000,
            defaultTimeout: 3000,
            maxConcurrentFailovers: 10,
            globalFailoverDelay: 15,
            enableCircuitBreaker: true,
        },
        monitoringSettings: {
            enableRealTimeMonitoring: true,
            metricsCollectionInterval: 30,
            retentionDays: 90,
            enableTracing: true,
        },
        alertSettings: {
            enableAlerts: true,
            channels: [
                {
                    type: "email",
                    config: { recipients: ["ops@guardant.me"] },
                    enabled: true,
                },
            ],
            escalationPolicy: {
                levels: [
                    {
                        level: 1,
                        delay: 300,
                        channels: ["email"],
                        recipients: ["ops-team"],
                    },
                ],
                autoEscalate: true,
                escalationDelay: 300,
            },
            alertThresholds: [
                {
                    metric: "response_time",
                    warning: 1000,
                    critical: 2000,
                    action: "email",
                },
                { metric: "error_rate", warning: 5, critical: 10, action: "slack" },
            ],
        },
        reportingSettings: {
            autoGenerateReports: true,
            reportSchedule: "daily",
            retentionDays: 365,
            exportFormats: ["pdf", "csv"],
        },
    },
    PRODUCTION: {
        enabled: true,
        globalSettings: {
            defaultHealthCheckInterval: 10000,
            defaultTimeout: 2000,
            maxConcurrentFailovers: 20,
            globalFailoverDelay: 5,
            enableCircuitBreaker: true,
        },
        monitoringSettings: {
            enableRealTimeMonitoring: true,
            metricsCollectionInterval: 15,
            retentionDays: 1095, // 3 years
            enableTracing: true,
        },
        alertSettings: {
            enableAlerts: true,
            channels: [
                {
                    type: "email",
                    config: { recipients: ["ops@guardant.me"] },
                    enabled: true,
                },
                {
                    type: "slack",
                    config: { channel: "#failover-alerts" },
                    enabled: true,
                },
                { type: "pagerduty", config: { serviceKey: "pd_key" }, enabled: true },
            ],
            escalationPolicy: {
                levels: [
                    {
                        level: 1,
                        delay: 60,
                        channels: ["slack"],
                        recipients: ["ops-team"],
                    },
                    {
                        level: 2,
                        delay: 300,
                        channels: ["email", "slack"],
                        recipients: ["management"],
                    },
                    {
                        level: 3,
                        delay: 900,
                        channels: ["pagerduty"],
                        recipients: ["emergency-contacts"],
                    },
                ],
                autoEscalate: true,
                escalationDelay: 60,
            },
            alertThresholds: [
                {
                    metric: "response_time",
                    warning: 500,
                    critical: 1000,
                    action: "slack",
                },
                { metric: "error_rate", warning: 2, critical: 5, action: "email" },
                {
                    metric: "availability",
                    warning: 99,
                    critical: 95,
                    action: "pagerduty",
                },
            ],
        },
        reportingSettings: {
            autoGenerateReports: true,
            reportSchedule: "daily",
            retentionDays: 1095, // 3 years
            exportFormats: ["pdf", "csv", "json"],
        },
    },
};
// Failover Manager
class FailoverManager {
    constructor(config, tracing) {
        this.logger = (0, logger_1.createLogger)("failover-manager");
        this.failoverConfigs = [];
        this.failoverStates = new Map();
        this.healthCheckIntervals = new Map();
        this.activeFailovers = new Set();
        this.config = config;
        this.tracing = tracing;
        this.initializeDefaultFailoverConfigs();
        this.startHealthChecks();
    }
    initializeDefaultFailoverConfigs() {
        const defaultConfigs = [
            {
                id: "api-failover",
                name: "API Service Failover",
                description: "Automatic failover for API services",
                type: FailoverType.ACTIVE_PASSIVE,
                primaryEndpoint: "https://api.guardant.me",
                secondaryEndpoints: ["https://api-backup.guardant.me"],
                healthCheckConfig: {
                    endpoint: "/health",
                    method: "GET",
                    timeout: 5000,
                    interval: 10000,
                    failureThreshold: 3,
                    successThreshold: 2,
                    expectedStatus: 200,
                    expectedResponse: '{"status":"healthy"}',
                },
                failoverCriteria: {
                    healthCheckFailures: 3,
                    responseTimeThreshold: 1000,
                    errorRateThreshold: 5,
                    availabilityThreshold: 99,
                    manualTrigger: true,
                },
                recoveryConfig: {
                    autoRecovery: true,
                    recoveryDelay: 300,
                    maxRecoveryAttempts: 3,
                    recoveryHealthChecks: 5,
                    rollbackOnFailure: true,
                },
                monitoringConfig: {
                    enableMetrics: true,
                    alertChannels: [],
                    escalationPolicy: {
                        levels: [],
                        autoEscalate: false,
                        escalationDelay: 300,
                    },
                    dashboardIntegration: true,
                },
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: "database-failover",
                name: "Database Failover",
                description: "Database replication and failover",
                type: FailoverType.ACTIVE_PASSIVE,
                primaryEndpoint: "postgresql://primary.db.guardant.me",
                secondaryEndpoints: ["postgresql://replica.db.guardant.me"],
                healthCheckConfig: {
                    endpoint: "/health",
                    method: "GET",
                    timeout: 3000,
                    interval: 15000,
                    failureThreshold: 2,
                    successThreshold: 3,
                    expectedStatus: 200,
                },
                failoverCriteria: {
                    healthCheckFailures: 2,
                    responseTimeThreshold: 500,
                    errorRateThreshold: 1,
                    availabilityThreshold: 99.9,
                    manualTrigger: true,
                },
                recoveryConfig: {
                    autoRecovery: false, // Manual recovery for database
                    recoveryDelay: 600,
                    maxRecoveryAttempts: 1,
                    recoveryHealthChecks: 10,
                    rollbackOnFailure: false,
                },
                monitoringConfig: {
                    enableMetrics: true,
                    alertChannels: [],
                    escalationPolicy: {
                        levels: [],
                        autoEscalate: false,
                        escalationDelay: 300,
                    },
                    dashboardIntegration: true,
                },
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
        this.failoverConfigs.push(...defaultConfigs);
    }
    async createFailoverConfig(config) {
        const newConfig = {
            ...config,
            id: `failover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.failoverConfigs.push(newConfig);
        this.initializeFailoverState(newConfig);
        this.startHealthCheck(newConfig);
        this.logger.info(`Created failover config: ${newConfig.name}`);
        return newConfig;
    }
    initializeFailoverState(config) {
        const state = {
            id: `state_${config.id}`,
            configId: config.id,
            status: FailoverStatus.HEALTHY,
            currentEndpoint: config.primaryEndpoint,
            lastHealthCheck: new Date(),
            healthCheckResults: [],
            failoverHistory: [],
            metrics: {
                uptime: 100,
                responseTime: 0,
                errorRate: 0,
                failoverCount: 0,
                lastFailover: new Date(),
                averageRecoveryTime: 0,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.failoverStates.set(config.id, state);
    }
    startHealthChecks() {
        for (const config of this.failoverConfigs.filter((c) => c.isActive)) {
            this.startHealthCheck(config);
        }
    }
    startHealthCheck(config) {
        if (this.healthCheckIntervals.has(config.id)) {
            clearInterval(this.healthCheckIntervals.get(config.id));
        }
        const interval = setInterval(async () => {
            await this.performHealthCheck(config);
        }, config.healthCheckConfig.interval);
        this.healthCheckIntervals.set(config.id, interval);
    }
    async performHealthCheck(config) {
        const state = this.failoverStates.get(config.id);
        if (!state)
            return;
        try {
            const result = await this.executeHealthCheck(config.healthCheckConfig, state.currentEndpoint);
            state.healthCheckResults.push(result);
            // Keep only recent results
            if (state.healthCheckResults.length > 100) {
                state.healthCheckResults = state.healthCheckResults.slice(-50);
            }
            // Update metrics
            this.updateFailoverMetrics(state, result);
            // Check if failover is needed
            if (this.shouldTriggerFailover(config, state)) {
                await this.triggerFailover(config, state, FailoverTrigger.HEALTH_CHECK_FAILURE);
            }
            state.lastHealthCheck = new Date();
            state.updatedAt = new Date();
        }
        catch (error) {
            this.logger.error(`Health check failed for ${config.name}:`, error);
        }
    }
    async executeHealthCheck(healthCheck, endpoint) {
        const startTime = Date.now();
        let success = false;
        let statusCode = 0;
        let error;
        try {
            const response = await fetch(`${endpoint}${healthCheck.endpoint}`, {
                method: healthCheck.method,
                headers: healthCheck.headers,
                signal: AbortSignal.timeout(healthCheck.timeout),
            });
            statusCode = response.status;
            success = response.status === healthCheck.expectedStatus;
            if (healthCheck.expectedResponse) {
                const responseText = await response.text();
                success =
                    success && responseText.includes(healthCheck.expectedResponse);
            }
        }
        catch (err) {
            error = err instanceof Error ? err.message : "Unknown error";
            success = false;
        }
        const responseTime = Date.now() - startTime;
        return {
            id: `health_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            endpoint,
            success,
            responseTime,
            statusCode,
            error,
            metadata: {},
        };
    }
    updateFailoverMetrics(state, result) {
        const recentResults = state.healthCheckResults.slice(-20);
        const successfulResults = recentResults.filter((r) => r.success);
        state.metrics.uptime =
            (successfulResults.length / recentResults.length) * 100;
        state.metrics.responseTime =
            recentResults.reduce((sum, r) => sum + r.responseTime, 0) /
                recentResults.length;
        state.metrics.errorRate =
            ((recentResults.length - successfulResults.length) /
                recentResults.length) *
                100;
    }
    shouldTriggerFailover(config, state) {
        if (state.status === FailoverStatus.FAILING_OVER ||
            state.status === FailoverStatus.FAILED_OVER) {
            return false;
        }
        const recentResults = state.healthCheckResults.slice(-config.failoverCriteria.healthCheckFailures);
        const failureCount = recentResults.filter((r) => !r.success).length;
        return (failureCount >= config.failoverCriteria.healthCheckFailures ||
            state.metrics.responseTime >
                config.failoverCriteria.responseTimeThreshold ||
            state.metrics.errorRate > config.failoverCriteria.errorRateThreshold ||
            state.metrics.uptime < config.failoverCriteria.availabilityThreshold);
    }
    async triggerFailover(config, state, trigger) {
        if (this.activeFailovers.has(config.id)) {
            this.logger.warn(`Failover already in progress for ${config.name}`);
            return;
        }
        this.activeFailovers.add(config.id);
        state.status = FailoverStatus.FAILING_OVER;
        try {
            const secondaryEndpoint = this.selectSecondaryEndpoint(config, state);
            if (!secondaryEndpoint) {
                throw new Error("No available secondary endpoint");
            }
            // Verify secondary endpoint is healthy
            const healthCheck = await this.executeHealthCheck(config.healthCheckConfig, secondaryEndpoint);
            if (!healthCheck.success) {
                throw new Error("Secondary endpoint is not healthy");
            }
            // Perform failover
            const failoverEvent = {
                id: `failover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                type: "failover",
                trigger,
                fromEndpoint: state.currentEndpoint,
                toEndpoint: secondaryEndpoint,
                reason: `Health check failures: ${this.getRecentFailureCount(state)}`,
                duration: 0,
                success: false,
                metadata: {},
            };
            // Update state
            state.currentEndpoint = secondaryEndpoint;
            state.status = FailoverStatus.FAILED_OVER;
            state.failoverHistory.push(failoverEvent);
            state.metrics.failoverCount++;
            state.metrics.lastFailover = new Date();
            // Update DNS/load balancer (simulated)
            await this.updateTrafficRouting(config, secondaryEndpoint);
            failoverEvent.success = true;
            failoverEvent.duration =
                (Date.now() - failoverEvent.timestamp.getTime()) / 1000;
            this.logger.info(`Failover completed for ${config.name}: ${state.currentEndpoint} -> ${secondaryEndpoint}`);
            // Start recovery monitoring
            if (config.recoveryConfig.autoRecovery) {
                this.startRecoveryMonitoring(config, state);
            }
            // Send alerts
            await this.sendFailoverAlert(config, failoverEvent);
        }
        catch (error) {
            this.logger.error(`Failover failed for ${config.name}:`, error);
            state.status = FailoverStatus.FAILED;
            // Send failure alert
            await this.sendFailoverAlert(config, {
                id: `failover_failed_${Date.now()}`,
                timestamp: new Date(),
                type: "failover",
                trigger,
                fromEndpoint: state.currentEndpoint,
                toEndpoint: "none",
                reason: error instanceof Error ? error.message : "Unknown error",
                duration: 0,
                success: false,
                metadata: {},
            });
        }
        finally {
            this.activeFailovers.delete(config.id);
            state.updatedAt = new Date();
        }
    }
    selectSecondaryEndpoint(config, state) {
        const availableEndpoints = config.secondaryEndpoints.filter((endpoint) => endpoint !== state.currentEndpoint);
        if (availableEndpoints.length === 0) {
            return null;
        }
        // Simple round-robin selection
        const index = state.metrics.failoverCount % availableEndpoints.length;
        return availableEndpoints[index];
    }
    getRecentFailureCount(state) {
        const recentResults = state.healthCheckResults.slice(-10);
        return recentResults.filter((r) => !r.success).length;
    }
    async updateTrafficRouting(config, endpoint) {
        // Simulated traffic routing update
        this.logger.info(`Updating traffic routing for ${config.name} to ${endpoint}`);
        // In a real implementation, this would:
        // - Update DNS records
        // - Update load balancer configuration
        // - Update CDN settings
        // - Update service discovery
    }
    startRecoveryMonitoring(config, state) {
        setTimeout(async () => {
            await this.attemptRecovery(config, state);
        }, config.recoveryConfig.recoveryDelay * 1000);
    }
    async attemptRecovery(config, state) {
        if (state.status !== FailoverStatus.FAILED_OVER)
            return;
        this.logger.info(`Attempting recovery for ${config.name}`);
        // Check if primary is healthy
        const primaryHealthCheck = await this.executeHealthCheck(config.healthCheckConfig, config.primaryEndpoint);
        if (primaryHealthCheck.success) {
            // Perform recovery
            const recoveryEvent = {
                id: `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                type: "recovery",
                trigger: FailoverTrigger.HEALTH_CHECK_FAILURE,
                fromEndpoint: state.currentEndpoint,
                toEndpoint: config.primaryEndpoint,
                reason: "Primary endpoint recovered",
                duration: 0,
                success: false,
                metadata: {},
            };
            try {
                // Update traffic routing back to primary
                await this.updateTrafficRouting(config, config.primaryEndpoint);
                state.currentEndpoint = config.primaryEndpoint;
                state.status = FailoverStatus.HEALTHY;
                state.failoverHistory.push(recoveryEvent);
                recoveryEvent.success = true;
                recoveryEvent.duration =
                    (Date.now() - recoveryEvent.timestamp.getTime()) / 1000;
                this.logger.info(`Recovery completed for ${config.name}: ${state.currentEndpoint} -> ${config.primaryEndpoint}`);
            }
            catch (error) {
                this.logger.error(`Recovery failed for ${config.name}:`, error);
                recoveryEvent.success = false;
                state.status = FailoverStatus.FAILED_OVER;
            }
            state.updatedAt = new Date();
        }
        else {
            // Schedule another recovery attempt
            if (state.metrics.failoverCount < config.recoveryConfig.maxRecoveryAttempts) {
                this.startRecoveryMonitoring(config, state);
            }
        }
    }
    async manualFailover(configId, targetEndpoint) {
        const config = this.failoverConfigs.find((c) => c.id === configId);
        const state = this.failoverStates.get(configId);
        if (!config || !state) {
            throw new Error(`Failover config not found: ${configId}`);
        }
        if (!config.failoverCriteria.manualTrigger) {
            throw new Error("Manual failover not enabled for this configuration");
        }
        const failoverEvent = {
            id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            type: "manual_switch",
            trigger: FailoverTrigger.MANUAL,
            fromEndpoint: state.currentEndpoint,
            toEndpoint: targetEndpoint,
            reason: "Manual failover triggered",
            duration: 0,
            success: false,
            metadata: {},
        };
        try {
            await this.updateTrafficRouting(config, targetEndpoint);
            state.currentEndpoint = targetEndpoint;
            state.failoverHistory.push(failoverEvent);
            state.metrics.failoverCount++;
            failoverEvent.success = true;
            failoverEvent.duration =
                (Date.now() - failoverEvent.timestamp.getTime()) / 1000;
            this.logger.info(`Manual failover completed for ${config.name}: ${state.currentEndpoint} -> ${targetEndpoint}`);
        }
        catch (error) {
            this.logger.error(`Manual failover failed for ${config.name}:`, error);
            failoverEvent.success = false;
        }
        state.updatedAt = new Date();
    }
    async generateFailoverReport(configId, period) {
        const config = this.failoverConfigs.find((c) => c.id === configId);
        const state = this.failoverStates.get(configId);
        if (!config || !state) {
            throw new Error(`Failover config not found: ${configId}`);
        }
        const periodEvents = state.failoverHistory.filter((e) => e.timestamp >= period.start && e.timestamp <= period.end);
        const summary = this.calculateFailoverSummary(periodEvents, state);
        const recommendations = await this.generateFailoverRecommendations(config, state, periodEvents);
        return {
            id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            configId,
            period,
            summary,
            events: periodEvents,
            metrics: state.metrics,
            recommendations,
            generatedAt: new Date(),
        };
    }
    calculateFailoverSummary(events, state) {
        const totalFailovers = events.filter((e) => e.type === "failover").length;
        const successfulFailovers = events.filter((e) => e.type === "failover" && e.success).length;
        const failedFailovers = totalFailovers - successfulFailovers;
        const averageFailoverTime = events.length > 0
            ? events.reduce((sum, e) => sum + e.duration, 0) / events.length
            : 0;
        const totalDowntime = events.reduce((sum, e) => sum + e.duration, 0);
        const availability = 100 - (totalDowntime / (24 * 60 * 60)) * 100; // Simplified calculation
        return {
            totalFailovers,
            successfulFailovers,
            failedFailovers,
            averageFailoverTime,
            totalDowntime,
            availability,
            currentStatus: state.status,
        };
    }
    async generateFailoverRecommendations(config, state, events) {
        const recommendations = [];
        // Check failover frequency
        if (events.length > 5) {
            recommendations.push({
                type: "infrastructure",
                title: "Improve Primary Endpoint Reliability",
                description: `High number of failovers (${events.length}) indicates primary endpoint issues`,
                priority: "high",
                estimatedImpact: "Reduce failover frequency and improve availability",
                implementation: "Upgrade infrastructure, add redundancy, improve monitoring",
                cost: "medium",
            });
        }
        // Check recovery time
        const averageRecoveryTime = state.metrics.averageRecoveryTime;
        if (averageRecoveryTime > 300) {
            // 5 minutes
            recommendations.push({
                type: "process",
                title: "Optimize Recovery Process",
                description: `Average recovery time of ${averageRecoveryTime}s is too high`,
                priority: "medium",
                estimatedImpact: "Faster recovery and reduced downtime",
                implementation: "Automate recovery procedures, improve health checks, optimize routing",
                cost: "low",
            });
        }
        // Check error rate
        if (state.metrics.errorRate > 5) {
            recommendations.push({
                type: "monitoring",
                title: "Enhance Monitoring and Alerting",
                description: `High error rate of ${state.metrics.errorRate}% indicates monitoring gaps`,
                priority: "medium",
                estimatedImpact: "Proactive issue detection and faster response",
                implementation: "Add comprehensive monitoring, improve alerting, implement circuit breakers",
                cost: "low",
            });
        }
        return recommendations;
    }
    async sendFailoverAlert(config, event) {
        if (!this.config.alertSettings.enableAlerts)
            return;
        const notification = {
            type: "failover_alert",
            config: config.name,
            event: event,
            timestamp: new Date(),
        };
        for (const channel of this.config.alertSettings.channels) {
            if (channel.enabled) {
                try {
                    await this.sendNotification(channel, notification);
                }
                catch (error) {
                    this.logger.error(`Failed to send failover alert via ${channel.type}:`, error);
                }
            }
        }
    }
    async sendNotification(channel, notification) {
        switch (channel.type) {
            case "email":
                this.logger.info(`Email notification: Failover event for ${notification.config}`);
                break;
            case "slack":
                this.logger.info(`Slack notification: Failover event for ${notification.config}`);
                break;
            case "webhook":
                this.logger.info(`Webhook notification: Failover event for ${notification.config}`);
                break;
            case "pagerduty":
                this.logger.info(`PagerDuty notification: Failover event for ${notification.config}`);
                break;
            default:
                this.logger.warn(`Unknown notification channel: ${channel.type}`);
        }
    }
    getFailoverStatus(configId) {
        return this.failoverStates.get(configId) || null;
    }
    getAllFailoverStatuses() {
        return Array.from(this.failoverStates.values());
    }
    destroy() {
        for (const [configId, interval] of this.healthCheckIntervals) {
            clearInterval(interval);
            this.logger.debug(`Stopped health check for config: ${configId}`);
        }
        this.healthCheckIntervals.clear();
    }
}
exports.FailoverManager = FailoverManager;
//# sourceMappingURL=automatic-failover.js.map