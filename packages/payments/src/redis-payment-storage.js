"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisPaymentStorage = void 0;
class RedisPaymentStorage {
    constructor(redis) {
        // Redis key generators
        this.keys = {
            subscription: (id) => `payment:subscription:${id}`,
            subscriptionByNest: (nestId) => `payment:subscription:nest:${nestId}`,
            transaction: (id) => `payment:transaction:${id}`,
            transactionsByNest: (nestId) => `payment:transactions:nest:${nestId}`,
            usageBilling: (id) => `payment:billing:${id}`,
            currentBilling: (nestId) => `payment:billing:current:${nestId}`,
            event: (id) => `payment:event:${id}`,
            eventsBySubscription: (subscriptionId) => `payment:events:subscription:${subscriptionId}`,
        };
        this.redis = redis;
    }
    // Subscription methods
    async createSubscription(subscription) {
        const pipeline = this.redis.pipeline();
        pipeline.set(this.keys.subscription(subscription.id), JSON.stringify(subscription));
        pipeline.set(this.keys.subscriptionByNest(subscription.nestId), subscription.id);
        await pipeline.exec();
    }
    async getSubscription(id) {
        const data = await this.redis.get(this.keys.subscription(id));
        return data ? JSON.parse(data) : null;
    }
    async getSubscriptionByNest(nestId) {
        const subscriptionId = await this.redis.get(this.keys.subscriptionByNest(nestId));
        if (!subscriptionId)
            return null;
        return this.getSubscription(subscriptionId);
    }
    async updateSubscription(subscription) {
        await this.redis.set(this.keys.subscription(subscription.id), JSON.stringify(subscription));
    }
    // Transaction methods
    async createTransaction(transaction) {
        const pipeline = this.redis.pipeline();
        pipeline.set(this.keys.transaction(transaction.id), JSON.stringify(transaction));
        pipeline.lpush(this.keys.transactionsByNest(transaction.nestId), transaction.id);
        // Set TTL for old transactions (1 year)
        pipeline.expire(this.keys.transaction(transaction.id), 365 * 24 * 60 * 60);
        await pipeline.exec();
    }
    async getTransaction(id) {
        const data = await this.redis.get(this.keys.transaction(id));
        return data ? JSON.parse(data) : null;
    }
    async updateTransaction(transaction) {
        await this.redis.set(this.keys.transaction(transaction.id), JSON.stringify(transaction));
    }
    async getTransactionsByNest(nestId, limit = 50) {
        const transactionIds = await this.redis.lrange(this.keys.transactionsByNest(nestId), 0, limit - 1);
        if (transactionIds.length === 0)
            return [];
        const pipeline = this.redis.pipeline();
        transactionIds.forEach(id => pipeline.get(this.keys.transaction(id)));
        const results = await pipeline.exec();
        return results
            ?.map(([err, data]) => {
            if (err || !data)
                return null;
            try {
                return JSON.parse(data);
            }
            catch {
                return null;
            }
        })
            .filter(Boolean) || [];
    }
    // Usage billing methods
    async createUsageBilling(billing) {
        const pipeline = this.redis.pipeline();
        pipeline.set(this.keys.usageBilling(billing.id), JSON.stringify(billing));
        pipeline.set(this.keys.currentBilling(billing.nestId), billing.id);
        // Set TTL for billing records (2 years)
        pipeline.expire(this.keys.usageBilling(billing.id), 2 * 365 * 24 * 60 * 60);
        await pipeline.exec();
    }
    async getUsageBilling(id) {
        const data = await this.redis.get(this.keys.usageBilling(id));
        return data ? JSON.parse(data) : null;
    }
    async getCurrentBilling(nestId) {
        const billingId = await this.redis.get(this.keys.currentBilling(nestId));
        if (!billingId)
            return null;
        return this.getUsageBilling(billingId);
    }
    // Event methods
    async createEvent(event) {
        const pipeline = this.redis.pipeline();
        pipeline.set(this.keys.event(event.id), JSON.stringify(event));
        pipeline.lpush(this.keys.eventsBySubscription(event.subscriptionId), event.id);
        // Keep only last 100 events per subscription
        pipeline.ltrim(this.keys.eventsBySubscription(event.subscriptionId), 0, 99);
        // Set TTL for events (1 year)
        pipeline.expire(this.keys.event(event.id), 365 * 24 * 60 * 60);
        await pipeline.exec();
    }
    async getEventsBySubscription(subscriptionId, limit = 20) {
        const eventIds = await this.redis.lrange(this.keys.eventsBySubscription(subscriptionId), 0, limit - 1);
        if (eventIds.length === 0)
            return [];
        const pipeline = this.redis.pipeline();
        eventIds.forEach(id => pipeline.get(this.keys.event(id)));
        const results = await pipeline.exec();
        return results
            ?.map(([err, data]) => {
            if (err || !data)
                return null;
            try {
                return JSON.parse(data);
            }
            catch {
                return null;
            }
        })
            .filter(Boolean) || [];
    }
    // Cleanup methods
    async cleanupExpiredSubscriptions() {
        // This would be implemented to clean up expired subscriptions
        // For now, we rely on Redis TTL
        return 0;
    }
    async getSubscriptionStats() {
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
exports.RedisPaymentStorage = RedisPaymentStorage;
//# sourceMappingURL=redis-payment-storage.js.map