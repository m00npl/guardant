import type { GuardAntTracing } from "./tracing";
export interface E2ETestScenario {
    name: string;
    description: string;
    steps: E2ETestStep[];
    expectedOutcome: string;
    timeoutMs: number;
    cleanup?: () => Promise<void>;
}
export interface E2ETestStep {
    name: string;
    description: string;
    action: () => Promise<any>;
    validation: (result: any) => Promise<boolean>;
    rollback?: () => Promise<void>;
}
export interface E2ETestResult {
    scenarioName: string;
    status: "PASSED" | "FAILED" | "SKIPPED" | "TIMEOUT";
    durationMs: number;
    steps: E2EStepResult[];
    error?: string;
    metadata?: Record<string, any>;
}
export interface E2EStepResult {
    stepName: string;
    status: "PASSED" | "FAILED" | "SKIPPED";
    durationMs: number;
    error?: string;
    data?: any;
}
export interface E2ETestReport {
    summary: {
        totalScenarios: number;
        passed: number;
        failed: number;
        skipped: number;
        totalDurationMs: number;
        successRate: number;
    };
    scenarios: E2ETestResult[];
    timestamp: number;
    environment: string;
}
export interface E2ETestConfig {
    baseUrl: string;
    adminApiUrl: string;
    publicApiUrl: string;
    workersApiUrl: string;
    testTimeoutMs: number;
    testData: {
        testUsers: Array<{
            subdomain: string;
            name: string;
            email: string;
            password: string;
        }>;
        testServices: Array<{
            name: string;
            type: "web" | "tcp" | "ping";
            target: string;
            interval: number;
        }>;
    };
    browserConfig?: {
        headless: boolean;
        slowMo: number;
        timeout: number;
    };
}
export declare const E2ETestConfigs: {
    LOCAL: {
        baseUrl: string;
        adminApiUrl: string;
        publicApiUrl: string;
        workersApiUrl: string;
        testTimeoutMs: number;
        testData: {
            testUsers: {
                subdomain: string;
                name: string;
                email: string;
                password: string;
            }[];
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
        browserConfig: {
            headless: boolean;
            slowMo: number;
            timeout: number;
        };
    };
    STAGING: {
        baseUrl: string;
        adminApiUrl: string;
        publicApiUrl: string;
        workersApiUrl: string;
        testTimeoutMs: number;
        testData: {
            testUsers: {
                subdomain: string;
                name: string;
                email: string;
                password: string;
            }[];
            testServices: {
                name: string;
                type: "web";
                target: string;
                interval: number;
            }[];
        };
        browserConfig: {
            headless: boolean;
            slowMo: number;
            timeout: number;
        };
    };
};
export declare class E2ETestRunner {
    private logger;
    private tracing?;
    private config;
    private scenarios;
    private results;
    constructor(config: E2ETestConfig, tracing?: GuardAntTracing);
    private initializeTestScenarios;
    runAllScenarios(): Promise<E2ETestReport>;
    private runScenario;
    private runStep;
    private registerNewNest;
    private validateNestRegistration;
    private loginToAdminPanel;
    private validateLogin;
    private accessAdminDashboard;
    private validateDashboardAccess;
    private checkSubscriptionStatus;
    private validateSubscriptionStatus;
    private prepareForServiceManagement;
    private validatePreparation;
    private createWebService;
    private validateServiceCreation;
    private configureServiceSettings;
    private validateServiceConfiguration;
    private verifyServiceMonitoring;
    private validateServiceMonitoring;
    private updateServiceConfiguration;
    private validateServiceUpdate;
    private configureStatusPage;
    private validateStatusPageConfiguration;
    private accessPublicStatusPage;
    private validatePublicStatusPage;
    private testWidgetEmbedding;
    private validateWidgetEmbedding;
    private verifyRealTimeUpdates;
    private validateRealTimeUpdates;
    private checkCurrentSubscription;
    private validateCurrentSubscription;
    private viewAvailablePlans;
    private validateAvailablePlans;
    private simulatePlanUpgrade;
    private validatePlanUpgrade;
    private checkUsageAnalytics;
    private validateUsageAnalytics;
    private createMultipleTestNests;
    private validateMultipleNests;
    private testDataIsolation;
    private validateDataIsolation;
    private testCrossTenantAccessPrevention;
    private validateCrossTenantAccessPrevention;
    private verifyResourceLimits;
    private validateResourceLimits;
    private setupTestServiceWithIncident;
    private validateIncidentSetup;
    private triggerSimulatedIncident;
    private validateIncidentTrigger;
    private verifyIncidentDetection;
    private validateIncidentDetection;
    private checkNotificationSystem;
    private validateNotificationSystem;
    private resolveIncident;
    private validateIncidentResolution;
}
export declare function createE2ETestRunner(config: E2ETestConfig, tracing?: GuardAntTracing): E2ETestRunner;
export { E2ETestConfigs };
//# sourceMappingURL=end-to-end-tests.d.ts.map