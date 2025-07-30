"use strict";
/**
 * Contract tests for Workers -> Admin API communication
 * Tests the contract for status reporting and worker coordination
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const pact_consumer_1 = require("./pact-consumer");
const admin_api_client_1 = require("../../services/workers/src/clients/admin-api-client");
const bun_test_1 = require("bun:test");
(0, bun_test_1.describe)('Workers -> Admin API Contract', () => {
    let pactSetup;
    let adminClient;
    (0, bun_test_1.beforeAll)(async () => {
        pactSetup = new pact_consumer_1.GuardAntPactSetup('./tests/contract/pacts');
        // Set up reverse pact (Workers as consumer, Admin API as provider)
        const workerToAdminPact = new (await Promise.resolve().then(() => __importStar(require('@pact-foundation/pact')))).Pact({
            consumer: 'Workers',
            provider: 'Admin API',
            port: 1238,
            log: './logs/pact-workers-admin.log',
            dir: './tests/contract/pacts',
            logLevel: 'INFO',
            spec: 2
        });
        pactSetup.getPact = () => workerToAdminPact;
        await workerToAdminPact.setup();
        // Configure client to use Pact mock server
        adminClient = new admin_api_client_1.AdminApiClient({
            baseUrl: 'http://localhost:1238',
            timeout: 10000
        });
    });
    (0, bun_test_1.afterAll)(async () => {
        await pactSetup.teardownAll();
    });
    (0, bun_test_1.test)('should report service status to admin API', async () => {
        const pact = pactSetup.getPact('workers-to-admin');
        await pact.addInteraction(pact_consumer_1.GuardAntInteractions.statusReport());
        // Act
        const result = await adminClient.reportStatus({
            workerId: 'worker-001',
            region: 'us-east-1',
            timestamp: '2024-01-15T10:30:00Z',
            checks: [
                {
                    serviceId: 'service-456',
                    status: 'up',
                    responseTime: 150,
                    statusCode: 200,
                    error: null,
                    metadata: {
                        redirectCount: 0,
                        dnsTime: 10,
                        connectTime: 50,
                        tlsTime: 30
                    }
                }
            ]
        }, {
            authorization: 'Bearer worker-token-123'
        });
        // Assert
        (0, bun_test_1.expect)(result.accepted).toBe(true);
        (0, bun_test_1.expect)(result.processed).toBeString();
        await pact.verify();
    });
    (0, bun_test_1.test)('should report worker heartbeat and metrics', async () => {
        const pact = pactSetup.getPact('workers-to-admin');
        await pact.addInteraction({
            state: 'admin API accepts worker heartbeats',
            uponReceiving: 'a worker heartbeat with metrics',
            withRequest: {
                method: 'POST',
                path: '/api/admin/heartbeat',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer worker-token-123'
                },
                body: {
                    workerId: 'worker-001',
                    region: 'us-east-1',
                    timestamp: '2024-01-15T10:30:00Z',
                    status: 'healthy',
                    metrics: {
                        uptime: 3600,
                        activeChecks: 25,
                        checksPerMinute: 50,
                        avgResponseTime: 150,
                        errorRate: 0.02,
                        resources: {
                            cpuUsage: 15.5,
                            memoryUsage: 256,
                            diskUsage: 45,
                            networkLatency: 25
                        }
                    },
                    lastConfigVersion: '1.2.3'
                }
            },
            willRespondWith: {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    acknowledged: true,
                    nextHeartbeat: 60,
                    configUpdateAvailable: false,
                    commands: []
                }
            }
        });
        // Act
        const result = await adminClient.sendHeartbeat({
            workerId: 'worker-001',
            region: 'us-east-1',
            timestamp: '2024-01-15T10:30:00Z',
            status: 'healthy',
            metrics: {
                uptime: 3600,
                activeChecks: 25,
                checksPerMinute: 50,
                avgResponseTime: 150,
                errorRate: 0.02,
                resources: {
                    cpuUsage: 15.5,
                    memoryUsage: 256,
                    diskUsage: 45,
                    networkLatency: 25
                }
            },
            lastConfigVersion: '1.2.3'
        });
        // Assert
        (0, bun_test_1.expect)(result.acknowledged).toBe(true);
        (0, bun_test_1.expect)(result.nextHeartbeat).toBe(60);
        (0, bun_test_1.expect)(result.configUpdateAvailable).toBe(false);
        (0, bun_test_1.expect)(result.commands).toBeArray();
        await pact.verify();
    });
    (0, bun_test_1.test)('should report incidents and service failures', async () => {
        const pact = pactSetup.getPact('workers-to-admin');
        await pact.addInteraction({
            state: 'admin API processes incident reports',
            uponReceiving: 'an incident report from worker',
            withRequest: {
                method: 'POST',
                path: '/api/admin/incidents/report',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer worker-token-123'
                },
                body: {
                    workerId: 'worker-001',
                    region: 'us-east-1',
                    timestamp: '2024-01-15T10:30:00Z',
                    incident: {
                        serviceId: 'service-456',
                        type: 'service_down',
                        severity: 'major',
                        description: 'Service returning 500 errors',
                        statusCode: 500,
                        responseTime: null,
                        consecutiveFailures: 3,
                        errorDetails: {
                            message: 'Internal Server Error',
                            headers: {
                                'content-type': 'text/html'
                            }
                        }
                    }
                }
            },
            willRespondWith: {
                status: 201,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    incidentId: 'incident-789',
                    acknowledged: true,
                    escalated: true,
                    notificationsSent: 2,
                    nextCheck: '2024-01-15T10:31:00Z'
                }
            }
        });
        // Act
        const result = await adminClient.reportIncident({
            workerId: 'worker-001',
            region: 'us-east-1',
            timestamp: '2024-01-15T10:30:00Z',
            incident: {
                serviceId: 'service-456',
                type: 'service_down',
                severity: 'major',
                description: 'Service returning 500 errors',
                statusCode: 500,
                responseTime: null,
                consecutiveFailures: 3,
                errorDetails: {
                    message: 'Internal Server Error',
                    headers: {
                        'content-type': 'text/html'
                    }
                }
            }
        });
        // Assert
        (0, bun_test_1.expect)(result.incidentId).toBeString();
        (0, bun_test_1.expect)(result.acknowledged).toBe(true);
        (0, bun_test_1.expect)(result.escalated).toBe(true);
        (0, bun_test_1.expect)(result.notificationsSent).toBeNumber();
        await pact.verify();
    });
    (0, bun_test_1.test)('should request service configuration from admin API', async () => {
        const pact = pactSetup.getPact('workers-to-admin');
        await pact.addInteraction({
            state: 'admin API has service configurations',
            uponReceiving: 'a service configuration request',
            withRequest: {
                method: 'GET',
                path: '/api/admin/services/config',
                query: {
                    workerId: 'worker-001',
                    region: 'us-east-1'
                },
                headers: {
                    'Authorization': 'Bearer worker-token-123'
                }
            },
            willRespondWith: {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    services: [
                        {
                            id: 'service-456',
                            nestId: 'nest-123',
                            name: 'Production API',
                            url: 'https://api.example.com/health',
                            type: 'web',
                            checkInterval: 60,
                            timeout: 30,
                            regions: ['us-east-1'],
                            expectedStatus: 200,
                            enabled: true,
                            headers: {
                                'User-Agent': 'GuardAnt-Monitor/1.0'
                            }
                        }
                    ],
                    configVersion: '1.2.3',
                    lastUpdate: '2024-01-15T10:00:00Z'
                }
            }
        });
        // Act
        const result = await adminClient.getServiceConfig('worker-001', 'us-east-1');
        // Assert
        (0, bun_test_1.expect)(result.services).toBeArray();
        (0, bun_test_1.expect)(result.services[0]).toHaveProperty('id');
        (0, bun_test_1.expect)(result.services[0]).toHaveProperty('url');
        (0, bun_test_1.expect)(result.services[0]).toHaveProperty('checkInterval');
        (0, bun_test_1.expect)(result.configVersion).toBeString();
        await pact.verify();
    });
    (0, bun_test_1.test)('should report worker performance metrics', async () => {
        const pact = pactSetup.getPact('workers-to-admin');
        await pact.addInteraction({
            state: 'admin API collects performance metrics',
            uponReceiving: 'worker performance metrics',
            withRequest: {
                method: 'POST',
                path: '/api/admin/metrics',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer worker-token-123'
                },
                body: {
                    workerId: 'worker-001',
                    region: 'us-east-1',
                    timestamp: '2024-01-15T10:30:00Z',
                    metrics: {
                        checksCompleted: 1500,
                        avgResponseTime: 145,
                        p95ResponseTime: 380,
                        p99ResponseTime: 750,
                        errorRate: 0.015,
                        timeoutRate: 0.005,
                        successRate: 0.98,
                        regionalLatency: {
                            'us-east-1': 25,
                            'us-west-2': 75,
                            'eu-west-1': 120
                        },
                        serviceBreakdown: [
                            {
                                serviceId: 'service-456',
                                checks: 100,
                                avgResponseTime: 150,
                                successRate: 0.99
                            }
                        ]
                    }
                }
            },
            willRespondWith: {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    recorded: true,
                    timestamp: '2024-01-15T10:30:01Z',
                    recommendations: [
                        {
                            type: 'optimization',
                            message: 'Consider reducing check interval for highly available services'
                        }
                    ]
                }
            }
        });
        // Act
        const result = await adminClient.reportMetrics({
            workerId: 'worker-001',
            region: 'us-east-1',
            timestamp: '2024-01-15T10:30:00Z',
            metrics: {
                checksCompleted: 1500,
                avgResponseTime: 145,
                p95ResponseTime: 380,
                p99ResponseTime: 750,
                errorRate: 0.015,
                timeoutRate: 0.005,
                successRate: 0.98,
                regionalLatency: {
                    'us-east-1': 25,
                    'us-west-2': 75,
                    'eu-west-1': 120
                },
                serviceBreakdown: [
                    {
                        serviceId: 'service-456',
                        checks: 100,
                        avgResponseTime: 150,
                        successRate: 0.99
                    }
                ]
            }
        });
        // Assert
        (0, bun_test_1.expect)(result.recorded).toBe(true);
        (0, bun_test_1.expect)(result.recommendations).toBeArray();
        await pact.verify();
    });
    (0, bun_test_1.test)('should handle worker registration with admin API', async () => {
        const pact = pactSetup.getPact('workers-to-admin');
        await pact.addInteraction({
            state: 'admin API accepts worker registrations',
            uponReceiving: 'a worker registration request',
            withRequest: {
                method: 'POST',
                path: '/api/admin/workers/register',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer bootstrap-token-456'
                },
                body: {
                    workerId: 'worker-new-002',
                    region: 'eu-west-1',
                    capabilities: {
                        checkTypes: ['web', 'tcp', 'ping', 'api'],
                        maxConcurrentChecks: 100,
                        supportedProtocols: ['http', 'https', 'tcp', 'icmp'],
                        regions: ['eu-west-1', 'eu-central-1']
                    },
                    version: '1.2.3',
                    startedAt: '2024-01-15T10:25:00Z'
                }
            },
            willRespondWith: {
                status: 201,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    registered: true,
                    workerId: 'worker-new-002',
                    token: 'worker-token-new-002',
                    configuration: {
                        heartbeatInterval: 60,
                        reportingInterval: 30,
                        maxRetries: 3,
                        timeout: 30
                    },
                    assignedServices: []
                }
            }
        });
        // Act
        const result = await adminClient.registerWorker({
            workerId: 'worker-new-002',
            region: 'eu-west-1',
            capabilities: {
                checkTypes: ['web', 'tcp', 'ping', 'api'],
                maxConcurrentChecks: 100,
                supportedProtocols: ['http', 'https', 'tcp', 'icmp'],
                regions: ['eu-west-1', 'eu-central-1']
            },
            version: '1.2.3',
            startedAt: '2024-01-15T10:25:00Z'
        }, {
            authorization: 'Bearer bootstrap-token-456'
        });
        // Assert
        (0, bun_test_1.expect)(result.registered).toBe(true);
        (0, bun_test_1.expect)(result.workerId).toBe('worker-new-002');
        (0, bun_test_1.expect)(result.token).toBeString();
        (0, bun_test_1.expect)(result.configuration).toHaveProperty('heartbeatInterval');
        (0, bun_test_1.expect)(result.assignedServices).toBeArray();
        await pact.verify();
    });
});
//# sourceMappingURL=workers-to-admin.test.js.map