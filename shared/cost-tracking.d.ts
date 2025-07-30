/**
 * GuardAnt Cost Tracking System
 * Comprehensive resource usage monitoring, cost calculation, and billing analytics
 * for multi-tenant monitoring platform with Golem network integration
 */
import { EventEmitter } from 'events';
import { GuardAntTracing } from './tracing';
import { GolemAdapter } from './golem-adapter';
export interface ResourceUsageEvent {
    id: string;
    timestamp: string;
    nestId: string;
    resourceType: ResourceType;
    action: UsageAction;
    quantity: number;
    unit: ResourceUnit;
    metadata: Record<string, any>;
    costCenterLabel?: string;
    regionId?: string;
    serviceId?: string;
}
export declare enum ResourceType {
    MONITORING_CHECK = "monitoring_check",
    API_REQUEST = "api_request",
    DATA_STORAGE = "data_storage",
    DATA_TRANSFER = "data_transfer",
    ALERT_NOTIFICATION = "alert_notification",
    WIDGET_RENDER = "widget_render",
    COMPUTE_TIME = "compute_time",
    BANDWIDTH_USAGE = "bandwidth_usage",
    STATUS_PAGE_VIEW = "status_page_view",
    BACKUP_STORAGE = "backup_storage",
    ANALYTICS_PROCESSING = "analytics_processing"
}
export declare enum UsageAction {
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete",
    READ = "read",
    PROCESS = "process",
    TRANSFER = "transfer",
    STORE = "store",
    EXECUTE = "execute"
}
export declare enum ResourceUnit {
    COUNT = "count",
    BYTES = "bytes",
    MEGABYTES = "megabytes",
    GIGABYTES = "gigabytes",
    MILLISECONDS = "milliseconds",
    SECONDS = "seconds",
    MINUTES = "minutes",
    HOURS = "hours",
    REQUESTS = "requests",
    VIEWS = "views"
}
export interface CostCalculationRule {
    id: string;
    resourceType: ResourceType;
    pricingModel: PricingModel;
    tiers: PricingTier[];
    effectiveDate: string;
    expirationDate?: string;
    regionMultipliers?: Record<string, number>;
    metadata: Record<string, any>;
}
export declare enum PricingModel {
    FLAT_RATE = "flat_rate",
    TIERED = "tiered",
    VOLUME_DISCOUNT = "volume_discount",
    TIME_BASED = "time_based",
    GOLEM_CREDIT = "golem_credit",
    SUBSCRIPTION = "subscription"
}
export interface PricingTier {
    minQuantity: number;
    maxQuantity?: number;
    pricePerUnit: number;
    currency: string;
    golemCredits?: number;
}
export interface CostSummary {
    nestId: string;
    period: {
        start: string;
        end: string;
        duration: number;
    };
    totalCost: {
        amount: number;
        currency: string;
        golemCredits: number;
    };
    resourceBreakdown: Array<{
        resourceType: ResourceType;
        quantity: number;
        unit: ResourceUnit;
        cost: {
            amount: number;
            currency: string;
            golemCredits: number;
        };
        averageUnitCost: number;
        percentageOfTotal: number;
    }>;
    dailyTrend: Array<{
        date: string;
        cost: number;
        topResources: Array<{
            resourceType: ResourceType;
            cost: number;
        }>;
    }>;
    costOptimizations: Array<{
        suggestion: string;
        potentialSavings: number;
        impact: 'high' | 'medium' | 'low';
        category: 'efficiency' | 'scaling' | 'pricing';
    }>;
    billingProjections: {
        monthlyProjection: number;
        quarterlyProjection: number;
        confidenceLevel: number;
    };
    costCenters?: Array<{
        label: string;
        cost: number;
        percentageOfTotal: number;
    }>;
}
export interface BillingAlert {
    id: string;
    nestId: string;
    type: AlertType;
    threshold: number;
    currentValue: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    triggeredAt: string;
    acknowledged: boolean;
}
export declare enum AlertType {
    BUDGET_EXCEEDED = "budget_exceeded",
    UNUSUAL_SPIKE = "unusual_spike",
    COST_THRESHOLD = "cost_threshold",
    GOLEM_CREDITS_LOW = "golem_credits_low",
    PROJECTION_WARNING = "projection_warning"
}
export interface CostTrackingConfiguration {
    enabled: boolean;
    currency: string;
    aggregationInterval: number;
    retentionDays: number;
    realTimeUpdates: boolean;
    defaultPricingModel: PricingModel;
    includeGolemCredits: boolean;
    regionalizePricing: boolean;
    enableBillingAlerts: boolean;
    budgetThresholds: Array<{
        percentage: number;
        alertLevel: 'warning' | 'critical';
    }>;
    enableOptimizationSuggestions: boolean;
    analysisFrequency: number;
    golemNetworkIntegration: boolean;
    paymentGatewayIntegration: boolean;
    automaticReporting: boolean;
    reportingFrequency: 'daily' | 'weekly' | 'monthly';
    stakeholders: string[];
}
export declare class CostTrackingManager extends EventEmitter {
    private serviceName;
    private config;
    private logger;
    private tracing?;
    private usageEvents;
    private calculationRules;
    private costCache;
    private aggregationTimer?;
    private alertsTimer?;
    private golemAdapter;
    constructor(serviceName: string, config: CostTrackingConfiguration, golemAdapter?: GolemAdapter, tracing?: GuardAntTracing);
    trackResourceUsage(event: Omit<ResourceUsageEvent, 'id' | 'timestamp'>): Promise<void>;
    calculateCostSummary(nestId: string, startDate: Date, endDate: Date): Promise<CostSummary>;
    getRealTimeCosts(nestId: string): Promise<any>;
    addPricingRule(rule: Omit<CostCalculationRule, 'id'>): Promise<CostCalculationRule>;
    private validateUsageEvent;
    private calculateEventCost;
    private calculateResourceCost;
    private findApplicableRule;
    private applyPricingRule;
    private calculateFlatRate;
    private calculateTieredPricing;
    private calculateVolumeDiscount;
    private calculateGolemCredits;
    private groupEventsByResource;
    private calculateDailyTrend;
    private generateOptimizationSuggestions;
    private detectUnusualUsagePatterns;
    private calculateBillingProjections;
    private calculateCostCenters;
    private calculatePeriodDays;
    private projectDailyCost;
    private getActiveBillingAlerts;
    private createEmptyCostSummary;
    private initializeDefaultPricingRules;
    private generateUsageId;
    private generateRuleId;
    private startAggregationTimer;
    private startAlertsTimer;
    private performAggregation;
    private checkBillingAlerts;
    private setupEventListeners;
    shutdown(): Promise<void>;
    getHealthStatus(): {
        healthy: boolean;
        details: any;
    };
}
export declare function createCostTrackingManager(serviceName: string, config: CostTrackingConfiguration, golemAdapter?: GolemAdapter, tracing?: GuardAntTracing): CostTrackingManager;
export declare class CostUtils {
    static formatCurrency(amount: number, currency: string): string;
    static calculateCostPercentageChange(current: number, previous: number): number;
    static aggregateResourceUsage(events: ResourceUsageEvent[]): Record<ResourceType, number>;
    static convertGolemCreditsToUSD(credits: number, exchangeRate: number): number;
    static calculateEfficiencyScore(actualCost: number, optimizedCost: number): number;
}
//# sourceMappingURL=cost-tracking.d.ts.map