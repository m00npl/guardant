"use strict";
/**
 * Comprehensive health check system for GuardAnt services
 * Provides detailed health status information including dependencies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonHealthChecks = exports.HealthChecker = void 0;
exports.createHealthMiddleware = createHealthMiddleware;
exports.createHealthEndpoints = createHealthEndpoints;
class HealthChecker {
    constructor(serviceName, version = '1.0.0') {
        this.serviceName = serviceName;
        this.version = version;
        this.startTime = Date.now();
        this.checks = new Map();
        this.requestCounts = {
            total: 0,
            errors: 0,
            lastReset: Date.now(),
        };
    }
    // Register a health check
    addCheck(name, check) {
        this.checks.set(name, check);
    }
    // Remove a health check
    removeCheck(name) {
        this.checks.delete(name);
    }
    // Track request metrics
    trackRequest(isError = false) {
        this.requestCounts.total++;
        if (isError) {
            this.requestCounts.errors++;
        }
        // Reset counters every hour
        const hourAgo = Date.now() - 60 * 60 * 1000;
        if (this.requestCounts.lastReset < hourAgo) {
            this.requestCounts = {
                total: 0,
                errors: 0,
                lastReset: Date.now(),
            };
        }
    }
    // Get memory usage
    getMemoryUsage() {
        const usage = process.memoryUsage();
        const total = usage.heapTotal;
        const used = usage.heapUsed;
        return {
            used,
            total,
            percentage: Math.round((used / total) * 100),
        };
    }
    // Get CPU usage (basic estimate)
    getCpuUsage() {
        return new Promise((resolve) => {
            const startUsage = process.cpuUsage();
            setTimeout(() => {
                const endUsage = process.cpuUsage(startUsage);
                const totalUsage = endUsage.user + endUsage.system;
                const percentage = Math.round((totalUsage / 1000000) * 100); // Convert to percentage
                resolve(Math.min(percentage, 100));
            }, 100);
        });
    }
    // Run all health checks
    async runHealthChecks() {
        const checkResults = {};
        const checkPromises = [];
        // Run all checks in parallel
        for (const [name, check] of this.checks.entries()) {
            checkPromises.push((async () => {
                const startTime = performance.now();
                try {
                    const result = await Promise.race([
                        check(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 10000)),
                    ]);
                    checkResults[name] = {
                        ...result,
                        duration: performance.now() - startTime,
                    };
                }
                catch (error) {
                    checkResults[name] = {
                        status: 'unhealthy',
                        timestamp: Date.now(),
                        duration: performance.now() - startTime,
                        error: error instanceof Error ? error.message : String(error),
                    };
                }
            })());
        }
        await Promise.all(checkPromises);
        // Determine overall status
        const statuses = Object.values(checkResults).map(r => r.status);
        let overallStatus;
        if (statuses.includes('unhealthy')) {
            overallStatus = 'unhealthy';
        }
        else if (statuses.includes('degraded')) {
            overallStatus = 'degraded';
        }
        else {
            overallStatus = 'healthy';
        }
        // Get system metrics
        const memory = this.getMemoryUsage();
        const cpu = await this.getCpuUsage();
        const uptime = Date.now() - this.startTime;
        // Calculate request rates
        const timeSinceReset = Date.now() - this.requestCounts.lastReset;
        const requestRate = timeSinceReset > 0 ? (this.requestCounts.total / (timeSinceReset / 1000)) : 0;
        const errorRate = this.requestCounts.total > 0 ? (this.requestCounts.errors / this.requestCounts.total) * 100 : 0;
        return {
            service: this.serviceName,
            version: this.version,
            status: overallStatus,
            timestamp: Date.now(),
            uptime,
            checks: checkResults,
            metrics: {
                memory,
                cpu: { usage: cpu },
                requests: {
                    total: this.requestCounts.total,
                    rate: Math.round(requestRate * 100) / 100,
                    errors: this.requestCounts.errors,
                    errorRate: Math.round(errorRate * 100) / 100,
                },
            },
        };
    }
    // Get basic health status (lightweight)
    getBasicHealth() {
        return {
            status: 'healthy',
            timestamp: Date.now(),
            uptime: Date.now() - this.startTime,
        };
    }
}
exports.HealthChecker = HealthChecker;
// Common health checks
exports.commonHealthChecks = {
    // Redis connection check
    redis: (client) => async () => {
        const startTime = performance.now();
        try {
            await client.ping();
            return {
                status: 'healthy',
                timestamp: Date.now(),
                duration: performance.now() - startTime,
                details: {
                    connected: true,
                    host: client.options.host,
                    port: client.options.port,
                },
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                timestamp: Date.now(),
                duration: performance.now() - startTime,
                error: error instanceof Error ? error.message : String(error),
                details: {
                    connected: false,
                    host: client.options?.host,
                    port: client.options?.port,
                },
            };
        }
    },
    // RabbitMQ connection check
    rabbitmq: (connection, channel) => async () => {
        const startTime = performance.now();
        try {
            if (!connection || !channel) {
                throw new Error('RabbitMQ connection or channel not available');
            }
            // Try to assert a temporary queue to test connection
            const testQueue = `health_check_${Date.now()}`;
            await channel.assertQueue(testQueue, { exclusive: true, autoDelete: true });
            await channel.deleteQueue(testQueue);
            return {
                status: 'healthy',
                timestamp: Date.now(),
                duration: performance.now() - startTime,
                details: {
                    connected: true,
                    channels: 1,
                },
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                timestamp: Date.now(),
                duration: performance.now() - startTime,
                error: error instanceof Error ? error.message : String(error),
                details: {
                    connected: false,
                },
            };
        }
    },
    // Database check (generic)
    database: (checkFn, name = 'database') => async () => {
        const startTime = performance.now();
        try {
            await checkFn();
            return {
                status: 'healthy',
                timestamp: Date.now(),
                duration: performance.now() - startTime,
                details: {
                    name,
                    connected: true,
                },
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                timestamp: Date.now(),
                duration: performance.now() - startTime,
                error: error instanceof Error ? error.message : String(error),
                details: {
                    name,
                    connected: false,
                },
            };
        }
    },
    // HTTP service check
    httpService: (url, timeout = 5000) => async () => {
        const startTime = performance.now();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const status = response.status >= 200 && response.status < 400 ? 'healthy' : 'degraded';
            return {
                status,
                timestamp: Date.now(),
                duration: performance.now() - startTime,
                details: {
                    url,
                    statusCode: response.status,
                    ok: response.ok,
                },
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                timestamp: Date.now(),
                duration: performance.now() - startTime,
                error: error instanceof Error ? error.message : String(error),
                details: {
                    url,
                },
            };
        }
    },
    // Storage check
    storage: (testFn, name = 'storage') => async () => {
        const startTime = performance.now();
        try {
            await testFn();
            return {
                status: 'healthy',
                timestamp: Date.now(),
                duration: performance.now() - startTime,
                details: {
                    name,
                    accessible: true,
                },
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                timestamp: Date.now(),
                duration: performance.now() - startTime,
                error: error instanceof Error ? error.message : String(error),
                details: {
                    name,
                    accessible: false,
                },
            };
        }
    },
};
// Health check middleware for Hono
function createHealthMiddleware(healthChecker) {
    return (c, next) => {
        // Track request
        healthChecker.trackRequest();
        return next().catch((error) => {
            // Track error
            healthChecker.trackRequest(true);
            throw error;
        });
    };
}
// Create health endpoints
function createHealthEndpoints(healthChecker) {
    return {
        // Basic health check (fast)
        basic: (c) => {
            const health = healthChecker.getBasicHealth();
            return c.json(health);
        },
        // Detailed health check (with dependency checks)
        detailed: async (c) => {
            try {
                const health = await healthChecker.runHealthChecks();
                const statusCode = health.status === 'healthy' ? 200 :
                    health.status === 'degraded' ? 200 : 503;
                return c.json(health, statusCode);
            }
            catch (error) {
                return c.json({
                    service: healthChecker.serviceName,
                    status: 'unhealthy',
                    timestamp: Date.now(),
                    error: error instanceof Error ? error.message : String(error),
                }, 503);
            }
        },
        // Readiness check (for Kubernetes)
        ready: async (c) => {
            try {
                const health = await healthChecker.runHealthChecks();
                if (health.status === 'unhealthy') {
                    return c.json({ ready: false, reason: 'Service unhealthy' }, 503);
                }
                return c.json({ ready: true });
            }
            catch (error) {
                return c.json({
                    ready: false,
                    reason: error instanceof Error ? error.message : String(error),
                }, 503);
            }
        },
        // Liveness check (for Kubernetes)
        live: (c) => {
            return c.json({ alive: true });
        },
    };
}
//# sourceMappingURL=health.js.map