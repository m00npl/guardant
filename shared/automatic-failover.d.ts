import { GuardAntTracing } from "./tracing";
export declare enum FailoverType {
    ACTIVE_ACTIVE = "active_active",
    ACTIVE_PASSIVE = "active_passive",
    GEOGRAPHIC = "geographic",
    DATABASE = "database",
    LOAD_BALANCER = "load_balancer",
    CUSTOM = "custom"
}
export declare enum FailoverStatus {
    HEALTHY = "healthy",
    DEGRADED = "degraded",
    FAILED = "failed",
    FAILING_OVER = "failing_over",
    FAILED_OVER = "failed_over",
    RECOVERING = "recovering"
}
export declare enum FailoverTrigger {
    HEALTH_CHECK_FAILURE = "health_check_failure",
    PERFORMANCE_DEGRADATION = "performance_degradation",
    MANUAL = "manual",
    SCHEDULED = "scheduled",
    DISASTER = "disaster",
    MAINTENANCE = "maintenance"
}
export interface FailoverConfig {
    id: string;
    name: string;
    description: string;
    type: FailoverType;
    primaryEndpoint: string;
    secondaryEndpoints: string[];
    healthCheckConfig: HealthCheckConfig;
    failoverCriteria: FailoverCriteria;
    recoveryConfig: RecoveryConfig;
    monitoringConfig: FailoverMonitoringConfig;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface HealthCheckConfig {
    endpoint: string;
    method: "GET" | "POST" | "HEAD";
    timeout: number;
    interval: number;
    failureThreshold: number;
    successThreshold: number;
    expectedStatus: number;
    expectedResponse?: string;
    headers?: Record<string, string>;
}
export interface FailoverCriteria {
    healthCheckFailures: number;
    responseTimeThreshold: number;
    errorRateThreshold: number;
    availabilityThreshold: number;
    manualTrigger: boolean;
}
export interface RecoveryConfig {
    autoRecovery: boolean;
    recoveryDelay: number;
    maxRecoveryAttempts: number;
    recoveryHealthChecks: number;
    rollbackOnFailure: boolean;
}
export interface FailoverMonitoringConfig {
    enableMetrics: boolean;
    alertChannels: NotificationChannel[];
    escalationPolicy: EscalationPolicy;
    dashboardIntegration: boolean;
}
export interface FailoverState {
    id: string;
    configId: string;
    status: FailoverStatus;
    currentEndpoint: string;
    lastHealthCheck: Date;
    healthCheckResults: HealthCheckResult[];
    failoverHistory: FailoverEvent[];
    metrics: FailoverMetrics;
    createdAt: Date;
    updatedAt: Date;
}
export interface HealthCheckResult {
    id: string;
    timestamp: Date;
    endpoint: string;
    success: boolean;
    responseTime: number;
    statusCode: number;
    error?: string;
    metadata: Record<string, any>;
}
export interface FailoverEvent {
    id: string;
    timestamp: Date;
    type: "failover" | "recovery" | "manual_switch";
    trigger: FailoverTrigger;
    fromEndpoint: string;
    toEndpoint: string;
    reason: string;
    duration: number;
    success: boolean;
    metadata: Record<string, any>;
}
export interface FailoverMetrics {
    uptime: number;
    responseTime: number;
    errorRate: number;
    failoverCount: number;
    lastFailover: Date;
    averageRecoveryTime: number;
}
export interface FailoverReport {
    id: string;
    configId: string;
    period: ReportPeriod;
    summary: FailoverSummary;
    events: FailoverEvent[];
    metrics: FailoverMetrics;
    recommendations: FailoverRecommendation[];
    generatedAt: Date;
}
export interface FailoverSummary {
    totalFailovers: number;
    successfulFailovers: number;
    failedFailovers: number;
    averageFailoverTime: number;
    totalDowntime: number;
    availability: number;
    currentStatus: FailoverStatus;
}
export interface FailoverRecommendation {
    type: "optimization" | "infrastructure" | "monitoring" | "process";
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    estimatedImpact: string;
    implementation: string;
    cost: "low" | "medium" | "high";
}
export interface FailoverSystemConfig {
    enabled: boolean;
    globalSettings: GlobalFailoverSettings;
    monitoringSettings: FailoverMonitoringSettings;
    alertSettings: FailoverAlertSettings;
    reportingSettings: FailoverReportingSettings;
}
export interface GlobalFailoverSettings {
    defaultHealthCheckInterval: number;
    defaultTimeout: number;
    maxConcurrentFailovers: number;
    globalFailoverDelay: number;
    enableCircuitBreaker: boolean;
}
export interface FailoverMonitoringSettings {
    enableRealTimeMonitoring: boolean;
    metricsCollectionInterval: number;
    retentionDays: number;
    enableTracing: boolean;
}
export interface FailoverAlertSettings {
    enableAlerts: boolean;
    channels: NotificationChannel[];
    escalationPolicy: EscalationPolicy;
    alertThresholds: AlertThreshold[];
}
export interface AlertThreshold {
    metric: "response_time" | "error_rate" | "availability";
    warning: number;
    critical: number;
    action: "email" | "slack" | "webhook" | "pagerduty";
}
export interface FailoverReportingSettings {
    autoGenerateReports: boolean;
    reportSchedule: "daily" | "weekly" | "monthly";
    retentionDays: number;
    exportFormats: ("pdf" | "csv" | "json")[];
}
export declare const FailoverConfigs: {
    LOCAL: {
        enabled: boolean;
        globalSettings: {
            defaultHealthCheckInterval: number;
            defaultTimeout: number;
            maxConcurrentFailovers: number;
            globalFailoverDelay: number;
            enableCircuitBreaker: boolean;
        };
        monitoringSettings: {
            enableRealTimeMonitoring: boolean;
            metricsCollectionInterval: number;
            retentionDays: number;
            enableTracing: boolean;
        };
        alertSettings: {
            enableAlerts: boolean;
            channels: never[];
            escalationPolicy: {
                levels: never[];
                autoEscalate: boolean;
                escalationDelay: number;
            };
            alertThresholds: never[];
        };
        reportingSettings: {
            autoGenerateReports: boolean;
            reportSchedule: string;
            retentionDays: number;
            exportFormats: string[];
        };
    };
    STAGING: {
        enabled: boolean;
        globalSettings: {
            defaultHealthCheckInterval: number;
            defaultTimeout: number;
            maxConcurrentFailovers: number;
            globalFailoverDelay: number;
            enableCircuitBreaker: boolean;
        };
        monitoringSettings: {
            enableRealTimeMonitoring: boolean;
            metricsCollectionInterval: number;
            retentionDays: number;
            enableTracing: boolean;
        };
        alertSettings: {
            enableAlerts: boolean;
            channels: {
                type: string;
                config: {
                    recipients: string[];
                };
                enabled: boolean;
            }[];
            escalationPolicy: {
                levels: {
                    level: number;
                    delay: number;
                    channels: string[];
                    recipients: string[];
                }[];
                autoEscalate: boolean;
                escalationDelay: number;
            };
            alertThresholds: {
                metric: string;
                warning: number;
                critical: number;
                action: string;
            }[];
        };
        reportingSettings: {
            autoGenerateReports: boolean;
            reportSchedule: string;
            retentionDays: number;
            exportFormats: string[];
        };
    };
    PRODUCTION: {
        enabled: boolean;
        globalSettings: {
            defaultHealthCheckInterval: number;
            defaultTimeout: number;
            maxConcurrentFailovers: number;
            globalFailoverDelay: number;
            enableCircuitBreaker: boolean;
        };
        monitoringSettings: {
            enableRealTimeMonitoring: boolean;
            metricsCollectionInterval: number;
            retentionDays: number;
            enableTracing: boolean;
        };
        alertSettings: {
            enableAlerts: boolean;
            channels: ({
                type: string;
                config: {
                    recipients: string[];
                    channel?: undefined;
                    serviceKey?: undefined;
                };
                enabled: boolean;
            } | {
                type: string;
                config: {
                    channel: string;
                    recipients?: undefined;
                    serviceKey?: undefined;
                };
                enabled: boolean;
            } | {
                type: string;
                config: {
                    serviceKey: string;
                    recipients?: undefined;
                    channel?: undefined;
                };
                enabled: boolean;
            })[];
            escalationPolicy: {
                levels: {
                    level: number;
                    delay: number;
                    channels: string[];
                    recipients: string[];
                }[];
                autoEscalate: boolean;
                escalationDelay: number;
            };
            alertThresholds: {
                metric: string;
                warning: number;
                critical: number;
                action: string;
            }[];
        };
        reportingSettings: {
            autoGenerateReports: boolean;
            reportSchedule: string;
            retentionDays: number;
            exportFormats: string[];
        };
    };
};
export declare class FailoverManager {
    private logger;
    private tracing?;
    private config;
    private failoverConfigs;
    private failoverStates;
    private healthCheckIntervals;
    private activeFailovers;
    constructor(config: FailoverSystemConfig, tracing?: GuardAntTracing);
    private initializeDefaultFailoverConfigs;
    createFailoverConfig(config: Omit<FailoverConfig, "id" | "createdAt" | "updatedAt">): Promise<FailoverConfig>;
    private initializeFailoverState;
    private startHealthChecks;
    private startHealthCheck;
    private performHealthCheck;
    private executeHealthCheck;
    private updateFailoverMetrics;
    private shouldTriggerFailover;
    private triggerFailover;
    private selectSecondaryEndpoint;
    private getRecentFailureCount;
    private updateTrafficRouting;
    private startRecoveryMonitoring;
    private attemptRecovery;
    manualFailover(configId: string, targetEndpoint: string): Promise<void>;
    generateFailoverReport(configId: string, period: ReportPeriod): Promise<FailoverReport>;
    private calculateFailoverSummary;
    private generateFailoverRecommendations;
    private sendFailoverAlert;
    private sendNotification;
    getFailoverStatus(configId: string): FailoverState | null;
    getAllFailoverStatuses(): FailoverState[];
    destroy(): void;
}
//# sourceMappingURL=automatic-failover.d.ts.map