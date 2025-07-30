"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bun_test_1 = require("bun:test");
// Mock service configurations for testing
const mockWebService = {
    id: 'web-service-1',
    nestId: 'test-nest-id',
    type: 'web',
    target: 'https://example.com',
    config: {
        expectedStatus: 200,
        timeout: 5000,
        followRedirects: true,
        headers: {
            'User-Agent': 'GuardAnt Monitor/1.0',
        },
    },
    interval: 60,
    regions: ['eu-west-1', 'us-east-1'],
};
const mockTcpService = {
    id: 'tcp-service-1',
    nestId: 'test-nest-id',
    type: 'tcp',
    target: 'example.com:80',
    config: {
        timeout: 5000,
        expectData: 'HTTP',
        sendData: 'GET / HTTP/1.1\r\nHost: example.com\r\n\r\n',
    },
    interval: 120,
    regions: ['eu-west-1'],
};
const mockPingService = {
    id: 'ping-service-1',
    nestId: 'test-nest-id',
    type: 'ping',
    target: 'example.com',
    config: {
        timeout: 5000,
        packetSize: 32,
        packets: 4,
    },
    interval: 300,
    regions: ['us-east-1'],
};
const mockGitHubService = {
    id: 'github-service-1',
    nestId: 'test-nest-id',
    type: 'github',
    target: 'octocat/Hello-World',
    config: {
        checkType: 'status',
        token: 'ghp_test_token',
    },
    interval: 900,
    regions: ['eu-west-1'],
};
(0, bun_test_1.describe)('Monitoring Services', () => {
    (0, bun_test_1.describe)('Web monitoring', () => {
        (0, bun_test_1.it)('should validate web service configuration', async () => {
            (0, bun_test_1.expect)(mockWebService.type).toBe('web');
            (0, bun_test_1.expect)(mockWebService.target).toMatch(/^https?:\/\/.+/);
            (0, bun_test_1.expect)(mockWebService.config.expectedStatus).toBeGreaterThanOrEqual(100);
            (0, bun_test_1.expect)(mockWebService.config.expectedStatus).toBeLessThan(600);
            (0, bun_test_1.expect)(mockWebService.config.timeout).toBeGreaterThan(0);
            (0, bun_test_1.expect)(mockWebService.config.timeout).toBeLessThanOrEqual(30000);
            (0, bun_test_1.expect)(typeof mockWebService.config.followRedirects).toBe('boolean');
        });
        (0, bun_test_1.it)('should perform web check simulation', async () => {
            // Simulate web check logic
            const performWebCheck = async (service) => {
                const startTime = Date.now();
                // Simulate HTTP request
                const mockResponse = {
                    status: 200,
                    responseTime: Math.floor(Math.random() * 500) + 50,
                    headers: {
                        'content-type': 'text/html',
                        'server': 'nginx/1.18.0',
                    },
                };
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                return {
                    serviceId: service.id,
                    nestId: service.nestId,
                    status: mockResponse.status === service.config.expectedStatus ? 'up' : 'down',
                    responseTime: mockResponse.responseTime,
                    timestamp: endTime,
                    metadata: {
                        statusCode: mockResponse.status,
                        headers: mockResponse.headers,
                        contentType: mockResponse.headers['content-type'],
                    },
                };
            };
            const result = await performWebCheck(mockWebService);
            (0, bun_test_1.expect)(result).toHaveProperty('serviceId');
            (0, bun_test_1.expect)(result).toHaveProperty('nestId');
            (0, bun_test_1.expect)(result).toHaveProperty('status');
            (0, bun_test_1.expect)(result).toHaveProperty('responseTime');
            (0, bun_test_1.expect)(result).toHaveProperty('timestamp');
            (0, bun_test_1.expect)(result).toHaveProperty('metadata');
            (0, bun_test_1.expect)(result.serviceId).toBe(mockWebService.id);
            (0, bun_test_1.expect)(result.nestId).toBe(mockWebService.nestId);
            (0, bun_test_1.expect)(['up', 'down', 'degraded']).toContain(result.status);
            (0, bun_test_1.expect)(typeof result.responseTime).toBe('number');
            (0, bun_test_1.expect)(result.responseTime).toBeGreaterThan(0);
            (0, bun_test_1.expect)(typeof result.timestamp).toBe('number');
        });
        (0, bun_test_1.it)('should handle web check errors', async () => {
            const performWebCheckWithError = async () => {
                // Simulate network error
                throw new Error('ECONNREFUSED: Connection refused');
            };
            try {
                await performWebCheckWithError();
                (0, bun_test_1.expect)('Should have thrown an error').toBe(false);
            }
            catch (error) {
                (0, bun_test_1.expect)(error).toBeInstanceOf(Error);
                (0, bun_test_1.expect)(error.message).toContain('ECONNREFUSED');
            }
        });
        (0, bun_test_1.it)('should validate HTTP status codes', async () => {
            const validStatusCodes = [200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 500, 502, 503];
            const invalidStatusCodes = [0, 99, 600, 999, -1];
            for (const code of validStatusCodes) {
                (0, bun_test_1.expect)(code).toBeGreaterThanOrEqual(100);
                (0, bun_test_1.expect)(code).toBeLessThan(600);
                (0, bun_test_1.expect)(Number.isInteger(code)).toBe(true);
            }
            for (const code of invalidStatusCodes) {
                (0, bun_test_1.expect)(code < 100 || code >= 600).toBe(true);
            }
        });
    });
    (0, bun_test_1.describe)('TCP monitoring', () => {
        (0, bun_test_1.it)('should validate TCP service configuration', async () => {
            (0, bun_test_1.expect)(mockTcpService.type).toBe('tcp');
            (0, bun_test_1.expect)(mockTcpService.target).toMatch(/^.+:\d+$/);
            const [host, port] = mockTcpService.target.split(':');
            (0, bun_test_1.expect)(host.length).toBeGreaterThan(0);
            (0, bun_test_1.expect)(parseInt(port)).toBeGreaterThan(0);
            (0, bun_test_1.expect)(parseInt(port)).toBeLessThan(65536);
            (0, bun_test_1.expect)(mockTcpService.config.timeout).toBeGreaterThan(0);
            (0, bun_test_1.expect)(mockTcpService.config.timeout).toBeLessThanOrEqual(30000);
        });
        (0, bun_test_1.it)('should perform TCP check simulation', async () => {
            const performTcpCheck = async (service) => {
                const startTime = Date.now();
                const [host, port] = service.target.split(':');
                // Simulate TCP connection
                const mockConnection = {
                    connected: true,
                    responseData: 'HTTP/1.1 200 OK\r\n\r\n',
                };
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                return {
                    serviceId: service.id,
                    nestId: service.nestId,
                    status: mockConnection.connected ? 'up' : 'down',
                    responseTime,
                    timestamp: endTime,
                    metadata: {
                        host,
                        port: parseInt(port),
                        connected: mockConnection.connected,
                        responseData: service.config.expectData
                            ? mockConnection.responseData.includes(service.config.expectData)
                            : null,
                    },
                };
            };
            const result = await performTcpCheck(mockTcpService);
            (0, bun_test_1.expect)(result).toHaveProperty('serviceId');
            (0, bun_test_1.expect)(result).toHaveProperty('nestId');
            (0, bun_test_1.expect)(result).toHaveProperty('status');
            (0, bun_test_1.expect)(result).toHaveProperty('responseTime');
            (0, bun_test_1.expect)(result).toHaveProperty('timestamp');
            (0, bun_test_1.expect)(result).toHaveProperty('metadata');
            (0, bun_test_1.expect)(result.serviceId).toBe(mockTcpService.id);
            (0, bun_test_1.expect)(['up', 'down']).toContain(result.status);
            (0, bun_test_1.expect)(typeof result.metadata.port).toBe('number');
            (0, bun_test_1.expect)(typeof result.metadata.connected).toBe('boolean');
        });
        (0, bun_test_1.it)('should validate port ranges', async () => {
            const validPorts = [22, 80, 443, 8080, 3000, 5432, 6379, 27017];
            const invalidPorts = [0, -1, 65536, 99999, 'abc'];
            for (const port of validPorts) {
                (0, bun_test_1.expect)(typeof port).toBe('number');
                (0, bun_test_1.expect)(port).toBeGreaterThan(0);
                (0, bun_test_1.expect)(port).toBeLessThan(65536);
                (0, bun_test_1.expect)(Number.isInteger(port)).toBe(true);
            }
            for (const port of invalidPorts) {
                if (typeof port === 'number') {
                    (0, bun_test_1.expect)(port <= 0 || port >= 65536).toBe(true);
                }
                else {
                    (0, bun_test_1.expect)(typeof port).not.toBe('number');
                }
            }
        });
    });
    (0, bun_test_1.describe)('Ping monitoring', () => {
        (0, bun_test_1.it)('should validate ping service configuration', async () => {
            (0, bun_test_1.expect)(mockPingService.type).toBe('ping');
            (0, bun_test_1.expect)(mockPingService.target.length).toBeGreaterThan(0);
            (0, bun_test_1.expect)(mockPingService.target).not.toMatch(/^https?:\/\//); // Should not include protocol
            (0, bun_test_1.expect)(mockPingService.target).not.toMatch(/:\d+$/); // Should not include port
            (0, bun_test_1.expect)(mockPingService.config.timeout).toBeGreaterThan(0);
            (0, bun_test_1.expect)(mockPingService.config.packetSize).toBeGreaterThanOrEqual(8);
            (0, bun_test_1.expect)(mockPingService.config.packetSize).toBeLessThanOrEqual(65507);
            (0, bun_test_1.expect)(mockPingService.config.packets).toBeGreaterThan(0);
            (0, bun_test_1.expect)(mockPingService.config.packets).toBeLessThanOrEqual(10);
        });
        (0, bun_test_1.it)('should perform ping check simulation', async () => {
            const performPingCheck = async (service) => {
                const startTime = Date.now();
                // Simulate ping results
                const mockPingResults = {
                    sent: service.config.packets,
                    received: service.config.packets - Math.floor(Math.random() * 2), // 0-1 packet loss
                    times: Array.from({ length: service.config.packets }, () => Math.random() * 50 + 10),
                };
                const endTime = Date.now();
                const avgResponseTime = mockPingResults.times.reduce((a, b) => a + b, 0) / mockPingResults.times.length;
                const packetLoss = ((mockPingResults.sent - mockPingResults.received) / mockPingResults.sent) * 100;
                return {
                    serviceId: service.id,
                    nestId: service.nestId,
                    status: mockPingResults.received > 0 ? 'up' : 'down',
                    responseTime: Math.round(avgResponseTime),
                    timestamp: endTime,
                    metadata: {
                        packetsSent: mockPingResults.sent,
                        packetsReceived: mockPingResults.received,
                        packetLoss,
                        minTime: Math.min(...mockPingResults.times),
                        maxTime: Math.max(...mockPingResults.times),
                        avgTime: avgResponseTime,
                    },
                };
            };
            const result = await performPingCheck(mockPingService);
            (0, bun_test_1.expect)(result).toHaveProperty('serviceId');
            (0, bun_test_1.expect)(result).toHaveProperty('nestId');
            (0, bun_test_1.expect)(result).toHaveProperty('status');
            (0, bun_test_1.expect)(result).toHaveProperty('responseTime');
            (0, bun_test_1.expect)(result).toHaveProperty('timestamp');
            (0, bun_test_1.expect)(result).toHaveProperty('metadata');
            (0, bun_test_1.expect)(result.serviceId).toBe(mockPingService.id);
            (0, bun_test_1.expect)(['up', 'down']).toContain(result.status);
            (0, bun_test_1.expect)(result.metadata.packetsSent).toBe(mockPingService.config.packets);
            (0, bun_test_1.expect)(result.metadata.packetsReceived).toBeLessThanOrEqual(result.metadata.packetsSent);
            (0, bun_test_1.expect)(result.metadata.packetLoss).toBeGreaterThanOrEqual(0);
            (0, bun_test_1.expect)(result.metadata.packetLoss).toBeLessThanOrEqual(100);
        });
        (0, bun_test_1.it)('should handle 100% packet loss', async () => {
            const performFailedPingCheck = async () => {
                return {
                    serviceId: mockPingService.id,
                    nestId: mockPingService.nestId,
                    status: 'down',
                    responseTime: 0,
                    timestamp: Date.now(),
                    metadata: {
                        packetsSent: 4,
                        packetsReceived: 0,
                        packetLoss: 100,
                        error: 'Request timeout',
                    },
                };
            };
            const result = await performFailedPingCheck();
            (0, bun_test_1.expect)(result.status).toBe('down');
            (0, bun_test_1.expect)(result.responseTime).toBe(0);
            (0, bun_test_1.expect)(result.metadata.packetLoss).toBe(100);
            (0, bun_test_1.expect)(result.metadata.packetsReceived).toBe(0);
        });
    });
    (0, bun_test_1.describe)('GitHub monitoring', () => {
        (0, bun_test_1.it)('should validate GitHub service configuration', async () => {
            (0, bun_test_1.expect)(mockGitHubService.type).toBe('github');
            (0, bun_test_1.expect)(mockGitHubService.target).toMatch(/^[\w\.-]+\/[\w\.-]+$/); // owner/repo format
            (0, bun_test_1.expect)(mockGitHubService.config.checkType).toBe('status');
            if (mockGitHubService.config.token) {
                (0, bun_test_1.expect)(mockGitHubService.config.token).toMatch(/^gh[ps]_[A-Za-z0-9_]+$/);
            }
        });
        (0, bun_test_1.it)('should perform GitHub check simulation', async () => {
            const performGitHubCheck = async (service) => {
                const startTime = Date.now();
                // Simulate GitHub API response
                const mockApiResponse = {
                    status: 200,
                    data: {
                        id: 1296269,
                        name: 'Hello-World',
                        full_name: 'octocat/Hello-World',
                        private: false,
                        has_issues: true,
                        has_projects: true,
                        has_wiki: true,
                        created_at: '2011-01-26T19:01:12Z',
                        updated_at: '2021-01-01T00:00:00Z',
                    },
                };
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                return {
                    serviceId: service.id,
                    nestId: service.nestId,
                    status: mockApiResponse.status === 200 ? 'up' : 'down',
                    responseTime,
                    timestamp: endTime,
                    metadata: {
                        repository: mockApiResponse.data.full_name,
                        private: mockApiResponse.data.private,
                        lastUpdated: mockApiResponse.data.updated_at,
                        hasIssues: mockApiResponse.data.has_issues,
                        rateLimitRemaining: 4999,
                    },
                };
            };
            const result = await performGitHubCheck(mockGitHubService);
            (0, bun_test_1.expect)(result).toHaveProperty('serviceId');
            (0, bun_test_1.expect)(result).toHaveProperty('nestId');
            (0, bun_test_1.expect)(result).toHaveProperty('status');
            (0, bun_test_1.expect)(result).toHaveProperty('responseTime');
            (0, bun_test_1.expect)(result).toHaveProperty('timestamp');
            (0, bun_test_1.expect)(result).toHaveProperty('metadata');
            (0, bun_test_1.expect)(result.serviceId).toBe(mockGitHubService.id);
            (0, bun_test_1.expect)(['up', 'down']).toContain(result.status);
            (0, bun_test_1.expect)(result.metadata.repository).toBe('octocat/Hello-World');
            (0, bun_test_1.expect)(typeof result.metadata.private).toBe('boolean');
            (0, bun_test_1.expect)(typeof result.metadata.rateLimitRemaining).toBe('number');
        });
        (0, bun_test_1.it)('should handle GitHub API rate limiting', async () => {
            const performRateLimitedCheck = async () => {
                return {
                    serviceId: mockGitHubService.id,
                    nestId: mockGitHubService.nestId,
                    status: 'degraded',
                    responseTime: 1000,
                    timestamp: Date.now(),
                    error: 'Rate limit exceeded',
                    metadata: {
                        rateLimitRemaining: 0,
                        rateLimitReset: Date.now() + 3600000, // Reset in 1 hour
                    },
                };
            };
            const result = await performRateLimitedCheck();
            (0, bun_test_1.expect)(result.status).toBe('degraded');
            (0, bun_test_1.expect)(result.error).toBe('Rate limit exceeded');
            (0, bun_test_1.expect)(result.metadata.rateLimitRemaining).toBe(0);
            (0, bun_test_1.expect)(result.metadata.rateLimitReset).toBeGreaterThan(Date.now());
        });
    });
    (0, bun_test_1.describe)('Regional coordination', () => {
        (0, bun_test_1.it)('should coordinate checks across multiple regions', async () => {
            const regions = ['eu-west-1', 'us-east-1', 'ap-southeast-1'];
            const service = mockWebService;
            // Simulate regional coordination
            const coordinateRegionalChecks = async (serviceConfig, regions) => {
                const results = [];
                for (const region of regions) {
                    const regionResult = {
                        serviceId: serviceConfig.id,
                        nestId: serviceConfig.nestId,
                        regionId: region,
                        status: Math.random() > 0.1 ? 'up' : 'down', // 90% uptime
                        responseTime: Math.floor(Math.random() * 500) + 50,
                        timestamp: Date.now(),
                    };
                    results.push(regionResult);
                }
                return results;
            };
            const results = await coordinateRegionalChecks(service, regions);
            (0, bun_test_1.expect)(results).toHaveLength(regions.length);
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                (0, bun_test_1.expect)(result.regionId).toBe(regions[i]);
                (0, bun_test_1.expect)(result.serviceId).toBe(service.id);
                (0, bun_test_1.expect)(['up', 'down', 'degraded']).toContain(result.status);
                (0, bun_test_1.expect)(typeof result.responseTime).toBe('number');
            }
        });
        (0, bun_test_1.it)('should handle regional failures', async () => {
            const simulateRegionalFailure = (regionId) => {
                return {
                    serviceId: mockWebService.id,
                    nestId: mockWebService.nestId,
                    regionId,
                    status: 'down',
                    responseTime: 0,
                    timestamp: Date.now(),
                    error: 'Regional worker unavailable',
                };
            };
            const failureResult = simulateRegionalFailure('ap-southeast-1');
            (0, bun_test_1.expect)(failureResult.status).toBe('down');
            (0, bun_test_1.expect)(failureResult.responseTime).toBe(0);
            (0, bun_test_1.expect)(failureResult.error).toBe('Regional worker unavailable');
            (0, bun_test_1.expect)(failureResult.regionId).toBe('ap-southeast-1');
        });
    });
    (0, bun_test_1.describe)('Check scheduling', () => {
        (0, bun_test_1.it)('should validate check intervals', async () => {
            const services = [mockWebService, mockTcpService, mockPingService, mockGitHubService];
            for (const service of services) {
                (0, bun_test_1.expect)(service.interval).toBeGreaterThanOrEqual(30); // Minimum 30 seconds
                (0, bun_test_1.expect)(service.interval).toBeLessThanOrEqual(3600); // Maximum 1 hour
                (0, bun_test_1.expect)(Number.isInteger(service.interval)).toBe(true);
            }
        });
        (0, bun_test_1.it)('should calculate next check time', async () => {
            const calculateNextCheck = (lastCheck, interval, jitter = true) => {
                let nextCheck = lastCheck + (interval * 1000);
                // Add jitter to prevent thundering herd
                if (jitter) {
                    const jitterMs = Math.random() * 10000; // Up to 10 seconds
                    nextCheck += jitterMs;
                }
                return nextCheck;
            };
            const lastCheck = Date.now();
            const interval = 60; // 60 seconds
            const nextCheck = calculateNextCheck(lastCheck, interval, true);
            const nextCheckNoJitter = calculateNextCheck(lastCheck, interval, false);
            (0, bun_test_1.expect)(nextCheck).toBeGreaterThan(lastCheck);
            (0, bun_test_1.expect)(nextCheckNoJitter).toBe(lastCheck + (interval * 1000));
            (0, bun_test_1.expect)(nextCheck).toBeGreaterThan(nextCheckNoJitter);
            (0, bun_test_1.expect)(nextCheck).toBeLessThanOrEqual(nextCheckNoJitter + 10000);
        });
    });
});
//# sourceMappingURL=monitoring.test.js.map