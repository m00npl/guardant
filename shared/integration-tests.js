"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationTestRunner = exports.IntegrationTestConfigs = void 0;
exports.createIntegrationTestRunner = createIntegrationTestRunner;
/**
 * Integration testing system for GuardAnt services
 * Provides comprehensive test suites for all major system components
 */
const logger_1 = require("./logger");
exports.IntegrationTestConfigs = {
    LOCAL: {
        baseUrl: "http://localhost:3000",
        adminApiUrl: "http://localhost:3001",
        publicApiUrl: "http://localhost:3002",
        workersApiUrl: "http://localhost:3099",
        testTimeoutMs: 30000,
        retryAttempts: 3,
        parallelExecution: false,
        testData: {
            testNest: {
                subdomain: "test-integration",
                name: "Integration Test Nest",
                email: "test@integration.guardant.me",
                password: "TestPassword123!",
            },
            testServices: [
                {
                    name: "Test Website",
                    type: "web",
                    target: "https://httpbin.org/status/200",
                    interval: 60,
                },
                {
                    name: "Test Ping",
                    type: "ping",
                    target: "8.8.8.8",
                    interval: 120,
                },
            ],
        },
    },
    STAGING: {
        baseUrl: "https://staging.guardant.me",
        adminApiUrl: "https://api-staging.guardant.me",
        publicApiUrl: "https://public-staging.guardant.me",
        workersApiUrl: "https://workers-staging.guardant.me",
        testTimeoutMs: 60000,
        retryAttempts: 5,
        parallelExecution: true,
        testData: {
            testNest: {
                subdomain: "staging-test",
                name: "Staging Test Nest",
                email: "test@staging.guardant.me",
                password: "StagingTest123!",
            },
            testServices: [
                {
                    name: "Staging Website",
                    type: "web",
                    target: "https://httpbin.org/status/200",
                    interval: 60,
                },
            ],
        },
    },
};
class IntegrationTestRunner {
    constructor(config, tracing) {
        this.logger = (0, logger_1.createLogger)("integration-tests");
        this.suites = [];
        this.results = [];
        this.config = config;
        this.tracing = tracing;
        this.initializeTestSuites();
    }
    initializeTestSuites() {
        // Authentication and Authorization Tests
        this.suites.push({
            name: "Authentication & Authorization",
            description: "Test JWT authentication, role-based access, and session management",
            timeoutMs: 30000,
            tests: [
                {
                    name: "Nest Registration",
                    description: "Test nest registration with valid data",
                    test: () => this.testNestRegistration(),
                    expectedResult: "Nest should be created successfully with default subscription",
                },
                {
                    name: "User Login",
                    description: "Test user login with valid credentials",
                    test: () => this.testUserLogin(),
                    expectedResult: "User should receive access and refresh tokens",
                },
                {
                    name: "Token Refresh",
                    description: "Test token refresh mechanism",
                    test: () => this.testTokenRefresh(),
                    expectedResult: "New access token should be issued",
                },
                {
                    name: "Role-Based Access",
                    description: "Test different user roles and permissions",
                    test: () => this.testRoleBasedAccess(),
                    expectedResult: "Users should only access resources based on their role",
                },
                {
                    name: "Session Management",
                    description: "Test session creation, tracking, and cleanup",
                    test: () => this.testSessionManagement(),
                    expectedResult: "Sessions should be properly managed and cleaned up",
                },
            ],
        });
        // Service Management Tests
        this.suites.push({
            name: "Service Management",
            description: "Test service CRUD operations and configuration",
            timeoutMs: 45000,
            tests: [
                {
                    name: "Service Creation",
                    description: "Test creating different types of services",
                    test: () => this.testServiceCreation(),
                    expectedResult: "Services should be created with proper configuration",
                },
                {
                    name: "Service Updates",
                    description: "Test updating service configurations",
                    test: () => this.testServiceUpdates(),
                    expectedResult: "Service configurations should be updated successfully",
                },
                {
                    name: "Service Deletion",
                    description: "Test service deletion and cleanup",
                    test: () => this.testServiceDeletion(),
                    expectedResult: "Services should be deleted and resources cleaned up",
                },
                {
                    name: "Service Limits",
                    description: "Test subscription-based service limits",
                    test: () => this.testServiceLimits(),
                    expectedResult: "Service creation should respect subscription limits",
                },
            ],
        });
        // Monitoring and Health Checks
        this.suites.push({
            name: "Monitoring & Health Checks",
            description: "Test monitoring workers and health check systems",
            timeoutMs: 60000,
            tests: [
                {
                    name: "Worker Health",
                    description: "Test monitoring worker health and status",
                    test: () => this.testWorkerHealth(),
                    expectedResult: "Workers should report healthy status",
                },
                {
                    name: "Service Monitoring",
                    description: "Test actual service monitoring and status updates",
                    test: () => this.testServiceMonitoring(),
                    expectedResult: "Services should be monitored and status updated",
                },
                {
                    name: "Incident Detection",
                    description: "Test incident detection and alerting",
                    test: () => this.testIncidentDetection(),
                    expectedResult: "Incidents should be detected and alerts triggered",
                },
                {
                    name: "Metrics Collection",
                    description: "Test metrics collection and aggregation",
                    test: () => this.testMetricsCollection(),
                    expectedResult: "Metrics should be collected and aggregated properly",
                },
            ],
        });
        // API Integration Tests
        this.suites.push({
            name: "API Integration",
            description: "Test all API endpoints and integrations",
            timeoutMs: 40000,
            tests: [
                {
                    name: "Admin API Endpoints",
                    description: "Test all admin API endpoints",
                    test: () => this.testAdminApiEndpoints(),
                    expectedResult: "All admin API endpoints should work correctly",
                },
                {
                    name: "Public API Endpoints",
                    description: "Test public API endpoints for status pages",
                    test: () => this.testPublicApiEndpoints(),
                    expectedResult: "Public API should serve status page data",
                },
                {
                    name: "Widget Integration",
                    description: "Test embeddable widget functionality",
                    test: () => this.testWidgetIntegration(),
                    expectedResult: "Widgets should be embeddable and functional",
                },
                {
                    name: "SSE Streams",
                    description: "Test Server-Sent Events for real-time updates",
                    test: () => this.testSSEStreams(),
                    expectedResult: "SSE streams should provide real-time updates",
                },
            ],
        });
        // Storage and Data Persistence
        this.suites.push({
            name: "Storage & Data Persistence",
            description: "Test data storage, retrieval, and persistence",
            timeoutMs: 35000,
            tests: [
                {
                    name: "Golem L3 Storage",
                    description: "Test Golem Base L3 storage operations",
                    test: () => this.testGolemStorage(),
                    expectedResult: "Data should be stored and retrieved from Golem L3",
                },
                {
                    name: "Redis Cache",
                    description: "Test Redis caching operations",
                    test: () => this.testRedisCache(),
                    expectedResult: "Cache operations should work correctly",
                },
                {
                    name: "RabbitMQ Integration",
                    description: "Test RabbitMQ message queuing",
                    test: () => this.testRabbitMQIntegration(),
                    expectedResult: "Messages should be queued and processed",
                },
                {
                    name: "Data Consistency",
                    description: "Test data consistency across storage layers",
                    test: () => this.testDataConsistency(),
                    expectedResult: "Data should be consistent across all storage layers",
                },
            ],
        });
        // Subscription and Billing
        this.suites.push({
            name: "Subscription & Billing",
            description: "Test subscription management and payment processing",
            timeoutMs: 50000,
            tests: [
                {
                    name: "Subscription Creation",
                    description: "Test automatic subscription creation",
                    test: () => this.testSubscriptionCreation(),
                    expectedResult: "Free subscription should be created automatically",
                },
                {
                    name: "Payment Processing",
                    description: "Test ETH payment processing",
                    test: () => this.testPaymentProcessing(),
                    expectedResult: "Payments should be processed successfully",
                },
                {
                    name: "Usage Tracking",
                    description: "Test usage tracking and billing",
                    test: () => this.testUsageTracking(),
                    expectedResult: "Usage should be tracked and billed correctly",
                },
                {
                    name: "Subscription Upgrades",
                    description: "Test subscription tier upgrades",
                    test: () => this.testSubscriptionUpgrades(),
                    expectedResult: "Subscription upgrades should work correctly",
                },
            ],
        });
    }
    async runAllTests() {
        const startTime = Date.now();
        this.logger.info("Starting integration test suite", {
            totalSuites: this.suites.length,
            config: this.config,
        });
        const suiteResults = [];
        for (const suite of this.suites) {
            const suiteResult = await this.runTestSuite(suite);
            suiteResults.push(suiteResult);
        }
        const totalDuration = Date.now() - startTime;
        const totalTests = this.results.length;
        const passed = this.results.filter((r) => r.status === "PASSED").length;
        const failed = this.results.filter((r) => r.status === "FAILED").length;
        const skipped = this.results.filter((r) => r.status === "SKIPPED").length;
        const report = {
            summary: {
                totalTests,
                passed,
                failed,
                skipped,
                totalDurationMs: totalDuration,
                successRate: totalTests > 0 ? (passed / totalTests) * 100 : 0,
            },
            suites: suiteResults,
            timestamp: Date.now(),
            environment: process.env.NODE_ENV || "development",
        };
        this.logger.info("Integration test suite completed", {
            summary: report.summary,
            successRate: `${report.summary.successRate.toFixed(2)}%`,
        });
        return report;
    }
    async runTestSuite(suite) {
        this.logger.info(`Running test suite: ${suite.name}`, {
            testCount: suite.tests.length,
            timeoutMs: suite.timeoutMs,
        });
        const results = [];
        const startTime = Date.now();
        // Run setup if provided
        if (suite.setup) {
            try {
                await suite.setup();
            }
            catch (error) {
                this.logger.error("Test suite setup failed", {
                    suite: suite.name,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        // Run tests
        for (const testCase of suite.tests) {
            const result = await this.runTestCase(suite, testCase);
            results.push(result);
        }
        // Run teardown if provided
        if (suite.teardown) {
            try {
                await suite.teardown();
            }
            catch (error) {
                this.logger.error("Test suite teardown failed", {
                    suite: suite.name,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        const duration = Date.now() - startTime;
        const passed = results.filter((r) => r.status === "PASSED").length;
        const failed = results.filter((r) => r.status === "FAILED").length;
        const skipped = results.filter((r) => r.status === "SKIPPED").length;
        return {
            suiteName: suite.name,
            results,
            summary: {
                total: results.length,
                passed,
                failed,
                skipped,
                durationMs: duration,
            },
        };
    }
    async runTestCase(suite, testCase) {
        const startTime = Date.now();
        const timeout = testCase.timeoutMs || suite.timeoutMs;
        const retries = testCase.retries || this.config.retryAttempts;
        this.logger.debug(`Running test: ${testCase.name}`, {
            suite: suite.name,
            expectedResult: testCase.expectedResult,
        });
        let lastError;
        let retryCount = 0;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout);
                });
                await Promise.race([testCase.test(), timeoutPromise]);
                const duration = Date.now() - startTime;
                const result = {
                    suiteName: suite.name,
                    testName: testCase.name,
                    status: "PASSED",
                    durationMs: duration,
                    retryCount: retryCount,
                };
                this.results.push(result);
                return result;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                retryCount = attempt;
                if (attempt < retries) {
                    this.logger.warn(`Test failed, retrying: ${testCase.name}`, {
                        attempt: attempt + 1,
                        maxRetries: retries,
                        error: lastError.message,
                    });
                    // Wait before retry with exponential backoff
                    await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }
        const duration = Date.now() - startTime;
        const result = {
            suiteName: suite.name,
            testName: testCase.name,
            status: "FAILED",
            durationMs: duration,
            error: lastError?.message,
            retryCount: retryCount,
        };
        this.results.push(result);
        return result;
    }
    // Test Implementation Methods
    async testNestRegistration() {
        const response = await fetch(`${this.config.adminApiUrl}/api/nests`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                subdomain: this.config.testData.testNest.subdomain,
                name: this.config.testData.testNest.name,
                email: this.config.testData.testNest.email,
                password: this.config.testData.testNest.password,
            }),
        });
        if (!response.ok) {
            throw new Error(`Nest registration failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.nest || !data.user || !data.tokens) {
            throw new Error("Invalid registration response format");
        }
    }
    async testUserLogin() {
        const response = await fetch(`${this.config.adminApiUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: this.config.testData.testNest.email,
                password: this.config.testData.testNest.password,
            }),
        });
        if (!response.ok) {
            throw new Error(`Login failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.accessToken || !data.refreshToken) {
            throw new Error("Invalid login response format");
        }
    }
    async testTokenRefresh() {
        // First login to get tokens
        const loginResponse = await fetch(`${this.config.adminApiUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: this.config.testData.testNest.email,
                password: this.config.testData.testNest.password,
            }),
        });
        const loginData = await loginResponse.json();
        // Test token refresh
        const refreshResponse = await fetch(`${this.config.adminApiUrl}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                refreshToken: loginData.refreshToken,
            }),
        });
        if (!refreshResponse.ok) {
            throw new Error(`Token refresh failed: ${refreshResponse.status} ${refreshResponse.statusText}`);
        }
        const refreshData = await refreshResponse.json();
        if (!refreshData.accessToken) {
            throw new Error("Invalid refresh response format");
        }
    }
    async testRoleBasedAccess() {
        // This test would verify that different user roles have appropriate access levels
        // Implementation would depend on the specific role system implemented
        throw new Error("Role-based access test not implemented");
    }
    async testSessionManagement() {
        // This test would verify session creation, tracking, and cleanup
        // Implementation would depend on the session management system
        throw new Error("Session management test not implemented");
    }
    async testServiceCreation() {
        // Login first
        const loginResponse = await fetch(`${this.config.adminApiUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: this.config.testData.testNest.email,
                password: this.config.testData.testNest.password,
            }),
        });
        const loginData = await loginResponse.json();
        // Create a test service
        const serviceResponse = await fetch(`${this.config.adminApiUrl}/api/services`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${loginData.accessToken}`,
            },
            body: JSON.stringify(this.config.testData.testServices[0]),
        });
        if (!serviceResponse.ok) {
            throw new Error(`Service creation failed: ${serviceResponse.status} ${serviceResponse.statusText}`);
        }
        const serviceData = await serviceResponse.json();
        if (!serviceData.service || !serviceData.service.id) {
            throw new Error("Invalid service creation response format");
        }
    }
    async testServiceUpdates() {
        throw new Error("Service updates test not implemented");
    }
    async testServiceDeletion() {
        throw new Error("Service deletion test not implemented");
    }
    async testServiceLimits() {
        throw new Error("Service limits test not implemented");
    }
    async testWorkerHealth() {
        const response = await fetch(`${this.config.workersApiUrl}/health`);
        if (!response.ok) {
            throw new Error(`Worker health check failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (data.status !== "healthy") {
            throw new Error(`Worker not healthy: ${data.status}`);
        }
    }
    async testServiceMonitoring() {
        throw new Error("Service monitoring test not implemented");
    }
    async testIncidentDetection() {
        throw new Error("Incident detection test not implemented");
    }
    async testMetricsCollection() {
        throw new Error("Metrics collection test not implemented");
    }
    async testAdminApiEndpoints() {
        const endpoints = [
            "/health",
            "/api/nests",
            "/api/services",
            "/api/subscription/plans",
        ];
        for (const endpoint of endpoints) {
            const response = await fetch(`${this.config.adminApiUrl}${endpoint}`);
            if (!response.ok &&
                endpoint !== "/api/nests" &&
                endpoint !== "/api/services") {
                throw new Error(`Admin API endpoint failed: ${endpoint} - ${response.status}`);
            }
        }
    }
    async testPublicApiEndpoints() {
        const endpoints = ["/health", "/api/status/page", "/api/status/history"];
        for (const endpoint of endpoints) {
            const response = await fetch(`${this.config.publicApiUrl}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subdomain: this.config.testData.testNest.subdomain,
                }),
            });
            if (!response.ok && endpoint !== "/health") {
                throw new Error(`Public API endpoint failed: ${endpoint} - ${response.status}`);
            }
        }
    }
    async testWidgetIntegration() {
        const response = await fetch(`${this.config.publicApiUrl}/api/status/${this.config.testData.testNest.subdomain}/widget.js`);
        if (!response.ok) {
            throw new Error(`Widget integration failed: ${response.status} ${response.statusText}`);
        }
        const widgetScript = await response.text();
        if (!widgetScript.includes("GuardAnt")) {
            throw new Error("Invalid widget script content");
        }
    }
    async testSSEStreams() {
        throw new Error("SSE streams test not implemented");
    }
    async testGolemStorage() {
        throw new Error("Golem storage test not implemented");
    }
    async testRedisCache() {
        throw new Error("Redis cache test not implemented");
    }
    async testRabbitMQIntegration() {
        throw new Error("RabbitMQ integration test not implemented");
    }
    async testDataConsistency() {
        throw new Error("Data consistency test not implemented");
    }
    async testSubscriptionCreation() {
        throw new Error("Subscription creation test not implemented");
    }
    async testPaymentProcessing() {
        throw new Error("Payment processing test not implemented");
    }
    async testUsageTracking() {
        throw new Error("Usage tracking test not implemented");
    }
    async testSubscriptionUpgrades() {
        throw new Error("Subscription upgrades test not implemented");
    }
}
exports.IntegrationTestRunner = IntegrationTestRunner;
// Factory function for creating test runners
function createIntegrationTestRunner(config, tracing) {
    return new IntegrationTestRunner(config, tracing);
}
//# sourceMappingURL=integration-tests.js.map