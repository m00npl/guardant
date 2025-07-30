"use strict";
/**
 * Contract testing setup using Pact for service-to-service communication
 * This ensures API compatibility between services in GuardAnt
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardAntInteractions = exports.GuardAntPactSetup = void 0;
const pact_1 = require("@pact-foundation/pact");
const path_1 = __importDefault(require("path"));
const { like, eachLike, term } = pact_1.Matchers;
// Pact configuration for different service pairs
class GuardAntPactSetup {
    constructor(testOutputDir = './pacts') {
        this.testOutputDir = testOutputDir;
        this.pacts = new Map();
        this.setupServicePairs();
    }
    setupServicePairs() {
        // Admin API <-> Public API
        this.pacts.set('admin-to-public', new pact_1.Pact({
            consumer: 'Admin API',
            provider: 'Public API',
            port: 1234,
            log: path_1.default.resolve(process.cwd(), 'logs', 'pact-admin-public.log'),
            dir: path_1.default.resolve(process.cwd(), this.testOutputDir),
            logLevel: 'INFO',
            spec: 2
        }));
        // Admin API <-> Workers
        this.pacts.set('admin-to-workers', new pact_1.Pact({
            consumer: 'Admin API',
            provider: 'Workers',
            port: 1235,
            log: path_1.default.resolve(process.cwd(), 'logs', 'pact-admin-workers.log'),
            dir: path_1.default.resolve(process.cwd(), this.testOutputDir),
            logLevel: 'INFO',
            spec: 2
        }));
        // Public API <-> Workers
        this.pacts.set('public-to-workers', new pact_1.Pact({
            consumer: 'Public API',
            provider: 'Workers',
            port: 1236,
            log: path_1.default.resolve(process.cwd(), 'logs', 'pact-public-workers.log'),
            dir: path_1.default.resolve(process.cwd(), this.testOutputDir),
            logLevel: 'INFO',
            spec: 2
        }));
        // Workers <-> External Services (monitoring targets)
        this.pacts.set('workers-to-external', new pact_1.Pact({
            consumer: 'Workers',
            provider: 'External Services',
            port: 1237,
            log: path_1.default.resolve(process.cwd(), 'logs', 'pact-workers-external.log'),
            dir: path_1.default.resolve(process.cwd(), this.testOutputDir),
            logLevel: 'INFO',
            spec: 2
        }));
    }
    getPact(servicePair) {
        const pact = this.pacts.get(servicePair);
        if (!pact) {
            throw new Error(`Pact not found for service pair: ${servicePair}`);
        }
        return pact;
    }
    async setupAll() {
        const setupPromises = Array.from(this.pacts.values()).map(pact => pact.setup());
        await Promise.all(setupPromises);
    }
    async teardownAll() {
        const teardownPromises = Array.from(this.pacts.values()).map(pact => pact.finalize());
        await Promise.all(teardownPromises);
    }
}
exports.GuardAntPactSetup = GuardAntPactSetup;
// Common interaction patterns for GuardAnt services
class GuardAntInteractions {
    // Admin API -> Public API: Status data synchronization
    static statusDataSync() {
        return {
            state: 'nest has services with status data',
            uponReceiving: 'a request for nest status data',
            withRequest: {
                method: 'GET',
                path: '/api/status',
                headers: {
                    'X-Nest-Subdomain': 'test-nest',
                    'Authorization': like('Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...')
                }
            },
            willRespondWith: {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    nest: {
                        id: like('nest-123'),
                        subdomain: like('test-nest'),
                        displayName: like('Test Nest'),
                        branding: {
                            primaryColor: term({ generate: '#0066cc', matcher: '^#[0-9a-fA-F]{6}$' }),
                            logo: like('https://example.com/logo.png')
                        }
                    },
                    services: eachLike({
                        id: like('service-456'),
                        name: like('Test Service'),
                        status: term({ generate: 'up', matcher: '^(up|down|degraded|maintenance)$' }),
                        responseTime: like(150),
                        uptime: like(99.9),
                        lastCheck: like('2024-01-15T10:30:00Z'),
                        regions: eachLike({
                            id: like('us-east-1'),
                            name: like('US East (Virginia)'),
                            status: term({ generate: 'up', matcher: '^(up|down|degraded)$' }),
                            responseTime: like(120)
                        })
                    }),
                    incidents: eachLike({
                        id: like('incident-789'),
                        title: like('Service Degradation'),
                        status: term({ generate: 'investigating', matcher: '^(investigating|identified|monitoring|resolved)$' }),
                        severity: term({ generate: 'minor', matcher: '^(critical|major|minor|maintenance)$' }),
                        createdAt: like('2024-01-15T09:00:00Z'),
                        affectedServices: eachLike(like('service-456'))
                    })
                }
            }
        };
    }
    // Admin API -> Workers: Service configuration update
    static serviceConfigUpdate() {
        return {
            state: 'worker is ready to receive service updates',
            uponReceiving: 'a service configuration update',
            withRequest: {
                method: 'POST',
                path: '/api/workers/config-update',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': like('Bearer worker-token-123')
                },
                body: {
                    action: term({ generate: 'update', matcher: '^(create|update|delete)$' }),
                    service: {
                        id: like('service-456'),
                        nestId: like('nest-123'),
                        name: like('Updated Service'),
                        url: like('https://example.com/health'),
                        type: term({ generate: 'web', matcher: '^(web|tcp|ping|api)$' }),
                        checkInterval: like(60),
                        timeout: like(30),
                        regions: eachLike(like('us-east-1')),
                        expectedStatus: like(200),
                        enabled: like(true)
                    }
                }
            },
            willRespondWith: {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    success: true,
                    workerId: like('worker-001'),
                    message: like('Service configuration updated')
                }
            }
        };
    }
    // Workers -> Admin API: Status report
    static statusReport() {
        return {
            state: 'admin API is ready to receive status reports',
            uponReceiving: 'a status report from worker',
            withRequest: {
                method: 'POST',
                path: '/api/admin/status-report',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': like('Bearer worker-token-123')
                },
                body: {
                    workerId: like('worker-001'),
                    region: like('us-east-1'),
                    timestamp: like('2024-01-15T10:30:00Z'),
                    checks: eachLike({
                        serviceId: like('service-456'),
                        status: term({ generate: 'up', matcher: '^(up|down|timeout|error)$' }),
                        responseTime: like(150),
                        statusCode: like(200),
                        error: like(null),
                        metadata: {
                            redirectCount: like(0),
                            dnsTime: like(10),
                            connectTime: like(50),
                            tlsTime: like(30)
                        }
                    })
                }
            },
            willRespondWith: {
                status: 202,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    accepted: true,
                    processed: like('2024-01-15T10:30:01Z')
                }
            }
        };
    }
    // Public API -> Workers: Real-time status request
    static realtimeStatusRequest() {
        return {
            state: 'worker has current status data',
            uponReceiving: 'a real-time status request',
            withRequest: {
                method: 'GET',
                path: '/api/status/realtime',
                query: {
                    nestId: like('nest-123'),
                    serviceIds: like('service-456,service-789')
                },
                headers: {
                    'Authorization': like('Bearer api-token-456')
                }
            },
            willRespondWith: {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    timestamp: like('2024-01-15T10:30:00Z'),
                    services: eachLike({
                        id: like('service-456'),
                        status: term({ generate: 'up', matcher: '^(up|down|degraded|checking)$' }),
                        lastCheck: like('2024-01-15T10:29:45Z'),
                        nextCheck: like('2024-01-15T10:30:45Z'),
                        regions: eachLike({
                            id: like('us-east-1'),
                            status: term({ generate: 'up', matcher: '^(up|down|degraded)$' }),
                            responseTime: like(120),
                            lastCheck: like('2024-01-15T10:29:45Z')
                        })
                    })
                }
            }
        };
    }
    // Workers -> External Services: Health check
    static externalHealthCheck() {
        return {
            state: 'external service is responding normally',
            uponReceiving: 'a health check request',
            withRequest: {
                method: 'GET',
                path: '/health',
                headers: {
                    'User-Agent': term({
                        generate: 'GuardAnt-Monitor/1.0',
                        matcher: '^GuardAnt-Monitor\/[0-9]+\\.[0-9]+$'
                    })
                }
            },
            willRespondWith: {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: {
                    status: like('healthy'),
                    timestamp: like('2024-01-15T10:30:00Z'),
                    version: like('1.2.3'),
                    uptime: like(3600)
                }
            }
        };
    }
    // Admin API -> Public API: Incident synchronization
    static incidentSync() {
        return {
            state: 'nest has active incidents',
            uponReceiving: 'a request for incident updates',
            withRequest: {
                method: 'GET',
                path: '/api/incidents/sync',
                query: {
                    nestId: like('nest-123'),
                    since: like('2024-01-15T09:00:00Z')
                },
                headers: {
                    'Authorization': like('Bearer sync-token-789')
                }
            },
            willRespondWith: {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    incidents: eachLike({
                        id: like('incident-789'),
                        title: like('Database Performance Issues'),
                        description: like('Experiencing slow response times'),
                        status: term({ generate: 'investigating', matcher: '^(investigating|identified|monitoring|resolved)$' }),
                        severity: term({ generate: 'major', matcher: '^(critical|major|minor|maintenance)$' }),
                        affectedServices: eachLike(like('service-456')),
                        createdAt: like('2024-01-15T09:00:00Z'),
                        updatedAt: like('2024-01-15T10:15:00Z'),
                        updates: eachLike({
                            id: like('update-123'),
                            message: like('We are investigating the issue'),
                            status: like('investigating'),
                            timestamp: like('2024-01-15T09:15:00Z')
                        })
                    }),
                    lastSync: like('2024-01-15T10:30:00Z')
                }
            }
        };
    }
}
exports.GuardAntInteractions = GuardAntInteractions;
//# sourceMappingURL=pact-consumer.js.map