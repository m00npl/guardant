"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringService = void 0;
const local_cache_1 = require("../local-cache");
const uuid_1 = require("uuid");
class MonitoringService {
    constructor(region = process.env.WORKER_REGION || 'unknown') {
        this.region = region;
    }
    async checkService(service) {
        const startTime = Date.now();
        try {
            const result = await this.performCheck(service, startTime);
            // Store result in local cache (will send to RabbitMQ or cache locally if connection failed)
            await this.storeCheckResult(service, result, startTime);
            return result;
        }
        catch (error) {
            const failedResult = {
                status: 'down',
                message: error.message || 'Check failed',
                responseTime: Date.now() - startTime,
            };
            // Store failed result too
            await this.storeCheckResult(service, failedResult, startTime);
            return failedResult;
        }
    }
    async performCheck(service, startTime) {
        switch (service.type) {
            case 'web':
                return await this.checkWeb(service, startTime);
            case 'tcp':
                return await this.checkTcp(service, startTime);
            case 'ping':
                return await this.checkPing(service, startTime);
            case 'github':
                return await this.checkGitHub(service, startTime);
            case 'uptime-api':
                return await this.checkUptimeApi(service, startTime);
            case 'keyword':
                return await this.checkKeyword(service, startTime);
            case 'heartbeat':
                return await this.checkHeartbeat(service, startTime);
            case 'port':
                return await this.checkPort(service, startTime);
            default:
                throw new Error(`Unknown service type: ${service.type}`);
        }
    }
    async storeCheckResult(service, result, startTime) {
        try {
            await local_cache_1.localCache.storeCheckResult({
                id: (0, uuid_1.v4)(),
                serviceId: service.id,
                nestId: service.nestId,
                timestamp: startTime,
                region: this.region,
                status: result.status,
                responseTime: result.responseTime || 0,
                statusCode: result.details?.statusCode,
                error: result.message,
            });
        }
        catch (error) {
            console.error('❌ Failed to store check result:', error);
            // Don't throw - monitoring should continue even if storage fails
        }
    }
    async checkWeb(service, startTime) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
            const response = await fetch(service.target, {
                method: 'HEAD',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Guardant/1.0 (https://guardant.me)',
                },
            });
            clearTimeout(timeout);
            const responseTime = Date.now() - startTime;
            if (response.ok) {
                return {
                    status: 'up',
                    responseTime,
                    message: `HTTP ${response.status}`,
                };
            }
            else {
                return {
                    status: response.status >= 500 ? 'down' : 'degraded',
                    responseTime,
                    message: `HTTP ${response.status}`,
                };
            }
        }
        catch (error) {
            throw new Error(`Web check failed: ${error.message}`);
        }
    }
    async checkTcp(service, startTime) {
        // TCP check implementation
        // For now, return a placeholder
        return {
            status: 'up',
            responseTime: Date.now() - startTime,
            message: 'TCP check not implemented',
        };
    }
    async checkPing(service, startTime) {
        // ICMP ping implementation
        // For now, return a placeholder
        return {
            status: 'up',
            responseTime: Date.now() - startTime,
            message: 'Ping check not implemented',
        };
    }
    async checkGitHub(service, startTime) {
        try {
            const headers = {
                'User-Agent': 'Guardant/1.0',
            };
            if (service.config.token) {
                headers['Authorization'] = `token ${service.config.token}`;
            }
            const response = await fetch(`https://api.github.com/repos/${service.target}`, {
                headers,
            });
            const responseTime = Date.now() - startTime;
            if (response.ok) {
                const data = await response.json();
                return {
                    status: 'up',
                    responseTime,
                    message: 'Repository accessible',
                    details: {
                        stars: data.stargazers_count,
                        forks: data.forks_count,
                        openIssues: data.open_issues_count,
                    },
                };
            }
            else if (response.status === 404) {
                return {
                    status: 'down',
                    responseTime,
                    message: 'Repository not found',
                };
            }
            else {
                return {
                    status: 'degraded',
                    responseTime,
                    message: `GitHub API returned ${response.status}`,
                };
            }
        }
        catch (error) {
            throw new Error(`GitHub check failed: ${error.message}`);
        }
    }
    async checkUptimeApi(service, startTime) {
        // Uptime API check implementation
        return {
            status: 'up',
            responseTime: Date.now() - startTime,
            message: 'Uptime API check not implemented',
        };
    }
    async checkKeyword(service, startTime) {
        try {
            const response = await fetch(service.target);
            const text = await response.text();
            const responseTime = Date.now() - startTime;
            const keyword = service.config.keyword;
            const shouldContain = service.config.shouldContain !== false;
            const caseSensitive = service.config.caseSensitive === true;
            const content = caseSensitive ? text : text.toLowerCase();
            const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();
            const found = content.includes(searchKeyword);
            if ((shouldContain && found) || (!shouldContain && !found)) {
                return {
                    status: 'up',
                    responseTime,
                    message: shouldContain ? 'Keyword found' : 'Keyword not found (as expected)',
                };
            }
            else {
                return {
                    status: 'down',
                    responseTime,
                    message: shouldContain ? 'Keyword not found' : 'Keyword found (unexpected)',
                };
            }
        }
        catch (error) {
            throw new Error(`Keyword check failed: ${error.message}`);
        }
    }
    async checkHeartbeat(service, startTime) {
        // Check last heartbeat timestamp from Redis
        // Implementation would check if heartbeat was received within tolerance
        return {
            status: 'up',
            responseTime: Date.now() - startTime,
            message: 'Heartbeat check not implemented',
        };
    }
    async checkPort(service, startTime) {
        // Port monitoring implementation
        return {
            status: 'up',
            responseTime: Date.now() - startTime,
            message: 'Port check not implemented',
        };
    }
}
exports.MonitoringService = MonitoringService;
//# sourceMappingURL=monitoring.js.map