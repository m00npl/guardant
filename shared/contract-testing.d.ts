import type { GuardAntTracing } from "./tracing";
export interface ContractTest {
    name: string;
    description: string;
    provider: string;
    consumer: string;
    endpoint: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    requestSchema?: ContractSchema;
    responseSchema?: ContractSchema;
    test: () => Promise<ContractTestResult>;
}
export interface ContractSchema {
    type: "object" | "array" | "string" | "number" | "boolean";
    properties?: Record<string, ContractSchema>;
    required?: string[];
    items?: ContractSchema;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    enum?: any[];
}
export interface ContractTestResult {
    testName: string;
    status: "PASSED" | "FAILED" | "SKIPPED" | "ERROR";
    provider: string;
    consumer: string;
    endpoint: string;
    method: string;
    requestValidation?: ContractValidationResult;
    responseValidation?: ContractValidationResult;
    compatibilityIssues?: ContractCompatibilityIssue[];
    timestamp: number;
}
export interface ContractValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    schema: ContractSchema;
}
export interface ContractCompatibilityIssue {
    type: "BREAKING" | "NON_BREAKING" | "DEPRECATION";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    description: string;
    field?: string;
    expected?: any;
    actual?: any;
    suggestion: string;
}
export interface ContractTestReport {
    summary: {
        totalTests: number;
        passed: number;
        failed: number;
        skipped: number;
        breakingChanges: number;
        nonBreakingChanges: number;
        deprecations: number;
    };
    tests: ContractTestResult[];
    compatibilityIssues: ContractCompatibilityIssue[];
    recommendations: ContractRecommendation[];
    timestamp: number;
    environment: string;
}
export interface ContractRecommendation {
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    title: string;
    description: string;
    impact: string;
    action: string;
    effort: "LOW" | "MEDIUM" | "HIGH";
    timeline: string;
}
export interface ContractTestConfig {
    services: {
        adminApi: string;
        publicApi: string;
        workersApi: string;
        frontendAdmin: string;
        frontendStatus: string;
    };
    contracts: {
        [key: string]: ContractDefinition;
    };
}
export interface ContractDefinition {
    name: string;
    version: string;
    provider: string;
    consumer: string;
    endpoints: ContractEndpoint[];
}
export interface ContractEndpoint {
    path: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    requestSchema?: ContractSchema;
    responseSchema?: ContractSchema;
    examples?: ContractExample[];
}
export interface ContractExample {
    name: string;
    request?: any;
    response?: any;
    description: string;
}
export declare const ContractTestConfigs: {
    LOCAL: {
        services: {
            adminApi: string;
            publicApi: string;
            workersApi: string;
            frontendAdmin: string;
            frontendStatus: string;
        };
        contracts: {
            "admin-api-v1": {
                name: string;
                version: string;
                provider: string;
                consumer: string;
                endpoints: ({
                    path: string;
                    method: string;
                    requestSchema: {
                        type: string;
                        properties: {
                            subdomain: {
                                type: string;
                                pattern: string;
                                minLength: number;
                                maxLength: number;
                            };
                            name: {
                                type: string;
                                minLength: number;
                                maxLength: number;
                            };
                            email: {
                                type: string;
                                pattern: string;
                            };
                            password: {
                                type: string;
                                minLength: number;
                                maxLength: number;
                            };
                            type?: undefined;
                            target?: undefined;
                            interval?: undefined;
                        };
                        required: string[];
                    };
                    responseSchema: {
                        type: string;
                        properties: {
                            nest: {
                                type: string;
                                properties: {
                                    id: {
                                        type: string;
                                    };
                                    subdomain: {
                                        type: string;
                                    };
                                    name: {
                                        type: string;
                                    };
                                    createdAt: {
                                        type: string;
                                    };
                                };
                                required: string[];
                            };
                            user: {
                                type: string;
                                properties: {
                                    id: {
                                        type: string;
                                    };
                                    email: {
                                        type: string;
                                    };
                                    role: {
                                        type: string;
                                    };
                                };
                                required: string[];
                            };
                            tokens: {
                                type: string;
                                properties: {
                                    accessToken: {
                                        type: string;
                                    };
                                    refreshToken: {
                                        type: string;
                                    };
                                };
                                required: string[];
                            };
                            accessToken?: undefined;
                            refreshToken?: undefined;
                            service?: undefined;
                        };
                        required: string[];
                    };
                } | {
                    path: string;
                    method: string;
                    requestSchema: {
                        type: string;
                        properties: {
                            email: {
                                type: string;
                                pattern: string;
                            };
                            password: {
                                type: string;
                                minLength: number;
                                maxLength?: undefined;
                            };
                            subdomain?: undefined;
                            name?: undefined;
                            type?: undefined;
                            target?: undefined;
                            interval?: undefined;
                        };
                        required: string[];
                    };
                    responseSchema: {
                        type: string;
                        properties: {
                            accessToken: {
                                type: string;
                            };
                            refreshToken: {
                                type: string;
                            };
                            user: {
                                type: string;
                                properties: {
                                    id: {
                                        type: string;
                                    };
                                    email: {
                                        type: string;
                                    };
                                    role: {
                                        type: string;
                                    };
                                };
                                required: string[];
                            };
                            nest?: undefined;
                            tokens?: undefined;
                            service?: undefined;
                        };
                        required: string[];
                    };
                } | {
                    path: string;
                    method: string;
                    requestSchema: {
                        type: string;
                        properties: {
                            name: {
                                type: string;
                                minLength: number;
                                maxLength: number;
                            };
                            type: {
                                type: string;
                                enum: string[];
                            };
                            target: {
                                type: string;
                                minLength: number;
                            };
                            interval: {
                                type: string;
                                minimum: number;
                                maximum: number;
                            };
                            subdomain?: undefined;
                            email?: undefined;
                            password?: undefined;
                        };
                        required: string[];
                    };
                    responseSchema: {
                        type: string;
                        properties: {
                            service: {
                                type: string;
                                properties: {
                                    id: {
                                        type: string;
                                    };
                                    name: {
                                        type: string;
                                    };
                                    type: {
                                        type: string;
                                    };
                                    target: {
                                        type: string;
                                    };
                                    interval: {
                                        type: string;
                                    };
                                    createdAt: {
                                        type: string;
                                    };
                                };
                                required: string[];
                            };
                            nest?: undefined;
                            user?: undefined;
                            tokens?: undefined;
                            accessToken?: undefined;
                            refreshToken?: undefined;
                        };
                        required: string[];
                    };
                })[];
            };
            "public-api-v1": {
                name: string;
                version: string;
                provider: string;
                consumer: string;
                endpoints: ({
                    path: string;
                    method: string;
                    requestSchema: {
                        type: string;
                        properties: {
                            subdomain: {
                                type: string;
                                pattern: string;
                                minLength: number;
                                maxLength: number;
                            };
                            days?: undefined;
                        };
                        required: string[];
                    };
                    responseSchema: {
                        type: string;
                        properties: {
                            nest: {
                                type: string;
                                properties: {
                                    name: {
                                        type: string;
                                    };
                                    isPublic: {
                                        type: string;
                                    };
                                };
                                required: string[];
                            };
                            services: {
                                type: string;
                                items: {
                                    type: string;
                                    properties: {
                                        id: {
                                            type: string;
                                        };
                                        name: {
                                            type: string;
                                        };
                                        status: {
                                            type: string;
                                            enum: string[];
                                        };
                                        uptime: {
                                            type: string;
                                        };
                                        lastCheck: {
                                            type: string;
                                        };
                                    };
                                    required: string[];
                                };
                            };
                            overallStatus: {
                                type: string;
                                enum: string[];
                            };
                            incidents?: undefined;
                        };
                        required: string[];
                    };
                } | {
                    path: string;
                    method: string;
                    requestSchema: {
                        type: string;
                        properties: {
                            subdomain: {
                                type: string;
                                pattern: string;
                                minLength: number;
                                maxLength: number;
                            };
                            days: {
                                type: string;
                                minimum: number;
                                maximum: number;
                            };
                        };
                        required: string[];
                    };
                    responseSchema: {
                        type: string;
                        properties: {
                            incidents: {
                                type: string;
                                items: {
                                    type: string;
                                    properties: {
                                        id: {
                                            type: string;
                                        };
                                        serviceId: {
                                            type: string;
                                        };
                                        type: {
                                            type: string;
                                            enum: string[];
                                        };
                                        startedAt: {
                                            type: string;
                                        };
                                        resolvedAt: {
                                            type: string;
                                        };
                                        duration: {
                                            type: string;
                                        };
                                        reason: {
                                            type: string;
                                        };
                                    };
                                    required: string[];
                                };
                            };
                            nest?: undefined;
                            services?: undefined;
                            overallStatus?: undefined;
                        };
                        required: string[];
                    };
                })[];
            };
            "workers-api-v1": {
                name: string;
                version: string;
                provider: string;
                consumer: string;
                endpoints: ({
                    path: string;
                    method: string;
                    responseSchema: {
                        type: string;
                        properties: {
                            status: {
                                type: string;
                                enum: string[];
                            };
                            uptime: {
                                type: string;
                            };
                            version: {
                                type: string;
                            };
                            worker?: undefined;
                            cache?: undefined;
                        };
                        required: string[];
                    };
                } | {
                    path: string;
                    method: string;
                    responseSchema: {
                        type: string;
                        properties: {
                            worker: {
                                type: string;
                                properties: {
                                    id: {
                                        type: string;
                                    };
                                    region: {
                                        type: string;
                                    };
                                    uptime: {
                                        type: string;
                                    };
                                    memory: {
                                        type: string;
                                        properties: {
                                            used: {
                                                type: string;
                                            };
                                            total: {
                                                type: string;
                                            };
                                        };
                                        required: string[];
                                    };
                                };
                                required: string[];
                            };
                            cache: {
                                type: string;
                                properties: {
                                    rabbitmqConnected: {
                                        type: string;
                                    };
                                    totalEntries: {
                                        type: string;
                                    };
                                    pendingRetries: {
                                        type: string;
                                    };
                                    failedEntries: {
                                        type: string;
                                    };
                                };
                                required: string[];
                            };
                            status?: undefined;
                            uptime?: undefined;
                            version?: undefined;
                        };
                        required: string[];
                    };
                })[];
            };
        };
    };
    STAGING: {
        services: {
            adminApi: string;
            publicApi: string;
            workersApi: string;
            frontendAdmin: string;
            frontendStatus: string;
        };
        contracts: {
            "admin-api-v1": {
                name: string;
                version: string;
                provider: string;
                consumer: string;
                endpoints: {
                    path: string;
                    method: string;
                    requestSchema: {
                        type: string;
                        properties: {
                            subdomain: {
                                type: string;
                                pattern: string;
                                minLength: number;
                                maxLength: number;
                            };
                            name: {
                                type: string;
                                minLength: number;
                                maxLength: number;
                            };
                            email: {
                                type: string;
                                pattern: string;
                            };
                            password: {
                                type: string;
                                minLength: number;
                                maxLength: number;
                            };
                        };
                        required: string[];
                    };
                    responseSchema: {
                        type: string;
                        properties: {
                            nest: {
                                type: string;
                                properties: {
                                    id: {
                                        type: string;
                                    };
                                    subdomain: {
                                        type: string;
                                    };
                                    name: {
                                        type: string;
                                    };
                                    createdAt: {
                                        type: string;
                                    };
                                };
                                required: string[];
                            };
                            user: {
                                type: string;
                                properties: {
                                    id: {
                                        type: string;
                                    };
                                    email: {
                                        type: string;
                                    };
                                    role: {
                                        type: string;
                                    };
                                };
                                required: string[];
                            };
                            tokens: {
                                type: string;
                                properties: {
                                    accessToken: {
                                        type: string;
                                    };
                                    refreshToken: {
                                        type: string;
                                    };
                                };
                                required: string[];
                            };
                        };
                        required: string[];
                    };
                }[];
            };
        };
    };
};
export declare class ContractTestRunner {
    private logger;
    private tracing?;
    private config;
    private tests;
    constructor(config: ContractTestConfig, tracing?: GuardAntTracing);
    private initializeContractTests;
    runAllContractTests(): Promise<ContractTestReport>;
    private runContractTest;
    private testContract;
    private getServiceUrl;
    private generateTestData;
    private makeRequest;
    private validateRequest;
    private validateResponse;
    private validateSchema;
    private validateType;
    private detectCompatibilityIssues;
    private collectCompatibilityIssues;
    private generateContractRecommendations;
}
export declare function createContractTestRunner(config: ContractTestConfig, tracing?: GuardAntTracing): ContractTestRunner;
export { ContractTestConfigs };
//# sourceMappingURL=contract-testing.d.ts.map