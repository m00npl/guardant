/**
 * GuardAnt Cost Tracking System
 * Comprehensive resource usage monitoring, cost calculation, and billing analytics
 * for multi-tenant monitoring platform with Golem network integration
 */

import { EventEmitter } from 'events';
import { createLogger } from './logger';
import { GuardAntTracing } from './tracing';
import { AlertError, ErrorCategory, ErrorSeverity } from './error-handling';
import { createGolemAdapter, DataType, GolemAdapter, GolemUtils } from './golem-adapter';

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

export enum ResourceType {
  MONITORING_CHECK = 'monitoring_check',
  API_REQUEST = 'api_request',
  DATA_STORAGE = 'data_storage',
  DATA_TRANSFER = 'data_transfer',
  ALERT_NOTIFICATION = 'alert_notification',
  WIDGET_RENDER = 'widget_render',
  COMPUTE_TIME = 'compute_time',
  BANDWIDTH_USAGE = 'bandwidth_usage',
  STATUS_PAGE_VIEW = 'status_page_view',
  BACKUP_STORAGE = 'backup_storage',
  ANALYTICS_PROCESSING = 'analytics_processing'
}

export enum UsageAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  READ = 'read',
  PROCESS = 'process',
  TRANSFER = 'transfer',
  STORE = 'store',
  EXECUTE = 'execute'
}

export enum ResourceUnit {
  COUNT = 'count',
  BYTES = 'bytes',
  MEGABYTES = 'megabytes',
  GIGABYTES = 'gigabytes',
  MILLISECONDS = 'milliseconds',
  SECONDS = 'seconds',
  MINUTES = 'minutes',
  HOURS = 'hours',
  REQUESTS = 'requests',
  VIEWS = 'views'
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

export enum PricingModel {
  FLAT_RATE = 'flat_rate',
  TIERED = 'tiered',
  VOLUME_DISCOUNT = 'volume_discount',
  TIME_BASED = 'time_based',
  GOLEM_CREDIT = 'golem_credit',
  SUBSCRIPTION = 'subscription'
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

export enum AlertType {
  BUDGET_EXCEEDED = 'budget_exceeded',
  UNUSUAL_SPIKE = 'unusual_spike',
  COST_THRESHOLD = 'cost_threshold',
  GOLEM_CREDITS_LOW = 'golem_credits_low',
  PROJECTION_WARNING = 'projection_warning'
}

export interface CostTrackingConfiguration {
  enabled: boolean;
  currency: string;
  
  // Data collection
  aggregationInterval: number; // minutes
  retentionDays: number;
  realTimeUpdates: boolean;
  
  // Cost calculation
  defaultPricingModel: PricingModel;
  includeGolemCredits: boolean;
  regionalizePricing: boolean;
  
  // Alerting
  enableBillingAlerts: boolean;
  budgetThresholds: Array<{
    percentage: number;
    alertLevel: 'warning' | 'critical';
  }>;
  
  // Optimization
  enableOptimizationSuggestions: boolean;
  analysisFrequency: number; // hours
  
  // Integration
  golemNetworkIntegration: boolean;
  paymentGatewayIntegration: boolean;
  
  // Reporting
  automaticReporting: boolean;
  reportingFrequency: 'daily' | 'weekly' | 'monthly';
  stakeholders: string[];
}

export class CostTrackingManager extends EventEmitter {
  private logger;
  private tracing?: GuardAntTracing;
  private usageEvents: ResourceUsageEvent[] = [];
  private calculationRules = new Map<string, CostCalculationRule>();
  private costCache = new Map<string, CostSummary>();
  private aggregationTimer?: NodeJS.Timer;
  private alertsTimer?: NodeJS.Timer;
  private golemAdapter: GolemAdapter;
  
  constructor(
    private serviceName: string,
    private config: CostTrackingConfiguration,
    golemAdapter?: GolemAdapter,
    tracing?: GuardAntTracing
  ) {
    super();
    this.logger = createLogger(`${serviceName}-cost-tracking`);
    this.tracing = tracing;
    
    // Initialize Golem adapter
    this.golemAdapter = golemAdapter || createGolemAdapter(
      serviceName,
      GolemUtils.createDefaultConfig(),
      undefined,
      tracing
    );
    
    if (config.enabled) {
      this.initializeDefaultPricingRules();
      this.startAggregationTimer();
      this.startAlertsTimer();
      this.setupEventListeners();
    }
  }

  // Track resource usage
  async trackResourceUsage(event: Omit<ResourceUsageEvent, 'id' | 'timestamp'>): Promise<void> {
    if (!this.config.enabled) return;
    
    const span = this.tracing?.startSpan('cost.track_usage');
    
    try {
      const usageEvent: ResourceUsageEvent = {
        ...event,
        id: this.generateUsageId(),
        timestamp: new Date().toISOString()
      };
      
      // Validate usage event
      this.validateUsageEvent(usageEvent);
      
      // Store usage event in Golem Base
      await this.golemAdapter.storeNestData(
        usageEvent.nestId,
        DataType.COST_DATA,
        usageEvent,
        {
          key: `usage:${usageEvent.id}`,
          resourceType: usageEvent.resourceType,
          timestamp: usageEvent.timestamp
        }
      );
      
      // Store in local cache
      this.usageEvents.push(usageEvent);
      
      // Real-time cost calculation if enabled
      if (this.config.realTimeUpdates) {
        const cost = await this.calculateEventCost(usageEvent);
        this.emit('usage-tracked', { event: usageEvent, cost });
      }
      
      this.logger.debug('Tracked resource usage', {
        nestId: usageEvent.nestId,
        resourceType: usageEvent.resourceType,
        quantity: usageEvent.quantity,
        unit: usageEvent.unit
      });
      
      span?.setTag('nest.id', usageEvent.nestId);
      span?.setTag('resource.type', usageEvent.resourceType);
      span?.setTag('resource.quantity', usageEvent.quantity);
      
    } catch (error) {
      this.logger.error('Failed to track resource usage', { error, event });
      span?.setTag('error', true);
      
      throw new AlertError(
        'Cost tracking failed',
        ErrorCategory.SYSTEM_ERROR,
        ErrorSeverity.MEDIUM,
        { originalError: error, event }
      );
    } finally {
      span?.finish();
    }
  }

  // Calculate cost summary for a period
  async calculateCostSummary(
    nestId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CostSummary> {
    const span = this.tracing?.startSpan('cost.calculate_summary');
    
    try {
      // Check cache first
      const cacheKey = `${nestId}_${startDate.toISOString()}_${endDate.toISOString()}`;
      const cached = this.costCache.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Filter usage events for the period and nest
      const periodEvents = this.usageEvents.filter(event =>
        event.nestId === nestId &&
        new Date(event.timestamp) >= startDate &&
        new Date(event.timestamp) <= endDate
      );
      
      if (periodEvents.length === 0) {
        return this.createEmptyCostSummary(nestId, startDate, endDate);
      }
      
      // Group events by resource type
      const resourceGroups = this.groupEventsByResource(periodEvents);
      
      // Calculate costs for each resource type
      const resourceBreakdown = await Promise.all(
        Array.from(resourceGroups.entries()).map(async ([resourceType, events]) => {
          const totalQuantity = events.reduce((sum, event) => sum + event.quantity, 0);
          const totalCost = await this.calculateResourceCost(resourceType, events);
          
          return {
            resourceType,
            quantity: totalQuantity,
            unit: events[0].unit,
            cost: totalCost,
            averageUnitCost: totalCost.amount / totalQuantity,
            percentageOfTotal: 0 // Will be calculated after total is known
          };
        })
      );
      
      // Calculate total cost
      const totalCost = resourceBreakdown.reduce((sum, resource) => ({
        amount: sum.amount + resource.cost.amount,
        currency: this.config.currency,
        golemCredits: sum.golemCredits + resource.cost.golemCredits
      }), { amount: 0, currency: this.config.currency, golemCredits: 0 });
      
      // Update percentages
      resourceBreakdown.forEach(resource => {
        resource.percentageOfTotal = (resource.cost.amount / totalCost.amount) * 100;
      });
      
      // Calculate daily trend
      const dailyTrend = this.calculateDailyTrend(periodEvents, startDate, endDate);
      
      // Generate optimization suggestions
      const costOptimizations = await this.generateOptimizationSuggestions(periodEvents, resourceBreakdown);
      
      // Calculate billing projections
      const billingProjections = this.calculateBillingProjections(periodEvents, totalCost.amount);
      
      // Calculate cost centers if available
      const costCenters = this.calculateCostCenters(periodEvents, totalCost.amount);
      
      const summary: CostSummary = {
        nestId,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          duration: endDate.getTime() - startDate.getTime()
        },
        totalCost,
        resourceBreakdown,
        dailyTrend,
        costOptimizations,
        billingProjections,
        costCenters
      };
      
      // Cache the result
      this.costCache.set(cacheKey, summary);
      
      this.logger.info('Calculated cost summary', {
        nestId,
        totalCost: totalCost.amount,
        currency: totalCost.currency,
        resourceTypes: resourceBreakdown.length
      });
      
      this.emit('cost-summary-calculated', summary);
      
      return summary;
      
    } catch (error) {
      this.logger.error('Failed to calculate cost summary', { error, nestId });
      span?.setTag('error', true);
      throw error;
    } finally {
      span?.finish();
    }
  }

  // Get real-time cost information
  async getRealTimeCosts(nestId: string): Promise<any> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const todayCosts = await this.calculateCostSummary(nestId, startOfDay, now);
    
    return {
      today: todayCosts.totalCost,
      hourly: todayCosts.totalCost.amount / (now.getHours() + 1),
      topResources: todayCosts.resourceBreakdown
        .sort((a, b) => b.cost.amount - a.cost.amount)
        .slice(0, 5),
      projectedDaily: this.projectDailyCost(todayCosts),
      alerts: await this.getActiveBillingAlerts(nestId)
    };
  }

  // Add pricing rule
  async addPricingRule(rule: Omit<CostCalculationRule, 'id'>): Promise<CostCalculationRule> {
    const pricingRule: CostCalculationRule = {
      ...rule,
      id: this.generateRuleId()
    };
    
    this.calculationRules.set(pricingRule.id, pricingRule);
    
    this.logger.info('Added pricing rule', {
      ruleId: pricingRule.id,
      resourceType: pricingRule.resourceType,
      pricingModel: pricingRule.pricingModel
    });
    
    this.emit('pricing-rule-added', pricingRule);
    
    return pricingRule;
  }

  // Private helper methods
  private validateUsageEvent(event: ResourceUsageEvent): void {
    if (!event.nestId) throw new Error('nestId is required');
    if (!event.resourceType) throw new Error('resourceType is required');
    if (event.quantity <= 0) throw new Error('quantity must be positive');
    if (!event.unit) throw new Error('unit is required');
  }

  private async calculateEventCost(event: ResourceUsageEvent): Promise<any> {
    const rule = this.findApplicableRule(event.resourceType, event.timestamp);
    if (!rule) {
      return { amount: 0, currency: this.config.currency, golemCredits: 0 };
    }
    
    return this.applyPricingRule(rule, event.quantity, event.regionId);
  }

  private async calculateResourceCost(resourceType: ResourceType, events: ResourceUsageEvent[]): Promise<any> {
    const totalQuantity = events.reduce((sum, event) => sum + event.quantity, 0);
    const rule = this.findApplicableRule(resourceType, events[0].timestamp);
    
    if (!rule) {
      return { amount: 0, currency: this.config.currency, golemCredits: 0 };
    }
    
    return this.applyPricingRule(rule, totalQuantity, events[0].regionId);
  }

  private findApplicableRule(resourceType: ResourceType, timestamp: string): CostCalculationRule | null {
    const applicableRules = Array.from(this.calculationRules.values())
      .filter(rule => 
        rule.resourceType === resourceType &&
        new Date(rule.effectiveDate) <= new Date(timestamp) &&
        (!rule.expirationDate || new Date(rule.expirationDate) > new Date(timestamp))
      )
      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
    
    return applicableRules[0] || null;
  }

  private applyPricingRule(rule: CostCalculationRule, quantity: number, regionId?: string): any {
    let cost = { amount: 0, currency: this.config.currency, golemCredits: 0 };
    
    switch (rule.pricingModel) {
      case PricingModel.FLAT_RATE:
        cost = this.calculateFlatRate(rule, quantity);
        break;
      case PricingModel.TIERED:
        cost = this.calculateTieredPricing(rule, quantity);
        break;
      case PricingModel.VOLUME_DISCOUNT:
        cost = this.calculateVolumeDiscount(rule, quantity);
        break;
      case PricingModel.GOLEM_CREDIT:
        cost = this.calculateGolemCredits(rule, quantity);
        break;
      default:
        cost = this.calculateFlatRate(rule, quantity);
    }
    
    // Apply regional multipliers
    if (regionId && rule.regionMultipliers?.[regionId]) {
      const multiplier = rule.regionMultipliers[regionId];
      cost.amount *= multiplier;
      cost.golemCredits *= multiplier;
    }
    
    return cost;
  }

  private calculateFlatRate(rule: CostCalculationRule, quantity: number): any {
    const tier = rule.tiers[0];
    return {
      amount: quantity * tier.pricePerUnit,
      currency: tier.currency,
      golemCredits: quantity * (tier.golemCredits || 0)
    };
  }

  private calculateTieredPricing(rule: CostCalculationRule, quantity: number): any {
    let totalCost = 0;
    let totalCredits = 0;
    let remainingQuantity = quantity;
    
    for (const tier of rule.tiers.sort((a, b) => a.minQuantity - b.minQuantity)) {
      if (remainingQuantity <= 0) break;
      
      const tierCapacity = (tier.maxQuantity || Infinity) - tier.minQuantity;
      const tierQuantity = Math.min(remainingQuantity, tierCapacity);
      
      if (quantity >= tier.minQuantity) {
        totalCost += tierQuantity * tier.pricePerUnit;
        totalCredits += tierQuantity * (tier.golemCredits || 0);
        remainingQuantity -= tierQuantity;
      }
    }
    
    return {
      amount: totalCost,
      currency: rule.tiers[0].currency,
      golemCredits: totalCredits
    };
  }

  private calculateVolumeDiscount(rule: CostCalculationRule, quantity: number): any {
    // Find the applicable tier based on quantity
    const applicableTier = rule.tiers
      .filter(tier => quantity >= tier.minQuantity)
      .sort((a, b) => b.minQuantity - a.minQuantity)[0];
    
    if (!applicableTier) {
      return { amount: 0, currency: this.config.currency, golemCredits: 0 };
    }
    
    return {
      amount: quantity * applicableTier.pricePerUnit,
      currency: applicableTier.currency,
      golemCredits: quantity * (applicableTier.golemCredits || 0)
    };
  }

  private calculateGolemCredits(rule: CostCalculationRule, quantity: number): any {
    const tier = rule.tiers[0];
    return {
      amount: 0,
      currency: this.config.currency,
      golemCredits: quantity * (tier.golemCredits || 1)
    };
  }

  private groupEventsByResource(events: ResourceUsageEvent[]): Map<ResourceType, ResourceUsageEvent[]> {
    const groups = new Map<ResourceType, ResourceUsageEvent[]>();
    
    events.forEach(event => {
      if (!groups.has(event.resourceType)) {
        groups.set(event.resourceType, []);
      }
      groups.get(event.resourceType)!.push(event);
    });
    
    return groups;
  }

  private calculateDailyTrend(events: ResourceUsageEvent[], startDate: Date, endDate: Date): any[] {
    const trend: any[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= dayStart && eventDate <= dayEnd;
      });
      
      const dayResources = this.groupEventsByResource(dayEvents);
      const topResources = Array.from(dayResources.entries())
        .map(([resourceType, resourceEvents]) => ({
          resourceType,
          cost: resourceEvents.reduce((sum, event) => sum + event.quantity, 0) // Simplified cost calculation
        }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 3);
      
      trend.push({
        date: currentDate.toISOString().split('T')[0],
        cost: dayEvents.reduce((sum, event) => sum + event.quantity, 0), // Simplified
        topResources
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return trend;
  }

  private async generateOptimizationSuggestions(events: ResourceUsageEvent[], breakdown: any[]): Promise<any[]> {
    const suggestions: any[] = [];
    
    // High-cost resource optimization
    const highCostResources = breakdown
      .filter(resource => resource.percentageOfTotal > 20)
      .sort((a, b) => b.cost.amount - a.cost.amount);
    
    highCostResources.forEach(resource => {
      suggestions.push({
        suggestion: `Optimize ${resource.resourceType} usage - represents ${resource.percentageOfTotal.toFixed(1)}% of total costs`,
        potentialSavings: resource.cost.amount * 0.15,
        impact: resource.percentageOfTotal > 40 ? 'high' : 'medium',
        category: 'efficiency'
      });
    });
    
    // Usage pattern suggestions
    const unusualPatterns = this.detectUnusualUsagePatterns(events);
    unusualPatterns.forEach(pattern => {
      suggestions.push({
        suggestion: pattern.suggestion,
        potentialSavings: pattern.potentialSavings,
        impact: pattern.impact,
        category: 'efficiency'
      });
    });
    
    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  private detectUnusualUsagePatterns(events: ResourceUsageEvent[]): any[] {
    // Simplified pattern detection
    const patterns: any[] = [];
    
    // Check for off-hours usage spikes
    const offHoursEvents = events.filter(event => {
      const hour = new Date(event.timestamp).getHours();
      return hour < 6 || hour > 22;
    });
    
    if (offHoursEvents.length > events.length * 0.3) {
      patterns.push({
        suggestion: 'Consider scheduling non-critical monitoring during off-peak hours',
        potentialSavings: events.length * 0.1,
        impact: 'medium'
      });
    }
    
    return patterns;
  }

  private calculateBillingProjections(events: ResourceUsageEvent[], currentCost: number): any {
    const periodDays = this.calculatePeriodDays(events);
    const dailyAverage = currentCost / periodDays;
    
    return {
      monthlyProjection: dailyAverage * 30,
      quarterlyProjection: dailyAverage * 90,
      confidenceLevel: Math.min(95, 60 + (periodDays * 2)) // Confidence increases with data points
    };
  }

  private calculateCostCenters(events: ResourceUsageEvent[], totalCost: number): any[] | undefined {
    const costCenterEvents = events.filter(event => event.costCenterLabel);
    
    if (costCenterEvents.length === 0) return undefined;
    
    const centerMap = new Map<string, number>();
    
    costCenterEvents.forEach(event => {
      const label = event.costCenterLabel!;
      centerMap.set(label, (centerMap.get(label) || 0) + event.quantity);
    });
    
    return Array.from(centerMap.entries()).map(([label, cost]) => ({
      label,
      cost,
      percentageOfTotal: (cost / totalCost) * 100
    }));
  }

  private calculatePeriodDays(events: ResourceUsageEvent[]): number {
    if (events.length === 0) return 1;
    
    const timestamps = events.map(event => new Date(event.timestamp).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    
    return Math.max(1, Math.ceil((maxTime - minTime) / (24 * 60 * 60 * 1000)));
  }

  private projectDailyCost(todayCosts: CostSummary): number {
    const hoursElapsed = new Date().getHours() + 1;
    return (todayCosts.totalCost.amount / hoursElapsed) * 24;
  }

  private async getActiveBillingAlerts(nestId: string): Promise<BillingAlert[]> {
    // Implementation would fetch active alerts from storage
    return [];
  }

  private createEmptyCostSummary(nestId: string, startDate: Date, endDate: Date): CostSummary {
    return {
      nestId,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        duration: endDate.getTime() - startDate.getTime()
      },
      totalCost: { amount: 0, currency: this.config.currency, golemCredits: 0 },
      resourceBreakdown: [],
      dailyTrend: [],
      costOptimizations: [],
      billingProjections: { monthlyProjection: 0, quarterlyProjection: 0, confidenceLevel: 0 }
    };
  }

  private initializeDefaultPricingRules(): void {
    const defaultRules: Array<Omit<CostCalculationRule, 'id'>> = [
      {
        resourceType: ResourceType.MONITORING_CHECK,
        pricingModel: PricingModel.TIERED,
        tiers: [
          { minQuantity: 0, maxQuantity: 1000, pricePerUnit: 0.001, currency: 'USD', golemCredits: 0.1 },
          { minQuantity: 1000, maxQuantity: 10000, pricePerUnit: 0.0008, currency: 'USD', golemCredits: 0.08 },
          { minQuantity: 10000, pricePerUnit: 0.0005, currency: 'USD', golemCredits: 0.05 }
        ],
        effectiveDate: new Date().toISOString(),
        metadata: { description: 'Default monitoring check pricing' }
      },
      {
        resourceType: ResourceType.API_REQUEST,
        pricingModel: PricingModel.VOLUME_DISCOUNT,
        tiers: [
          { minQuantity: 0, pricePerUnit: 0.0001, currency: 'USD', golemCredits: 0.01 },
          { minQuantity: 100000, pricePerUnit: 0.00008, currency: 'USD', golemCredits: 0.008 },
          { minQuantity: 1000000, pricePerUnit: 0.00005, currency: 'USD', golemCredits: 0.005 }
        ],
        effectiveDate: new Date().toISOString(),
        metadata: { description: 'Default API request pricing' }
      }
    ];
    
    defaultRules.forEach(rule => {
      this.addPricingRule(rule).catch(error => {
        this.logger.error('Failed to add default pricing rule', { error, rule });
      });
    });
  }

  private generateUsageId(): string {
    return `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startAggregationTimer(): void {
    this.aggregationTimer = setInterval(() => {
      this.performAggregation().catch(error => {
        this.logger.error('Aggregation failed', { error });
      });
    }, this.config.aggregationInterval * 60000);
  }

  private startAlertsTimer(): void {
    if (!this.config.enableBillingAlerts) return;
    
    this.alertsTimer = setInterval(() => {
      this.checkBillingAlerts().catch(error => {
        this.logger.error('Billing alerts check failed', { error });
      });
    }, 60000); // Check every minute
  }

  private async performAggregation(): Promise<void> {
    this.logger.debug('Performing cost aggregation');
    // Implementation would aggregate and clean up old usage events
  }

  private async checkBillingAlerts(): Promise<void> {
    this.logger.debug('Checking billing alerts');
    // Implementation would check for budget thresholds and unusual spending patterns
  }

  private setupEventListeners(): void {
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  // Shutdown cleanup
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down cost tracking manager');
    
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }
    
    if (this.alertsTimer) {
      clearInterval(this.alertsTimer);
    }
    
    // Perform final aggregation
    await this.performAggregation();
    
    this.emit('shutdown');
  }

  // Health check
  getHealthStatus(): { healthy: boolean; details: any } {
    return {
      healthy: true,
      details: {
        usageEventsQueued: this.usageEvents.length,
        pricingRules: this.calculationRules.size,
        cachedSummaries: this.costCache.size,
        configEnabled: this.config.enabled
      }
    };
  }
}

// Factory function
export function createCostTrackingManager(
  serviceName: string,
  config: CostTrackingConfiguration,
  golemAdapter?: GolemAdapter,
  tracing?: GuardAntTracing
): CostTrackingManager {
  return new CostTrackingManager(serviceName, config, golemAdapter, tracing);
}

// Utility functions for cost calculations
export class CostUtils {
  static formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  static calculateCostPercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  static aggregateResourceUsage(events: ResourceUsageEvent[]): Record<ResourceType, number> {
    return events.reduce((acc, event) => {
      acc[event.resourceType] = (acc[event.resourceType] || 0) + event.quantity;
      return acc;
    }, {} as Record<ResourceType, number>);
  }

  static convertGolemCreditsToUSD(credits: number, exchangeRate: number): number {
    return credits * exchangeRate;
  }

  static calculateEfficiencyScore(actualCost: number, optimizedCost: number): number {
    if (actualCost === 0) return 100;
    return Math.max(0, ((actualCost - optimizedCost) / actualCost) * 100);
  }
}