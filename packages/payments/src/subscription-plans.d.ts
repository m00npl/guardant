import type { SubscriptionPlan } from './types';
export declare const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan>;
export declare const OVERAGE_PRICING: {
    requests: string;
    storage: string;
    bandwidth: string;
};
export declare function getPlan(planId: string): SubscriptionPlan | null;
export declare function getAllPlans(): SubscriptionPlan[];
export declare function canUpgradeTo(currentTier: string, targetTier: string): boolean;
export declare function canDowngradeTo(currentTier: string, targetTier: string): boolean;
export declare function calculateProration(currentPlan: SubscriptionPlan, newPlan: SubscriptionPlan, daysRemaining: number, isYearly?: boolean): string;
export declare function calculateOverageCosts(usage: {
    requests: number;
    storage: number;
    bandwidth: number;
}, plan: SubscriptionPlan): {
    requests: string;
    storage: string;
    bandwidth: string;
    total: string;
};
export declare function formatETH(weiAmount: string, decimals?: number): string;
export declare function validatePlanLimits(usage: {
    services: number;
    workers: number;
    regions: number;
}, plan: SubscriptionPlan): {
    valid: boolean;
    violations: string[];
};
//# sourceMappingURL=subscription-plans.d.ts.map