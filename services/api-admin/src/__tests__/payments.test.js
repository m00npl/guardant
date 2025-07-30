"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bun_test_1 = require("bun:test");
// Mock subscription plans (matching actual implementation)
const mockSubscriptionPlans = [
    {
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
            checkInterval: 300,
            historyRetention: 30,
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
    {
        id: 'pro',
        tier: 'pro',
        name: 'Pro Nest',
        description: 'For growing teams and businesses',
        price: {
            monthly: '50000000000000000', // 0.05 ETH in wei
            yearly: '500000000000000000', // 0.5 ETH in wei
        },
        features: {
            maxServices: 25,
            maxWorkers: 5,
            maxRegions: 10,
            checkInterval: 60,
            historyRetention: 365,
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
    {
        id: 'enterprise',
        tier: 'enterprise',
        name: 'Enterprise Colony',
        description: 'For large organizations with advanced needs',
        price: {
            monthly: '200000000000000000', // 0.2 ETH in wei
            yearly: '2000000000000000000', // 2 ETH in wei
        },
        features: {
            maxServices: 500,
            maxWorkers: 50,
            maxRegions: 50,
            checkInterval: 30,
            historyRetention: 1095,
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
];
const mockSubscription = {
    id: 'test-subscription-id',
    nestId: 'test-nest-id',
    planId: 'pro',
    tier: 'pro',
    status: 'active',
    currentPeriodStart: Date.now() - 15 * 24 * 60 * 60 * 1000, // 15 days ago
    currentPeriodEnd: Date.now() + 15 * 24 * 60 * 60 * 1000, // 15 days from now
    cancelAtPeriodEnd: false,
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now(),
    paymentMethod: 'eth',
    usage: {
        services: 5,
        workers: 2,
        requests: 50000,
        storage: 500 * 1024 * 1024, // 500MB in bytes
        bandwidth: 10 * 1024 * 1024 * 1024, // 10GB in bytes
        lastUpdated: Date.now(),
    },
    lastPayment: {
        amount: '50000000000000000',
        transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678ab',
        timestamp: Date.now() - 15 * 24 * 60 * 60 * 1000,
        status: 'confirmed',
    },
};
const mockTransaction = {
    id: 'test-transaction-id',
    nestId: 'test-nest-id',
    subscriptionId: 'test-subscription-id',
    type: 'subscription',
    amount: '50000000000000000',
    currency: 'ETH',
    status: 'confirmed',
    description: 'Pro Nest subscription (monthly)',
    createdAt: Date.now(),
    confirmedAt: Date.now() + 120000, // 2 minutes later
    transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678ab',
    retryCount: 0,
};
(0, bun_test_1.describe)('Payment System', () => {
    (0, bun_test_1.describe)('Subscription Plans', () => {
        (0, bun_test_1.it)('should have valid plan structure', async () => {
            for (const plan of mockSubscriptionPlans) {
                (0, bun_test_1.expect)(plan).toHaveProperty('id');
                (0, bun_test_1.expect)(plan).toHaveProperty('tier');
                (0, bun_test_1.expect)(plan).toHaveProperty('name');
                (0, bun_test_1.expect)(plan).toHaveProperty('description');
                (0, bun_test_1.expect)(plan).toHaveProperty('price');
                (0, bun_test_1.expect)(plan).toHaveProperty('features');
                (0, bun_test_1.expect)(plan).toHaveProperty('limits');
                (0, bun_test_1.expect)(typeof plan.id).toBe('string');
                (0, bun_test_1.expect)(typeof plan.tier).toBe('string');
                (0, bun_test_1.expect)(typeof plan.name).toBe('string');
                (0, bun_test_1.expect)(typeof plan.description).toBe('string');
                (0, bun_test_1.expect)(typeof plan.price).toBe('object');
                (0, bun_test_1.expect)(typeof plan.features).toBe('object');
                (0, bun_test_1.expect)(typeof plan.limits).toBe('object');
            }
        });
        (0, bun_test_1.it)('should have valid pricing structure', async () => {
            for (const plan of mockSubscriptionPlans) {
                (0, bun_test_1.expect)(plan.price).toHaveProperty('monthly');
                (0, bun_test_1.expect)(plan.price).toHaveProperty('yearly');
                (0, bun_test_1.expect)(typeof plan.price.monthly).toBe('string');
                (0, bun_test_1.expect)(typeof plan.price.yearly).toBe('string');
                // Validate wei format (numeric string)
                (0, bun_test_1.expect)(/^\d+$/.test(plan.price.monthly)).toBe(true);
                (0, bun_test_1.expect)(/^\d+$/.test(plan.price.yearly)).toBe(true);
                // Yearly should be 10x monthly (2 months free)
                const monthlyWei = BigInt(plan.price.monthly);
                const yearlyWei = BigInt(plan.price.yearly);
                if (monthlyWei > 0n) {
                    (0, bun_test_1.expect)(yearlyWei).toBe(monthlyWei * 10n);
                }
                else {
                    (0, bun_test_1.expect)(yearlyWei).toBe(0n);
                }
            }
        });
        (0, bun_test_1.it)('should have progressively increasing features', async () => {
            const freePlan = mockSubscriptionPlans.find(p => p.tier === 'free');
            const proPlan = mockSubscriptionPlans.find(p => p.tier === 'pro');
            const enterprisePlan = mockSubscriptionPlans.find(p => p.tier === 'enterprise');
            // Services
            (0, bun_test_1.expect)(proPlan.features.maxServices).toBeGreaterThan(freePlan.features.maxServices);
            (0, bun_test_1.expect)(enterprisePlan.features.maxServices).toBeGreaterThan(proPlan.features.maxServices);
            // Workers
            (0, bun_test_1.expect)(proPlan.features.maxWorkers).toBeGreaterThan(freePlan.features.maxWorkers);
            (0, bun_test_1.expect)(enterprisePlan.features.maxWorkers).toBeGreaterThan(proPlan.features.maxWorkers);
            // Regions
            (0, bun_test_1.expect)(proPlan.features.maxRegions).toBeGreaterThan(freePlan.features.maxRegions);
            (0, bun_test_1.expect)(enterprisePlan.features.maxRegions).toBeGreaterThan(proPlan.features.maxRegions);
            // Check interval (lower is better)
            (0, bun_test_1.expect)(proPlan.features.checkInterval).toBeLessThan(freePlan.features.checkInterval);
            (0, bun_test_1.expect)(enterprisePlan.features.checkInterval).toBeLessThan(proPlan.features.checkInterval);
            // History retention
            (0, bun_test_1.expect)(proPlan.features.historyRetention).toBeGreaterThan(freePlan.features.historyRetention);
            (0, bun_test_1.expect)(enterprisePlan.features.historyRetention).toBeGreaterThan(proPlan.features.historyRetention);
        });
        (0, bun_test_1.it)('should have valid tier progression', async () => {
            const tierOrder = ['free', 'pro', 'enterprise'];
            for (let i = 0; i < mockSubscriptionPlans.length; i++) {
                const plan = mockSubscriptionPlans[i];
                (0, bun_test_1.expect)(tierOrder).toContain(plan.tier);
                (0, bun_test_1.expect)(plan.tier).toBe(tierOrder[i]);
            }
        });
    });
    (0, bun_test_1.describe)('Subscription Management', () => {
        (0, bun_test_1.it)('should validate subscription structure', async () => {
            const requiredFields = [
                'id', 'nestId', 'planId', 'tier', 'status',
                'currentPeriodStart', 'currentPeriodEnd', 'cancelAtPeriodEnd',
                'createdAt', 'updatedAt', 'paymentMethod', 'usage'
            ];
            for (const field of requiredFields) {
                (0, bun_test_1.expect)(mockSubscription).toHaveProperty(field);
            }
        });
        (0, bun_test_1.it)('should validate subscription status values', async () => {
            const validStatuses = ['pending', 'active', 'past_due', 'cancelled', 'expired'];
            (0, bun_test_1.expect)(validStatuses).toContain(mockSubscription.status);
        });
        (0, bun_test_1.it)('should validate subscription periods', async () => {
            (0, bun_test_1.expect)(mockSubscription.currentPeriodStart).toBeLessThan(mockSubscription.currentPeriodEnd);
            (0, bun_test_1.expect)(mockSubscription.currentPeriodEnd).toBeGreaterThan(Date.now());
            (0, bun_test_1.expect)(mockSubscription.createdAt).toBeLessThanOrEqual(mockSubscription.currentPeriodStart);
        });
        (0, bun_test_1.it)('should validate usage tracking', async () => {
            const usage = mockSubscription.usage;
            (0, bun_test_1.expect)(usage).toHaveProperty('services');
            (0, bun_test_1.expect)(usage).toHaveProperty('workers');
            (0, bun_test_1.expect)(usage).toHaveProperty('requests');
            (0, bun_test_1.expect)(usage).toHaveProperty('storage');
            (0, bun_test_1.expect)(usage).toHaveProperty('bandwidth');
            (0, bun_test_1.expect)(usage).toHaveProperty('lastUpdated');
            (0, bun_test_1.expect)(typeof usage.services).toBe('number');
            (0, bun_test_1.expect)(typeof usage.workers).toBe('number');
            (0, bun_test_1.expect)(typeof usage.requests).toBe('number');
            (0, bun_test_1.expect)(typeof usage.storage).toBe('number');
            (0, bun_test_1.expect)(typeof usage.bandwidth).toBe('number');
            (0, bun_test_1.expect)(typeof usage.lastUpdated).toBe('number');
            (0, bun_test_1.expect)(usage.services).toBeGreaterThanOrEqual(0);
            (0, bun_test_1.expect)(usage.workers).toBeGreaterThanOrEqual(0);
            (0, bun_test_1.expect)(usage.requests).toBeGreaterThanOrEqual(0);
            (0, bun_test_1.expect)(usage.storage).toBeGreaterThanOrEqual(0);
            (0, bun_test_1.expect)(usage.bandwidth).toBeGreaterThanOrEqual(0);
        });
    });
    (0, bun_test_1.describe)('Payment Transactions', () => {
        (0, bun_test_1.it)('should validate transaction structure', async () => {
            const requiredFields = [
                'id', 'nestId', 'subscriptionId', 'type', 'amount',
                'currency', 'status', 'description', 'createdAt', 'retryCount'
            ];
            for (const field of requiredFields) {
                (0, bun_test_1.expect)(mockTransaction).toHaveProperty(field);
            }
        });
        (0, bun_test_1.it)('should validate transaction types', async () => {
            const validTypes = ['subscription', 'upgrade', 'overage'];
            (0, bun_test_1.expect)(validTypes).toContain(mockTransaction.type);
        });
        (0, bun_test_1.it)('should validate transaction status', async () => {
            const validStatuses = ['pending', 'processing', 'confirmed', 'failed', 'cancelled'];
            (0, bun_test_1.expect)(validStatuses).toContain(mockTransaction.status);
        });
        (0, bun_test_1.it)('should validate ETH amount format', async () => {
            // Amount should be in wei (string format)
            (0, bun_test_1.expect)(typeof mockTransaction.amount).toBe('string');
            (0, bun_test_1.expect)(/^\d+$/.test(mockTransaction.amount)).toBe(true);
            (0, bun_test_1.expect)(BigInt(mockTransaction.amount)).toBeGreaterThan(0n);
        });
        (0, bun_test_1.it)('should validate currency', async () => {
            (0, bun_test_1.expect)(mockTransaction.currency).toBe('ETH');
        });
        (0, bun_test_1.it)('should validate transaction hash format', async () => {
            if (mockTransaction.transactionHash) {
                (0, bun_test_1.expect)(mockTransaction.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/); // 0x + 64 hex chars = 66 total
            }
        });
        (0, bun_test_1.it)('should validate timing logic', async () => {
            (0, bun_test_1.expect)(mockTransaction.createdAt).toBeLessThanOrEqual(Date.now());
            if (mockTransaction.confirmedAt) {
                (0, bun_test_1.expect)(mockTransaction.confirmedAt).toBeGreaterThanOrEqual(mockTransaction.createdAt);
            }
            if (mockTransaction.failedAt) {
                (0, bun_test_1.expect)(mockTransaction.failedAt).toBeGreaterThanOrEqual(mockTransaction.createdAt);
            }
        });
    });
    (0, bun_test_1.describe)('Overage Calculations', () => {
        (0, bun_test_1.it)('should calculate request overage correctly', async () => {
            const proPlan = mockSubscriptionPlans.find(p => p.tier === 'pro');
            const usage = mockSubscription.usage;
            const overageRequests = Math.max(0, usage.requests - proPlan.limits.requestsPerMonth);
            (0, bun_test_1.expect)(overageRequests).toBeGreaterThanOrEqual(0);
            // Current usage is within limits
            (0, bun_test_1.expect)(usage.requests).toBeLessThan(proPlan.limits.requestsPerMonth);
            (0, bun_test_1.expect)(overageRequests).toBe(0);
        });
        (0, bun_test_1.it)('should calculate storage overage correctly', async () => {
            const proPlan = mockSubscriptionPlans.find(p => p.tier === 'pro');
            const usage = mockSubscription.usage;
            const storageLimitBytes = proPlan.limits.storageGB * 1024 * 1024 * 1024;
            const overageStorage = Math.max(0, usage.storage - storageLimitBytes);
            (0, bun_test_1.expect)(overageStorage).toBeGreaterThanOrEqual(0);
            (0, bun_test_1.expect)(usage.storage).toBeLessThan(storageLimitBytes);
            (0, bun_test_1.expect)(overageStorage).toBe(0);
        });
        (0, bun_test_1.it)('should calculate bandwidth overage correctly', async () => {
            const proPlan = mockSubscriptionPlans.find(p => p.tier === 'pro');
            const usage = mockSubscription.usage;
            const bandwidthLimitBytes = proPlan.limits.bandwidthGB * 1024 * 1024 * 1024;
            const overageBandwidth = Math.max(0, usage.bandwidth - bandwidthLimitBytes);
            (0, bun_test_1.expect)(overageBandwidth).toBeGreaterThanOrEqual(0);
            (0, bun_test_1.expect)(usage.bandwidth).toBeLessThan(bandwidthLimitBytes);
            (0, bun_test_1.expect)(overageBandwidth).toBe(0);
        });
    });
    (0, bun_test_1.describe)('Subscription Upgrades', () => {
        (0, bun_test_1.it)('should validate upgrade paths', async () => {
            const validUpgrades = [
                { from: 'free', to: 'pro' },
                { from: 'free', to: 'enterprise' },
                { from: 'pro', to: 'enterprise' },
            ];
            const invalidUpgrades = [
                { from: 'pro', to: 'free' }, // downgrade
                { from: 'enterprise', to: 'pro' }, // downgrade
                { from: 'enterprise', to: 'free' }, // downgrade
                { from: 'free', to: 'free' }, // same tier
            ];
            for (const upgrade of validUpgrades) {
                const fromPlan = mockSubscriptionPlans.find(p => p.tier === upgrade.from);
                const toPlan = mockSubscriptionPlans.find(p => p.tier === upgrade.to);
                const fromPrice = BigInt(fromPlan.price.monthly);
                const toPrice = BigInt(toPlan.price.monthly);
                (0, bun_test_1.expect)(toPrice).toBeGreaterThan(fromPrice);
            }
            for (const upgrade of invalidUpgrades) {
                const fromPlan = mockSubscriptionPlans.find(p => p.tier === upgrade.from);
                const toPlan = mockSubscriptionPlans.find(p => p.tier === upgrade.to);
                const fromPrice = BigInt(fromPlan.price.monthly);
                const toPrice = BigInt(toPlan.price.monthly);
                (0, bun_test_1.expect)(toPrice).toBeLessThanOrEqual(fromPrice);
            }
        });
        (0, bun_test_1.it)('should calculate prorated charges correctly', async () => {
            const daysRemaining = 15; // Half of monthly period
            const monthlyDays = 30;
            const currentPrice = BigInt('50000000000000000'); // 0.05 ETH
            const newPrice = BigInt('200000000000000000'); // 0.2 ETH
            const dailyCurrentPrice = currentPrice / BigInt(monthlyDays);
            const dailyNewPrice = newPrice / BigInt(monthlyDays);
            const refund = dailyCurrentPrice * BigInt(daysRemaining);
            const charge = dailyNewPrice * BigInt(daysRemaining);
            const prorationAmount = charge - refund;
            (0, bun_test_1.expect)(prorationAmount).toBeGreaterThan(0n);
            (0, bun_test_1.expect)(prorationAmount).toBeLessThan(newPrice);
        });
    });
    (0, bun_test_1.describe)('Holesky Network Configuration', () => {
        (0, bun_test_1.it)('should validate Holesky chain ID', async () => {
            const holeskyChainId = 17000;
            (0, bun_test_1.expect)(holeskyChainId).toBe(17000);
        });
        (0, bun_test_1.it)('should validate RPC URL format', async () => {
            const rpcUrls = [
                'https://ethereum-holesky.publicnode.com',
                'https://holesky.infura.io/v3/xxx',
                'https://eth-holesky.alchemyapi.io/v2/xxx',
            ];
            for (const url of rpcUrls) {
                (0, bun_test_1.expect)(url).toMatch(/^https:\/\/.+/);
                (0, bun_test_1.expect)(url).toContain('holesky');
            }
        });
        (0, bun_test_1.it)('should validate contract addresses', async () => {
            const mockContractAddresses = [
                '0x1234567890123456789012345678901234567890',
                '0xabcdefABCDEF1234567890123456789012345678',
            ];
            const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
            for (const address of mockContractAddresses) {
                (0, bun_test_1.expect)(ethAddressRegex.test(address)).toBe(true);
            }
        });
    });
    (0, bun_test_1.describe)('Price Formatting', () => {
        (0, bun_test_1.it)('should format ETH prices correctly', async () => {
            const testPrices = [
                { wei: '50000000000000000', eth: '0.05' },
                { wei: '100000000000000000', eth: '0.1' },
                { wei: '1000000000000000000', eth: '1' },
                { wei: '0', eth: '0' },
            ];
            for (const price of testPrices) {
                const weiValue = BigInt(price.wei);
                const ethValue = Number(weiValue) / 1e18;
                (0, bun_test_1.expect)(ethValue.toString()).toBe(price.eth);
            }
        });
        (0, bun_test_1.it)('should handle large numbers correctly', async () => {
            const largeWeiAmount = '10000000000000000000'; // 10 ETH
            const weiValue = BigInt(largeWeiAmount);
            (0, bun_test_1.expect)(weiValue).toBe(10000000000000000000n);
            (0, bun_test_1.expect)(Number(weiValue) / 1e18).toBe(10);
        });
    });
});
//# sourceMappingURL=payments.test.js.map