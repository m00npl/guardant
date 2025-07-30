import Redis from 'ioredis';
import type { PaymentStorage } from './payment-manager';
import type { Subscription, PaymentTransaction, UsageBilling, SubscriptionEvent } from './types';
export declare class RedisPaymentStorage implements PaymentStorage {
    private redis;
    constructor(redis: Redis);
    private keys;
    createSubscription(subscription: Subscription): Promise<void>;
    getSubscription(id: string): Promise<Subscription | null>;
    getSubscriptionByNest(nestId: string): Promise<Subscription | null>;
    updateSubscription(subscription: Subscription): Promise<void>;
    createTransaction(transaction: PaymentTransaction): Promise<void>;
    getTransaction(id: string): Promise<PaymentTransaction | null>;
    updateTransaction(transaction: PaymentTransaction): Promise<void>;
    getTransactionsByNest(nestId: string, limit?: number): Promise<PaymentTransaction[]>;
    createUsageBilling(billing: UsageBilling): Promise<void>;
    getUsageBilling(id: string): Promise<UsageBilling | null>;
    getCurrentBilling(nestId: string): Promise<UsageBilling | null>;
    createEvent(event: SubscriptionEvent): Promise<void>;
    getEventsBySubscription(subscriptionId: string, limit?: number): Promise<SubscriptionEvent[]>;
    cleanupExpiredSubscriptions(): Promise<number>;
    getSubscriptionStats(): Promise<{
        total: number;
        active: number;
        expired: number;
        cancelled: number;
    }>;
}
//# sourceMappingURL=redis-payment-storage.d.ts.map