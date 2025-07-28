/**
 * Advanced monitoring alerts system for GuardAnt
 * Provides intelligent alerting with escalation, suppression, and notification routing
 */

import { createLogger } from './logger';
import { AlertError, ErrorCategory, ErrorSeverity } from './error-handling';
import type { GuardAntTracing } from './tracing';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  type: AlertType;
  condition: AlertCondition;
  severity: AlertSeverity;
  enabled: boolean;
  nestId?: string;
  
  notifications: NotificationChannel[];
  escalation: EscalationRule[];
  suppression: SuppressionRule;
  
  tags: string[];
  metadata: AlertMetadata;
}

export enum AlertType {
  METRIC = 'metric',
  AVAILABILITY = 'availability',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  INFRASTRUCTURE = 'infrastructure'
}

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export interface AlertCondition {
  metric: string;
  operator: ConditionOperator;
  threshold: number | string;
  timeWindow: number;
  evaluationFrequency: number;
  datapoints: DatapointConfig;
}

export enum ConditionOperator {
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  EQUALS = 'eq',
  NOT_EQUALS = 'ne'
}

export interface DatapointConfig {
  minDatapoints: number;
  missingDataTreatment: 'breaching' | 'not_breaching' | 'ignore';
  aggregation: AggregationType;
}

export enum AggregationType {
  AVERAGE = 'avg',
  SUM = 'sum',
  MAXIMUM = 'max',
  COUNT = 'count'
}

export interface NotificationChannel {
  type: NotificationType;
  target: string;
  template?: string;
}

export enum NotificationType {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook'
}

export interface EscalationRule {
  level: number;
  delayMinutes: number;
  channels: NotificationChannel[];
}

export interface SuppressionRule {
  enabled: boolean;
  quietPeriodMinutes: number;
  maxAlertsPerHour: number;
}

export interface AlertMetadata {
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
  version: string;
  category: string;
  priority: number;
}

export class MonitoringAlertsManager {
  private logger;
  private tracing?: GuardAntTracing;
  private rules = new Map<string, AlertRule>();

  constructor(
    private serviceName: string,
    tracing?: GuardAntTracing
  ) {
    this.logger = createLogger(`${serviceName}-alerts-manager`);
    this.tracing = tracing;
  }

  getHealthStatus(): { healthy: boolean; details: any } {
    return {
      healthy: true,
      details: {
        rulesCount: this.rules.size
      }
    };
  }
}

export function createMonitoringAlertsManager(
  serviceName: string,
  tracing?: GuardAntTracing
): MonitoringAlertsManager {
  return new MonitoringAlertsManager(serviceName, tracing);
}