/**
 * Comprehensive health check system for GuardAnt services
 * Provides detailed health status information including dependencies
 */
export interface HealthCheckResult {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: number;
    duration: number;
    details?: Record<string, any>;
    error?: string;
}
export interface ServiceHealthStatus {
    service: string;
    version: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: number;
    uptime: number;
    checks: Record<string, HealthCheckResult>;
    metrics?: {
        memory: {
            used: number;
            total: number;
            percentage: number;
        };
        cpu?: {
            usage: number;
        };
        requests?: {
            total: number;
            rate: number;
            errors: number;
            errorRate: number;
        };
    };
}
export type HealthCheck = () => Promise<HealthCheckResult>;
export declare class HealthChecker {
    private serviceName;
    private version;
    private startTime;
    private checks;
    private requestCounts;
    constructor(serviceName: string, version?: string);
    addCheck(name: string, check: HealthCheck): void;
    removeCheck(name: string): void;
    trackRequest(isError?: boolean): void;
    private getMemoryUsage;
    private getCpuUsage;
    runHealthChecks(): Promise<ServiceHealthStatus>;
    getBasicHealth(): {
        status: string;
        timestamp: number;
        uptime: number;
    };
}
export declare const commonHealthChecks: {
    redis: (client: any) => HealthCheck;
    rabbitmq: (connection: any, channel: any) => HealthCheck;
    database: (checkFn: () => Promise<void>, name?: string) => HealthCheck;
    httpService: (url: string, timeout?: number) => HealthCheck;
    storage: (testFn: () => Promise<void>, name?: string) => HealthCheck;
};
export declare function createHealthMiddleware(healthChecker: HealthChecker): (c: any, next: any) => any;
export declare function createHealthEndpoints(healthChecker: HealthChecker): {
    basic: (c: any) => any;
    detailed: (c: any) => Promise<any>;
    ready: (c: any) => Promise<any>;
    live: (c: any) => any;
};
//# sourceMappingURL=health.d.ts.map