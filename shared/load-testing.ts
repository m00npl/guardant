/**
 * Load testing system for GuardAnt services
 * Provides comprehensive performance testing with various load scenarios
 */
import { createLogger } from "./logger";
import {
  PerformanceError,
  ErrorCategory,
  ErrorSeverity,
} from "./error-handling";
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
  weight: number; // Relative weight for request distribution
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

export const LoadTestConfigs = {
  LOCAL: {
    baseUrl: "http://localhost:3000",
    adminApiUrl: "http://localhost:3001",
    publicApiUrl: "http://localhost:3002",
    workersApiUrl: "http://localhost:3099",
    testUsers: [
      {
        subdomain: "load-test-1",
        email: "load1@test.guardant.me",
        password: "LoadTest123!",
      },
      {
        subdomain: "load-test-2",
        email: "load2@test.guardant.me",
        password: "LoadTest456!",
      },
    ],
    testServices: [
      {
        name: "Load Test Website",
        type: "web" as const,
        target: "https://httpbin.org/status/200",
      },
      {
        name: "Load Test Ping",
        type: "ping" as const,
        target: "8.8.8.8",
      },
    ],
  },
  STAGING: {
    baseUrl: "https://staging.guardant.me",
    adminApiUrl: "https://api-staging.guardant.me",
    publicApiUrl: "https://public-staging.guardant.me",
    workersApiUrl: "https://workers-staging.guardant.me",
    testUsers: [
      {
        subdomain: "staging-load",
        email: "staging-load@guardant.me",
        password: "StagingLoad123!",
      },
    ],
    testServices: [
      {
        name: "Staging Load Test",
        type: "web" as const,
        target: "https://httpbin.org/status/200",
      },
    ],
  },
};

export class LoadTestRunner {
  private logger = createLogger("load-tests");
  private tracing?: GuardAntTracing;
  private config: LoadTestConfigs;
  private scenarios: LoadTestScenario[] = [];
  private results: LoadTestResult[] = [];

  constructor(config: LoadTestConfigs, tracing?: GuardAntTracing) {
    this.config = config;
    this.tracing = tracing;
    this.initializeLoadTestScenarios();
  }

  private initializeLoadTestScenarios(): void {
    // API Endpoint Load Tests
    this.scenarios.push({
      name: "API Endpoint Load Test",
      description: "Test API endpoints under various load conditions",
      config: {
        concurrentUsers: 50,
        durationSeconds: 300,
        rampUpSeconds: 60,
        rampDownSeconds: 30,
        targetRPS: 100,
        timeoutMs: 5000,
        retryAttempts: 2,
      },
      requests: [
        {
          name: "Health Check",
          method: "GET",
          url: `${this.config.adminApiUrl}/health`,
          weight: 20,
          expectedStatus: 200,
        },
        {
          name: "Subscription Plans",
          method: "GET",
          url: `${this.config.adminApiUrl}/api/subscription/plans`,
          weight: 15,
          expectedStatus: 200,
        },
        {
          name: "Status Page Data",
          method: "POST",
          url: `${this.config.publicApiUrl}/api/status/page`,
          headers: { "Content-Type": "application/json" },
          body: { subdomain: this.config.testUsers[0].subdomain },
          weight: 30,
          expectedStatus: 200,
        },
        {
          name: "Widget Script",
          method: "GET",
          url: `${this.config.publicApiUrl}/api/status/${this.config.testUsers[0].subdomain}/widget.js`,
          weight: 25,
          expectedStatus: 200,
        },
        {
          name: "Worker Health",
          method: "GET",
          url: `${this.config.workersApiUrl}/health`,
          weight: 10,
          expectedStatus: 200,
        },
      ],
      expectedMetrics: {
        maxResponseTime: 2000,
        minResponseTime: 50,
        avgResponseTime: 500,
        p95ResponseTime: 1500,
        p99ResponseTime: 2000,
        maxRPS: 150,
        avgRPS: 100,
        errorRate: 0.05,
        successRate: 0.95,
        totalRequests: 30000,
        totalErrors: 1500,
      },
    });

    // Authentication Load Test
    this.scenarios.push({
      name: "Authentication Load Test",
      description: "Test authentication endpoints under high load",
      config: {
        concurrentUsers: 100,
        durationSeconds: 180,
        rampUpSeconds: 30,
        rampDownSeconds: 15,
        targetRPS: 200,
        timeoutMs: 3000,
        retryAttempts: 1,
      },
      requests: [
        {
          name: "User Login",
          method: "POST",
          url: `${this.config.adminApiUrl}/api/auth/login`,
          headers: { "Content-Type": "application/json" },
          body: {
            email: this.config.testUsers[0].email,
            password: this.config.testUsers[0].password,
          },
          weight: 60,
          expectedStatus: 200,
        },
        {
          name: "Token Refresh",
          method: "POST",
          url: `${this.config.adminApiUrl}/api/auth/refresh`,
          headers: { "Content-Type": "application/json" },
          body: { refreshToken: "test-refresh-token" },
          weight: 40,
          expectedStatus: 200,
        },
      ],
      expectedMetrics: {
        maxResponseTime: 1500,
        minResponseTime: 100,
        avgResponseTime: 300,
        p95ResponseTime: 800,
        p99ResponseTime: 1200,
        maxRPS: 250,
        avgRPS: 200,
        errorRate: 0.03,
        successRate: 0.97,
        totalRequests: 36000,
        totalErrors: 1080,
      },
    });

    // Service Management Load Test
    this.scenarios.push({
      name: "Service Management Load Test",
      description: "Test service CRUD operations under load",
      config: {
        concurrentUsers: 25,
        durationSeconds: 240,
        rampUpSeconds: 45,
        rampDownSeconds: 20,
        targetRPS: 50,
        timeoutMs: 8000,
        retryAttempts: 3,
      },
      requests: [
        {
          name: "Create Service",
          method: "POST",
          url: `${this.config.adminApiUrl}/api/services`,
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: this.config.testServices[0],
          weight: 30,
          expectedStatus: 201,
        },
        {
          name: "List Services",
          method: "GET",
          url: `${this.config.adminApiUrl}/api/services`,
          headers: { Authorization: "Bearer test-access-token" },
          weight: 40,
          expectedStatus: 200,
        },
        {
          name: "Update Service",
          method: "PUT",
          url: `${this.config.adminApiUrl}/api/services/test-service-id`,
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: { interval: 120 },
          weight: 20,
          expectedStatus: 200,
        },
        {
          name: "Delete Service",
          method: "DELETE",
          url: `${this.config.adminApiUrl}/api/services/test-service-id`,
          headers: { Authorization: "Bearer test-access-token" },
          weight: 10,
          expectedStatus: 204,
        },
      ],
      expectedMetrics: {
        maxResponseTime: 5000,
        minResponseTime: 200,
        avgResponseTime: 1500,
        p95ResponseTime: 3500,
        p99ResponseTime: 4500,
        maxRPS: 75,
        avgRPS: 50,
        errorRate: 0.08,
        successRate: 0.92,
        totalRequests: 12000,
        totalErrors: 960,
      },
    });

    // Status Page Load Test
    this.scenarios.push({
      name: "Status Page Load Test",
      description: "Test public status page performance under high traffic",
      config: {
        concurrentUsers: 200,
        durationSeconds: 360,
        rampUpSeconds: 90,
        rampDownSeconds: 45,
        targetRPS: 500,
        timeoutMs: 4000,
        retryAttempts: 2,
      },
      requests: [
        {
          name: "Status Page HTML",
          method: "GET",
          url: `${this.config.baseUrl}/${this.config.testUsers[0].subdomain}`,
          weight: 50,
          expectedStatus: 200,
        },
        {
          name: "Status Page API",
          method: "POST",
          url: `${this.config.publicApiUrl}/api/status/page`,
          headers: { "Content-Type": "application/json" },
          body: { subdomain: this.config.testUsers[0].subdomain },
          weight: 30,
          expectedStatus: 200,
        },
        {
          name: "Status History",
          method: "POST",
          url: `${this.config.publicApiUrl}/api/status/history`,
          headers: { "Content-Type": "application/json" },
          body: {
            subdomain: this.config.testUsers[0].subdomain,
            days: 7,
          },
          weight: 15,
          expectedStatus: 200,
        },
        {
          name: "Widget Script",
          method: "GET",
          url: `${this.config.publicApiUrl}/api/status/${this.config.testUsers[0].subdomain}/widget.js`,
          weight: 5,
          expectedStatus: 200,
        },
      ],
      expectedMetrics: {
        maxResponseTime: 3000,
        minResponseTime: 100,
        avgResponseTime: 800,
        p95ResponseTime: 2000,
        p99ResponseTime: 2500,
        maxRPS: 600,
        avgRPS: 500,
        errorRate: 0.02,
        successRate: 0.98,
        totalRequests: 180000,
        totalErrors: 3600,
      },
    });

    // Monitoring Workers Load Test
    this.scenarios.push({
      name: "Monitoring Workers Load Test",
      description: "Test monitoring worker performance under load",
      config: {
        concurrentUsers: 10,
        durationSeconds: 120,
        rampUpSeconds: 20,
        rampDownSeconds: 10,
        targetRPS: 20,
        timeoutMs: 10000,
        retryAttempts: 5,
      },
      requests: [
        {
          name: "Worker Health",
          method: "GET",
          url: `${this.config.workersApiUrl}/health`,
          weight: 40,
          expectedStatus: 200,
        },
        {
          name: "Worker Status",
          method: "GET",
          url: `${this.config.workersApiUrl}/status`,
          weight: 30,
          expectedStatus: 200,
        },
        {
          name: "Cache Statistics",
          method: "GET",
          url: `${this.config.workersApiUrl}/cache/stats`,
          weight: 20,
          expectedStatus: 200,
        },
        {
          name: "Flush Cache",
          method: "POST",
          url: `${this.config.workersApiUrl}/cache/flush`,
          weight: 10,
          expectedStatus: 200,
        },
      ],
      expectedMetrics: {
        maxResponseTime: 8000,
        minResponseTime: 500,
        avgResponseTime: 2000,
        p95ResponseTime: 5000,
        p99ResponseTime: 7000,
        maxRPS: 25,
        avgRPS: 20,
        errorRate: 0.05,
        successRate: 0.95,
        totalRequests: 2400,
        totalErrors: 120,
      },
    });
  }

  async runAllLoadTests(): Promise<LoadTestReport> {
    const startTime = Date.now();
    this.logger.info("Starting load test scenarios", {
      totalScenarios: this.scenarios.length,
      config: this.config,
    });

    const scenarioResults: LoadTestResult[] = [];

    for (const scenario of this.scenarios) {
      const result = await this.runLoadTestScenario(scenario);
      scenarioResults.push(result);
    }

    const totalDuration = Date.now() - startTime;
    const totalScenarios = this.results.length;
    const passed = this.results.filter((r) => r.status === "PASSED").length;
    const failed = this.results.filter((r) => r.status === "FAILED").length;

    const recommendations = this.generateRecommendations(scenarioResults);

    const report: LoadTestReport = {
      summary: {
        totalScenarios,
        passed,
        failed,
        totalDurationMs: totalDuration,
        averageRPS: this.calculateAverageRPS(scenarioResults),
        peakRPS: this.calculatePeakRPS(scenarioResults),
        overallErrorRate: this.calculateOverallErrorRate(scenarioResults),
      },
      scenarios: scenarioResults,
      recommendations,
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || "development",
    };

    this.logger.info("Load test scenarios completed", {
      summary: report.summary,
      recommendations: recommendations.length,
    });

    return report;
  }

  private async runLoadTestScenario(
    scenario: LoadTestScenario
  ): Promise<LoadTestResult> {
    const startTime = Date.now();
    this.logger.info(`Running load test scenario: ${scenario.name}`, {
      config: scenario.config,
      requestCount: scenario.requests.length,
    });

    const requestResults: LoadTestRequestResult[] = [];
    const {
      concurrentUsers,
      durationSeconds,
      rampUpSeconds,
      rampDownSeconds,
      targetRPS,
    } = scenario.config;

    // Calculate request distribution
    const totalWeight = scenario.requests.reduce(
      (sum, req) => sum + req.weight,
      0
    );
    const requestsPerSecond = targetRPS;
    const totalRequests = requestsPerSecond * durationSeconds;

    // Simulate load test execution
    const startTimestamp = Date.now();
    let currentRequest = 0;

    while (currentRequest < totalRequests) {
      // Select request based on weight
      const randomWeight = Math.random() * totalWeight;
      let cumulativeWeight = 0;
      let selectedRequest = scenario.requests[0];

      for (const request of scenario.requests) {
        cumulativeWeight += request.weight;
        if (randomWeight <= cumulativeWeight) {
          selectedRequest = request;
          break;
        }
      }

      // Execute request
      const requestStart = Date.now();
      const result = await this.executeRequest(selectedRequest);
      const responseTime = Date.now() - requestStart;

      requestResults.push({
        requestName: selectedRequest.name,
        status: result.success ? "SUCCESS" : "FAILED",
        responseTime,
        statusCode: result.statusCode,
        error: result.error,
        timestamp: requestStart,
      });

      currentRequest++;

      // Control request rate
      const elapsed = Date.now() - startTimestamp;
      const expectedRequests = Math.floor((elapsed / 1000) * requestsPerSecond);

      if (currentRequest > expectedRequests) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 / requestsPerSecond)
        );
      }
    }

    const duration = Date.now() - startTime;
    const metrics = this.calculateMetrics(requestResults);
    const summary = this.calculateSummary(requestResults);

    const result: LoadTestResult = {
      scenarioName: scenario.name,
      status: this.evaluateScenario(scenario, metrics),
      durationMs: duration,
      metrics,
      requests: requestResults,
      summary,
      timestamp: Date.now(),
    };

    this.results.push(result);
    return result;
  }

  private async executeRequest(request: LoadTestRequest): Promise<{
    success: boolean;
    statusCode: number;
    error?: string;
  }> {
    try {
      const options: RequestInit = {
        method: request.method,
        headers: request.headers,
        timeout: request.timeoutMs || 5000,
      };

      if (request.body) {
        options.body =
          typeof request.body === "string"
            ? request.body
            : JSON.stringify(request.body);
      }

      const response = await fetch(request.url, options);
      const success = response.status === request.expectedStatus;

      return {
        success,
        statusCode: response.status,
        error: success
          ? undefined
          : `Expected ${request.expectedStatus}, got ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private calculateMetrics(results: LoadTestRequestResult[]): LoadTestMetrics {
    const responseTimes = results
      .map((r) => r.responseTime)
      .sort((a, b) => a - b);
    const successful = results.filter((r) => r.status === "SUCCESS");
    const failed = results.filter((r) => r.status === "FAILED");

    const totalRequests = results.length;
    const totalErrors = failed.length;
    const successRate =
      totalRequests > 0 ? successful.length / totalRequests : 0;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length
        : 0;

    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    return {
      maxResponseTime:
        responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0,
      minResponseTime: responseTimes.length > 0 ? responseTimes[0] : 0,
      avgResponseTime,
      p95ResponseTime: responseTimes.length > 0 ? responseTimes[p95Index] : 0,
      p99ResponseTime: responseTimes.length > 0 ? responseTimes[p99Index] : 0,
      maxRPS: this.calculateMaxRPS(results),
      avgRPS: this.calculateAvgRPS(results),
      errorRate,
      successRate,
      totalRequests,
      totalErrors,
    };
  }

  private calculateSummary(
    results: LoadTestRequestResult[]
  ): LoadTestResult["summary"] {
    const totalRequests = results.length;
    const successfulRequests = results.filter(
      (r) => r.status === "SUCCESS"
    ).length;
    const failedRequests = results.filter((r) => r.status === "FAILED").length;
    const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageRPS: this.calculateAvgRPS(results),
      peakRPS: this.calculateMaxRPS(results),
      errorRate,
    };
  }

  private calculateMaxRPS(results: LoadTestRequestResult[]): number {
    // Group requests by second and find the maximum
    const requestsBySecond = new Map<number, number>();

    results.forEach((result) => {
      const second = Math.floor(result.timestamp / 1000);
      requestsBySecond.set(second, (requestsBySecond.get(second) || 0) + 1);
    });

    return Math.max(...Array.from(requestsBySecond.values()), 0);
  }

  private calculateAvgRPS(results: LoadTestRequestResult[]): number {
    if (results.length === 0) return 0;

    const firstTimestamp = Math.min(...results.map((r) => r.timestamp));
    const lastTimestamp = Math.max(...results.map((r) => r.timestamp));
    const durationSeconds = (lastTimestamp - firstTimestamp) / 1000;

    return durationSeconds > 0 ? results.length / durationSeconds : 0;
  }

  private evaluateScenario(
    scenario: LoadTestScenario,
    metrics: LoadTestMetrics
  ): "PASSED" | "FAILED" {
    const expected = scenario.expectedMetrics;

    // Check if metrics meet expectations
    const checks = [
      metrics.avgResponseTime <= expected.avgResponseTime * 1.2,
      metrics.p95ResponseTime <= expected.p95ResponseTime * 1.2,
      metrics.errorRate <= expected.errorRate * 1.5,
      metrics.avgRPS >= expected.avgRPS * 0.8,
    ];

    return checks.every((check) => check) ? "PASSED" : "FAILED";
  }

  private generateRecommendations(
    results: LoadTestResult[]
  ): LoadTestRecommendation[] {
    const recommendations: LoadTestRecommendation[] = [];

    // Analyze response times
    const highResponseTimeScenarios = results.filter(
      (r) => r.metrics.avgResponseTime > 2000
    );
    if (highResponseTimeScenarios.length > 0) {
      recommendations.push({
        type: "PERFORMANCE",
        severity: "HIGH",
        title: "High Response Times Detected",
        description: `${highResponseTimeScenarios.length} scenarios have average response times above 2 seconds`,
        impact: "Poor user experience and potential timeout issues",
        suggestion:
          "Consider optimizing database queries, adding caching, or scaling infrastructure",
      });
    }

    // Analyze error rates
    const highErrorRateScenarios = results.filter(
      (r) => r.metrics.errorRate > 0.1
    );
    if (highErrorRateScenarios.length > 0) {
      recommendations.push({
        type: "CAPACITY",
        severity: "CRITICAL",
        title: "High Error Rates Detected",
        description: `${highErrorRateScenarios.length} scenarios have error rates above 10%`,
        impact: "Service unavailability and data loss",
        suggestion:
          "Immediate investigation required. Check server resources, database connections, and error logs",
      });
    }

    // Analyze RPS performance
    const lowRPSScenarios = results.filter((r) => r.metrics.avgRPS < 50);
    if (lowRPSScenarios.length > 0) {
      recommendations.push({
        type: "CAPACITY",
        severity: "MEDIUM",
        title: "Low Request Throughput",
        description: `${lowRPSScenarios.length} scenarios have average RPS below 50`,
        impact: "Limited system capacity under load",
        suggestion:
          "Consider horizontal scaling, load balancing, or performance optimization",
      });
    }

    // Check for infrastructure bottlenecks
    const allScenarios = results.length;
    const passedScenarios = results.filter((r) => r.status === "PASSED").length;
    const passRate = allScenarios > 0 ? passedScenarios / allScenarios : 0;

    if (passRate < 0.8) {
      recommendations.push({
        type: "INFRASTRUCTURE",
        severity: "HIGH",
        title: "Infrastructure Performance Issues",
        description: `Only ${(passRate * 100).toFixed(1)}% of load test scenarios passed`,
        impact: "System may not handle production load reliably",
        suggestion:
          "Review infrastructure capacity, database performance, and application bottlenecks",
      });
    }

    return recommendations;
  }

  private calculateAverageRPS(results: LoadTestResult[]): number {
    if (results.length === 0) return 0;
    const totalRPS = results.reduce((sum, r) => sum + r.metrics.avgRPS, 0);
    return totalRPS / results.length;
  }

  private calculatePeakRPS(results: LoadTestResult[]): number {
    if (results.length === 0) return 0;
    return Math.max(...results.map((r) => r.metrics.maxRPS));
  }

  private calculateOverallErrorRate(results: LoadTestResult[]): number {
    if (results.length === 0) return 0;
    const totalRequests = results.reduce(
      (sum, r) => sum + r.metrics.totalRequests,
      0
    );
    const totalErrors = results.reduce(
      (sum, r) => sum + r.metrics.totalErrors,
      0
    );
    return totalRequests > 0 ? totalErrors / totalRequests : 0;
  }
}

// Factory function for creating load test runners
export function createLoadTestRunner(
  config: LoadTestConfigs,
  tracing?: GuardAntTracing
): LoadTestRunner {
  return new LoadTestRunner(config, tracing);
}

// Export configurations for easy access
export { LoadTestConfigs };
