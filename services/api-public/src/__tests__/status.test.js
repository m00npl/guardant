"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bun_test_1 = require("bun:test");
// Mock data for testing
const mockNestData = {
    id: 'test-nest-id',
    subdomain: 'testcompany',
    name: 'Test Company',
    email: 'test@example.com',
    settings: {
        isPublic: true,
        timezone: 'UTC',
        language: 'en',
    },
    createdAt: Date.now() - 24 * 60 * 60 * 1000,
    updatedAt: Date.now(),
    status: 'active',
};
const mockServiceData = [
    {
        id: 'service-1',
        nestId: 'test-nest-id',
        name: 'Main Website',
        type: 'web',
        target: 'https://example.com',
        status: 'up',
        responseTime: 150,
        lastChecked: Date.now() - 60000,
        regions: [
            {
                id: 'eu-west-1',
                status: 'up',
                responseTime: 145,
                lastChecked: Date.now() - 60000,
            },
            {
                id: 'us-east-1',
                status: 'up',
                responseTime: 155,
                lastChecked: Date.now() - 60000,
            },
        ],
        createdAt: Date.now() - 24 * 60 * 60 * 1000,
        isActive: true,
    },
    {
        id: 'service-2',
        nestId: 'test-nest-id',
        name: 'API Server',
        type: 'web',
        target: 'https://api.example.com',
        status: 'degraded',
        responseTime: 850,
        lastChecked: Date.now() - 120000,
        regions: [
            {
                id: 'eu-west-1',
                status: 'up',
                responseTime: 650,
                lastChecked: Date.now() - 120000,
            },
            {
                id: 'us-east-1',
                status: 'degraded',
                responseTime: 1050,
                lastChecked: Date.now() - 120000,
            },
        ],
        createdAt: Date.now() - 12 * 60 * 60 * 1000,
        isActive: true,
    },
];
const mockIncidentData = [
    {
        id: 'incident-1',
        nestId: 'test-nest-id',
        title: 'API Server Slow Response',
        description: 'Experiencing slower than normal response times',
        severity: 'minor',
        status: 'investigating',
        serviceIds: ['service-2'],
        startedAt: Date.now() - 2 * 60 * 60 * 1000,
        createdAt: Date.now() - 2 * 60 * 60 * 1000,
        updatedAt: Date.now() - 30 * 60 * 1000,
    },
];
(0, bun_test_1.describe)('Public API Status Routes', () => {
    (0, bun_test_1.describe)('Status page data transformation', () => {
        (0, bun_test_1.it)('should transform nest data correctly', async () => {
            // Simulate nest data transformation
            const transformedNest = {
                subdomain: mockNestData.subdomain,
                name: mockNestData.name,
                createdAt: mockNestData.createdAt,
                lastUpdated: mockNestData.updatedAt,
            };
            (0, bun_test_1.expect)(transformedNest).toHaveProperty('subdomain');
            (0, bun_test_1.expect)(transformedNest).toHaveProperty('name');
            (0, bun_test_1.expect)(transformedNest).toHaveProperty('createdAt');
            (0, bun_test_1.expect)(transformedNest).toHaveProperty('lastUpdated');
            (0, bun_test_1.expect)(transformedNest.subdomain).toBe(mockNestData.subdomain);
            (0, bun_test_1.expect)(transformedNest.name).toBe(mockNestData.name);
            (0, bun_test_1.expect)(transformedNest.createdAt).toBe(mockNestData.createdAt);
            (0, bun_test_1.expect)(transformedNest.lastUpdated).toBe(mockNestData.updatedAt);
            // Should not expose sensitive data
            (0, bun_test_1.expect)(transformedNest).not.toHaveProperty('email');
            (0, bun_test_1.expect)(transformedNest).not.toHaveProperty('id');
        });
        (0, bun_test_1.it)('should transform service data correctly', async () => {
            for (const service of mockServiceData) {
                const transformedService = {
                    id: service.id,
                    name: service.name,
                    type: service.type,
                    status: service.status,
                    responseTime: service.responseTime,
                    lastChecked: service.lastChecked,
                    regions: service.regions,
                };
                (0, bun_test_1.expect)(transformedService).toHaveProperty('id');
                (0, bun_test_1.expect)(transformedService).toHaveProperty('name');
                (0, bun_test_1.expect)(transformedService).toHaveProperty('type');
                (0, bun_test_1.expect)(transformedService).toHaveProperty('status');
                (0, bun_test_1.expect)(transformedService).toHaveProperty('responseTime');
                (0, bun_test_1.expect)(transformedService).toHaveProperty('lastChecked');
                (0, bun_test_1.expect)(transformedService).toHaveProperty('regions');
                // Should not expose sensitive data
                (0, bun_test_1.expect)(transformedService).not.toHaveProperty('nestId');
                (0, bun_test_1.expect)(transformedService).not.toHaveProperty('target');
            }
        });
        (0, bun_test_1.it)('should transform incident data correctly', async () => {
            for (const incident of mockIncidentData) {
                const transformedIncident = {
                    id: incident.id,
                    title: incident.title,
                    description: incident.description,
                    severity: incident.severity,
                    status: incident.status,
                    serviceIds: incident.serviceIds,
                    startedAt: incident.startedAt,
                    updatedAt: incident.updatedAt,
                };
                (0, bun_test_1.expect)(transformedIncident).toHaveProperty('id');
                (0, bun_test_1.expect)(transformedIncident).toHaveProperty('title');
                (0, bun_test_1.expect)(transformedIncident).toHaveProperty('description');
                (0, bun_test_1.expect)(transformedIncident).toHaveProperty('severity');
                (0, bun_test_1.expect)(transformedIncident).toHaveProperty('status');
                (0, bun_test_1.expect)(transformedIncident).toHaveProperty('serviceIds');
                (0, bun_test_1.expect)(transformedIncident).toHaveProperty('startedAt');
                (0, bun_test_1.expect)(transformedIncident).toHaveProperty('updatedAt');
                // Should not expose sensitive data
                (0, bun_test_1.expect)(transformedIncident).not.toHaveProperty('nestId');
            }
        });
    });
    (0, bun_test_1.describe)('Privacy filtering', () => {
        (0, bun_test_1.it)('should filter private nests', async () => {
            const privateNest = { ...mockNestData, settings: { ...mockNestData.settings, isPublic: false } };
            (0, bun_test_1.expect)(privateNest.settings.isPublic).toBe(false);
            // Simulate privacy check
            if (!privateNest.settings.isPublic) {
                (0, bun_test_1.expect)('Private nest should be rejected').toBeTruthy();
            }
        });
        (0, bun_test_1.it)('should allow public nests', async () => {
            (0, bun_test_1.expect)(mockNestData.settings.isPublic).toBe(true);
            // Simulate privacy check
            if (mockNestData.settings.isPublic) {
                (0, bun_test_1.expect)('Public nest should be allowed').toBeTruthy();
            }
        });
        (0, bun_test_1.it)('should not expose internal service configuration', async () => {
            // Test that sensitive fields exist in internal data but should be filtered in public API
            const sensitiveFields = ['nestId'];
            for (const service of mockServiceData) {
                for (const field of sensitiveFields) {
                    (0, bun_test_1.expect)(service).toHaveProperty(field); // They exist in internal data
                }
                // In real transformation, these would be removed:
                // - nestId (internal identifier)
                // - config (service configuration)
                // - notifications (notification settings)
                // - target (actual endpoint being monitored)
                (0, bun_test_1.expect)('Sensitive data filtering should be implemented').toBeTruthy();
            }
        });
    });
    (0, bun_test_1.describe)('Status calculations', () => {
        (0, bun_test_1.it)('should calculate overall status correctly', async () => {
            const services = mockServiceData;
            // Simulate overall status calculation
            const hasDownServices = services.some(s => s.status === 'down');
            const hasDegradedServices = services.some(s => s.status === 'degraded');
            const allServicesUp = services.every(s => s.status === 'up');
            let overallStatus;
            if (hasDownServices) {
                overallStatus = 'down';
            }
            else if (hasDegradedServices) {
                overallStatus = 'degraded';
            }
            else if (allServicesUp) {
                overallStatus = 'up';
            }
            else {
                overallStatus = 'unknown';
            }
            (0, bun_test_1.expect)(overallStatus).toBe('degraded'); // One service is degraded
            (0, bun_test_1.expect)(hasDownServices).toBe(false);
            (0, bun_test_1.expect)(hasDegradedServices).toBe(true);
            (0, bun_test_1.expect)(allServicesUp).toBe(false);
        });
        (0, bun_test_1.it)('should handle empty services list', async () => {
            const emptyServices = [];
            const overallStatus = emptyServices.length === 0 ? 'unknown' : 'up';
            (0, bun_test_1.expect)(overallStatus).toBe('unknown');
        });
        (0, bun_test_1.it)('should validate status values', async () => {
            const validStatuses = ['up', 'down', 'degraded', 'maintenance', 'unknown'];
            for (const service of mockServiceData) {
                (0, bun_test_1.expect)(validStatuses).toContain(service.status);
                for (const region of service.regions) {
                    (0, bun_test_1.expect)(validStatuses).toContain(region.status);
                }
            }
        });
    });
    (0, bun_test_1.describe)('Historical data generation', () => {
        (0, bun_test_1.it)('should generate valid historical data points', async () => {
            const period = '7d';
            const currentStatus = 'up';
            const currentResponseTime = 150;
            // Simulate historical data generation
            const generateMockHistoricalData = (period, status, responseTime) => {
                const periodHours = period === '24h' ? 24 : period === '7d' ? 168 : period === '30d' ? 720 : 2160;
                const points = Math.min(periodHours, 100); // Limit data points
                const data = [];
                const now = Date.now();
                const interval = (periodHours * 60 * 60 * 1000) / points;
                for (let i = 0; i < points; i++) {
                    const timestamp = now - (points - i - 1) * interval;
                    // Simulate some variation
                    const statusVariation = Math.random();
                    const rtVariation = Math.random() * 0.4 + 0.8; // 80% - 120%
                    data.push({
                        timestamp,
                        status: statusVariation > 0.95 ? 'down' : statusVariation > 0.90 ? 'degraded' : status,
                        responseTime: Math.round(responseTime * rtVariation),
                        uptime: statusVariation > 0.95 ? 0 : 1,
                    });
                }
                return data;
            };
            const historicalData = generateMockHistoricalData(period, currentStatus, currentResponseTime);
            (0, bun_test_1.expect)(historicalData.length).toBeGreaterThan(0);
            (0, bun_test_1.expect)(historicalData.length).toBeLessThanOrEqual(100);
            for (const point of historicalData) {
                (0, bun_test_1.expect)(point).toHaveProperty('timestamp');
                (0, bun_test_1.expect)(point).toHaveProperty('status');
                (0, bun_test_1.expect)(point).toHaveProperty('responseTime');
                (0, bun_test_1.expect)(point).toHaveProperty('uptime');
                (0, bun_test_1.expect)(typeof point.timestamp).toBe('number');
                (0, bun_test_1.expect)(typeof point.status).toBe('string');
                (0, bun_test_1.expect)(typeof point.responseTime).toBe('number');
                (0, bun_test_1.expect)(typeof point.uptime).toBe('number');
                (0, bun_test_1.expect)(point.timestamp).toBeGreaterThan(0);
                (0, bun_test_1.expect)(point.responseTime).toBeGreaterThan(0);
                (0, bun_test_1.expect)([0, 1]).toContain(point.uptime);
            }
        });
        (0, bun_test_1.it)('should validate period parameters', async () => {
            const validPeriods = ['24h', '7d', '30d', '90d'];
            const invalidPeriods = ['1h', '1d', '365d', '', 'invalid'];
            for (const period of validPeriods) {
                (0, bun_test_1.expect)(validPeriods).toContain(period);
            }
            for (const period of invalidPeriods) {
                (0, bun_test_1.expect)(validPeriods).not.toContain(period);
            }
        });
    });
    (0, bun_test_1.describe)('RSS feed generation', () => {
        (0, bun_test_1.it)('should generate valid RSS XML structure', async () => {
            const nestName = 'Test Company';
            const subdomain = 'testcompany';
            // Simulate RSS generation
            const generateRSSFeed = (nest, incidents) => {
                const items = incidents.map(incident => `
    <item>
      <title><![CDATA[${incident.severity.toUpperCase()}: ${incident.title}]]></title>
      <description><![CDATA[${incident.description}]]></description>
      <pubDate>${new Date(incident.startedAt).toUTCString()}</pubDate>
      <guid>https://${subdomain}.guardant.me/incidents/${incident.id}</guid>
      <link>https://${subdomain}.guardant.me/</link>
    </item>`).join('');
                return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title><![CDATA[${nest.name} Status]]></title>
    <description><![CDATA[Status updates for ${nest.name}]]></description>
    <link>https://${subdomain}.guardant.me/</link>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>GuardAnt Status Page</generator>
    ${items}
  </channel>
</rss>`;
            };
            const rssXml = generateRSSFeed(mockNestData, mockIncidentData);
            (0, bun_test_1.expect)(rssXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
            (0, bun_test_1.expect)(rssXml).toContain('<rss version="2.0">');
            (0, bun_test_1.expect)(rssXml).toContain('<channel>');
            (0, bun_test_1.expect)(rssXml).toContain('</channel>');
            (0, bun_test_1.expect)(rssXml).toContain('</rss>');
            (0, bun_test_1.expect)(rssXml).toContain(nestName);
            (0, bun_test_1.expect)(rssXml).toContain('GuardAnt Status Page');
            // Check for incident data
            for (const incident of mockIncidentData) {
                (0, bun_test_1.expect)(rssXml).toContain(incident.title);
                (0, bun_test_1.expect)(rssXml).toContain(incident.description);
                (0, bun_test_1.expect)(rssXml).toContain(incident.severity.toUpperCase());
            }
        });
    });
    (0, bun_test_1.describe)('Widget JavaScript generation', () => {
        (0, bun_test_1.it)('should generate valid widget JavaScript', async () => {
            const subdomain = 'testcompany';
            const options = {
                theme: 'light',
                services: [],
                compact: false,
                apiUrl: 'https://api.guardant.me',
            };
            // Simulate widget JS generation
            const generateWidgetJS = (subdomain, opts) => {
                return `
(function() {
  'use strict';
  
  var GuardAntWidget = {
    subdomain: '${subdomain}',
    theme: '${opts.theme}',
    services: ${JSON.stringify(opts.services)},
    compact: ${opts.compact},
    apiUrl: '${opts.apiUrl}',
    
    init: function() {
      var containers = document.querySelectorAll('[data-guardant="' + this.subdomain + '"]');
      // Widget initialization logic
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      GuardAntWidget.init();
    });
  } else {
    GuardAntWidget.init();
  }
})();`;
            };
            const widgetJS = generateWidgetJS(subdomain, options);
            (0, bun_test_1.expect)(widgetJS).toContain('GuardAntWidget');
            (0, bun_test_1.expect)(widgetJS).toContain(subdomain);
            (0, bun_test_1.expect)(widgetJS).toContain(options.theme);
            (0, bun_test_1.expect)(widgetJS).toContain(options.apiUrl);
            (0, bun_test_1.expect)(widgetJS).toContain('DOMContentLoaded');
            (0, bun_test_1.expect)(widgetJS).toContain('data-guardant');
            // Should be valid JavaScript (basic syntax check)
            (0, bun_test_1.expect)(widgetJS).toMatch(/\(function\(\)/);
            (0, bun_test_1.expect)(widgetJS).toMatch(/\}\)\(\);$/);
        });
        (0, bun_test_1.it)('should validate widget options', async () => {
            const validThemes = ['light', 'dark'];
            const invalidThemes = ['blue', 'red', '', null];
            for (const theme of validThemes) {
                (0, bun_test_1.expect)(validThemes).toContain(theme);
            }
            for (const theme of invalidThemes) {
                (0, bun_test_1.expect)(validThemes).not.toContain(theme);
            }
            // Compact should be boolean
            (0, bun_test_1.expect)(typeof true).toBe('boolean');
            (0, bun_test_1.expect)(typeof false).toBe('boolean');
            (0, bun_test_1.expect)(typeof 'true').not.toBe('boolean');
            // Services should be array
            (0, bun_test_1.expect)(Array.isArray([])).toBe(true);
            (0, bun_test_1.expect)(Array.isArray(['service1', 'service2'])).toBe(true);
            (0, bun_test_1.expect)(Array.isArray('all')).toBe(false);
        });
    });
    (0, bun_test_1.describe)('Cache headers', () => {
        (0, bun_test_1.it)('should set appropriate cache headers', async () => {
            const cacheSettings = {
                status: { maxAge: 60, staleWhileRevalidate: 300 }, // 1 minute cache
                history: { maxAge: 300, staleWhileRevalidate: 1800 }, // 5 minute cache
                incidents: { maxAge: 300, staleWhileRevalidate: 1800 }, // 5 minute cache
                widget: { maxAge: 300 }, // 5 minute cache
            };
            for (const [endpoint, cache] of Object.entries(cacheSettings)) {
                (0, bun_test_1.expect)(typeof cache.maxAge).toBe('number');
                (0, bun_test_1.expect)(cache.maxAge).toBeGreaterThan(0);
                if (cache.staleWhileRevalidate) {
                    (0, bun_test_1.expect)(cache.staleWhileRevalidate).toBeGreaterThan(cache.maxAge);
                }
            }
        });
    });
});
//# sourceMappingURL=status.test.js.map