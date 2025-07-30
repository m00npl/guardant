import type { GuardAntTracing } from "./tracing";
export interface DeploymentConfig {
    service: string;
    environment: "development" | "staging" | "production";
    version: string;
    strategy: "blue-green" | "rolling" | "recreate";
    healthCheck: HealthCheckConfig;
    rollback: RollbackConfig;
    monitoring: MonitoringConfig;
}
export interface HealthCheckConfig {
    endpoint: string;
    timeoutMs: number;
    intervalMs: number;
    retries: number;
    expectedStatus: number;
    expectedResponse?: any;
}
export interface RollbackConfig {
    enabled: boolean;
    automatic: boolean;
    threshold: number;
    previousVersion?: string;
    rollbackTimeoutMs: number;
}
export interface MonitoringConfig {
    metrics: boolean;
    logs: boolean;
    alerts: boolean;
    dashboard: boolean;
}
export interface DeploymentStep {
    name: string;
    description: string;
    action: () => Promise<DeploymentStepResult>;
    rollback?: () => Promise<void>;
    timeoutMs: number;
}
export interface DeploymentStepResult {
    stepName: string;
    status: "SUCCESS" | "FAILED" | "SKIPPED" | "TIMEOUT";
    durationMs: number;
    error?: string;
    metadata?: Record<string, any>;
}
export interface DeploymentResult {
    deploymentId: string;
    service: string;
    environment: string;
    version: string;
    strategy: string;
    status: "IN_PROGRESS" | "SUCCESS" | "FAILED" | "ROLLED_BACK";
    steps: DeploymentStepResult[];
    startTime: number;
    endTime?: number;
    durationMs?: number;
    healthCheckResults: HealthCheckResult[];
    rollbackReason?: string;
}
export interface HealthCheckResult {
    timestamp: number;
    status: "HEALTHY" | "UNHEALTHY" | "TIMEOUT";
    responseTime: number;
    statusCode: number;
    error?: string;
}
export interface DeploymentReport {
    summary: {
        totalDeployments: number;
        successful: number;
        failed: number;
        rolledBack: number;
        averageDurationMs: number;
        successRate: number;
    };
    deployments: DeploymentResult[];
    recommendations: DeploymentRecommendation[];
    timestamp: number;
    environment: string;
}
export interface DeploymentRecommendation {
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    title: string;
    description: string;
    impact: string;
    action: string;
    effort: "LOW" | "MEDIUM" | "HIGH";
    timeline: string;
}
export interface BlueGreenConfig {
    blueEnvironment: string;
    greenEnvironment: string;
    activeEnvironment: "blue" | "green";
    switchoverTimeoutMs: number;
    healthCheckThreshold: number;
}
export declare const DeploymentConfigs: {
    LOCAL: {
        services: {
            adminApi: {
                port: number;
                healthCheck: string;
                dockerImage: string;
            };
            publicApi: {
                port: number;
                healthCheck: string;
                dockerImage: string;
            };
            workersApi: {
                port: number;
                healthCheck: string;
                dockerImage: string;
            };
            frontendAdmin: {
                port: number;
                healthCheck: string;
                dockerImage: string;
            };
            frontendStatus: {
                port: number;
                healthCheck: string;
                dockerImage: string;
            };
        };
        blueGreen: {
            blueEnvironment: string;
            greenEnvironment: string;
            activeEnvironment: "blue";
            switchoverTimeoutMs: number;
            healthCheckThreshold: number;
        };
    };
    STAGING: {
        services: {
            adminApi: {
                port: number;
                healthCheck: string;
                dockerImage: string;
            };
            publicApi: {
                port: number;
                healthCheck: string;
                dockerImage: string;
            };
            workersApi: {
                port: number;
                healthCheck: string;
                dockerImage: string;
            };
            frontendAdmin: {
                port: number;
                healthCheck: string;
                dockerImage: string;
            };
            frontendStatus: {
                port: number;
                healthCheck: string;
                dockerImage: string;
            };
        };
        blueGreen: {
            blueEnvironment: string;
            greenEnvironment: string;
            activeEnvironment: "blue";
            switchoverTimeoutMs: number;
            healthCheckThreshold: number;
        };
    };
    PRODUCTION: {
        services: {
            adminApi: {
                port: number;
                healthCheck: string;
                dockerImage: string;
            };
            publicApi: {
                port: number;
                healthCheck: string;
                dockerImage: string;
            };
            workersApi: {
                port: number;
                healthCheck: string;
                dockerImage: string;
            };
            frontendAdmin: {
                port: number;
                healthCheck: string;
                dockerImage: string;
            };
            frontendStatus: {
                port: number;
                healthCheck: string;
                dockerImage: string;
            };
        };
        blueGreen: {
            blueEnvironment: string;
            greenEnvironment: string;
            activeEnvironment: "blue";
            switchoverTimeoutMs: number;
            healthCheckThreshold: number;
        };
    };
};
export declare class AutomatedDeployment {
    private logger;
    private tracing?;
    private config;
    private deployments;
    constructor(config: any, tracing?: GuardAntTracing);
    deployService(service: string, version: string, environment: string): Promise<DeploymentResult>;
    private createDeploymentSteps;
    private executeDeploymentStep;
    private preDeploymentHealthCheck;
    private buildDockerImage;
    private cleanupDockerImage;
    private deployToInactiveEnvironment;
    private rollbackInactiveEnvironment;
    private healthCheckInactiveEnvironment;
    private switchTraffic;
    private switchTrafficBack;
    private postDeploymentHealthCheck;
    private cleanupOldEnvironment;
    private performHealthChecks;
    private shouldRollback;
    private rollbackDeployment;
    private generateDeploymentId;
    getDeploymentHistory(service?: string, environment?: string): Promise<DeploymentResult[]>;
    generateDeploymentReport(service?: string, environment?: string): Promise<DeploymentReport>;
    private generateDeploymentRecommendations;
}
export declare function createAutomatedDeployment(config: any, tracing?: GuardAntTracing): AutomatedDeployment;
export { DeploymentConfigs };
//# sourceMappingURL=automated-deployment.d.ts.map