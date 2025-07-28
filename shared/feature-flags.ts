/**
 * Feature flags system for GuardAnt services
 * Provides dynamic feature toggling, A/B testing, gradual rollouts, and targeting
 */

import { createLogger } from './logger';
import { FeatureFlagError, ErrorCategory, ErrorSeverity } from './error-handling';
import type { GuardAntTracing } from './tracing';

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  type: FlagType;
  variants?: FlagVariant[];
  targeting: FlagTargeting;
  rollout: RolloutStrategy;
  metadata: FlagMetadata;
}

export enum FlagType {
  BOOLEAN = 'boolean',
  STRING = 'string',
  NUMBER = 'number',
  JSON = 'json',
  VARIANT = 'variant'
}

export interface FlagVariant {
  key: string;
  name: string;
  value: any;
  weight: number; // Percentage weight for A/B testing
  description?: string;
}

export interface FlagTargeting {
  rules: TargetingRule[];
  defaultValue: any;
  enabled: boolean;
}

export interface TargetingRule {
  id: string;
  description: string;
  conditions: TargetingCondition[];
  value: any;
  enabled: boolean;
  priority: number;
}

export interface TargetingCondition {
  attribute: string;
  operator: ConditionOperator;
  values: any[];
  negate?: boolean;
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  IN = 'in',
  NOT_IN = 'not_in',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  REGEX = 'regex',
  VERSION_GREATER_THAN = 'version_greater_than',
  VERSION_LESS_THAN = 'version_less_than',
  PERCENTAGE = 'percentage'
}

export interface RolloutStrategy {
  type: RolloutType;
  percentage?: number;
  segments?: string[];
  schedule?: RolloutSchedule;
  canaryConfig?: CanaryConfig;
}

export enum RolloutType {
  ALL_USERS = 'all_users',
  PERCENTAGE = 'percentage',
  SEGMENTS = 'segments',
  SCHEDULED = 'scheduled',
  CANARY = 'canary',
  GRADUAL = 'gradual'
}

export interface RolloutSchedule {
  startDate: Date;
  endDate?: Date;
  timezone: string;
  phases?: RolloutPhase[];
}

export interface RolloutPhase {
  name: string;
  startDate: Date;
  percentage: number;
  duration: number; // minutes
}

export interface CanaryConfig {
  baseline: string; // baseline variant key
  canary: string; // canary variant key
  trafficSplit: number; // percentage to canary
  successMetrics: string[];
  failureMetrics: string[];
  autoPromote: boolean;
  autoRollback: boolean;
}

export interface FlagMetadata {
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
  tags: string[];
  environment: string;
  archived: boolean;
  version: number;
}

export interface EvaluationContext {
  userId?: string;
  nestId?: string;
  userAgent?: string;
  ipAddress?: string;
  country?: string;
  region?: string;
  platform?: string;
  version?: string;
  customAttributes?: Record<string, any>;
  timestamp?: Date;
}

export interface FlagEvaluation {
  key: string;
  value: any;
  variant?: string;
  reason: string;
  ruleId?: string;
  timestamp: Date;
  context: EvaluationContext;
}

export interface FlagAnalytics {
  key: string;
  evaluations: number;
  uniqueUsers: number;
  variants: Record<string, number>;
  conversionRate?: number;
  successMetric?: number;
  period: { start: Date; end: Date };
}

// Predefined feature flags for GuardAnt system
export const GuardAntFeatureFlags: FeatureFlag[] = [
  {
    key: 'enhanced_monitoring',
    name: 'Enhanced Monitoring',
    description: 'Enable advanced monitoring features with real-time analytics',
    enabled: true,
    type: FlagType.BOOLEAN,
    targeting: {
      rules: [
        {
          id: 'premium_users',
          description: 'Enable for premium subscription users',
          conditions: [
            {
              attribute: 'subscription_tier',
              operator: ConditionOperator.IN,
              values: ['pro', 'enterprise']
            }
          ],
          value: true,
          enabled: true,
          priority: 1
        }
      ],
      defaultValue: false,
      enabled: true
    },
    rollout: {
      type: RolloutType.SEGMENTS,
      segments: ['premium_users', 'beta_testers']
    },
    metadata: {
      createdBy: 'system',
      createdAt: new Date(),
      updatedBy: 'system',
      updatedAt: new Date(),
      tags: ['monitoring', 'premium'],
      environment: 'production',
      archived: false,
      version: 1
    }
  },

  {
    key: 'multi_region_monitoring',
    name: 'Multi-Region Monitoring',
    description: 'Allow monitoring from multiple geographic regions',
    enabled: true,
    type: FlagType.VARIANT,
    variants: [
      {
        key: 'single_region',
        name: 'Single Region',
        value: { regions: ['us-east-1'], maxRegions: 1 },
        weight: 50,
        description: 'Monitor from single region only'
      },
      {
        key: 'multi_region',
        name: 'Multi Region',
        value: { regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1'], maxRegions: 3 },
        weight: 50,
        description: 'Monitor from multiple regions'
      }
    ],
    targeting: {
      rules: [
        {
          id: 'enterprise_users',
          description: 'Enterprise users get multi-region by default',
          conditions: [
            {
              attribute: 'subscription_tier',
              operator: ConditionOperator.EQUALS,
              values: ['enterprise']
            }
          ],
          value: 'multi_region',
          enabled: true,
          priority: 1
        }
      ],
      defaultValue: 'single_region',
      enabled: true
    },
    rollout: {
      type: RolloutType.PERCENTAGE,
      percentage: 25
    },
    metadata: {
      createdBy: 'system',
      createdAt: new Date(),
      updatedBy: 'system',
      updatedAt: new Date(),
      tags: ['monitoring', 'regions', 'enterprise'],
      environment: 'production',
      archived: false,
      version: 1
    }
  },

  {
    key: 'new_dashboard_ui',
    name: 'New Dashboard UI',
    description: 'A/B test for the redesigned dashboard interface',
    enabled: true,
    type: FlagType.VARIANT,
    variants: [
      {
        key: 'legacy',
        name: 'Legacy Dashboard',
        value: { theme: 'legacy', features: ['basic_charts'] },
        weight: 70,
        description: 'Current dashboard design'
      },
      {
        key: 'modern',
        name: 'Modern Dashboard',
        value: { theme: 'modern', features: ['advanced_charts', 'dark_mode', 'customizable_widgets'] },
        weight: 30,
        description: 'New modern dashboard design'
      }
    ],
    targeting: {
      rules: [
        {
          id: 'beta_testers',
          description: 'Beta testers always get modern UI',
          conditions: [
            {
              attribute: 'user_tags',
              operator: ConditionOperator.CONTAINS,
              values: ['beta_tester']
            }
          ],
          value: 'modern',
          enabled: true,
          priority: 1
        },
        {
          id: 'new_users',
          description: 'New users are more likely to get modern UI',
          conditions: [
            {
              attribute: 'account_age_days',
              operator: ConditionOperator.LESS_THAN,
              values: [30]
            }
          ],
          value: 'modern',
          enabled: true,
          priority: 2
        }
      ],
      defaultValue: 'legacy',
      enabled: true
    },
    rollout: {
      type: RolloutType.CANARY,
      canaryConfig: {
        baseline: 'legacy',
        canary: 'modern',
        trafficSplit: 30,
        successMetrics: ['dashboard_engagement', 'user_satisfaction'],
        failureMetrics: ['error_rate', 'page_load_time'],
        autoPromote: false,
        autoRollback: true
      }
    },
    metadata: {
      createdBy: 'product_team',
      createdAt: new Date(),
      updatedBy: 'product_team',
      updatedAt: new Date(),
      tags: ['ui', 'dashboard', 'ab_test'],
      environment: 'production',
      archived: false,
      version: 2
    }
  },

  {
    key: 'advanced_alerting',
    name: 'Advanced Alerting',
    description: 'Enable advanced alerting features with custom conditions',
    enabled: true,
    type: FlagType.BOOLEAN,
    targeting: {
      rules: [
        {
          id: 'gradual_rollout',
          description: 'Gradual rollout to all users',
          conditions: [
            {
              attribute: 'user_id',
              operator: ConditionOperator.PERCENTAGE,
              values: [50] // 50% of users
            }
          ],
          value: true,
          enabled: true,
          priority: 1
        }
      ],
      defaultValue: false,
      enabled: true
    },
    rollout: {
      type: RolloutType.GRADUAL,
      schedule: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        timezone: 'UTC',
        phases: [
          {
            name: 'Phase 1',
            startDate: new Date(),
            percentage: 10,
            duration: 10080 // 7 days in minutes
          },
          {
            name: 'Phase 2',
            startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            percentage: 25,
            duration: 10080
          },
          {
            name: 'Phase 3',
            startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            percentage: 50,
            duration: 10080
          },
          {
            name: 'Full Rollout',
            startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
            percentage: 100,
            duration: 10080
          }
        ]
      }
    },
    metadata: {
      createdBy: 'engineering_team',
      createdAt: new Date(),
      updatedBy: 'engineering_team',
      updatedAt: new Date(),
      tags: ['alerting', 'advanced', 'gradual_rollout'],
      environment: 'production',
      archived: false,
      version: 1
    }
  },

  {
    key: 'payment_v2',
    name: 'Payment System V2',
    description: 'New payment processing system with improved UX',
    enabled: false, // Not yet ready for production
    type: FlagType.BOOLEAN,
    targeting: {
      rules: [
        {
          id: 'internal_testing',
          description: 'Internal team testing only',
          conditions: [
            {
              attribute: 'email',
              operator: ConditionOperator.ENDS_WITH,
              values: ['@guardant.me']
            }
          ],
          value: true,
          enabled: true,
          priority: 1
        }
      ],
      defaultValue: false,
      enabled: true
    },
    rollout: {
      type: RolloutType.SEGMENTS,
      segments: ['internal_team']
    },
    metadata: {
      createdBy: 'payments_team',
      createdAt: new Date(),
      updatedBy: 'payments_team',
      updatedAt: new Date(),
      tags: ['payments', 'v2', 'internal'],
      environment: 'staging',
      archived: false,
      version: 1
    }
  },

  {
    key: 'performance_optimizations',
    name: 'Performance Optimizations',
    description: 'Enable various performance optimization features',
    enabled: true,
    type: FlagType.JSON,
    targeting: {
      rules: [],
      defaultValue: {
        enableCaching: true,
        enableCompression: true,
        enableCDN: false,
        enableLazyLoading: true,
        cacheTimeout: 300,
        compressionLevel: 6
      },
      enabled: true
    },
    rollout: {
      type: RolloutType.ALL_USERS
    },
    metadata: {
      createdBy: 'performance_team',
      createdAt: new Date(),
      updatedBy: 'performance_team',
      updatedAt: new Date(),
      tags: ['performance', 'optimization', 'caching'],
      environment: 'production',
      archived: false,
      version: 1
    }
  }
];

export class FeatureFlagManager {
  private logger;
  private tracing?: GuardAntTracing;
  private flags = new Map<string, FeatureFlag>();
  private evaluationHistory: FlagEvaluation[] = [];
  private analytics = new Map<string, FlagAnalytics>();

  constructor(
    private serviceName: string,
    tracing?: GuardAntTracing
  ) {
    this.logger = createLogger(`${serviceName}-feature-flags`);
    this.tracing = tracing;
    
    this.loadDefaultFlags();
  }

  private loadDefaultFlags(): void {
    for (const flag of GuardAntFeatureFlags) {
      this.flags.set(flag.key, flag);
    }

    this.logger.info('Default feature flags loaded', {
      flagsCount: this.flags.size
    });
  }

  addFlag(flag: FeatureFlag): void {
    this.flags.set(flag.key, flag);
    
    this.logger.info('Feature flag added', {
      key: flag.key,
      name: flag.name,
      type: flag.type,
      enabled: flag.enabled
    });
  }

  removeFlag(key: string): boolean {
    const removed = this.flags.delete(key);
    
    if (removed) {
      this.logger.info('Feature flag removed', { key });
    }

    return removed;
  }

  updateFlag(key: string, updates: Partial<FeatureFlag>): boolean {
    const flag = this.flags.get(key);
    if (!flag) {
      return false;
    }

    const updatedFlag = {
      ...flag,
      ...updates,
      metadata: {
        ...flag.metadata,
        ...updates.metadata,
        updatedAt: new Date(),
        version: flag.metadata.version + 1
      }
    };

    this.flags.set(key, updatedFlag);
    
    this.logger.info('Feature flag updated', {
      key,
      version: updatedFlag.metadata.version
    });

    return true;
  }

  evaluate(key: string, context: EvaluationContext = {}): any {
    const startTime = Date.now();
    
    try {
      const flag = this.flags.get(key);
      if (!flag) {
        this.logger.warn('Feature flag not found', { key });
        return null;
      }

      if (!flag.enabled) {
        return this.createEvaluation(key, flag.targeting.defaultValue, context, 'flag_disabled');
      }

      // Check targeting rules
      if (flag.targeting.enabled) {
        const ruleResult = this.evaluateTargetingRules(flag, context);
        if (ruleResult) {
          return this.createEvaluation(key, ruleResult.value, context, 'rule_match', ruleResult.ruleId);
        }
      }

      // Handle rollout strategy
      const rolloutResult = this.evaluateRollout(flag, context);
      const finalValue = rolloutResult.enabled ? rolloutResult.value : flag.targeting.defaultValue;

      const evaluation = this.createEvaluation(key, finalValue, context, rolloutResult.reason);
      
      const duration = Date.now() - startTime;
      this.logger.debug('Feature flag evaluated', {
        key,
        value: finalValue,
        reason: rolloutResult.reason,
        duration
      });

      if (this.tracing) {
        this.tracing.addEvent('feature_flag_evaluated', {
          'flag.key': key,
          'flag.value': JSON.stringify(finalValue),
          'flag.reason': rolloutResult.reason,
          'flag.duration_ms': duration.toString()
        });
      }

      return evaluation;

    } catch (error) {
      this.logger.error(`Feature flag evaluation failed: ${key}`, error as Error);
      return this.createEvaluation(key, null, context, 'evaluation_error');
    }
  }

  private evaluateTargetingRules(flag: FeatureFlag, context: EvaluationContext): { value: any; ruleId: string } | null {
    // Sort rules by priority (higher priority first)
    const sortedRules = [...flag.targeting.rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (!rule.enabled) continue;

      if (this.evaluateConditions(rule.conditions, context)) {
        return {
          value: rule.value,
          ruleId: rule.id
        };
      }
    }

    return null;
  }

  private evaluateConditions(conditions: TargetingCondition[], context: EvaluationContext): boolean {
    return conditions.every(condition => {
      const result = this.evaluateCondition(condition, context);
      return condition.negate ? !result : result;
    });
  }

  private evaluateCondition(condition: TargetingCondition, context: EvaluationContext): boolean {
    const contextValue = this.getContextValue(condition.attribute, context);
    
    if (contextValue === undefined) {
      return false;
    }

    switch (condition.operator) {
      case ConditionOperator.EQUALS:
        return condition.values.includes(contextValue);
      
      case ConditionOperator.NOT_EQUALS:
        return !condition.values.includes(contextValue);
      
      case ConditionOperator.IN:
        return Array.isArray(contextValue) 
          ? contextValue.some(v => condition.values.includes(v))
          : condition.values.includes(contextValue);
      
      case ConditionOperator.NOT_IN:
        return Array.isArray(contextValue)
          ? !contextValue.some(v => condition.values.includes(v))
          : !condition.values.includes(contextValue);
      
      case ConditionOperator.CONTAINS:
        return typeof contextValue === 'string' && 
               condition.values.some(v => contextValue.includes(String(v)));
      
      case ConditionOperator.NOT_CONTAINS:
        return typeof contextValue === 'string' && 
               !condition.values.some(v => contextValue.includes(String(v)));
      
      case ConditionOperator.STARTS_WITH:
        return typeof contextValue === 'string' && 
               condition.values.some(v => contextValue.startsWith(String(v)));
      
      case ConditionOperator.ENDS_WITH:
        return typeof contextValue === 'string' && 
               condition.values.some(v => contextValue.endsWith(String(v)));
      
      case ConditionOperator.GREATER_THAN:
        return typeof contextValue === 'number' && 
               contextValue > Number(condition.values[0]);
      
      case ConditionOperator.LESS_THAN:
        return typeof contextValue === 'number' && 
               contextValue < Number(condition.values[0]);
      
      case ConditionOperator.GREATER_THAN_OR_EQUAL:
        return typeof contextValue === 'number' && 
               contextValue >= Number(condition.values[0]);
      
      case ConditionOperator.LESS_THAN_OR_EQUAL:
        return typeof contextValue === 'number' && 
               contextValue <= Number(condition.values[0]);
      
      case ConditionOperator.REGEX:
        return typeof contextValue === 'string' && 
               new RegExp(String(condition.values[0])).test(contextValue);
      
      case ConditionOperator.VERSION_GREATER_THAN:
        return this.compareVersions(String(contextValue), String(condition.values[0])) > 0;
      
      case ConditionOperator.VERSION_LESS_THAN:
        return this.compareVersions(String(contextValue), String(condition.values[0])) < 0;
      
      case ConditionOperator.PERCENTAGE:
        return this.calculatePercentage(context) < Number(condition.values[0]);
      
      default:
        return false;
    }
  }

  private getContextValue(attribute: string, context: EvaluationContext): any {
    const parts = attribute.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private evaluateRollout(flag: FeatureFlag, context: EvaluationContext): { enabled: boolean; value: any; reason: string } {
    const rollout = flag.rollout;

    switch (rollout.type) {
      case RolloutType.ALL_USERS:
        return {
          enabled: true,
          value: this.selectVariantValue(flag, context),
          reason: 'all_users_rollout'
        };

      case RolloutType.PERCENTAGE:
        const percentage = rollout.percentage || 0;
        const userPercentage = this.calculatePercentage(context);
        const enabled = userPercentage < percentage;
        
        return {
          enabled,
          value: enabled ? this.selectVariantValue(flag, context) : flag.targeting.defaultValue,
          reason: `percentage_rollout_${percentage}%`
        };

      case RolloutType.SEGMENTS:
        // This would check if user belongs to specified segments
        // For now, return default behavior
        return {
          enabled: true,
          value: this.selectVariantValue(flag, context),
          reason: 'segments_rollout'
        };

      case RolloutType.SCHEDULED:
        if (rollout.schedule) {
          const now = new Date();
          const inSchedule = now >= rollout.schedule.startDate && 
                           (!rollout.schedule.endDate || now <= rollout.schedule.endDate);
          
          return {
            enabled: inSchedule,
            value: inSchedule ? this.selectVariantValue(flag, context) : flag.targeting.defaultValue,
            reason: inSchedule ? 'scheduled_rollout_active' : 'scheduled_rollout_inactive'
          };
        }
        break;

      case RolloutType.GRADUAL:
        if (rollout.schedule?.phases) {
          const now = new Date();
          const activePhase = rollout.schedule.phases.find(phase => {
            const phaseEnd = new Date(phase.startDate.getTime() + phase.duration * 60000);
            return now >= phase.startDate && now <= phaseEnd;
          });

          if (activePhase) {
            const userPercentage = this.calculatePercentage(context);
            const enabled = userPercentage < activePhase.percentage;
            
            return {
              enabled,
              value: enabled ? this.selectVariantValue(flag, context) : flag.targeting.defaultValue,
              reason: `gradual_rollout_${activePhase.name}_${activePhase.percentage}%`
            };
          }
        }
        break;

      case RolloutType.CANARY:
        if (rollout.canaryConfig) {
          const userPercentage = this.calculatePercentage(context);
          const isCanary = userPercentage < rollout.canaryConfig.trafficSplit;
          
          return {
            enabled: true,
            value: isCanary ? 
              this.getVariantValue(flag, rollout.canaryConfig.canary) : 
              this.getVariantValue(flag, rollout.canaryConfig.baseline),
            reason: isCanary ? 'canary_variant' : 'baseline_variant'
          };
        }
        break;
    }

    return {
      enabled: false,
      value: flag.targeting.defaultValue,
      reason: 'rollout_not_applicable'
    };
  }

  private selectVariantValue(flag: FeatureFlag, context: EvaluationContext): any {
    if (flag.type !== FlagType.VARIANT || !flag.variants) {
      return flag.targeting.defaultValue;
    }

    // Weighted random selection for A/B testing
    const userPercentage = this.calculatePercentage(context);
    let cumulativeWeight = 0;

    for (const variant of flag.variants) {
      cumulativeWeight += variant.weight;
      if (userPercentage * 100 <= cumulativeWeight) {
        return variant.value;
      }
    }

    // Fallback to first variant
    return flag.variants[0]?.value || flag.targeting.defaultValue;
  }

  private getVariantValue(flag: FeatureFlag, variantKey: string): any {
    const variant = flag.variants?.find(v => v.key === variantKey);
    return variant?.value || flag.targeting.defaultValue;
  }

  private calculatePercentage(context: EvaluationContext): number {
    // Create a deterministic percentage based on user ID or other stable identifier
    const identifier = context.userId || context.nestId || context.ipAddress || 'anonymous';
    
    // Simple hash function for consistent percentage
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      const char = identifier.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash) % 100;
  }

  private compareVersions(version1: string, version2: string): number {
    const parts1 = version1.split('.').map(Number);
    const parts2 = version2.split('.').map(Number);
    
    const maxLength = Math.max(parts1.length, parts2.length);
    
    for (let i = 0; i < maxLength; i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    
    return 0;
  }

  private createEvaluation(
    key: string,
    value: any,
    context: EvaluationContext,
    reason: string,
    ruleId?: string
  ): FlagEvaluation {
    const evaluation: FlagEvaluation = {
      key,
      value,
      reason,
      ruleId,
      timestamp: new Date(),
      context
    };

    // Store evaluation for analytics
    this.evaluationHistory.push(evaluation);
    
    // Keep only recent evaluations (last 10000)
    if (this.evaluationHistory.length > 10000) {
      this.evaluationHistory.shift();
    }

    // Update analytics
    this.updateAnalytics(evaluation);

    return evaluation;
  }

  private updateAnalytics(evaluation: FlagEvaluation): void {
    let analytics = this.analytics.get(evaluation.key);
    
    if (!analytics) {
      analytics = {
        key: evaluation.key,
        evaluations: 0,
        uniqueUsers: 0,
        variants: {},
        period: {
          start: new Date(),
          end: new Date()
        }
      };
      this.analytics.set(evaluation.key, analytics);
    }

    analytics.evaluations++;
    analytics.period.end = evaluation.timestamp;
    
    // Track variant usage
    const variantKey = evaluation.variant || 'default';
    analytics.variants[variantKey] = (analytics.variants[variantKey] || 0) + 1;
  }

  // Utility methods
  isEnabled(key: string, context: EvaluationContext = {}): boolean {
    const evaluation = this.evaluate(key, context);
    return Boolean(evaluation?.value);
  }

  getString(key: string, defaultValue: string, context: EvaluationContext = {}): string {
    const evaluation = this.evaluate(key, context);
    return typeof evaluation?.value === 'string' ? evaluation.value : defaultValue;
  }

  getNumber(key: string, defaultValue: number, context: EvaluationContext = {}): number {
    const evaluation = this.evaluate(key, context);
    return typeof evaluation?.value === 'number' ? evaluation.value : defaultValue;
  }

  getJSON<T>(key: string, defaultValue: T, context: EvaluationContext = {}): T {
    const evaluation = this.evaluate(key, context);
    return evaluation?.value !== null && typeof evaluation?.value === 'object' 
      ? evaluation.value : defaultValue;
  }

  getVariant(key: string, context: EvaluationContext = {}): string | null {
    const evaluation = this.evaluate(key, context);
    return evaluation?.variant || null;
  }

  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  getFlag(key: string): FeatureFlag | null {
    return this.flags.get(key) || null;
  }

  getEvaluationHistory(key?: string, limit: number = 100): FlagEvaluation[] {
    let history = key 
      ? this.evaluationHistory.filter(eval => eval.key === key)
      : this.evaluationHistory;

    return history
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getAnalytics(key?: string): FlagAnalytics[] {
    const analyticsArray = Array.from(this.analytics.values());
    return key ? analyticsArray.filter(a => a.key === key) : analyticsArray;
  }

  getHealthStatus(): { healthy: boolean; details: any } {
    const totalFlags = this.flags.size;
    const enabledFlags = Array.from(this.flags.values()).filter(f => f.enabled).length;
    const recentEvaluations = this.evaluationHistory.filter(
      e => Date.now() - e.timestamp.getTime() < 3600000 // Last hour
    ).length;

    return {
      healthy: totalFlags > 0,
      details: {
        totalFlags,
        enabledFlags,
        disabledFlags: totalFlags - enabledFlags,
        recentEvaluations,
        evaluationHistorySize: this.evaluationHistory.length,
        analyticsKeys: this.analytics.size
      }
    };
  }
}

// Factory function
export function createFeatureFlagManager(
  serviceName: string,
  tracing?: GuardAntTracing
): FeatureFlagManager {
  return new FeatureFlagManager(serviceName, tracing);
}

export { FlagType, RolloutType, ConditionOperator, GuardAntFeatureFlags };