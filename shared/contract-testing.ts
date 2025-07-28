/**
 * Contract testing system for GuardAnt services
 * Provides API contract validation and compatibility testing between services
 */
import { createLogger } from "./logger";
import { ContractError, ErrorCategory, ErrorSeverity } from "./error-handling";
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

export const ContractTestConfigs = {
  LOCAL: {
    services: {
      adminApi: "http://localhost:3001",
      publicApi: "http://localhost:3002",
      workersApi: "http://localhost:3099",
      frontendAdmin: "http://localhost:3000",
      frontendStatus: "http://localhost:3003",
    },
    contracts: {
      "admin-api-v1": {
        name: "Admin API v1",
        version: "1.0.0",
        provider: "admin-api",
        consumer: "frontend-admin",
        endpoints: [
          {
            path: "/api/nests",
            method: "POST",
            requestSchema: {
              type: "object",
              properties: {
                subdomain: {
                  type: "string",
                  pattern: "^[a-z0-9-]+$",
                  minLength: 3,
                  maxLength: 50,
                },
                name: { type: "string", minLength: 1, maxLength: 100 },
                email: { type: "string", pattern: "^[^@]+@[^@]+\\.[^@]+$" },
                password: { type: "string", minLength: 8, maxLength: 128 },
              },
              required: ["subdomain", "name", "email", "password"],
            },
            responseSchema: {
              type: "object",
              properties: {
                nest: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    subdomain: { type: "string" },
                    name: { type: "string" },
                    createdAt: { type: "number" },
                  },
                  required: ["id", "subdomain", "name", "createdAt"],
                },
                user: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    email: { type: "string" },
                    role: { type: "string" },
                  },
                  required: ["id", "email", "role"],
                },
                tokens: {
                  type: "object",
                  properties: {
                    accessToken: { type: "string" },
                    refreshToken: { type: "string" },
                  },
                  required: ["accessToken", "refreshToken"],
                },
              },
              required: ["nest", "user", "tokens"],
            },
          },
          {
            path: "/api/auth/login",
            method: "POST",
            requestSchema: {
              type: "object",
              properties: {
                email: { type: "string", pattern: "^[^@]+@[^@]+\\.[^@]+$" },
                password: { type: "string", minLength: 1 },
              },
              required: ["email", "password"],
            },
            responseSchema: {
              type: "object",
              properties: {
                accessToken: { type: "string" },
                refreshToken: { type: "string" },
                user: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    email: { type: "string" },
                    role: { type: "string" },
                  },
                  required: ["id", "email", "role"],
                },
              },
              required: ["accessToken", "refreshToken", "user"],
            },
          },
          {
            path: "/api/services",
            method: "POST",
            requestSchema: {
              type: "object",
              properties: {
                name: { type: "string", minLength: 1, maxLength: 100 },
                type: {
                  type: "string",
                  enum: [
                    "web",
                    "tcp",
                    "ping",
                    "github",
                    "uptime-api",
                    "keyword",
                    "heartbeat",
                    "port",
                  ],
                },
                target: { type: "string", minLength: 1 },
                interval: { type: "number", minimum: 30, maximum: 86400 },
              },
              required: ["name", "type", "target", "interval"],
            },
            responseSchema: {
              type: "object",
              properties: {
                service: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    type: { type: "string" },
                    target: { type: "string" },
                    interval: { type: "number" },
                    createdAt: { type: "number" },
                  },
                  required: [
                    "id",
                    "name",
                    "type",
                    "target",
                    "interval",
                    "createdAt",
                  ],
                },
              },
              required: ["service"],
            },
          },
        ],
      },
      "public-api-v1": {
        name: "Public API v1",
        version: "1.0.0",
        provider: "public-api",
        consumer: "frontend-status",
        endpoints: [
          {
            path: "/api/status/page",
            method: "POST",
            requestSchema: {
              type: "object",
              properties: {
                subdomain: {
                  type: "string",
                  pattern: "^[a-z0-9-]+$",
                  minLength: 3,
                  maxLength: 50,
                },
              },
              required: ["subdomain"],
            },
            responseSchema: {
              type: "object",
              properties: {
                nest: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    isPublic: { type: "boolean" },
                  },
                  required: ["name", "isPublic"],
                },
                services: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      status: {
                        type: "string",
                        enum: [
                          "operational",
                          "degraded",
                          "down",
                          "maintenance",
                        ],
                      },
                      uptime: { type: "number" },
                      lastCheck: { type: "number" },
                    },
                    required: ["id", "name", "status", "uptime", "lastCheck"],
                  },
                },
                overallStatus: {
                  type: "string",
                  enum: ["operational", "degraded", "down", "maintenance"],
                },
              },
              required: ["nest", "services", "overallStatus"],
            },
          },
          {
            path: "/api/status/history",
            method: "POST",
            requestSchema: {
              type: "object",
              properties: {
                subdomain: {
                  type: "string",
                  pattern: "^[a-z0-9-]+$",
                  minLength: 3,
                  maxLength: 50,
                },
                days: { type: "number", minimum: 1, maximum: 90 },
              },
              required: ["subdomain", "days"],
            },
            responseSchema: {
              type: "object",
              properties: {
                incidents: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      serviceId: { type: "string" },
                      type: {
                        type: "string",
                        enum: ["down", "degraded", "maintenance"],
                      },
                      startedAt: { type: "number" },
                      resolvedAt: { type: "number" },
                      duration: { type: "number" },
                      reason: { type: "string" },
                    },
                    required: [
                      "id",
                      "serviceId",
                      "type",
                      "startedAt",
                      "reason",
                    ],
                  },
                },
              },
              required: ["incidents"],
            },
          },
        ],
      },
      "workers-api-v1": {
        name: "Workers API v1",
        version: "1.0.0",
        provider: "workers-api",
        consumer: "admin-api",
        endpoints: [
          {
            path: "/health",
            method: "GET",
            responseSchema: {
              type: "object",
              properties: {
                status: { type: "string", enum: ["healthy", "unhealthy"] },
                uptime: { type: "number" },
                version: { type: "string" },
              },
              required: ["status", "uptime", "version"],
            },
          },
          {
            path: "/status",
            method: "GET",
            responseSchema: {
              type: "object",
              properties: {
                worker: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    region: { type: "string" },
                    uptime: { type: "number" },
                    memory: {
                      type: "object",
                      properties: {
                        used: { type: "number" },
                        total: { type: "number" },
                      },
                      required: ["used", "total"],
                    },
                  },
                  required: ["id", "region", "uptime", "memory"],
                },
                cache: {
                  type: "object",
                  properties: {
                    rabbitmqConnected: { type: "boolean" },
                    totalEntries: { type: "number" },
                    pendingRetries: { type: "number" },
                    failedEntries: { type: "number" },
                  },
                  required: [
                    "rabbitmqConnected",
                    "totalEntries",
                    "pendingRetries",
                    "failedEntries",
                  ],
                },
              },
              required: ["worker", "cache"],
            },
          },
        ],
      },
    },
  },
  STAGING: {
    services: {
      adminApi: "https://api-staging.guardant.me",
      publicApi: "https://public-staging.guardant.me",
      workersApi: "https://workers-staging.guardant.me",
      frontendAdmin: "https://app-staging.guardant.me",
      frontendStatus: "https://status-staging.guardant.me",
    },
    contracts: {
      "admin-api-v1": {
        name: "Admin API v1",
        version: "1.0.0",
        provider: "admin-api",
        consumer: "frontend-admin",
        endpoints: [
          {
            path: "/api/nests",
            method: "POST",
            requestSchema: {
              type: "object",
              properties: {
                subdomain: {
                  type: "string",
                  pattern: "^[a-z0-9-]+$",
                  minLength: 3,
                  maxLength: 50,
                },
                name: { type: "string", minLength: 1, maxLength: 100 },
                email: { type: "string", pattern: "^[^@]+@[^@]+\\.[^@]+$" },
                password: { type: "string", minLength: 8, maxLength: 128 },
              },
              required: ["subdomain", "name", "email", "password"],
            },
            responseSchema: {
              type: "object",
              properties: {
                nest: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    subdomain: { type: "string" },
                    name: { type: "string" },
                    createdAt: { type: "number" },
                  },
                  required: ["id", "subdomain", "name", "createdAt"],
                },
                user: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    email: { type: "string" },
                    role: { type: "string" },
                  },
                  required: ["id", "email", "role"],
                },
                tokens: {
                  type: "object",
                  properties: {
                    accessToken: { type: "string" },
                    refreshToken: { type: "string" },
                  },
                  required: ["accessToken", "refreshToken"],
                },
              },
              required: ["nest", "user", "tokens"],
            },
          },
        ],
      },
    },
  },
};

export class ContractTestRunner {
  private logger = createLogger("contract-tests");
  private tracing?: GuardAntTracing;
  private config: ContractTestConfig;
  private tests: ContractTest[] = [];

  constructor(config: ContractTestConfig, tracing?: GuardAntTracing) {
    this.config = config;
    this.tracing = tracing;
    this.initializeContractTests();
  }

  private initializeContractTests(): void {
    // Admin API Contract Tests
    for (const [contractName, contract] of Object.entries(
      this.config.contracts
    )) {
      for (const endpoint of contract.endpoints) {
        this.tests.push({
          name: `${contractName} - ${endpoint.method} ${endpoint.path}`,
          description: `Test contract for ${endpoint.method} ${endpoint.path}`,
          provider: contract.provider,
          consumer: contract.consumer,
          endpoint: endpoint.path,
          method: endpoint.method,
          requestSchema: endpoint.requestSchema,
          responseSchema: endpoint.responseSchema,
          test: () => this.testContract(contractName, endpoint),
        });
      }
    }
  }

  async runAllContractTests(): Promise<ContractTestReport> {
    const startTime = Date.now();
    this.logger.info("Starting contract tests", {
      totalTests: this.tests.length,
      config: this.config,
    });

    const testResults: ContractTestResult[] = [];

    for (const test of this.tests) {
      const result = await this.runContractTest(test);
      testResults.push(result);
    }

    const totalDuration = Date.now() - startTime;
    const passed = testResults.filter((r) => r.status === "PASSED").length;
    const failed = testResults.filter((r) => r.status === "FAILED").length;
    const skipped = testResults.filter((r) => r.status === "SKIPPED").length;

    const compatibilityIssues = this.collectCompatibilityIssues(testResults);
    const recommendations = this.generateContractRecommendations(testResults);

    const report: ContractTestReport = {
      summary: {
        totalTests: testResults.length,
        passed,
        failed,
        skipped,
        breakingChanges: compatibilityIssues.filter(
          (i) => i.type === "BREAKING"
        ).length,
        nonBreakingChanges: compatibilityIssues.filter(
          (i) => i.type === "NON_BREAKING"
        ).length,
        deprecations: compatibilityIssues.filter(
          (i) => i.type === "DEPRECATION"
        ).length,
      },
      tests: testResults,
      compatibilityIssues,
      recommendations,
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || "development",
    };

    this.logger.info("Contract tests completed", {
      summary: report.summary,
      compatibilityIssues: compatibilityIssues.length,
      recommendations: recommendations.length,
    });

    return report;
  }

  private async runContractTest(
    test: ContractTest
  ): Promise<ContractTestResult> {
    this.logger.debug(`Running contract test: ${test.name}`, {
      provider: test.provider,
      consumer: test.consumer,
      endpoint: test.endpoint,
      method: test.method,
    });

    try {
      const result = await test.test();
      return {
        ...result,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        testName: test.name,
        status: "ERROR",
        provider: test.provider,
        consumer: test.consumer,
        endpoint: test.endpoint,
        method: test.method,
        timestamp: Date.now(),
      };
    }
  }

  private async testContract(
    contractName: string,
    endpoint: ContractEndpoint
  ): Promise<ContractTestResult> {
    const serviceUrl = this.getServiceUrl(endpoint.path);
    const testName = `${contractName} - ${endpoint.method} ${endpoint.path}`;

    try {
      // Prepare test data based on schema
      const testData = this.generateTestData(endpoint.requestSchema);

      // Make request
      const response = await this.makeRequest(
        serviceUrl + endpoint.path,
        endpoint.method,
        testData
      );

      // Validate response
      const responseValidation = this.validateResponse(
        response,
        endpoint.responseSchema
      );

      // Check for compatibility issues
      const compatibilityIssues = this.detectCompatibilityIssues(
        response,
        endpoint.responseSchema
      );

      return {
        testName,
        status: responseValidation.valid ? "PASSED" : "FAILED",
        provider: contractName.split("-")[0],
        consumer: contractName.split("-")[1],
        endpoint: endpoint.path,
        method: endpoint.method,
        requestValidation: endpoint.requestSchema
          ? this.validateRequest(testData, endpoint.requestSchema)
          : undefined,
        responseValidation,
        compatibilityIssues:
          compatibilityIssues.length > 0 ? compatibilityIssues : undefined,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        testName,
        status: "FAILED",
        provider: contractName.split("-")[0],
        consumer: contractName.split("-")[1],
        endpoint: endpoint.path,
        method: endpoint.method,
        compatibilityIssues: [
          {
            type: "BREAKING",
            severity: "CRITICAL",
            description: `Contract test failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestion:
              "Check service availability and endpoint implementation",
          },
        ],
        timestamp: Date.now(),
      };
    }
  }

  private getServiceUrl(path: string): string {
    if (path.startsWith("/api/")) {
      return this.config.services.adminApi;
    } else if (path.startsWith("/status/")) {
      return this.config.services.publicApi;
    } else if (path.startsWith("/health") || path.startsWith("/status")) {
      return this.config.services.workersApi;
    } else {
      return this.config.services.adminApi;
    }
  }

  private generateTestData(schema?: ContractSchema): any {
    if (!schema) return undefined;

    switch (schema.type) {
      case "object":
        const obj: any = {};
        if (schema.properties) {
          for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (schema.required?.includes(key)) {
              obj[key] = this.generateTestData(propSchema);
            }
          }
        }
        return obj;

      case "array":
        if (schema.items) {
          return [this.generateTestData(schema.items)];
        }
        return [];

      case "string":
        if (schema.enum) {
          return schema.enum[0];
        }
        if (schema.pattern) {
          if (schema.pattern.includes("email")) {
            return "test@example.com";
          }
          if (schema.pattern.includes("subdomain")) {
            return "test-subdomain";
          }
        }
        return "test-string";

      case "number":
        if (schema.minimum !== undefined && schema.maximum !== undefined) {
          return Math.floor((schema.minimum + schema.maximum) / 2);
        }
        return 100;

      case "boolean":
        return true;

      default:
        return null;
    }
  }

  private async makeRequest(
    url: string,
    method: string,
    data?: any
  ): Promise<any> {
    const options: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (data && (method === "POST" || method === "PUT")) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  private validateRequest(
    data: any,
    schema: ContractSchema
  ): ContractValidationResult {
    return this.validateSchema(data, schema);
  }

  private validateResponse(
    data: any,
    schema?: ContractSchema
  ): ContractValidationResult {
    if (!schema) {
      return {
        valid: true,
        errors: [],
        warnings: [],
        schema: { type: "object" },
      };
    }
    return this.validateSchema(data, schema);
  }

  private validateSchema(
    data: any,
    schema: ContractSchema
  ): ContractValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic type validation
    if (!this.validateType(data, schema.type)) {
      errors.push(`Expected type ${schema.type}, got ${typeof data}`);
    }

    // Object validation
    if (schema.type === "object" && schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (schema.required?.includes(key)) {
          if (!(key in data)) {
            errors.push(`Required field '${key}' is missing`);
          } else {
            const propValidation = this.validateSchema(data[key], propSchema);
            errors.push(...propValidation.errors.map((e) => `${key}.${e}`));
            warnings.push(...propValidation.warnings.map((w) => `${key}.${w}`));
          }
        } else if (key in data) {
          const propValidation = this.validateSchema(data[key], propSchema);
          errors.push(...propValidation.errors.map((e) => `${key}.${e}`));
          warnings.push(...propValidation.warnings.map((w) => `${key}.${w}`));
        }
      }
    }

    // Array validation
    if (schema.type === "array" && schema.items) {
      if (!Array.isArray(data)) {
        errors.push("Expected array");
      } else {
        for (let i = 0; i < data.length; i++) {
          const itemValidation = this.validateSchema(data[i], schema.items);
          errors.push(...itemValidation.errors.map((e) => `[${i}].${e}`));
          warnings.push(...itemValidation.warnings.map((w) => `[${i}].${w}`));
        }
      }
    }

    // String validation
    if (schema.type === "string") {
      if (typeof data === "string") {
        if (schema.minLength && data.length < schema.minLength) {
          errors.push(
            `String too short, minimum ${schema.minLength} characters`
          );
        }
        if (schema.maxLength && data.length > schema.maxLength) {
          errors.push(
            `String too long, maximum ${schema.maxLength} characters`
          );
        }
        if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
          errors.push(`String does not match pattern ${schema.pattern}`);
        }
        if (schema.enum && !schema.enum.includes(data)) {
          errors.push(
            `String value '${data}' not in enum ${schema.enum.join(", ")}`
          );
        }
      }
    }

    // Number validation
    if (schema.type === "number") {
      if (typeof data === "number") {
        if (schema.minimum !== undefined && data < schema.minimum) {
          errors.push(`Number too small, minimum ${schema.minimum}`);
        }
        if (schema.maximum !== undefined && data > schema.maximum) {
          errors.push(`Number too large, maximum ${schema.maximum}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      schema,
    };
  }

  private validateType(data: any, expectedType: string): boolean {
    switch (expectedType) {
      case "object":
        return (
          typeof data === "object" && data !== null && !Array.isArray(data)
        );
      case "array":
        return Array.isArray(data);
      case "string":
        return typeof data === "string";
      case "number":
        return typeof data === "number";
      case "boolean":
        return typeof data === "boolean";
      default:
        return true;
    }
  }

  private detectCompatibilityIssues(
    data: any,
    schema?: ContractSchema
  ): ContractCompatibilityIssue[] {
    const issues: ContractCompatibilityIssue[] = [];

    if (!schema) return issues;

    // Check for missing required fields
    if (schema.type === "object" && schema.properties && schema.required) {
      for (const requiredField of schema.required) {
        if (!(requiredField in data)) {
          issues.push({
            type: "BREAKING",
            severity: "CRITICAL",
            description: `Required field '${requiredField}' is missing`,
            field: requiredField,
            suggestion: "Add the missing required field to the response",
          });
        }
      }
    }

    // Check for type mismatches
    if (!this.validateType(data, schema.type)) {
      issues.push({
        type: "BREAKING",
        severity: "HIGH",
        description: `Type mismatch: expected ${schema.type}, got ${typeof data}`,
        expected: schema.type,
        actual: typeof data,
        suggestion: "Fix the data type to match the schema",
      });
    }

    // Check for enum violations
    if (schema.type === "string" && schema.enum && typeof data === "string") {
      if (!schema.enum.includes(data)) {
        issues.push({
          type: "BREAKING",
          severity: "MEDIUM",
          description: `Value '${data}' not in allowed enum values`,
          field: "enum",
          expected: schema.enum,
          actual: data,
          suggestion: "Use one of the allowed enum values",
        });
      }
    }

    return issues;
  }

  private collectCompatibilityIssues(
    results: ContractTestResult[]
  ): ContractCompatibilityIssue[] {
    const issues: ContractCompatibilityIssue[] = [];

    for (const result of results) {
      if (result.compatibilityIssues) {
        issues.push(...result.compatibilityIssues);
      }
    }

    return issues;
  }

  private generateContractRecommendations(
    results: ContractTestResult[]
  ): ContractRecommendation[] {
    const recommendations: ContractRecommendation[] = [];

    // Analyze breaking changes
    const breakingChanges = results.filter((r) =>
      r.compatibilityIssues?.some((i) => i.type === "BREAKING")
    );

    if (breakingChanges.length > 0) {
      recommendations.push({
        priority: "CRITICAL",
        title: "Breaking Contract Changes Detected",
        description: `${breakingChanges.length} contracts have breaking changes`,
        impact: "Service incompatibility and potential system failures",
        action: "Immediately fix breaking changes or implement versioning",
        effort: "HIGH",
        timeline: "Immediate",
      });
    }

    // Analyze failed tests
    const failedTests = results.filter((r) => r.status === "FAILED");
    if (failedTests.length > 0) {
      recommendations.push({
        priority: "HIGH",
        title: "Contract Test Failures",
        description: `${failedTests.length} contract tests failed`,
        impact: "API compatibility issues between services",
        action: "Review and fix failed contract tests",
        effort: "MEDIUM",
        timeline: "Within 1 week",
      });
    }

    // Analyze schema validation issues
    const validationIssues = results.filter(
      (r) => r.responseValidation && !r.responseValidation.valid
    );

    if (validationIssues.length > 0) {
      recommendations.push({
        priority: "MEDIUM",
        title: "Schema Validation Issues",
        description: `${validationIssues.length} responses fail schema validation`,
        impact: "Inconsistent API responses and client errors",
        action: "Fix response schemas to match contracts",
        effort: "MEDIUM",
        timeline: "Within 2 weeks",
      });
    }

    return recommendations;
  }
}

// Factory function for creating contract test runners
export function createContractTestRunner(
  config: ContractTestConfig,
  tracing?: GuardAntTracing
): ContractTestRunner {
  return new ContractTestRunner(config, tracing);
}

// Export configurations for easy access
export { ContractTestConfigs };
