import type { SubscriptionPlan } from './types';
import { ethers } from 'ethers';

// Convert ETH to wei (18 decimals)
const toWei = (eth: number): string => {
  return ethers.parseEther(eth.toString()).toString();
};

// Predefined subscription plans
export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    tier: 'free',
    name: 'Free Nest',
    description: 'Perfect for personal projects and testing',
    price: {
      monthly: '0',
      yearly: '0',
    },
    features: {
      maxServices: 3,
      maxWorkers: 1,
      maxRegions: 2,
      checkInterval: 300, // 5 minutes
      historyRetention: 30, // 30 days
      customDomains: false,
      apiAccess: false,
      webhooks: false,
      sla: false,
      support: 'community',
    },
    limits: {
      requestsPerMonth: 10000,
      storageGB: 1,
      bandwidthGB: 10,
    },
  },

  pro: {
    id: 'pro',
    tier: 'pro',
    name: 'Pro Nest',
    description: 'For growing teams and businesses',
    price: {
      monthly: toWei(0.05), // 0.05 ETH per month
      yearly: toWei(0.5),   // 0.5 ETH per year (2 months free)
    },
    features: {
      maxServices: 25,
      maxWorkers: 5,
      maxRegions: 10,
      checkInterval: 60, // 1 minute
      historyRetention: 365, // 1 year
      customDomains: true,
      apiAccess: true,
      webhooks: true,
      sla: false,
      support: 'email',
    },
    limits: {
      requestsPerMonth: 100000,
      storageGB: 10,
      bandwidthGB: 100,
    },
  },

  enterprise: {
    id: 'enterprise',
    tier: 'enterprise',
    name: 'Enterprise Colony',
    description: 'For large organizations with advanced needs',
    price: {
      monthly: toWei(0.2), // 0.2 ETH per month
      yearly: toWei(2.0),  // 2.0 ETH per year (2 months free)
    },
    features: {
      maxServices: 500,
      maxWorkers: 50,
      maxRegions: 50,
      checkInterval: 30, // 30 seconds
      historyRetention: 1095, // 3 years
      customDomains: true,
      apiAccess: true,
      webhooks: true,
      sla: true,
      support: 'priority',
    },
    limits: {
      requestsPerMonth: 1000000,
      storageGB: 100,
      bandwidthGB: 1000,
    },
  },
};

// Overage pricing (per unit above plan limits)
export const OVERAGE_PRICING = {
  requests: toWei(0.00001), // 0.00001 ETH per 1000 extra requests
  storage: toWei(0.001),    // 0.001 ETH per extra GB per month
  bandwidth: toWei(0.0005), // 0.0005 ETH per extra GB
};

// Get plan by ID
export function getPlan(planId: string): SubscriptionPlan | null {
  return SUBSCRIPTION_PLANS[planId] || null;
}

// Get all plans
export function getAllPlans(): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS);
}

// Check if upgrade is valid
export function canUpgradeTo(currentTier: string, targetTier: string): boolean {
  const tierOrder = ['free', 'pro', 'enterprise'];
  const currentIndex = tierOrder.indexOf(currentTier);
  const targetIndex = tierOrder.indexOf(targetTier);
  
  return targetIndex > currentIndex;
}

// Check if downgrade is valid
export function canDowngradeTo(currentTier: string, targetTier: string): boolean {
  const tierOrder = ['free', 'pro', 'enterprise'];
  const currentIndex = tierOrder.indexOf(currentTier);
  const targetIndex = tierOrder.indexOf(targetTier);
  
  return targetIndex < currentIndex;
}

// Calculate prorated amount for plan changes
export function calculateProration(
  currentPlan: SubscriptionPlan,
  newPlan: SubscriptionPlan,
  daysRemaining: number,
  isYearly: boolean = false
): string {
  const currentPrice = BigInt(isYearly ? currentPlan.price.yearly : currentPlan.price.monthly);
  const newPrice = BigInt(isYearly ? newPlan.price.yearly : newPlan.price.monthly);
  
  const totalDays = isYearly ? 365 : 30;
  const dailyCurrentPrice = currentPrice / BigInt(totalDays);
  const dailyNewPrice = newPrice / BigInt(totalDays);
  
  const refund = dailyCurrentPrice * BigInt(daysRemaining);
  const charge = dailyNewPrice * BigInt(daysRemaining);
  
  const netAmount = charge - refund;
  
  return netAmount.toString();
}

// Calculate overage costs
export function calculateOverageCosts(usage: {
  requests: number;
  storage: number; // bytes
  bandwidth: number; // bytes
}, plan: SubscriptionPlan): {
  requests: string;
  storage: string;
  bandwidth: string;
  total: string;
} {
  // Convert bytes to GB
  const storageGB = usage.storage / (1024 * 1024 * 1024);
  const bandwidthGB = usage.bandwidth / (1024 * 1024 * 1024);
  
  // Calculate overages
  const excessRequests = Math.max(0, usage.requests - plan.limits.requestsPerMonth);
  const excessStorage = Math.max(0, storageGB - plan.limits.storageGB);
  const excessBandwidth = Math.max(0, bandwidthGB - plan.limits.bandwidthGB);
  
  // Calculate costs
  const requestsCost = BigInt(Math.ceil(excessRequests / 1000)) * BigInt(OVERAGE_PRICING.requests);
  const storageCost = BigInt(Math.ceil(excessStorage)) * BigInt(OVERAGE_PRICING.storage);
  const bandwidthCost = BigInt(Math.ceil(excessBandwidth)) * BigInt(OVERAGE_PRICING.bandwidth);
  
  const total = requestsCost + storageCost + bandwidthCost;
  
  return {
    requests: requestsCost.toString(),
    storage: storageCost.toString(),
    bandwidth: bandwidthCost.toString(),
    total: total.toString(),
  };
}

// Format ETH amount for display
export function formatETH(weiAmount: string, decimals: number = 4): string {
  const eth = ethers.formatEther(weiAmount);
  return parseFloat(eth).toFixed(decimals);
}

// Validate plan limits against current usage
export function validatePlanLimits(usage: {
  services: number;
  workers: number;
  regions: number;
}, plan: SubscriptionPlan): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  
  if (usage.services > plan.features.maxServices) {
    violations.push(`Services: ${usage.services}/${plan.features.maxServices}`);
  }
  
  if (usage.workers > plan.features.maxWorkers) {
    violations.push(`Workers: ${usage.workers}/${plan.features.maxWorkers}`);
  }
  
  if (usage.regions > plan.features.maxRegions) {
    violations.push(`Regions: ${usage.regions}/${plan.features.maxRegions}`);
  }
  
  return {
    valid: violations.length === 0,
    violations,
  };
}