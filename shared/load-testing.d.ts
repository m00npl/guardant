import type { GuardAntTracing } from "./tracing";
export interface LoadTestScenario {
    name: string;
    description: string;
    config: LoadTestConfig;
    requests: LoadTestRequest[];
    expectedMetrics: LoadTestMetrics;
}
export interface LoadTestConfig {
    concurrentUsers: number;
    durationSeconds: number;
    rampUpSeconds: number;
    rampDownSeconds: number;
    targetRPS: number;
    timeoutMs: number;
    retryAttempts: number;
}
export interface LoadTestRequest {
    name: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    url: string;
    headers?: Record<string, string>;
    body?: any;
    weight: number;
    expectedStatus: number;
    timeoutMs?: number;
}
export interface LoadTestMetrics {
    maxResponseTime: number;
    minResponseTime: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    maxRPS: number;
    avgRPS: number;
    errorRate: number;
    successRate: number;
    totalRequests: number;
    totalErrors: number;
}
export interface LoadTestResult {
    scenarioName: string;
    status: "PASSED" | "FAILED" | "TIMEOUT";
    durationMs: number;
    metrics: LoadTestMetrics;
    requests: LoadTestRequestResult[];
    summary: {
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
        averageRPS: number;
        peakRPS: number;
        errorRate: number;
    };
    timestamp: number;
}
export interface LoadTestRequestResult {
    requestName: string;
    status: "SUCCESS" | "FAILED" | "TIMEOUT";
    responseTime: number;
    statusCode: number;
    error?: string;
    timestamp: number;
}
export interface LoadTestReport {
    summary: {
        totalScenarios: number;
        passed: number;
        failed: number;
        totalDurationMs: number;
        averageRPS: number;
        peakRPS: number;
        overallErrorRate: number;
    };
    scenarios: LoadTestResult[];
    recommendations: LoadTestRecommendation[];
    timestamp: number;
    environment: string;
}
export interface LoadTestRecommendation {
    type: "PERFORMANCE" | "CAPACITY" | "OPTIMIZATION" | "INFRASTRUCTURE";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    title: string;
    description: string;
    impact: string;
    suggestion: string;
}
export interface LoadTestConfigs {
    baseUrl: string;
    adminApiUrl: string;
    publicApiUrl: string;
    workersApiUrl: string;
    testUsers: Array<{
        subdomain: string;
        email: string;
        password: string;
    }>;
    testServices: Array<{
        name: string;
        type: "web" | "tcp" | "ping";
        target: string;
    }>;
}
export declare const LoadTestConfigs: {
    LOCAL: {
        baseUrl: string;
        adminApiUrl: string;
        publicApiUrl: string;
        workersApiUrl: string;
        testUsers: {
            subdomain: string;
            email: string;
            password: string;
        }[];
        testServices: ({
            name: string;
            type: "web";
            target: string;
        } | {
            name: string;
            type: "ping";
            target: string;
        })[];
    };
    STAGING: {
        baseUrl: string;
        adminApiUrl: string;
        publicApiUrl: string;
        workersApiUrl: string;
        testUsers: {
            subdomain: string;
            email: string;
            password: string;
        }[];
        testServices: {
            name: string;
            type: "web";
            target: string;
        }[];
    };
};
export declare class LoadTestRunner {
    private logger;
    private tracing?;
    private config;
    private scenarios;
    private results;
    constructor(config: LoadTestConfigs, tracing?: GuardAntTracing);
    private initializeLoadTestScenarios;
    runAllLoadTests(): Promise<LoadTestReport>;
    private runLoadTestScenario;
    private executeRequest;
    private calculateMetrics;
    private calculateSummary;
    private calculateMaxRPS;
    private calculateAvgRPS;
    private evaluateScenario;
    private generateRecommendations;
    private calculateAverageRPS;
    private calculatePeakRPS;
    private calculateOverallErrorRate;
}
export declare function createLoadTestRunner(config: LoadTestConfigs, tracing?: GuardAntTracing): LoadTestRunner;
export { LoadTestConfigs };
//# sourceMappingURL=load-testing.d.ts.map