// Wallet types
export type WalletType = 'metamask' | 'walletconnect' | 'coinbase' | 'trust' | 'brave' | 'rainbow' | 'safe' | 'ledger';

// Subscription plans
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  price: {
    monthly: string; // ETH amount in wei
    yearly: string; // ETH amount in wei
  };
  features: {
    maxServices: number;
    maxWorkers: number;
    maxRegions: number;
    checkInterval: number; // seconds
    historyRetention: number; // days
    customDomains: boolean;
    apiAccess: boolean;
    webhooks: boolean;
    sla: boolean;
    support: 'community' | 'email' | 'priority';
  };
  limits: {
    requestsPerMonth: number;
    storageGB: number;
    bandwidthGB: number;
  };
}

// Subscription status
export interface Subscription {
  id: string;
  nestId: string;
  planId: string;
  tier: SubscriptionTier;
  status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'pending';
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  trialEnd?: number;
  createdAt: number;
  updatedAt: number;
  
  // Payment info
  paymentMethod: 'eth' | 'usdc' | 'usdt';
  paymentWallet?: {
    address: string;
    type: WalletType;
    chainId: number;
    ensName?: string;
  };
  lastPayment?: {
    amount: string;
    transactionHash: string;
    timestamp: number;
    status: 'pending' | 'confirmed' | 'failed';
    walletType?: WalletType;
  };
  
  // Usage tracking
  usage: {
    services: number;
    workers: number;
    requests: number;
    storage: number; // bytes
    bandwidth: number; // bytes
    lastUpdated: number;
  };
}

// Payment transaction
export interface PaymentTransaction {
  id: string;
  nestId: string;
  subscriptionId: string;
  type: 'subscription' | 'upgrade' | 'overage';
  amount: string; // Amount in wei or token units
  currency: 'ETH' | 'USDC' | 'USDT';
  status: 'pending' | 'processing' | 'confirmed' | 'failed' | 'refunded';
  
  // Blockchain data
  from?: string; // Sender wallet address
  to?: string; // Receiver address (contract or wallet)
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  gasPrice?: string;
  
  // Wallet info
  walletType?: WalletType;
  walletMeta?: {
    ensName?: string;
    connectorId?: string;
    chainId?: number;
  };
  
  // Metadata
  description: string;
  metadata?: Record<string, any>;
  createdAt: number;
  confirmedAt?: number;
  failedAt?: number;
  
  // Error handling
  failureReason?: string;
  retryCount: number;
  nextRetryAt?: number;
}

// Usage billing
export interface UsageBilling {
  id: string;
  nestId: string;
  subscriptionId: string;
  period: {
    start: number;
    end: number;
  };
  
  // Usage metrics
  usage: {
    requests: number;
    storage: number; // bytes
    bandwidth: number; // bytes
    overageRequests: number;
    overageStorage: number;
    overageBandwidth: number;
  };
  
  // Costs
  costs: {
    baseSubscription: string; // ETH in wei
    overageRequests: string;
    overageStorage: string;
    overageBandwidth: string;
    total: string;
  };
  
  status: 'draft' | 'finalized' | 'paid';
  createdAt: number;
  finalizedAt?: number;
  paidAt?: number;
}

// Golem Base L2 "Erech" configuration
export interface GolemL2Config {
  rpcUrl: string;
  chainId: number; // 393530 for Golem Base L2 "Erech"
  contracts: {
    subscriptionManager: string;
    paymentProcessor: string;
    usdcToken?: string; // USDC token address
    usdtToken?: string; // USDT token address
  };
  wallet: {
    privateKey: string;
    address: string;
  };
  acceptedTokens: {
    ETH: boolean;
    USDC: boolean;
    USDT: boolean;
  };
}

// Legacy alias for compatibility
export type HoleskyConfig = GolemL2Config;

// Payment method
export interface PaymentMethod {
  id: string;
  nestId: string;
  type: 'wallet' | 'contract';
  address: string;
  name: string;
  isDefault: boolean;
  metadata?: {
    walletType?: WalletType;
    contractType?: 'multisig' | 'safe';
    chainId?: number;
    ensName?: string;
    isConnected?: boolean;
  };
  createdAt: number;
  lastUsedAt?: number;
  verifiedAt?: number;
}

// Invoice
export interface Invoice {
  id: string;
  nestId: string;
  subscriptionId: string;
  number: string; // human-readable invoice number
  
  // Invoice details
  description: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: string; // ETH in wei
    total: string;
  }[];
  
  // Amounts
  subtotal: string; // ETH in wei
  tax?: string;
  total: string;
  
  // Status
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: number;
  paidAt?: number;
  
  // Payment
  paymentTransactionId?: string;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  sentAt?: number;
}

// Subscription events
export interface SubscriptionEvent {
  id: string;
  nestId: string;
  subscriptionId: string;
  type: 'created' | 'activated' | 'deactivated' | 'upgraded' | 'downgraded' | 'cancelled' | 'renewed' | 'payment_failed' | 'payment_succeeded';
  data: Record<string, any>;
  createdAt: number;
}