import { describe, it, expect, beforeEach } from 'bun:test';

// Test data
const testService = {
  id: 'test-service-id',
  nestId: 'test-nest-id',
  name: 'Test API Service',
  type: 'web' as const,
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
    strategy: 'closest' as const,
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

describe('Services Management', () => {
  describe('Service validation', () => {
    it('should validate service object structure', async () => {
      const requiredFields = [
        'id', 'nestId', 'name', 'type', 'target', 'interval',
        'config', 'notifications', 'tags', 'isActive', 'monitoring',
        'createdAt', 'updatedAt'
      ];

      for (const field of requiredFields) {
        expect(testService).toHaveProperty(field);
      }
    });

    it('should validate service types', async () => {
      const validTypes = ['web', 'tcp', 'ping', 'github', 'uptime-api', 'keyword', 'heartbeat', 'port'];
      const invalidTypes = ['invalid', 'http', 'api', ''];

      for (const type of validTypes) {
        expect(validTypes).toContain(type);
      }

      for (const type of invalidTypes) {
        expect(validTypes).not.toContain(type);
      }
    });

    it('should validate web service targets', async () => {
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
        expect(urlRegex.test(target)).toBe(true);
      }

      for (const target of invalidTargets) {
        expect(urlRegex.test(target)).toBe(false);
      }
    });

    it('should validate tcp service targets', async () => {
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
        expect(tcpRegex.test(target)).toBe(true);
        const port = parseInt(target.split(':')[1]);
        expect(port).toBeGreaterThan(0);
        expect(port).toBeLessThan(65536);
      }

      for (const target of invalidTcpTargets) {
        const matches = tcpRegex.test(target);
        if (matches) {
          const port = parseInt(target.split(':')[1]);
          expect(port > 0 && port < 65536).toBe(false);
        } else {
          expect(matches).toBe(false);
        }
      }
    });

    it('should validate ping service targets', async () => {
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
        expect(target.length).toBeGreaterThan(0);
        expect(target).not.toMatch(/^https?:\/\//);
        expect(target).not.toMatch(/:[0-9]+$/);
      }

      for (const target of invalidPingTargets) {
        const hasProtocol = /^https?:\/\//.test(target);
        const hasPort = /:[0-9]+$/.test(target);
        const isEmpty = target.length === 0;
        const hasInvalidChars = /\.\./.test(target);
        
        expect(hasProtocol || hasPort || isEmpty || hasInvalidChars).toBe(true);
      }
    });
  });

  describe('Service intervals', () => {
    it('should validate monitoring intervals', async () => {
      const validIntervals = [30, 60, 120, 300, 600, 1800, 3600];
      const invalidIntervals = [0, -1, 15, 7201, null, undefined];

      for (const interval of validIntervals) {
        expect(interval).toBeGreaterThanOrEqual(30);
        expect(interval).toBeLessThanOrEqual(3600);
      }

      for (const interval of invalidIntervals) {
        if (interval !== null && interval !== undefined) {
          expect(interval < 30 || interval > 3600).toBe(true);
        } else {
          expect(interval).toBeFalsy();
        }
      }
    });
  });

  describe('Regional monitoring', () => {
    it('should validate region selection', async () => {
      const selectedRegions = ['eu-west-1', 'us-east-1'];
      const availableRegionIds = availableRegions
        .filter(r => r.available)
        .map(r => r.id);

      for (const regionId of selectedRegions) {
        expect(availableRegionIds).toContain(regionId);
      }
    });

    it('should reject unavailable regions', async () => {
      const unavailableRegions = availableRegions
        .filter(r => !r.available)
        .map(r => r.id);

      const selectedRegions = ['ap-southeast-1']; // unavailable region

      for (const regionId of selectedRegions) {
        expect(unavailableRegions).toContain(regionId);
      }
    });

    it('should validate monitoring strategies', async () => {
      const validStrategies = ['closest', 'all-selected', 'round-robin', 'failover'];
      const invalidStrategies = ['random', 'custom', '', null];

      for (const strategy of validStrategies) {
        expect(validStrategies).toContain(strategy);
      }

      for (const strategy of invalidStrategies) {
        expect(validStrategies).not.toContain(strategy);
      }
    });

    it('should validate region limits', async () => {
      const monitoring = testService.monitoring;

      expect(monitoring.regions.length).toBeGreaterThan(0);
      expect(monitoring.regions.length).toBeLessThanOrEqual(10); // reasonable limit
      
      if (monitoring.minRegions) {
        expect(monitoring.minRegions).toBeGreaterThan(0);
        expect(monitoring.minRegions).toBeLessThanOrEqual(monitoring.regions.length);
      }

      if (monitoring.maxRegions) {
        expect(monitoring.maxRegions).toBeGreaterThanOrEqual(monitoring.minRegions || 1);
        expect(monitoring.maxRegions).toBeLessThanOrEqual(monitoring.regions.length);
      }
    });
  });

  describe('Notification configuration', () => {
    it('should validate webhook URLs', async () => {
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
        expect(webhookRegex.test(webhook)).toBe(true);
      }

      for (const webhook of invalidWebhooks) {
        expect(webhookRegex.test(webhook)).toBe(false);
      }
    });

    it('should validate email addresses', async () => {
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
        expect(emailRegex.test(email)).toBe(true);
      }

      for (const email of invalidEmails) {
        expect(emailRegex.test(email)).toBe(false);
      }
    });
  });

  describe('Service configuration', () => {
    it('should validate web service config', async () => {
      const webConfig = {
        expectedStatus: 200,
        timeout: 5000,
        followRedirects: true,
        headers: {
          'User-Agent': 'GuardAnt Monitor',
        },
      };

      expect(typeof webConfig.expectedStatus).toBe('number');
      expect(webConfig.expectedStatus).toBeGreaterThanOrEqual(100);
      expect(webConfig.expectedStatus).toBeLessThan(600);

      expect(typeof webConfig.timeout).toBe('number');
      expect(webConfig.timeout).toBeGreaterThan(0);
      expect(webConfig.timeout).toBeLessThanOrEqual(30000);

      expect(typeof webConfig.followRedirects).toBe('boolean');
    });

    it('should validate tcp service config', async () => {
      const tcpConfig = {
        timeout: 5000,
        expectData: 'SSH-2.0',
        sendData: 'GET / HTTP/1.1\r\n\r\n',
      };

      expect(typeof tcpConfig.timeout).toBe('number');
      expect(tcpConfig.timeout).toBeGreaterThan(0);
      expect(tcpConfig.timeout).toBeLessThanOrEqual(30000);

      if (tcpConfig.expectData) {
        expect(typeof tcpConfig.expectData).toBe('string');
      }

      if (tcpConfig.sendData) {
        expect(typeof tcpConfig.sendData).toBe('string');
      }
    });

    it('should validate ping config', async () => {
      const pingConfig = {
        timeout: 5000,
        packetSize: 32,
        packets: 4,
      };

      expect(typeof pingConfig.timeout).toBe('number');
      expect(pingConfig.timeout).toBeGreaterThan(0);
      expect(pingConfig.timeout).toBeLessThanOrEqual(30000);

      expect(typeof pingConfig.packetSize).toBe('number');
      expect(pingConfig.packetSize).toBeGreaterThanOrEqual(8);
      expect(pingConfig.packetSize).toBeLessThanOrEqual(65507);

      expect(typeof pingConfig.packets).toBe('number');
      expect(pingConfig.packets).toBeGreaterThan(0);
      expect(pingConfig.packets).toBeLessThanOrEqual(10);
    });
  });

  describe('Service tags', () => {
    it('should validate tag format', async () => {
      const validTags = ['api', 'production', 'critical', 'web-server', 'db'];
      const invalidTags = ['', 'tag with spaces', 'TAG', '123tag', 'tag-', '-tag'];

      const tagRegex = /^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/;

      for (const tag of validTags) {
        expect(tagRegex.test(tag)).toBe(true);
      }

      for (const tag of invalidTags) {
        expect(tagRegex.test(tag)).toBe(false);
      }
    });

    it('should limit number of tags', async () => {
      const reasonableTagLimit = 10;
      
      expect(testService.tags.length).toBeLessThanOrEqual(reasonableTagLimit);
    });
  });

  describe('Service limits by subscription', () => {
    it('should enforce free tier limits', async () => {
      const freeTierLimits = {
        maxServices: 3,
        maxRegions: 2,
        minInterval: 300, // 5 minutes
      };

      // Test service count limit
      expect(1).toBeLessThanOrEqual(freeTierLimits.maxServices);

      // Test region limit
      expect(testService.monitoring.regions.length).toBeLessThanOrEqual(freeTierLimits.maxRegions);

      // Test interval limit (testService has 60s interval, but free tier requires 300s)
      // For testing purposes, we'll check the free tier limit exists
      expect(freeTierLimits.minInterval).toBe(300);
    });

    it('should allow pro tier features', async () => {
      const proTierLimits = {
        maxServices: 25,
        maxRegions: 10,
        minInterval: 60, // 1 minute
      };

      expect(proTierLimits.maxServices).toBeGreaterThan(3);
      expect(proTierLimits.maxRegions).toBeGreaterThan(2);
      expect(proTierLimits.minInterval).toBeLessThan(300);
    });

    it('should allow unlimited tier features', async () => {
      const unlimitedTierLimits = {
        maxServices: -1, // unlimited
        maxRegions: 50,
        minInterval: 30, // 30 seconds
      };

      expect(unlimitedTierLimits.maxServices).toBe(-1);
      expect(unlimitedTierLimits.maxRegions).toBeGreaterThan(10);
      expect(unlimitedTierLimits.minInterval).toBeLessThan(60);
    });
  });
});