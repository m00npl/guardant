import type { GuardAntTracing } from "./tracing";
export interface TestSuite {
    name: string;
    description: string;
    tests: TestCase[];
    setup?: () => Promise<void>;
    teardown?: () => Promise<void>;
    timeoutMs: number;
}
export interface TestCase {
    name: string;
    description: string;
    test: () => Promise<void>;
    expectedResult: string;
    timeoutMs?: number;
    retries?: number;
}
export interface TestResult {
    suiteName: string;
    testName: string;
    status: "PASSED" | "FAILED" | "SKIPPED" | "TIMEOUT";
    durationMs: number;
    error?: string;
    retryCount?: number;
    metadata?: Record<string, any>;
}
export interface TestReport {
    summary: {
        totalTests: number;
        passed: number;
        failed: number;
        skipped: number;
        totalDurationMs: number;
        successRate: number;
    };
    suites: TestSuiteResult[];
    timestamp: number;
    environment: string;
}
export interface TestSuiteResult {
    suiteName: string;
    results: TestResult[];
    summary: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        durationMs: number;
    };
}
export interface IntegrationTestConfig {
    baseUrl: string;
    adminApiUrl: string;
    publicApiUrl: string;
    workersApiUrl: string;
    testTimeoutMs: number;
    retryAttempts: number;
    parallelExecution: boolean;
    testData: {
        testNest: {
            subdomain: string;
            name: string;
            email: string;
            password: string;
        };
        testServices: Array<{
            name: string;
            type: "web" | "tcp" | "ping";
            target: string;
            interval: number;
        }>;
    };
}
export declare const IntegrationTestConfigs: {
    LOCAL: {
        baseUrl: string;
        adminApiUrl: string;
        publicApiUrl: string;
        workersApiUrl: string;
        testTimeoutMs: number;
        retryAttempts: number;
        parallelExecution: boolean;
        testData: {
            testNest: {
                subdomain: string;
                name: string;
                email: string;
                password: string;
            };
            testServices: ({
                name: string;
                type: "web";
                target: string;
                interval: number;
            } | {
                name: string;
                type: "ping";
                target: string;
                interval: number;
            })[];
        };
    };
    STAGING: {
        baseUrl: string;
        adminApiUrl: string;
        publicApiUrl: string;
        workersApiUrl: string;
        testTimeoutMs: number;
        retryAttempts: number;
        parallelExecution: boolean;
        testData: {
            testNest: {
                subdomain: string;
                name: string;
                email: string;
                password: string;
            };
            testServices: {
                name: string;
                type: "web";
                target: string;
                interval: number;
            }[];
        };
    };
};
export declare class IntegrationTestRunner {
    private logger;
    private tracing?;
    private config;
    private suites;
    private results;
    constructor(config: IntegrationTestConfig, tracing?: GuardAntTracing);
    private initializeTestSuites;
    runAllTests(): Promise<TestReport>;
    private runTestSuite;
    private runTestCase;
    private testNestRegistration;
    private testUserLogin;
    private testTokenRefresh;
    private testRoleBasedAccess;
    private testSessionManagement;
    private testServiceCreation;
    private testServiceUpdates;
    private testServiceDeletion;
    private testServiceLimits;
    private testWorkerHealth;
    private testServiceMonitoring;
    private testIncidentDetection;
    private testMetricsCollection;
    private testAdminApiEndpoints;
    private testPublicApiEndpoints;
    private testWidgetIntegration;
    private testSSEStreams;
    private testGolemStorage;
    private testRedisCache;
    private testRabbitMQIntegration;
    private testDataConsistency;
    private testSubscriptionCreation;
    private testPaymentProcessing;
    private testUsageTracking;
    private testSubscriptionUpgrades;
}
export declare function createIntegrationTestRunner(config: IntegrationTestConfig, tracing?: GuardAntTracing): IntegrationTestRunner;
export { IntegrationTestConfigs };
//# sourceMappingURL=integration-tests.d.ts.map