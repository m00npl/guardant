/**
 * Feature flags system for GuardAnt services
 * Provides dynamic feature toggling, A/B testing, gradual rollouts, and targeting
 */
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
export declare enum FlagType {
    BOOLEAN = "boolean",
    STRING = "string",
    NUMBER = "number",
    JSON = "json",
    VARIANT = "variant"
}
export interface FlagVariant {
    key: string;
    name: string;
    value: any;
    weight: number;
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
export declare enum ConditionOperator {
    EQUALS = "equals",
    NOT_EQUALS = "not_equals",
    IN = "in",
    NOT_IN = "not_in",
    CONTAINS = "contains",
    NOT_CONTAINS = "not_contains",
    STARTS_WITH = "starts_with",
    ENDS_WITH = "ends_with",
    GREATER_THAN = "greater_than",
    LESS_THAN = "less_than",
    GREATER_THAN_OR_EQUAL = "greater_than_or_equal",
    LESS_THAN_OR_EQUAL = "less_than_or_equal",
    REGEX = "regex",
    VERSION_GREATER_THAN = "version_greater_than",
    VERSION_LESS_THAN = "version_less_than",
    PERCENTAGE = "percentage"
}
export interface RolloutStrategy {
    type: RolloutType;
    percentage?: number;
    segments?: string[];
    schedule?: RolloutSchedule;
    canaryConfig?: CanaryConfig;
}
export declare enum RolloutType {
    ALL_USERS = "all_users",
    PERCENTAGE = "percentage",
    SEGMENTS = "segments",
    SCHEDULED = "scheduled",
    CANARY = "canary",
    GRADUAL = "gradual"
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
    duration: number;
}
export interface CanaryConfig {
    baseline: string;
    canary: string;
    trafficSplit: number;
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
    period: {
        start: Date;
        end: Date;
    };
}
export declare const GuardAntFeatureFlags: FeatureFlag[];
export declare class FeatureFlagManager {
    private serviceName;
    private logger;
    private tracing?;
    private flags;
    private evaluationHistory;
    private analytics;
    constructor(serviceName: string, tracing?: GuardAntTracing);
    private loadDefaultFlags;
    addFlag(flag: FeatureFlag): void;
    removeFlag(key: string): boolean;
    updateFlag(key: string, updates: Partial<FeatureFlag>): boolean;
    evaluate(key: string, context?: EvaluationContext): any;
    private evaluateTargetingRules;
    private evaluateConditions;
    private evaluateCondition;
    private getContextValue;
    private evaluateRollout;
    private selectVariantValue;
    private getVariantValue;
    private calculatePercentage;
    private compareVersions;
    private createEvaluation;
    private updateAnalytics;
    isEnabled(key: string, context?: EvaluationContext): boolean;
    getString(key: string, defaultValue: string, context?: EvaluationContext): string;
    getNumber(key: string, defaultValue: number, context?: EvaluationContext): number;
    getJSON<T>(key: string, defaultValue: T, context?: EvaluationContext): T;
    getVariant(key: string, context?: EvaluationContext): string | null;
    getAllFlags(): FeatureFlag[];
    getFlag(key: string): FeatureFlag | null;
    getEvaluationHistory(key?: string, limit?: number): FlagEvaluation[];
    getAnalytics(key?: string): FlagAnalytics[];
    getHealthStatus(): {
        healthy: boolean;
        details: any;
    };
}
export declare function createFeatureFlagManager(serviceName: string, tracing?: GuardAntTracing): FeatureFlagManager;
export { FlagType, RolloutType, ConditionOperator, GuardAntFeatureFlags };
//# sourceMappingURL=feature-flags.d.ts.map