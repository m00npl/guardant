import { createLogger } from "./logger";
import { GuardAntTracing } from "./tracing";

// Failover Types and Status
export enum FailoverType {
  ACTIVE_ACTIVE = "active_active",
  ACTIVE_PASSIVE = "active_passive",
  GEOGRAPHIC = "geographic",
  DATABASE = "database",
  LOAD_BALANCER = "load_balancer",
  CUSTOM = "custom",
}

export enum FailoverStatus {
  HEALTHY = "healthy",
  DEGRADED = "degraded",
  FAILED = "failed",
  FAILING_OVER = "failing_over",
  FAILED_OVER = "failed_over",
  RECOVERING = "recovering",
}

export enum FailoverTrigger {
  HEALTH_CHECK_FAILURE = "health_check_failure",
  PERFORMANCE_DEGRADATION = "performance_degradation",
  MANUAL = "manual",
  SCHEDULED = "scheduled",
  DISASTER = "disaster",
  MAINTENANCE = "maintenance",
}

// Failover Configuration
export interface FailoverConfig {
  id: string;
  name: string;
  description: string;
  type: FailoverType;
  primaryEndpoint: string;
  secondaryEndpoints: string[];
  healthCheckConfig: HealthCheckConfig;
  failoverCriteria: FailoverCriteria;
  recoveryConfig: RecoveryConfig;
  monitoringConfig: FailoverMonitoringConfig;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthCheckConfig {
  endpoint: string;
  method: "GET" | "POST" | "HEAD";
  timeout: number; // milliseconds
  interval: number; // milliseconds
  failureThreshold: number;
  successThreshold: number;
  expectedStatus: number;
  expectedResponse?: string;
  headers?: Record<string, string>;
}

export interface FailoverCriteria {
  healthCheckFailures: number;
  responseTimeThreshold: number; // milliseconds
  errorRateThreshold: number; // percentage
  availabilityThreshold: number; // percentage
  manualTrigger: boolean;
}

export interface RecoveryConfig {
  autoRecovery: boolean;
  recoveryDelay: number; // seconds
  maxRecoveryAttempts: number;
  recoveryHealthChecks: number;
  rollbackOnFailure: boolean;
}

export interface FailoverMonitoringConfig {
  enableMetrics: boolean;
  alertChannels: NotificationChannel[];
  escalationPolicy: EscalationPolicy;
  dashboardIntegration: boolean;
}

// Failover State
export interface FailoverState {
  id: string;
  configId: string;
  status: FailoverStatus;
  currentEndpoint: string;
  lastHealthCheck: Date;
  healthCheckResults: HealthCheckResult[];
  failoverHistory: FailoverEvent[];
  metrics: FailoverMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthCheckResult {
  id: string;
  timestamp: Date;
  endpoint: string;
  success: boolean;
  responseTime: number;
  statusCode: number;
  error?: string;
  metadata: Record<string, any>;
}

export interface FailoverEvent {
  id: string;
  timestamp: Date;
  type: "failover" | "recovery" | "manual_switch";
  trigger: FailoverTrigger;
  fromEndpoint: string;
  toEndpoint: string;
  reason: string;
  duration: number; // seconds
  success: boolean;
  metadata: Record<string, any>;
}

export interface FailoverMetrics {
  uptime: number; // percentage
  responseTime: number; // milliseconds
  errorRate: number; // percentage
  failoverCount: number;
  lastFailover: Date;
  averageRecoveryTime: number; // seconds
}

// Failover Report Types
export interface FailoverReport {
  id: string;
  configId: string;
  period: ReportPeriod;
  summary: FailoverSummary;
  events: FailoverEvent[];
  metrics: FailoverMetrics;
  recommendations: FailoverRecommendation[];
  generatedAt: Date;
}

export interface FailoverSummary {
  totalFailovers: number;
  successfulFailovers: number;
  failedFailovers: number;
  averageFailoverTime: number; // seconds
  totalDowntime: number; // seconds
  availability: number; // percentage
  currentStatus: FailoverStatus;
}

export interface FailoverRecommendation {
  type: "optimization" | "infrastructure" | "monitoring" | "process";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedImpact: string;
  implementation: string;
  cost: "low" | "medium" | "high";
}

// Failover Configuration
export interface FailoverSystemConfig {
  enabled: boolean;
  globalSettings: GlobalFailoverSettings;
  monitoringSettings: FailoverMonitoringSettings;
  alertSettings: FailoverAlertSettings;
  reportingSettings: FailoverReportingSettings;
}

export interface GlobalFailoverSettings {
  defaultHealthCheckInterval: number; // milliseconds
  defaultTimeout: number; // milliseconds
  maxConcurrentFailovers: number;
  globalFailoverDelay: number; // seconds
  enableCircuitBreaker: boolean;
}

export interface FailoverMonitoringSettings {
  enableRealTimeMonitoring: boolean;
  metricsCollectionInterval: number; // seconds
  retentionDays: number;
  enableTracing: boolean;
}

export interface FailoverAlertSettings {
  enableAlerts: boolean;
  channels: NotificationChannel[];
  escalationPolicy: EscalationPolicy;
  alertThresholds: AlertThreshold[];
}

export interface AlertThreshold {
  metric: "response_time" | "error_rate" | "availability";
  warning: number;
  critical: number;
  action: "email" | "slack" | "webhook" | "pagerduty";
}

export interface FailoverReportingSettings {
  autoGenerateReports: boolean;
  reportSchedule: "daily" | "weekly" | "monthly";
  retentionDays: number;
  exportFormats: ("pdf" | "csv" | "json")[];
}

// Failover Configurations
export const FailoverConfigs = {
  LOCAL: {
    enabled: true,
    globalSettings: {
      defaultHealthCheckInterval: 30000,
      defaultTimeout: 5000,
      maxConcurrentFailovers: 5,
      globalFailoverDelay: 30,
      enableCircuitBreaker: true,
    },
    monitoringSettings: {
      enableRealTimeMonitoring: true,
      metricsCollectionInterval: 60,
      retentionDays: 30,
      enableTracing: true,
    },
    alertSettings: {
      enableAlerts: false,
      channels: [],
      escalationPolicy: {
        levels: [],
        autoEscalate: false,
        escalationDelay: 300,
      },
      alertThresholds: [],
    },
    reportingSettings: {
      autoGenerateReports: false,
      reportSchedule: "weekly",
      retentionDays: 90,
      exportFormats: ["json"],
    },
  },
  STAGING: {
    enabled: true,
    globalSettings: {
      defaultHealthCheckInterval: 15000,
      defaultTimeout: 3000,
      maxConcurrentFailovers: 10,
      globalFailoverDelay: 15,
      enableCircuitBreaker: true,
    },
    monitoringSettings: {
      enableRealTimeMonitoring: true,
      metricsCollectionInterval: 30,
      retentionDays: 90,
      enableTracing: true,
    },
    alertSettings: {
      enableAlerts: true,
      channels: [
        {
          type: "email",
          config: { recipients: ["ops@guardant.me"] },
          enabled: true,
        },
      ],
      escalationPolicy: {
        levels: [
          {
            level: 1,
            delay: 300,
            channels: ["email"],
            recipients: ["ops-team"],
          },
        ],
        autoEscalate: true,
        escalationDelay: 300,
      },
      alertThresholds: [
        {
          metric: "response_time",
          warning: 1000,
          critical: 2000,
          action: "email",
        },
        { metric: "error_rate", warning: 5, critical: 10, action: "slack" },
      ],
    },
    reportingSettings: {
      autoGenerateReports: true,
      reportSchedule: "daily",
      retentionDays: 365,
      exportFormats: ["pdf", "csv"],
    },
  },
  PRODUCTION: {
    enabled: true,
    globalSettings: {
      defaultHealthCheckInterval: 10000,
      defaultTimeout: 2000,
      maxConcurrentFailovers: 20,
      globalFailoverDelay: 5,
      enableCircuitBreaker: true,
    },
    monitoringSettings: {
      enableRealTimeMonitoring: true,
      metricsCollectionInterval: 15,
      retentionDays: 1095, // 3 years
      enableTracing: true,
    },
    alertSettings: {
      enableAlerts: true,
      channels: [
        {
          type: "email",
          config: { recipients: ["ops@guardant.me"] },
          enabled: true,
        },
        {
          type: "slack",
          config: { channel: "#failover-alerts" },
          enabled: true,
        },
        { type: "pagerduty", config: { serviceKey: "pd_key" }, enabled: true },
      ],
      escalationPolicy: {
        levels: [
          {
            level: 1,
            delay: 60,
            channels: ["slack"],
            recipients: ["ops-team"],
          },
          {
            level: 2,
            delay: 300,
            channels: ["email", "slack"],
            recipients: ["management"],
          },
          {
            level: 3,
            delay: 900,
            channels: ["pagerduty"],
            recipients: ["emergency-contacts"],
          },
        ],
        autoEscalate: true,
        escalationDelay: 60,
      },
      alertThresholds: [
        {
          metric: "response_time",
          warning: 500,
          critical: 1000,
          action: "slack",
        },
        { metric: "error_rate", warning: 2, critical: 5, action: "email" },
        {
          metric: "availability",
          warning: 99,
          critical: 95,
          action: "pagerduty",
        },
      ],
    },
    reportingSettings: {
      autoGenerateReports: true,
      reportSchedule: "daily",
      retentionDays: 1095, // 3 years
      exportFormats: ["pdf", "csv", "json"],
    },
  },
};

// Failover Manager
export class FailoverManager {
  private logger = createLogger("failover-manager");
  private tracing?: GuardAntTracing;
  private config: FailoverSystemConfig;
  private failoverConfigs: FailoverConfig[] = [];
  private failoverStates: Map<string, FailoverState> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private activeFailovers: Set<string> = new Set();

  constructor(config: FailoverSystemConfig, tracing?: GuardAntTracing) {
    this.config = config;
    this.tracing = tracing;
    this.initializeDefaultFailoverConfigs();
    this.startHealthChecks();
  }

  private initializeDefaultFailoverConfigs(): void {
    const defaultConfigs: FailoverConfig[] = [
      {
        id: "api-failover",
        name: "API Service Failover",
        description: "Automatic failover for API services",
        type: FailoverType.ACTIVE_PASSIVE,
        primaryEndpoint: "https://api.guardant.me",
        secondaryEndpoints: ["https://api-backup.guardant.me"],
        healthCheckConfig: {
          endpoint: "/health",
          method: "GET",
          timeout: 5000,
          interval: 10000,
          failureThreshold: 3,
          successThreshold: 2,
          expectedStatus: 200,
          expectedResponse: '{"status":"healthy"}',
        },
        failoverCriteria: {
          healthCheckFailures: 3,
          responseTimeThreshold: 1000,
          errorRateThreshold: 5,
          availabilityThreshold: 99,
          manualTrigger: true,
        },
        recoveryConfig: {
          autoRecovery: true,
          recoveryDelay: 300,
          maxRecoveryAttempts: 3,
          recoveryHealthChecks: 5,
          rollbackOnFailure: true,
        },
        monitoringConfig: {
          enableMetrics: true,
          alertChannels: [],
          escalationPolicy: {
            levels: [],
            autoEscalate: false,
            escalationDelay: 300,
          },
          dashboardIntegration: true,
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "database-failover",
        name: "Database Failover",
        description: "Database replication and failover",
        type: FailoverType.ACTIVE_PASSIVE,
        primaryEndpoint: "postgresql://primary.db.guardant.me",
        secondaryEndpoints: ["postgresql://replica.db.guardant.me"],
        healthCheckConfig: {
          endpoint: "/health",
          method: "GET",
          timeout: 3000,
          interval: 15000,
          failureThreshold: 2,
          successThreshold: 3,
          expectedStatus: 200,
        },
        failoverCriteria: {
          healthCheckFailures: 2,
          responseTimeThreshold: 500,
          errorRateThreshold: 1,
          availabilityThreshold: 99.9,
          manualTrigger: true,
        },
        recoveryConfig: {
          autoRecovery: false, // Manual recovery for database
          recoveryDelay: 600,
          maxRecoveryAttempts: 1,
          recoveryHealthChecks: 10,
          rollbackOnFailure: false,
        },
        monitoringConfig: {
          enableMetrics: true,
          alertChannels: [],
          escalationPolicy: {
            levels: [],
            autoEscalate: false,
            escalationDelay: 300,
          },
          dashboardIntegration: true,
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    this.failoverConfigs.push(...defaultConfigs);
  }

  async createFailoverConfig(
    config: Omit<FailoverConfig, "id" | "createdAt" | "updatedAt">
  ): Promise<FailoverConfig> {
    const newConfig: FailoverConfig = {
      ...config,
      id: `failover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.failoverConfigs.push(newConfig);
    this.initializeFailoverState(newConfig);
    this.startHealthCheck(newConfig);

    this.logger.info(`Created failover config: ${newConfig.name}`);
    return newConfig;
  }

  private initializeFailoverState(config: FailoverConfig): void {
    const state: FailoverState = {
      id: `state_${config.id}`,
      configId: config.id,
      status: FailoverStatus.HEALTHY,
      currentEndpoint: config.primaryEndpoint,
      lastHealthCheck: new Date(),
      healthCheckResults: [],
      failoverHistory: [],
      metrics: {
        uptime: 100,
        responseTime: 0,
        errorRate: 0,
        failoverCount: 0,
        lastFailover: new Date(),
        averageRecoveryTime: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.failoverStates.set(config.id, state);
  }

  private startHealthChecks(): void {
    for (const config of this.failoverConfigs.filter((c) => c.isActive)) {
      this.startHealthCheck(config);
    }
  }

  private startHealthCheck(config: FailoverConfig): void {
    if (this.healthCheckIntervals.has(config.id)) {
      clearInterval(this.healthCheckIntervals.get(config.id)!);
    }

    const interval = setInterval(async () => {
      await this.performHealthCheck(config);
    }, config.healthCheckConfig.interval);

    this.healthCheckIntervals.set(config.id, interval);
  }

  private async performHealthCheck(config: FailoverConfig): Promise<void> {
    const state = this.failoverStates.get(config.id);
    if (!state) return;

    try {
      const result = await this.executeHealthCheck(
        config.healthCheckConfig,
        state.currentEndpoint
      );
      state.healthCheckResults.push(result);

      // Keep only recent results
      if (state.healthCheckResults.length > 100) {
        state.healthCheckResults = state.healthCheckResults.slice(-50);
      }

      // Update metrics
      this.updateFailoverMetrics(state, result);

      // Check if failover is needed
      if (this.shouldTriggerFailover(config, state)) {
        await this.triggerFailover(
          config,
          state,
          FailoverTrigger.HEALTH_CHECK_FAILURE
        );
      }

      state.lastHealthCheck = new Date();
      state.updatedAt = new Date();
    } catch (error) {
      this.logger.error(`Health check failed for ${config.name}:`, error);
    }
  }

  private async executeHealthCheck(
    healthCheck: HealthCheckConfig,
    endpoint: string
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let success = false;
    let statusCode = 0;
    let error: string | undefined;

    try {
      const response = await fetch(`${endpoint}${healthCheck.endpoint}`, {
        method: healthCheck.method,
        headers: healthCheck.headers,
        signal: AbortSignal.timeout(healthCheck.timeout),
      });

      statusCode = response.status;
      success = response.status === healthCheck.expectedStatus;

      if (healthCheck.expectedResponse) {
        const responseText = await response.text();
        success =
          success && responseText.includes(healthCheck.expectedResponse);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
      success = false;
    }

    const responseTime = Date.now() - startTime;

    return {
      id: `health_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      endpoint,
      success,
      responseTime,
      statusCode,
      error,
      metadata: {},
    };
  }

  private updateFailoverMetrics(
    state: FailoverState,
    result: HealthCheckResult
  ): void {
    const recentResults = state.healthCheckResults.slice(-20);
    const successfulResults = recentResults.filter((r) => r.success);

    state.metrics.uptime =
      (successfulResults.length / recentResults.length) * 100;
    state.metrics.responseTime =
      recentResults.reduce((sum, r) => sum + r.responseTime, 0) /
      recentResults.length;
    state.metrics.errorRate =
      ((recentResults.length - successfulResults.length) /
        recentResults.length) *
      100;
  }

  private shouldTriggerFailover(
    config: FailoverConfig,
    state: FailoverState
  ): boolean {
    if (
      state.status === FailoverStatus.FAILING_OVER ||
      state.status === FailoverStatus.FAILED_OVER
    ) {
      return false;
    }

    const recentResults = state.healthCheckResults.slice(
      -config.failoverCriteria.healthCheckFailures
    );
    const failureCount = recentResults.filter((r) => !r.success).length;

    return (
      failureCount >= config.failoverCriteria.healthCheckFailures ||
      state.metrics.responseTime >
        config.failoverCriteria.responseTimeThreshold ||
      state.metrics.errorRate > config.failoverCriteria.errorRateThreshold ||
      state.metrics.uptime < config.failoverCriteria.availabilityThreshold
    );
  }

  private async triggerFailover(
    config: FailoverConfig,
    state: FailoverState,
    trigger: FailoverTrigger
  ): Promise<void> {
    if (this.activeFailovers.has(config.id)) {
      this.logger.warn(`Failover already in progress for ${config.name}`);
      return;
    }

    this.activeFailovers.add(config.id);
    state.status = FailoverStatus.FAILING_OVER;

    try {
      const secondaryEndpoint = this.selectSecondaryEndpoint(config, state);
      if (!secondaryEndpoint) {
        throw new Error("No available secondary endpoint");
      }

      // Verify secondary endpoint is healthy
      const healthCheck = await this.executeHealthCheck(
        config.healthCheckConfig,
        secondaryEndpoint
      );
      if (!healthCheck.success) {
        throw new Error("Secondary endpoint is not healthy");
      }

      // Perform failover
      const failoverEvent: FailoverEvent = {
        id: `failover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        type: "failover",
        trigger,
        fromEndpoint: state.currentEndpoint,
        toEndpoint: secondaryEndpoint,
        reason: `Health check failures: ${this.getRecentFailureCount(state)}`,
        duration: 0,
        success: false,
        metadata: {},
      };

      // Update state
      state.currentEndpoint = secondaryEndpoint;
      state.status = FailoverStatus.FAILED_OVER;
      state.failoverHistory.push(failoverEvent);
      state.metrics.failoverCount++;
      state.metrics.lastFailover = new Date();

      // Update DNS/load balancer (simulated)
      await this.updateTrafficRouting(config, secondaryEndpoint);

      failoverEvent.success = true;
      failoverEvent.duration =
        (Date.now() - failoverEvent.timestamp.getTime()) / 1000;

      this.logger.info(
        `Failover completed for ${config.name}: ${state.currentEndpoint} -> ${secondaryEndpoint}`
      );

      // Start recovery monitoring
      if (config.recoveryConfig.autoRecovery) {
        this.startRecoveryMonitoring(config, state);
      }

      // Send alerts
      await this.sendFailoverAlert(config, failoverEvent);
    } catch (error) {
      this.logger.error(`Failover failed for ${config.name}:`, error);
      state.status = FailoverStatus.FAILED;

      // Send failure alert
      await this.sendFailoverAlert(config, {
        id: `failover_failed_${Date.now()}`,
        timestamp: new Date(),
        type: "failover",
        trigger,
        fromEndpoint: state.currentEndpoint,
        toEndpoint: "none",
        reason: error instanceof Error ? error.message : "Unknown error",
        duration: 0,
        success: false,
        metadata: {},
      });
    } finally {
      this.activeFailovers.delete(config.id);
      state.updatedAt = new Date();
    }
  }

  private selectSecondaryEndpoint(
    config: FailoverConfig,
    state: FailoverState
  ): string | null {
    const availableEndpoints = config.secondaryEndpoints.filter(
      (endpoint) => endpoint !== state.currentEndpoint
    );

    if (availableEndpoints.length === 0) {
      return null;
    }

    // Simple round-robin selection
    const index = state.metrics.failoverCount % availableEndpoints.length;
    return availableEndpoints[index];
  }

  private getRecentFailureCount(state: FailoverState): number {
    const recentResults = state.healthCheckResults.slice(-10);
    return recentResults.filter((r) => !r.success).length;
  }

  private async updateTrafficRouting(
    config: FailoverConfig,
    endpoint: string
  ): Promise<void> {
    // Simulated traffic routing update
    this.logger.info(
      `Updating traffic routing for ${config.name} to ${endpoint}`
    );

    // In a real implementation, this would:
    // - Update DNS records
    // - Update load balancer configuration
    // - Update CDN settings
    // - Update service discovery
  }

  private startRecoveryMonitoring(
    config: FailoverConfig,
    state: FailoverState
  ): void {
    setTimeout(async () => {
      await this.attemptRecovery(config, state);
    }, config.recoveryConfig.recoveryDelay * 1000);
  }

  private async attemptRecovery(
    config: FailoverConfig,
    state: FailoverState
  ): Promise<void> {
    if (state.status !== FailoverStatus.FAILED_OVER) return;

    this.logger.info(`Attempting recovery for ${config.name}`);

    // Check if primary is healthy
    const primaryHealthCheck = await this.executeHealthCheck(
      config.healthCheckConfig,
      config.primaryEndpoint
    );

    if (primaryHealthCheck.success) {
      // Perform recovery
      const recoveryEvent: FailoverEvent = {
        id: `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        type: "recovery",
        trigger: FailoverTrigger.HEALTH_CHECK_FAILURE,
        fromEndpoint: state.currentEndpoint,
        toEndpoint: config.primaryEndpoint,
        reason: "Primary endpoint recovered",
        duration: 0,
        success: false,
        metadata: {},
      };

      try {
        // Update traffic routing back to primary
        await this.updateTrafficRouting(config, config.primaryEndpoint);

        state.currentEndpoint = config.primaryEndpoint;
        state.status = FailoverStatus.HEALTHY;
        state.failoverHistory.push(recoveryEvent);

        recoveryEvent.success = true;
        recoveryEvent.duration =
          (Date.now() - recoveryEvent.timestamp.getTime()) / 1000;

        this.logger.info(
          `Recovery completed for ${config.name}: ${state.currentEndpoint} -> ${config.primaryEndpoint}`
        );
      } catch (error) {
        this.logger.error(`Recovery failed for ${config.name}:`, error);
        recoveryEvent.success = false;
        state.status = FailoverStatus.FAILED_OVER;
      }

      state.updatedAt = new Date();
    } else {
      // Schedule another recovery attempt
      if (
        state.metrics.failoverCount < config.recoveryConfig.maxRecoveryAttempts
      ) {
        this.startRecoveryMonitoring(config, state);
      }
    }
  }

  async manualFailover(
    configId: string,
    targetEndpoint: string
  ): Promise<void> {
    const config = this.failoverConfigs.find((c) => c.id === configId);
    const state = this.failoverStates.get(configId);

    if (!config || !state) {
      throw new Error(`Failover config not found: ${configId}`);
    }

    if (!config.failoverCriteria.manualTrigger) {
      throw new Error("Manual failover not enabled for this configuration");
    }

    const failoverEvent: FailoverEvent = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: "manual_switch",
      trigger: FailoverTrigger.MANUAL,
      fromEndpoint: state.currentEndpoint,
      toEndpoint: targetEndpoint,
      reason: "Manual failover triggered",
      duration: 0,
      success: false,
      metadata: {},
    };

    try {
      await this.updateTrafficRouting(config, targetEndpoint);
      state.currentEndpoint = targetEndpoint;
      state.failoverHistory.push(failoverEvent);
      state.metrics.failoverCount++;

      failoverEvent.success = true;
      failoverEvent.duration =
        (Date.now() - failoverEvent.timestamp.getTime()) / 1000;

      this.logger.info(
        `Manual failover completed for ${config.name}: ${state.currentEndpoint} -> ${targetEndpoint}`
      );
    } catch (error) {
      this.logger.error(`Manual failover failed for ${config.name}:`, error);
      failoverEvent.success = false;
    }

    state.updatedAt = new Date();
  }

  async generateFailoverReport(
    configId: string,
    period: ReportPeriod
  ): Promise<FailoverReport> {
    const config = this.failoverConfigs.find((c) => c.id === configId);
    const state = this.failoverStates.get(configId);

    if (!config || !state) {
      throw new Error(`Failover config not found: ${configId}`);
    }

    const periodEvents = state.failoverHistory.filter(
      (e) => e.timestamp >= period.start && e.timestamp <= period.end
    );

    const summary = this.calculateFailoverSummary(periodEvents, state);
    const recommendations = await this.generateFailoverRecommendations(
      config,
      state,
      periodEvents
    );

    return {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      configId,
      period,
      summary,
      events: periodEvents,
      metrics: state.metrics,
      recommendations,
      generatedAt: new Date(),
    };
  }

  private calculateFailoverSummary(
    events: FailoverEvent[],
    state: FailoverState
  ): FailoverSummary {
    const totalFailovers = events.filter((e) => e.type === "failover").length;
    const successfulFailovers = events.filter(
      (e) => e.type === "failover" && e.success
    ).length;
    const failedFailovers = totalFailovers - successfulFailovers;
    const averageFailoverTime =
      events.length > 0
        ? events.reduce((sum, e) => sum + e.duration, 0) / events.length
        : 0;

    const totalDowntime = events.reduce((sum, e) => sum + e.duration, 0);
    const availability = 100 - (totalDowntime / (24 * 60 * 60)) * 100; // Simplified calculation

    return {
      totalFailovers,
      successfulFailovers,
      failedFailovers,
      averageFailoverTime,
      totalDowntime,
      availability,
      currentStatus: state.status,
    };
  }

  private async generateFailoverRecommendations(
    config: FailoverConfig,
    state: FailoverState,
    events: FailoverEvent[]
  ): Promise<FailoverRecommendation[]> {
    const recommendations: FailoverRecommendation[] = [];

    // Check failover frequency
    if (events.length > 5) {
      recommendations.push({
        type: "infrastructure",
        title: "Improve Primary Endpoint Reliability",
        description: `High number of failovers (${events.length}) indicates primary endpoint issues`,
        priority: "high",
        estimatedImpact: "Reduce failover frequency and improve availability",
        implementation:
          "Upgrade infrastructure, add redundancy, improve monitoring",
        cost: "medium",
      });
    }

    // Check recovery time
    const averageRecoveryTime = state.metrics.averageRecoveryTime;
    if (averageRecoveryTime > 300) {
      // 5 minutes
      recommendations.push({
        type: "process",
        title: "Optimize Recovery Process",
        description: `Average recovery time of ${averageRecoveryTime}s is too high`,
        priority: "medium",
        estimatedImpact: "Faster recovery and reduced downtime",
        implementation:
          "Automate recovery procedures, improve health checks, optimize routing",
        cost: "low",
      });
    }

    // Check error rate
    if (state.metrics.errorRate > 5) {
      recommendations.push({
        type: "monitoring",
        title: "Enhance Monitoring and Alerting",
        description: `High error rate of ${state.metrics.errorRate}% indicates monitoring gaps`,
        priority: "medium",
        estimatedImpact: "Proactive issue detection and faster response",
        implementation:
          "Add comprehensive monitoring, improve alerting, implement circuit breakers",
        cost: "low",
      });
    }

    return recommendations;
  }

  private async sendFailoverAlert(
    config: FailoverConfig,
    event: FailoverEvent
  ): Promise<void> {
    if (!this.config.alertSettings.enableAlerts) return;

    const notification = {
      type: "failover_alert",
      config: config.name,
      event: event,
      timestamp: new Date(),
    };

    for (const channel of this.config.alertSettings.channels) {
      if (channel.enabled) {
        try {
          await this.sendNotification(channel, notification);
        } catch (error) {
          this.logger.error(
            `Failed to send failover alert via ${channel.type}:`,
            error
          );
        }
      }
    }
  }

  private async sendNotification(
    channel: NotificationChannel,
    notification: any
  ): Promise<void> {
    switch (channel.type) {
      case "email":
        this.logger.info(
          `Email notification: Failover event for ${notification.config}`
        );
        break;
      case "slack":
        this.logger.info(
          `Slack notification: Failover event for ${notification.config}`
        );
        break;
      case "webhook":
        this.logger.info(
          `Webhook notification: Failover event for ${notification.config}`
        );
        break;
      case "pagerduty":
        this.logger.info(
          `PagerDuty notification: Failover event for ${notification.config}`
        );
        break;
      default:
        this.logger.warn(`Unknown notification channel: ${channel.type}`);
    }
  }

  getFailoverStatus(configId: string): FailoverState | null {
    return this.failoverStates.get(configId) || null;
  }

  getAllFailoverStatuses(): FailoverState[] {
    return Array.from(this.failoverStates.values());
  }

  destroy(): void {
    for (const [configId, interval] of this.healthCheckIntervals) {
      clearInterval(interval);
      this.logger.debug(`Stopped health check for config: ${configId}`);
    }
    this.healthCheckIntervals.clear();
  }
}
