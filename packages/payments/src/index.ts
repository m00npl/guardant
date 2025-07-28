// Main exports
export { PaymentManager } from './payment-manager';
export { RedisPaymentStorage } from './redis-payment-storage';
export { 
  WalletConnector,
  WalletConnectConnector,
  createWalletConnector,
  createWalletConnectConnector
} from './wallet-connector';
export { 
  SUBSCRIPTION_PLANS, 
  OVERAGE_PRICING,
  getPlan,
  getAllPlans,
  canUpgradeTo,
  canDowngradeTo,
  calculateProration,
  calculateOverageCosts,
  formatETH,
  validatePlanLimits
} from './subscription-plans';

// Type exports
export type {
  WalletType,
  SubscriptionTier,
  SubscriptionPlan,
  Subscription,
  PaymentTransaction,
  UsageBilling,
  GolemL2Config,
  HoleskyConfig, // Legacy alias
  PaymentMethod,
  Invoice,
  SubscriptionEvent,
} from './types';

export type { PaymentStorage } from './payment-manager';
export type { WalletInfo, WalletConnectorConfig } from './wallet-connector';