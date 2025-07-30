export type WalletType = 'metamask' | 'walletconnect' | 'coinbase' | 'trust' | 'brave' | 'rainbow' | 'safe' | 'ledger';
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export interface SubscriptionPlan {
    id: string;
    tier: SubscriptionTier;
    name: string;
    description: string;
    price: {
        monthly: string;
        yearly: string;
    };
    features: {
        maxServices: number;
        maxWorkers: number;
        maxRegions: number;
        checkInterval: number;
        historyRetention: number;
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
    usage: {
        services: number;
        workers: number;
        requests: number;
        storage: number;
        bandwidth: number;
        lastUpdated: number;
    };
}
export interface PaymentTransaction {
    id: string;
    nestId: string;
    subscriptionId: string;
    type: 'subscription' | 'upgrade' | 'overage';
    amount: string;
    currency: 'ETH' | 'USDC' | 'USDT';
    status: 'pending' | 'processing' | 'confirmed' | 'failed' | 'refunded';
    from?: string;
    to?: string;
    transactionHash?: string;
    blockNumber?: number;
    gasUsed?: string;
    gasPrice?: string;
    walletType?: WalletType;
    walletMeta?: {
        ensName?: string;
        connectorId?: string;
        chainId?: number;
    };
    description: string;
    metadata?: Record<string, any>;
    createdAt: number;
    confirmedAt?: number;
    failedAt?: number;
    failureReason?: string;
    retryCount: number;
    nextRetryAt?: number;
}
export interface UsageBilling {
    id: string;
    nestId: string;
    subscriptionId: string;
    period: {
        start: number;
        end: number;
    };
    usage: {
        requests: number;
        storage: number;
        bandwidth: number;
        overageRequests: number;
        overageStorage: number;
        overageBandwidth: number;
    };
    costs: {
        baseSubscription: string;
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
export interface GolemL2Config {
    rpcUrl: string;
    chainId: number;
    contracts: {
        subscriptionManager: string;
        paymentProcessor: string;
        usdcToken?: string;
        usdtToken?: string;
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
export type HoleskyConfig = GolemL2Config;
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
export interface Invoice {
    id: string;
    nestId: string;
    subscriptionId: string;
    number: string;
    description: string;
    items: {
        description: string;
        quantity: number;
        unitPrice: string;
        total: string;
    }[];
    subtotal: string;
    tax?: string;
    total: string;
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    dueDate: number;
    paidAt?: number;
    paymentTransactionId?: string;
    createdAt: number;
    updatedAt: number;
    sentAt?: number;
}
export interface SubscriptionEvent {
    id: string;
    nestId: string;
    subscriptionId: string;
    type: 'created' | 'activated' | 'deactivated' | 'upgraded' | 'downgraded' | 'cancelled' | 'renewed' | 'payment_failed' | 'payment_succeeded';
    data: Record<string, any>;
    createdAt: number;
}
//# sourceMappingURL=types.d.ts.map