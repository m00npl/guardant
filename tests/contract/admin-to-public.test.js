"use strict";
/**
 * Contract tests for Admin API -> Public API communication
 * Tests the contract between admin services and public status pages
 */
Object.defineProperty(exports, "__esModule", { value: true });
const pact_consumer_1 = require("./pact-consumer");
const status_api_client_1 = require("../../services/admin-api/src/clients/status-api-client");
const bun_test_1 = require("bun:test");
(0, bun_test_1.describe)('Admin API -> Public API Contract', () => {
    let pactSetup;
    let statusClient;
    (0, bun_test_1.beforeAll)(async () => {
        pactSetup = new pact_consumer_1.GuardAntPactSetup('./tests/contract/pacts');
        await pactSetup.setupAll();
        // Configure client to use Pact mock server
        statusClient = new status_api_client_1.StatusApiClient({
            baseUrl: 'http://localhost:1234',
            timeout: 5000
        });
    });
    (0, bun_test_1.afterAll)(async () => {
        await pactSetup.teardownAll();
    });
    (0, bun_test_1.test)('should fetch nest status data for public display', async () => {
        const pact = pactSetup.getPact('admin-to-public');
        await pact.addInteraction(pact_consumer_1.GuardAntInteractions.statusDataSync());
        // Act
        const result = await statusClient.getNestStatus('test-nest', {
            authorization: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...'
        });
        // Assert
        (0, bun_test_1.expect)(result.nest.subdomain).toBe('test-nest');
        (0, bun_test_1.expect)(result.services).toBeArray();
        (0, bun_test_1.expect)(result.services[0]).toHaveProperty('status');
        (0, bun_test_1.expect)(result.services[0]).toHaveProperty('responseTime');
        (0, bun_test_1.expect)(result.services[0]).toHaveProperty('uptime');
        (0, bun_test_1.expect)(result.incidents).toBeArray();
        await pact.verify();
    });
    (0, bun_test_1.test)('should synchronize incident data between services', async () => {
        const pact = pactSetup.getPact('admin-to-public');
        await pact.addInteraction(pact_consumer_1.GuardAntInteractions.incidentSync());
        // Act
        const result = await statusClient.syncIncidents('nest-123', {
            since: '2024-01-15T09:00:00Z',
            authorization: 'Bearer sync-token-789'
        });
        // Assert
        (0, bun_test_1.expect)(result.incidents).toBeArray();
        (0, bun_test_1.expect)(result.incidents[0]).toHaveProperty('title');
        (0, bun_test_1.expect)(result.incidents[0]).toHaveProperty('status');
        (0, bun_test_1.expect)(result.incidents[0]).toHaveProperty('severity');
        (0, bun_test_1.expect)(result.incidents[0].affectedServices).toBeArray();
        (0, bun_test_1.expect)(result.incidents[0].updates).toBeArray();
        (0, bun_test_1.expect)(result.lastSync).toBeString();
        await pact.verify();
    });
    (0, bun_test_1.test)('should handle branding configuration sync', async () => {
        const pact = pactSetup.getPact('admin-to-public');
        await pact.addInteraction({
            state: 'nest has custom branding configuration',
            uponReceiving: 'a request for branding data',
            withRequest: {
                method: 'GET',
                path: '/api/branding',
                headers: {
                    'X-Nest-Subdomain': 'test-nest'
                }
            },
            willRespondWith: {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    primaryColor: '#0066cc',
                    secondaryColor: '#f0f9ff',
                    logo: 'https://example.com/logo.png',
                    favicon: 'https://example.com/favicon.ico',
                    customCss: '.status-page { font-family: "Custom Font"; }',
                    customDomain: 'status.example.com'
                }
            }
        });
        // Act
        const result = await statusClient.getBranding('test-nest');
        // Assert
        (0, bun_test_1.expect)(result.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        (0, bun_test_1.expect)(result.logo).toBeString();
        (0, bun_test_1.expect)(result.customCss).toBeString();
        await pact.verify();
    });
    (0, bun_test_1.test)('should sync service maintenance windows', async () => {
        const pact = pactSetup.getPact('admin-to-public');
        await pact.addInteraction({
            state: 'nest has scheduled maintenance windows',
            uponReceiving: 'a request for maintenance schedule',
            withRequest: {
                method: 'GET',
                path: '/api/maintenance',
                query: {
                    nestId: 'nest-123',
                    upcoming: 'true'
                }
            },
            willRespondWith: {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    maintenanceWindows: [
                        {
                            id: 'maint-123',
                            title: 'Database Upgrade',
                            description: 'Upgrading database servers',
                            startTime: '2024-01-20T02:00:00Z',
                            endTime: '2024-01-20T04:00:00Z',
                            affectedServices: ['service-456'],
                            status: 'scheduled',
                            impact: 'partial-outage'
                        }
                    ]
                }
            }
        });
        // Act
        const result = await statusClient.getMaintenanceWindows('nest-123', { upcoming: true });
        // Assert
        (0, bun_test_1.expect)(result.maintenanceWindows).toBeArray();
        (0, bun_test_1.expect)(result.maintenanceWindows[0]).toHaveProperty('title');
        (0, bun_test_1.expect)(result.maintenanceWindows[0]).toHaveProperty('startTime');
        (0, bun_test_1.expect)(result.maintenanceWindows[0]).toHaveProperty('endTime');
        (0, bun_test_1.expect)(result.maintenanceWindows[0].affectedServices).toBeArray();
        await pact.verify();
    });
    (0, bun_test_1.test)('should handle real-time status subscription setup', async () => {
        const pact = pactSetup.getPact('admin-to-public');
        await pact.addInteraction({
            state: 'websocket endpoint is available',
            uponReceiving: 'a websocket connection request',
            withRequest: {
                method: 'GET',
                path: '/api/status/subscribe',
                headers: {
                    'X-Nest-Subdomain': 'test-nest',
                    'Upgrade': 'websocket',
                    'Connection': 'Upgrade'
                }
            },
            willRespondWith: {
                status: 101,
                headers: {
                    'Upgrade': 'websocket',
                    'Connection': 'Upgrade',
                    'Sec-WebSocket-Accept': 'mock-websocket-key'
                }
            }
        });
        // Act - Note: This would typically be tested with a WebSocket client
        const response = await fetch('http://localhost:1234/api/status/subscribe', {
            method: 'GET',
            headers: {
                'X-Nest-Subdomain': 'test-nest',
                'Upgrade': 'websocket',
                'Connection': 'Upgrade'
            }
        });
        // Assert
        (0, bun_test_1.expect)(response.status).toBe(101);
        (0, bun_test_1.expect)(response.headers.get('Upgrade')).toBe('websocket');
        await pact.verify();
    });
});
//# sourceMappingURL=admin-to-public.test.js.map