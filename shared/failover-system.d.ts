/**
 * GuardAnt Automatic Failover System
 * High-availability orchestration with intelligent failover detection,
 * automated service recovery, and traffic routing for multi-tenant monitoring platform
 */
import { EventEmitter } from 'events';
import { GuardAntTracing } from './tracing';
import { GolemAdapter } from './golem-adapter';
export interface ServiceEndpoint {
    id: string;
    name: string;
    url: string;
    region: string;
    priority: number;
    healthCheckPath: string;
    capacity: number;
    currentLoad: number;
    status: ServiceStatus;
    lastHealthCheck: string;
    metadata: Record<string, any>;
}
export declare enum ServiceStatus {
    HEALTHY = "healthy",
    DEGRADED = "degraded",
    UNHEALTHY = "unhealthy",
    MAINTENANCE = "maintenance",
    UNKNOWN = "unknown"
}
export interface FailoverRule {
    id: string;
    name: string;
    servicePattern: string;
    triggerConditions: FailoverCondition[];
    failoverStrategy: FailoverStrategy;
    recoveryStrategy: RecoveryStrategy;
    enabled: boolean;
    priority: number;
    cooldownPeriod: number;
    maxFailovers: number;
    timeWindow: number;
    notificationChannels: string[];
    metadata: Record<string, any>;
}
export interface FailoverCondition {
    type: ConditionType;
    threshold: number;
    duration: number;
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
    metric: string;
    description: string;
}
export declare enum ConditionType {
    HEALTH_CHECK_FAILURE = "health_check_failure",
    RESPONSE_TIME = "response_time",
    ERROR_RATE = "error_rate",
    CPU_USAGE = "cpu_usage",
    MEMORY_USAGE = "memory_usage",
    CONNECTION_COUNT = "connection_count",
    CUSTOM_METRIC = "custom_metric"
}
export interface FailoverStrategy {
    type: FailoverType;
    targetSelection: TargetSelection;
    trafficDistribution: TrafficDistribution;
    drainTimeout: number;
    validateTarget: boolean;
    rollbackOnFailure: boolean;
    configuration: Record<string, any>;
}
export declare enum FailoverType {
    IMMEDIATE = "immediate",
    GRADUAL = "gradual",
    BLUE_GREEN = "blue_green",
    CANARY = "canary",
    WEIGHTED_ROUND_ROBIN = "weighted_round_robin"
}
export declare enum TargetSelection {
    HIGHEST_PRIORITY = "highest_priority",
    LOWEST_LOAD = "lowest_load",
    CLOSEST_REGION = "closest_region",
    ROUND_ROBIN = "round_robin",
    RANDOM = "random",
    CUSTOM = "custom"
}
export interface TrafficDistribution {
    strategy: 'all_or_nothing' | 'percentage_based' | 'connection_based';
    parameters: Record<string, any>;
}
export interface RecoveryStrategy {
    type: RecoveryType;
    healthCheckInterval: number;
    consecutiveSuccessRequired: number;
    recoveryDelay: number;
    trafficRampUp: {
        enabled: boolean;
        initialPercentage: number;
        incrementPercentage: number;
        incrementInterval: number;
    };
    rollbackConditions: FailoverCondition[];
}
export declare enum RecoveryType {
    AUTOMATIC = "automatic",
    MANUAL = "manual",
    SCHEDULED = "scheduled",
    HYBRID = "hybrid"
}
export interface FailoverEvent {
    id: string;
    timestamp: string;
    ruleId: string;
    sourceEndpoint: ServiceEndpoint;
    targetEndpoint?: ServiceEndpoint;
    triggerReason: string;
    conditions: Array<{
        type: ConditionType;
        actualValue: number;
        threshold: number;
        passed: boolean;
    }>;
    status: FailoverStatus;
    duration?: number;
    affectedConnections: number;
    recoveredAt?: string;
    metadata: Record<string, any>;
}
export declare enum FailoverStatus {
    TRIGGERED = "triggered",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    FAILED = "failed",
    RECOVERING = "recovering",
    RECOVERED = "recovered"
}
export interface FailoverConfiguration {
    enabled: boolean;
    healthCheckInterval: number;
    healthCheckTimeout: number;
    healthCheckRetries: number;
    detectionInterval: number;
    metricsRetentionPeriod: number;
    maxConcurrentFailovers: number;
    globalCooldownPeriod: number;
    enableMetrics: boolean;
    enableTracing: boolean;
    enableAlerting: boolean;
    loadBalancerIntegration: boolean;
    dnsFailoverEnabled: boolean;
    serviceDiscoveryIntegration: boolean;
    notificationChannels: Array<{
        type: 'email' | 'slack' | 'webhook' | 'sms';
        config: Record<string, any>;
    }>;
}
export declare class FailoverSystemManager extends EventEmitter {
    private serviceName;
    private config;
    private logger;
    private tracing?;
    private endpoints;
    private rules;
    private activeFailovers;
    private metrics;
    private golemAdapter;
    private healthCheckTimer?;
    private detectionTimer?;
    private metricsCleanupTimer?;
    constructor(serviceName: string, config: FailoverConfiguration, golemAdapter?: GolemAdapter, tracing?: GuardAntTracing);
    registerEndpoint(endpoint: Omit<ServiceEndpoint, 'id' | 'lastHealthCheck' | 'currentLoad'>): Promise<ServiceEndpoint>;
    addFailoverRule(rule: Omit<FailoverRule, 'id'>): Promise<FailoverRule>;
    triggerFailover(sourceEndpointId: string, targetEndpointId?: string, reason?: string): Promise<FailoverEvent>;
    getSystemHealth(): any;
    getEndpointMetrics(endpointId: string, period?: number): any;
    private performHealthCheck;
    private httpHealthCheck;
    private determineEndpointStatus;
    private detectFailovers;
    private evaluateFailoverRule;
    private evaluateConditions;
    private getMetricValue;
    private evaluateCondition;
    private initiateFailover;
    private executeFailover;
    private executeFailoverStrategy;
    private executeImmediateFailover;
    private executeGradualFailover;
    private executeBlueGreenFailover;
    private redirectTrafficToTarget;
    private redirectTrafficPercentage;
    private validateFailoverTarget;
    private selectFailoverTarget;
    private startRecoveryMonitoring;
    private executeRecovery;
    private executeTrafficRampUp;
    private redirectTrafficToSource;
    private redirectTrafficPercentageToSource;
    private isInCooldown;
    private getRegionalHealth;
    private getRecentFailovers;
    private calculateTrend;
    private validateEndpoint;
    private validateFailoverRule;
    private generateEndpointId;
    private generateRuleId;
    private generateFailoverId;
    private startHealthChecking;
    private startFailoverDetection;
    private startMetricsCleanup;
    private performAllHealthChecks;
    private cleanupOldMetrics;
    private setupEventListeners;
    shutdown(): Promise<void>;
    getHealthStatus(): {
        healthy: boolean;
        details: any;
    };
}
export declare function createFailoverSystemManager(serviceName: string, config: FailoverConfiguration, golemAdapter?: GolemAdapter, tracing?: GuardAntTracing): FailoverSystemManager;
//# sourceMappingURL=failover-system.d.ts.map