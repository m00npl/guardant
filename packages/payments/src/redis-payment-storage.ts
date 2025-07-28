import Redis from 'ioredis';
import type { PaymentStorage } from './payment-manager';
import type {
  Subscription,
  PaymentTransaction,
  UsageBilling,
  SubscriptionEvent,
} from './types';

export class RedisPaymentStorage implements PaymentStorage {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  // Redis key generators
  private keys = {
    subscription: (id: string) => `payment:subscription:${id}`,
    subscriptionByNest: (nestId: string) => `payment:subscription:nest:${nestId}`,
    transaction: (id: string) => `payment:transaction:${id}`,
    transactionsByNest: (nestId: string) => `payment:transactions:nest:${nestId}`,
    usageBilling: (id: string) => `payment:billing:${id}`,
    currentBilling: (nestId: string) => `payment:billing:current:${nestId}`,
    event: (id: string) => `payment:event:${id}`,
    eventsBySubscription: (subscriptionId: string) => `payment:events:subscription:${subscriptionId}`,
  };

  // Subscription methods
  async createSubscription(subscription: Subscription): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    pipeline.set(this.keys.subscription(subscription.id), JSON.stringify(subscription));
    pipeline.set(this.keys.subscriptionByNest(subscription.nestId), subscription.id);
    
    await pipeline.exec();
  }

  async getSubscription(id: string): Promise<Subscription | null> {
    const data = await this.redis.get(this.keys.subscription(id));
    return data ? JSON.parse(data) : null;
  }

  async getSubscriptionByNest(nestId: string): Promise<Subscription | null> {
    const subscriptionId = await this.redis.get(this.keys.subscriptionByNest(nestId));
    if (!subscriptionId) return null;
    
    return this.getSubscription(subscriptionId);
  }

  async updateSubscription(subscription: Subscription): Promise<void> {
    await this.redis.set(this.keys.subscription(subscription.id), JSON.stringify(subscription));
  }

  // Transaction methods
  async createTransaction(transaction: PaymentTransaction): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    pipeline.set(this.keys.transaction(transaction.id), JSON.stringify(transaction));
    pipeline.lpush(this.keys.transactionsByNest(transaction.nestId), transaction.id);
    
    // Set TTL for old transactions (1 year)
    pipeline.expire(this.keys.transaction(transaction.id), 365 * 24 * 60 * 60);
    
    await pipeline.exec();
  }

  async getTransaction(id: string): Promise<PaymentTransaction | null> {
    const data = await this.redis.get(this.keys.transaction(id));
    return data ? JSON.parse(data) : null;
  }

  async updateTransaction(transaction: PaymentTransaction): Promise<void> {
    await this.redis.set(this.keys.transaction(transaction.id), JSON.stringify(transaction));
  }

  async getTransactionsByNest(nestId: string, limit: number = 50): Promise<PaymentTransaction[]> {
    const transactionIds = await this.redis.lrange(this.keys.transactionsByNest(nestId), 0, limit - 1);
    if (transactionIds.length === 0) return [];

    const pipeline = this.redis.pipeline();
    transactionIds.forEach(id => pipeline.get(this.keys.transaction(id)));
    
    const results = await pipeline.exec();
    
    return results
      ?.map(([err, data]) => {
        if (err || !data) return null;
        try {
          return JSON.parse(data as string);
        } catch {
          return null;
        }
      })
      .filter(Boolean) || [];
  }

  // Usage billing methods
  async createUsageBilling(billing: UsageBilling): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    pipeline.set(this.keys.usageBilling(billing.id), JSON.stringify(billing));
    pipeline.set(this.keys.currentBilling(billing.nestId), billing.id);
    
    // Set TTL for billing records (2 years)
    pipeline.expire(this.keys.usageBilling(billing.id), 2 * 365 * 24 * 60 * 60);
    
    await pipeline.exec();
  }

  async getUsageBilling(id: string): Promise<UsageBilling | null> {
    const data = await this.redis.get(this.keys.usageBilling(id));
    return data ? JSON.parse(data) : null;
  }

  async getCurrentBilling(nestId: string): Promise<UsageBilling | null> {
    const billingId = await this.redis.get(this.keys.currentBilling(nestId));
    if (!billingId) return null;
    
    return this.getUsageBilling(billingId);
  }

  // Event methods
  async createEvent(event: SubscriptionEvent): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    pipeline.set(this.keys.event(event.id), JSON.stringify(event));
    pipeline.lpush(this.keys.eventsBySubscription(event.subscriptionId), event.id);
    
    // Keep only last 100 events per subscription
    pipeline.ltrim(this.keys.eventsBySubscription(event.subscriptionId), 0, 99);
    
    // Set TTL for events (1 year)
    pipeline.expire(this.keys.event(event.id), 365 * 24 * 60 * 60);
    
    await pipeline.exec();
  }

  async getEventsBySubscription(subscriptionId: string, limit: number = 20): Promise<SubscriptionEvent[]> {
    const eventIds = await this.redis.lrange(this.keys.eventsBySubscription(subscriptionId), 0, limit - 1);
    if (eventIds.length === 0) return [];

    const pipeline = this.redis.pipeline();
    eventIds.forEach(id => pipeline.get(this.keys.event(id)));
    
    const results = await pipeline.exec();
    
    return results
      ?.map(([err, data]) => {
        if (err || !data) return null;
        try {
          return JSON.parse(data as string);
        } catch {
          return null;
        }
      })
      .filter(Boolean) || [];
  }

  // Cleanup methods
  async cleanupExpiredSubscriptions(): Promise<number> {
    // This would be implemented to clean up expired subscriptions
    // For now, we rely on Redis TTL
    return 0;
  }

  async getSubscriptionStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    cancelled: number;
  }> {
    // This would scan through subscriptions to get stats
    // For demo purposes, return mock data
    return {
      total: 0,
      active: 0,
      expired: 0,
      cancelled: 0,
    };
  }
}