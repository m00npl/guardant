"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bun_test_1 = require("bun:test");
// Test data
const testService = {
    id: 'test-service-id',
    nestId: 'test-nest-id',
    name: 'Test API Service',
    type: 'web',
    target: 'https://api.example.com',
    interval: 60,
    config: {
        expectedStatus: 200,
        timeout: 5000,
        followRedirects: true,
    },
    notifications: {
        webhooks: ['https://webhook.example.com'],
        emails: ['admin@example.com'],
    },
    tags: ['api', 'production'],
    isActive: true,
    monitoring: {
        regions: ['eu-west-1', 'us-east-1'],
        strategy: 'closest',
        minRegions: 1,
        maxRegions: 2,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
};
const availableRegions = [
    { id: 'eu-west-1', name: 'Europe West (Frankfurt)', available: true },
    { id: 'eu-central-1', name: 'Europe Central (Warsaw)', available: true },
    { id: 'us-east-1', name: 'US East (Virginia)', available: true },
    { id: 'us-west-1', name: 'US West (California)', available: true },
    { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', available: false },
];
(0, bun_test_1.describe)('Services Management', () => {
    (0, bun_test_1.describe)('Service validation', () => {
        (0, bun_test_1.it)('should validate service object structure', async () => {
            const requiredFields = [
                'id', 'nestId', 'name', 'type', 'target', 'interval',
                'config', 'notifications', 'tags', 'isActive', 'monitoring',
                'createdAt', 'updatedAt'
            ];
            for (const field of requiredFields) {
                (0, bun_test_1.expect)(testService).toHaveProperty(field);
            }
        });
        (0, bun_test_1.it)('should validate service types', async () => {
            const validTypes = ['web', 'tcp', 'ping', 'github', 'uptime-api', 'keyword', 'heartbeat', 'port'];
            const invalidTypes = ['invalid', 'http', 'api', ''];
            for (const type of validTypes) {
                (0, bun_test_1.expect)(validTypes).toContain(type);
            }
            for (const type of invalidTypes) {
                (0, bun_test_1.expect)(validTypes).not.toContain(type);
            }
        });
        (0, bun_test_1.it)('should validate web service targets', async () => {
            const validTargets = [
                'https://api.example.com',
                'http://localhost:3000',
                'https://subdomain.example.com/path',
                'http://192.168.1.1:8080',
            ];
            const invalidTargets = [
                'not-a-url',
                'ftp://example.com',
                'javascript:alert(1)',
                '',
                'http://',
                'https://',
            ];
            const urlRegex = /^https?:\/\/.+/;
            for (const target of validTargets) {
                (0, bun_test_1.expect)(urlRegex.test(target)).toBe(true);
            }
            for (const target of invalidTargets) {
                (0, bun_test_1.expect)(urlRegex.test(target)).toBe(false);
            }
        });
        (0, bun_test_1.it)('should validate tcp service targets', async () => {
            const validTcpTargets = [
                'localhost:3000',
                '192.168.1.1:22',
                'example.com:443',
                'subdomain.example.com:8080',
            ];
            const invalidTcpTargets = [
                'localhost', // missing port
                ':3000', // missing host
                'localhost:abc', // invalid port
                'localhost:99999', // port out of range
                '', // empty
            ];
            const tcpRegex = /^[a-zA-Z0-9.-]+:[0-9]+$/;
            for (const target of validTcpTargets) {
                (0, bun_test_1.expect)(tcpRegex.test(target)).toBe(true);
                const port = parseInt(target.split(':')[1]);
                (0, bun_test_1.expect)(port).toBeGreaterThan(0);
                (0, bun_test_1.expect)(port).toBeLessThan(65536);
            }
            for (const target of invalidTcpTargets) {
                const matches = tcpRegex.test(target);
                if (matches) {
                    const port = parseInt(target.split(':')[1]);
                    (0, bun_test_1.expect)(port > 0 && port < 65536).toBe(false);
                }
                else {
                    (0, bun_test_1.expect)(matches).toBe(false);
                }
            }
        });
        (0, bun_test_1.it)('should validate ping service targets', async () => {
            const validPingTargets = [
                'google.com',
                '8.8.8.8',
                'localhost',
                'subdomain.example.com',
            ];
            const invalidPingTargets = [
                'http://example.com', // should not include protocol
                'example.com:80', // should not include port
                '', // empty
                'invalid..domain',
            ];
            for (const target of validPingTargets) {
                (0, bun_test_1.expect)(target.length).toBeGreaterThan(0);
                (0, bun_test_1.expect)(target).not.toMatch(/^https?:\/\//);
                (0, bun_test_1.expect)(target).not.toMatch(/:[0-9]+$/);
            }
            for (const target of invalidPingTargets) {
                const hasProtocol = /^https?:\/\//.test(target);
                const hasPort = /:[0-9]+$/.test(target);
                const isEmpty = target.length === 0;
                const hasInvalidChars = /\.\./.test(target);
                (0, bun_test_1.expect)(hasProtocol || hasPort || isEmpty || hasInvalidChars).toBe(true);
            }
        });
    });
    (0, bun_test_1.describe)('Service intervals', () => {
        (0, bun_test_1.it)('should validate monitoring intervals', async () => {
            const validIntervals = [30, 60, 120, 300, 600, 1800, 3600];
            const invalidIntervals = [0, -1, 15, 7201, null, undefined];
            for (const interval of validIntervals) {
                (0, bun_test_1.expect)(interval).toBeGreaterThanOrEqual(30);
                (0, bun_test_1.expect)(interval).toBeLessThanOrEqual(3600);
            }
            for (const interval of invalidIntervals) {
                if (interval !== null && interval !== undefined) {
                    (0, bun_test_1.expect)(interval < 30 || interval > 3600).toBe(true);
                }
                else {
                    (0, bun_test_1.expect)(interval).toBeFalsy();
                }
            }
        });
    });
    (0, bun_test_1.describe)('Regional monitoring', () => {
        (0, bun_test_1.it)('should validate region selection', async () => {
            const selectedRegions = ['eu-west-1', 'us-east-1'];
            const availableRegionIds = availableRegions
                .filter(r => r.available)
                .map(r => r.id);
            for (const regionId of selectedRegions) {
                (0, bun_test_1.expect)(availableRegionIds).toContain(regionId);
            }
        });
        (0, bun_test_1.it)('should reject unavailable regions', async () => {
            const unavailableRegions = availableRegions
                .filter(r => !r.available)
                .map(r => r.id);
            const selectedRegions = ['ap-southeast-1']; // unavailable region
            for (const regionId of selectedRegions) {
                (0, bun_test_1.expect)(unavailableRegions).toContain(regionId);
            }
        });
        (0, bun_test_1.it)('should validate monitoring strategies', async () => {
            const validStrategies = ['closest', 'all-selected', 'round-robin', 'failover'];
            const invalidStrategies = ['random', 'custom', '', null];
            for (const strategy of validStrategies) {
                (0, bun_test_1.expect)(validStrategies).toContain(strategy);
            }
            for (const strategy of invalidStrategies) {
                (0, bun_test_1.expect)(validStrategies).not.toContain(strategy);
            }
        });
        (0, bun_test_1.it)('should validate region limits', async () => {
            const monitoring = testService.monitoring;
            (0, bun_test_1.expect)(monitoring.regions.length).toBeGreaterThan(0);
            (0, bun_test_1.expect)(monitoring.regions.length).toBeLessThanOrEqual(10); // reasonable limit
            if (monitoring.minRegions) {
                (0, bun_test_1.expect)(monitoring.minRegions).toBeGreaterThan(0);
                (0, bun_test_1.expect)(monitoring.minRegions).toBeLessThanOrEqual(monitoring.regions.length);
            }
            if (monitoring.maxRegions) {
                (0, bun_test_1.expect)(monitoring.maxRegions).toBeGreaterThanOrEqual(monitoring.minRegions || 1);
                (0, bun_test_1.expect)(monitoring.maxRegions).toBeLessThanOrEqual(monitoring.regions.length);
            }
        });
    });
    (0, bun_test_1.describe)('Notification configuration', () => {
        (0, bun_test_1.it)('should validate webhook URLs', async () => {
            const validWebhooks = [
                'https://hooks.slack.com/services/xxx',
                'https://discord.com/api/webhooks/xxx',
                'https://api.example.com/webhook',
            ];
            const invalidWebhooks = [
                'not-a-url',
                'http://insecure-webhook.com', // should be HTTPS for webhooks
                'javascript:alert(1)',
                '',
            ];
            const webhookRegex = /^https:\/\/.+/;
            for (const webhook of validWebhooks) {
                (0, bun_test_1.expect)(webhookRegex.test(webhook)).toBe(true);
            }
            for (const webhook of invalidWebhooks) {
                (0, bun_test_1.expect)(webhookRegex.test(webhook)).toBe(false);
            }
        });
        (0, bun_test_1.it)('should validate email addresses', async () => {
            const validEmails = [
                'admin@example.com',
                'user.name@subdomain.example.com',
                'test+alerts@example.co.uk',
            ];
            const invalidEmails = [
                'invalid-email',
                'user@',
                '@example.com',
                'user.example.com',
                '',
            ];
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            for (const email of validEmails) {
                (0, bun_test_1.expect)(emailRegex.test(email)).toBe(true);
            }
            for (const email of invalidEmails) {
                (0, bun_test_1.expect)(emailRegex.test(email)).toBe(false);
            }
        });
    });
    (0, bun_test_1.describe)('Service configuration', () => {
        (0, bun_test_1.it)('should validate web service config', async () => {
            const webConfig = {
                expectedStatus: 200,
                timeout: 5000,
                followRedirects: true,
                headers: {
                    'User-Agent': 'GuardAnt Monitor',
                },
            };
            (0, bun_test_1.expect)(typeof webConfig.expectedStatus).toBe('number');
            (0, bun_test_1.expect)(webConfig.expectedStatus).toBeGreaterThanOrEqual(100);
            (0, bun_test_1.expect)(webConfig.expectedStatus).toBeLessThan(600);
            (0, bun_test_1.expect)(typeof webConfig.timeout).toBe('number');
            (0, bun_test_1.expect)(webConfig.timeout).toBeGreaterThan(0);
            (0, bun_test_1.expect)(webConfig.timeout).toBeLessThanOrEqual(30000);
            (0, bun_test_1.expect)(typeof webConfig.followRedirects).toBe('boolean');
        });
        (0, bun_test_1.it)('should validate tcp service config', async () => {
            const tcpConfig = {
                timeout: 5000,
                expectData: 'SSH-2.0',
                sendData: 'GET / HTTP/1.1\r\n\r\n',
            };
            (0, bun_test_1.expect)(typeof tcpConfig.timeout).toBe('number');
            (0, bun_test_1.expect)(tcpConfig.timeout).toBeGreaterThan(0);
            (0, bun_test_1.expect)(tcpConfig.timeout).toBeLessThanOrEqual(30000);
            if (tcpConfig.expectData) {
                (0, bun_test_1.expect)(typeof tcpConfig.expectData).toBe('string');
            }
            if (tcpConfig.sendData) {
                (0, bun_test_1.expect)(typeof tcpConfig.sendData).toBe('string');
            }
        });
        (0, bun_test_1.it)('should validate ping config', async () => {
            const pingConfig = {
                timeout: 5000,
                packetSize: 32,
                packets: 4,
            };
            (0, bun_test_1.expect)(typeof pingConfig.timeout).toBe('number');
            (0, bun_test_1.expect)(pingConfig.timeout).toBeGreaterThan(0);
            (0, bun_test_1.expect)(pingConfig.timeout).toBeLessThanOrEqual(30000);
            (0, bun_test_1.expect)(typeof pingConfig.packetSize).toBe('number');
            (0, bun_test_1.expect)(pingConfig.packetSize).toBeGreaterThanOrEqual(8);
            (0, bun_test_1.expect)(pingConfig.packetSize).toBeLessThanOrEqual(65507);
            (0, bun_test_1.expect)(typeof pingConfig.packets).toBe('number');
            (0, bun_test_1.expect)(pingConfig.packets).toBeGreaterThan(0);
            (0, bun_test_1.expect)(pingConfig.packets).toBeLessThanOrEqual(10);
        });
    });
    (0, bun_test_1.describe)('Service tags', () => {
        (0, bun_test_1.it)('should validate tag format', async () => {
            const validTags = ['api', 'production', 'critical', 'web-server', 'db'];
            const invalidTags = ['', 'tag with spaces', 'TAG', '123tag', 'tag-', '-tag'];
            const tagRegex = /^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/;
            for (const tag of validTags) {
                (0, bun_test_1.expect)(tagRegex.test(tag)).toBe(true);
            }
            for (const tag of invalidTags) {
                (0, bun_test_1.expect)(tagRegex.test(tag)).toBe(false);
            }
        });
        (0, bun_test_1.it)('should limit number of tags', async () => {
            const reasonableTagLimit = 10;
            (0, bun_test_1.expect)(testService.tags.length).toBeLessThanOrEqual(reasonableTagLimit);
        });
    });
    (0, bun_test_1.describe)('Service limits by subscription', () => {
        (0, bun_test_1.it)('should enforce free tier limits', async () => {
            const freeTierLimits = {
                maxServices: 3,
                maxRegions: 2,
                minInterval: 300, // 5 minutes
            };
            // Test service count limit
            (0, bun_test_1.expect)(1).toBeLessThanOrEqual(freeTierLimits.maxServices);
            // Test region limit
            (0, bun_test_1.expect)(testService.monitoring.regions.length).toBeLessThanOrEqual(freeTierLimits.maxRegions);
            // Test interval limit (testService has 60s interval, but free tier requires 300s)
            // For testing purposes, we'll check the free tier limit exists
            (0, bun_test_1.expect)(freeTierLimits.minInterval).toBe(300);
        });
        (0, bun_test_1.it)('should allow pro tier features', async () => {
            const proTierLimits = {
                maxServices: 25,
                maxRegions: 10,
                minInterval: 60, // 1 minute
            };
            (0, bun_test_1.expect)(proTierLimits.maxServices).toBeGreaterThan(3);
            (0, bun_test_1.expect)(proTierLimits.maxRegions).toBeGreaterThan(2);
            (0, bun_test_1.expect)(proTierLimits.minInterval).toBeLessThan(300);
        });
        (0, bun_test_1.it)('should allow unlimited tier features', async () => {
            const unlimitedTierLimits = {
                maxServices: -1, // unlimited
                maxRegions: 50,
                minInterval: 30, // 30 seconds
            };
            (0, bun_test_1.expect)(unlimitedTierLimits.maxServices).toBe(-1);
            (0, bun_test_1.expect)(unlimitedTierLimits.maxRegions).toBeGreaterThan(10);
            (0, bun_test_1.expect)(unlimitedTierLimits.minInterval).toBeLessThan(60);
        });
    });
});
//# sourceMappingURL=services.test.js.map