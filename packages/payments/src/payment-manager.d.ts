import type { GolemL2Config, Subscription, PaymentTransaction, SubscriptionPlan, UsageBilling, SubscriptionEvent, WalletType } from './types';
import { WalletConnector, WalletInfo } from './wallet-connector';
export interface PaymentStorage {
    createSubscription(subscription: Subscription): Promise<void>;
    getSubscription(id: string): Promise<Subscription | null>;
    getSubscriptionByNest(nestId: string): Promise<Subscription | null>;
    updateSubscription(subscription: Subscription): Promise<void>;
    createTransaction(transaction: PaymentTransaction): Promise<void>;
    getTransaction(id: string): Promise<PaymentTransaction | null>;
    updateTransaction(transaction: PaymentTransaction): Promise<void>;
    getTransactionsByNest(nestId: string): Promise<PaymentTransaction[]>;
    createUsageBilling(billing: UsageBilling): Promise<void>;
    getUsageBilling(id: string): Promise<UsageBilling | null>;
    getCurrentBilling(nestId: string): Promise<UsageBilling | null>;
    createEvent(event: SubscriptionEvent): Promise<void>;
    getEventsBySubscription(subscriptionId: string): Promise<SubscriptionEvent[]>;
}
export declare class PaymentManager {
    private config;
    private provider;
    private wallet;
    private storage;
    private walletConnector?;
    private connectedWallet?;
    constructor(config: GolemL2Config, storage: PaymentStorage, walletConnector?: WalletConnector);
    /**
     * Connect user wallet for payments
     */
    connectWallet(walletType: WalletType): Promise<WalletInfo>;
    /**
     * Get connected wallet info
     */
    getConnectedWallet(): WalletInfo | undefined;
    /**
     * Create new subscription for a nest
     */
    createSubscription(nestId: string, planId: string, paymentMethod: string, isYearly?: boolean, walletAddress?: string): Promise<{
        success: boolean;
        subscription?: Subscription;
        error?: string;
    }>;
    /**
     * Process payment for subscription
     */
    createPayment(nestId: string, subscriptionId: string, type: 'subscription' | 'upgrade' | 'overage', amount: string, description: string, fromWallet?: string): Promise<{
        success: boolean;
        transaction?: PaymentTransaction;
        error?: string;
    }>;
    /**
     * Process payment from connected wallet
     */
    private processWalletPayment;
    /**
     * Simulate payment processing (for demo)
     */
    private simulatePayment;
    /**
     * Activate subscription after successful payment
     */
    private activatePayment;
    /**
     * Upgrade subscription plan
     */
    upgradeSubscription(nestId: string, newPlanId: string, isYearly?: boolean, walletAddress?: string): Promise<{
        success: boolean;
        transaction?: PaymentTransaction;
        error?: string;
    }>;
    /**
     * Cancel subscription
     */
    cancelSubscription(nestId: string, immediately?: boolean): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Process usage billing for overage charges
     */
    processUsageBilling(nestId: string): Promise<{
        success: boolean;
        billing?: UsageBilling;
        error?: string;
    }>;
    /**
     * Get subscription status
     */
    getSubscriptionStatus(nestId: string): Promise<{
        subscription?: Subscription;
        plan?: SubscriptionPlan;
        usage?: any;
        billing?: UsageBilling[];
    } | null>;
    /**
     * Helper methods
     */
    private calculateProration;
    private createEvent;
}
//# sourceMappingURL=payment-manager.d.ts.map