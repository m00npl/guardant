import type { GuardAntTracing } from "./tracing";
export interface SecurityTestScenario {
    name: string;
    description: string;
    category: SecurityTestCategory;
    tests: SecurityTest[];
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    expectedResult: string;
}
export type SecurityTestCategory = "AUTHENTICATION" | "AUTHORIZATION" | "INPUT_VALIDATION" | "SQL_INJECTION" | "XSS" | "CSRF" | "RATE_LIMITING" | "ENCRYPTION" | "API_SECURITY" | "DATA_EXPOSURE" | "CONFIGURATION" | "DEPENDENCIES";
export interface SecurityTest {
    name: string;
    description: string;
    test: () => Promise<SecurityTestResult>;
    remediation?: string;
}
export interface SecurityTestResult {
    testName: string;
    status: "PASSED" | "FAILED" | "SKIPPED" | "ERROR";
    vulnerability?: SecurityVulnerability;
    evidence?: string;
    recommendation?: string;
    timestamp: number;
}
export interface SecurityVulnerability {
    type: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    description: string;
    impact: string;
    cwe?: string;
    cvss?: number;
    remediation: string;
}
export interface SecurityTestReport {
    summary: {
        totalTests: number;
        passed: number;
        failed: number;
        skipped: number;
        criticalVulnerabilities: number;
        highVulnerabilities: number;
        mediumVulnerabilities: number;
        lowVulnerabilities: number;
    };
    scenarios: SecurityScenarioResult[];
    vulnerabilities: SecurityVulnerability[];
    recommendations: SecurityRecommendation[];
    timestamp: number;
    environment: string;
}
export interface SecurityScenarioResult {
    scenarioName: string;
    category: SecurityTestCategory;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    tests: SecurityTestResult[];
    summary: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
    };
}
export interface SecurityRecommendation {
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    title: string;
    description: string;
    impact: string;
    remediation: string;
    effort: "LOW" | "MEDIUM" | "HIGH";
    timeline: string;
}
export interface SecurityTestConfig {
    baseUrl: string;
    adminApiUrl: string;
    publicApiUrl: string;
    testUsers: Array<{
        subdomain: string;
        email: string;
        password: string;
        role: string;
    }>;
    testData: {
        maliciousInputs: string[];
        sqlInjectionPayloads: string[];
        xssPayloads: string[];
        csrfTokens: string[];
    };
}
export declare const SecurityTestConfigs: {
    LOCAL: {
        baseUrl: string;
        adminApiUrl: string;
        publicApiUrl: string;
        testUsers: {
            subdomain: string;
            email: string;
            password: string;
            role: string;
        }[];
        testData: {
            maliciousInputs: string[];
            sqlInjectionPayloads: string[];
            xssPayloads: string[];
            csrfTokens: string[];
        };
    };
    STAGING: {
        baseUrl: string;
        adminApiUrl: string;
        publicApiUrl: string;
        testUsers: {
            subdomain: string;
            email: string;
            password: string;
            role: string;
        }[];
        testData: {
            maliciousInputs: string[];
            sqlInjectionPayloads: string[];
            xssPayloads: string[];
            csrfTokens: string[];
        };
    };
};
export declare class SecurityTestRunner {
    private logger;
    private tracing?;
    private config;
    private scenarios;
    private results;
    constructor(config: SecurityTestConfig, tracing?: GuardAntTracing);
    private initializeSecurityTestScenarios;
    runAllSecurityTests(): Promise<SecurityTestReport>;
    private runSecurityTestScenario;
    private runSecurityTest;
    private testBruteForceProtection;
    private testPasswordPolicy;
    private testSessionManagement;
    private testTokenSecurity;
    private testRoleBasedAccessControl;
    private testCrossTenantAccess;
    private testApiEndpointAuthorization;
    private testResourceAccessControl;
    private testMaliciousInputDetection;
    private testDataSanitization;
    private testInputBoundaries;
    private testSpecialCharacterHandling;
    private testSqlInjectionDetection;
    private testNoSqlInjectionDetection;
    private testDatabaseQueryProtection;
    private testReflectedXSS;
    private testStoredXSS;
    private testDOMXSS;
    private testCSRFTokenValidation;
    private testCSRFProtectionHeaders;
    private testApiRateLimiting;
    private testAuthenticationRateLimiting;
    private testIPBasedRateLimiting;
    private testDataEncryptionAtRest;
    private testDataEncryptionInTransit;
    private testPasswordHashing;
    private testApiAuthentication;
    private testApiAuthorization;
    private testApiInputValidation;
    private testSensitiveDataExposure;
    private testErrorInformationDisclosure;
    private testDebugInformationExposure;
    private testSecurityHeaders;
    private testCORSConfiguration;
    private testHTTPSEnforcement;
    private testVulnerableDependencies;
    private testOutdatedDependencies;
    private collectVulnerabilities;
    private calculateSecuritySummary;
    private generateSecurityRecommendations;
}
export declare function createSecurityTestRunner(config: SecurityTestConfig, tracing?: GuardAntTracing): SecurityTestRunner;
export { SecurityTestConfigs };
//# sourceMappingURL=security-testing.d.ts.map