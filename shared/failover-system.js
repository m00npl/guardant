"use strict";
/**
 * GuardAnt Automatic Failover System
 * High-availability orchestration with intelligent failover detection,
 * automated service recovery, and traffic routing for multi-tenant monitoring platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailoverSystemManager = exports.FailoverStatus = exports.RecoveryType = exports.TargetSelection = exports.FailoverType = exports.ConditionType = exports.ServiceStatus = void 0;
exports.createFailoverSystemManager = createFailoverSystemManager;
const events_1 = require("events");
const logger_1 = require("./logger");
const golem_adapter_1 = require("./golem-adapter");
var ServiceStatus;
(function (ServiceStatus) {
    ServiceStatus["HEALTHY"] = "healthy";
    ServiceStatus["DEGRADED"] = "degraded";
    ServiceStatus["UNHEALTHY"] = "unhealthy";
    ServiceStatus["MAINTENANCE"] = "maintenance";
    ServiceStatus["UNKNOWN"] = "unknown";
})(ServiceStatus || (exports.ServiceStatus = ServiceStatus = {}));
var ConditionType;
(function (ConditionType) {
    ConditionType["HEALTH_CHECK_FAILURE"] = "health_check_failure";
    ConditionType["RESPONSE_TIME"] = "response_time";
    ConditionType["ERROR_RATE"] = "error_rate";
    ConditionType["CPU_USAGE"] = "cpu_usage";
    ConditionType["MEMORY_USAGE"] = "memory_usage";
    ConditionType["CONNECTION_COUNT"] = "connection_count";
    ConditionType["CUSTOM_METRIC"] = "custom_metric";
})(ConditionType || (exports.ConditionType = ConditionType = {}));
var FailoverType;
(function (FailoverType) {
    FailoverType["IMMEDIATE"] = "immediate";
    FailoverType["GRADUAL"] = "gradual";
    FailoverType["BLUE_GREEN"] = "blue_green";
    FailoverType["CANARY"] = "canary";
    FailoverType["WEIGHTED_ROUND_ROBIN"] = "weighted_round_robin";
})(FailoverType || (exports.FailoverType = FailoverType = {}));
var TargetSelection;
(function (TargetSelection) {
    TargetSelection["HIGHEST_PRIORITY"] = "highest_priority";
    TargetSelection["LOWEST_LOAD"] = "lowest_load";
    TargetSelection["CLOSEST_REGION"] = "closest_region";
    TargetSelection["ROUND_ROBIN"] = "round_robin";
    TargetSelection["RANDOM"] = "random";
    TargetSelection["CUSTOM"] = "custom";
})(TargetSelection || (exports.TargetSelection = TargetSelection = {}));
var RecoveryType;
(function (RecoveryType) {
    RecoveryType["AUTOMATIC"] = "automatic";
    RecoveryType["MANUAL"] = "manual";
    RecoveryType["SCHEDULED"] = "scheduled";
    RecoveryType["HYBRID"] = "hybrid";
})(RecoveryType || (exports.RecoveryType = RecoveryType = {}));
var FailoverStatus;
(function (FailoverStatus) {
    FailoverStatus["TRIGGERED"] = "triggered";
    FailoverStatus["IN_PROGRESS"] = "in_progress";
    FailoverStatus["COMPLETED"] = "completed";
    FailoverStatus["FAILED"] = "failed";
    FailoverStatus["RECOVERING"] = "recovering";
    FailoverStatus["RECOVERED"] = "recovered";
})(FailoverStatus || (exports.FailoverStatus = FailoverStatus = {}));
class FailoverSystemManager extends events_1.EventEmitter {
    constructor(serviceName, config, golemAdapter, tracing) {
        super();
        this.serviceName = serviceName;
        this.config = config;
        this.endpoints = new Map();
        this.rules = new Map();
        this.activeFailovers = new Map();
        this.metrics = new Map();
        this.logger = (0, logger_1.createLogger)(`${serviceName}-failover`);
        this.tracing = tracing;
        // Initialize Golem adapter
        this.golemAdapter = golemAdapter || (0, golem_adapter_1.createGolemAdapter)(serviceName, golem_adapter_1.GolemUtils.createDefaultConfig(), undefined, tracing);
        if (config.enabled) {
            this.startHealthChecking();
            this.startFailoverDetection();
            this.startMetricsCleanup();
            this.setupEventListeners();
        }
    }
    // Register service endpoint
    async registerEndpoint(endpoint) {
        const span = this.tracing?.startSpan('failover.register_endpoint');
        try {
            const serviceEndpoint = {
                ...endpoint,
                id: this.generateEndpointId(),
                lastHealthCheck: new Date().toISOString(),
                currentLoad: 0
            };
            // Validate endpoint
            this.validateEndpoint(serviceEndpoint);
            // Store endpoint in Golem Base
            await this.golemAdapter.storeNestData('system', // Use system namespace for failover endpoints
            golem_adapter_1.DataType.FAILOVER_CONFIG, serviceEndpoint, {
                key: `endpoint:${serviceEndpoint.id}`,
                type: 'service-endpoint',
                region: serviceEndpoint.region
            });
            // Store in local cache
            this.endpoints.set(serviceEndpoint.id, serviceEndpoint);
            // Initialize metrics storage
            this.metrics.set(serviceEndpoint.id, []);
            // Perform initial health check
            await this.performHealthCheck(serviceEndpoint.id);
            this.logger.info('Registered service endpoint', {
                endpointId: serviceEndpoint.id,
                name: serviceEndpoint.name,
                region: serviceEndpoint.region,
                priority: serviceEndpoint.priority
            });
            this.emit('endpoint-registered', serviceEndpoint);
            span?.setTag('endpoint.id', serviceEndpoint.id);
            span?.setTag('endpoint.name', serviceEndpoint.name);
            return serviceEndpoint;
        }
        catch (error) {
            this.logger.error('Failed to register endpoint', { error, endpoint });
            span?.setTag('error', true);
            throw error;
        }
        finally {
            span?.finish();
        }
    }
    // Add failover rule
    async addFailoverRule(rule) {
        const span = this.tracing?.startSpan('failover.add_rule');
        try {
            const failoverRule = {
                ...rule,
                id: this.generateRuleId()
            };
            // Validate rule
            this.validateFailoverRule(failoverRule);
            // Store rule
            this.rules.set(failoverRule.id, failoverRule);
            this.logger.info('Added failover rule', {
                ruleId: failoverRule.id,
                name: failoverRule.name,
                strategy: failoverRule.failoverStrategy.type,
                enabled: failoverRule.enabled
            });
            this.emit('failover-rule-added', failoverRule);
            return failoverRule;
        }
        catch (error) {
            this.logger.error('Failed to add failover rule', { error, rule });
            span?.setTag('error', true);
            throw error;
        }
        finally {
            span?.finish();
        }
    }
    // Trigger manual failover
    async triggerFailover(sourceEndpointId, targetEndpointId, reason = 'Manual failover') {
        const span = this.tracing?.startSpan('failover.trigger_manual');
        try {
            const sourceEndpoint = this.endpoints.get(sourceEndpointId);
            if (!sourceEndpoint) {
                throw new Error(`Source endpoint not found: ${sourceEndpointId}`);
            }
            let targetEndpoint;
            if (targetEndpointId) {
                targetEndpoint = this.endpoints.get(targetEndpointId);
                if (!targetEndpoint) {
                    throw new Error(`Target endpoint not found: ${targetEndpointId}`);
                }
            }
            else {
                // Auto-select target based on default strategy
                targetEndpoint = this.selectFailoverTarget(sourceEndpoint);
            }
            if (!targetEndpoint) {
                throw new Error('No suitable failover target found');
            }
            // Create failover event
            const failoverEvent = {
                id: this.generateFailoverId(),
                timestamp: new Date().toISOString(),
                ruleId: 'manual',
                sourceEndpoint,
                targetEndpoint,
                triggerReason: reason,
                conditions: [],
                status: FailoverStatus.TRIGGERED,
                affectedConnections: sourceEndpoint.currentLoad,
                metadata: { type: 'manual' }
            };
            // Execute failover
            await this.executeFailover(failoverEvent);
            return failoverEvent;
        }
        catch (error) {
            this.logger.error('Manual failover failed', { error, sourceEndpointId, targetEndpointId });
            span?.setTag('error', true);
            throw error;
        }
        finally {
            span?.finish();
        }
    }
    // Get system health overview
    getSystemHealth() {
        const endpoints = Array.from(this.endpoints.values());
        const activeFailoverCount = this.activeFailovers.size;
        const healthyCount = endpoints.filter(ep => ep.status === ServiceStatus.HEALTHY).length;
        const degradedCount = endpoints.filter(ep => ep.status === ServiceStatus.DEGRADED).length;
        const unhealthyCount = endpoints.filter(ep => ep.status === ServiceStatus.UNHEALTHY).length;
        const totalCapacity = endpoints.reduce((sum, ep) => sum + ep.capacity, 0);
        const totalLoad = endpoints.reduce((sum, ep) => sum + ep.currentLoad, 0);
        return {
            overall: {
                status: unhealthyCount > 0 ? 'degraded' : healthyCount === endpoints.length ? 'healthy' : 'warning',
                totalEndpoints: endpoints.length,
                healthyEndpoints: healthyCount,
                degradedEndpoints: degradedCount,
                unhealthyEndpoints: unhealthyCount,
                activeFailovers: activeFailoverCount
            },
            capacity: {
                total: totalCapacity,
                used: totalLoad,
                utilization: totalCapacity > 0 ? (totalLoad / totalCapacity) * 100 : 0
            },
            regions: this.getRegionalHealth(endpoints),
            recentFailovers: this.getRecentFailovers(5)
        };
    }
    // Get endpoint metrics
    getEndpointMetrics(endpointId, period = 3600000) {
        const endpoint = this.endpoints.get(endpointId);
        if (!endpoint) {
            throw new Error(`Endpoint not found: ${endpointId}`);
        }
        const metrics = this.metrics.get(endpointId) || [];
        const since = Date.now() - period;
        const recentMetrics = metrics.filter(m => m.timestamp > since);
        if (recentMetrics.length === 0) {
            return {
                endpointId,
                period,
                availability: 0,
                averageResponseTime: 0,
                errorRate: 0,
                dataPoints: 0
            };
        }
        const healthyChecks = recentMetrics.filter(m => m.healthy).length;
        const avgResponseTime = recentMetrics.reduce((sum, m) => sum + (m.responseTime || 0), 0) / recentMetrics.length;
        const errorCount = recentMetrics.filter(m => !m.healthy).length;
        return {
            endpointId,
            period,
            availability: (healthyChecks / recentMetrics.length) * 100,
            averageResponseTime: avgResponseTime,
            errorRate: (errorCount / recentMetrics.length) * 100,
            dataPoints: recentMetrics.length,
            trend: this.calculateTrend(recentMetrics)
        };
    }
    // Private methods
    async performHealthCheck(endpointId) {
        const endpoint = this.endpoints.get(endpointId);
        if (!endpoint || endpoint.status === ServiceStatus.MAINTENANCE) {
            return;
        }
        const span = this.tracing?.startSpan('failover.health_check');
        span?.setTag('endpoint.id', endpointId);
        try {
            const startTime = Date.now();
            // Perform HTTP health check
            const response = await this.httpHealthCheck(endpoint);
            const responseTime = Date.now() - startTime;
            const healthy = response.ok && responseTime < this.config.healthCheckTimeout;
            // Update endpoint status
            const newStatus = this.determineEndpointStatus(healthy, responseTime, endpoint);
            if (newStatus !== endpoint.status) {
                this.logger.info('Endpoint status changed', {
                    endpointId,
                    oldStatus: endpoint.status,
                    newStatus,
                    responseTime
                });
                endpoint.status = newStatus;
                this.emit('endpoint-status-changed', { endpoint, oldStatus: endpoint.status, newStatus });
            }
            endpoint.lastHealthCheck = new Date().toISOString();
            // Store metrics
            const metrics = this.metrics.get(endpointId) || [];
            metrics.push({
                timestamp: Date.now(),
                healthy,
                responseTime,
                status: newStatus
            });
            // Keep only recent metrics
            const cutoff = Date.now() - this.config.metricsRetentionPeriod;
            this.metrics.set(endpointId, metrics.filter(m => m.timestamp > cutoff));
            span?.setTag('health.status', healthy);
            span?.setTag('response.time', responseTime);
        }
        catch (error) {
            this.logger.error('Health check failed', { error, endpointId });
            // Mark as unhealthy on error
            endpoint.status = ServiceStatus.UNHEALTHY;
            endpoint.lastHealthCheck = new Date().toISOString();
            span?.setTag('error', true);
        }
        finally {
            span?.finish();
        }
    }
    async httpHealthCheck(endpoint) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.healthCheckTimeout);
        try {
            const response = await fetch(`${endpoint.url}${endpoint.healthCheckPath}`, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'GuardAnt-Failover/1.0',
                    'X-Health-Check': 'true'
                }
            });
            clearTimeout(timeoutId);
            return response;
        }
        catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    determineEndpointStatus(healthy, responseTime, endpoint) {
        if (!healthy) {
            return ServiceStatus.UNHEALTHY;
        }
        // Consider degraded if response time is significantly higher than normal
        const metrics = this.metrics.get(endpoint.id) || [];
        const recentHealthyMetrics = metrics
            .filter(m => m.healthy && m.timestamp > Date.now() - 300000) // Last 5 minutes
            .slice(-10); // Last 10 measurements
        if (recentHealthyMetrics.length > 0) {
            const avgResponseTime = recentHealthyMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentHealthyMetrics.length;
            // Mark as degraded if current response time is 2x average
            if (responseTime > avgResponseTime * 2 && responseTime > 1000) {
                return ServiceStatus.DEGRADED;
            }
        }
        return ServiceStatus.HEALTHY;
    }
    async detectFailovers() {
        const span = this.tracing?.startSpan('failover.detect');
        try {
            const activeRules = Array.from(this.rules.values()).filter(rule => rule.enabled);
            for (const rule of activeRules) {
                await this.evaluateFailoverRule(rule);
            }
        }
        catch (error) {
            this.logger.error('Failover detection failed', { error });
            span?.setTag('error', true);
        }
        finally {
            span?.finish();
        }
    }
    async evaluateFailoverRule(rule) {
        // Find matching endpoints
        const matchingEndpoints = Array.from(this.endpoints.values())
            .filter(endpoint => new RegExp(rule.servicePattern).test(endpoint.name));
        for (const endpoint of matchingEndpoints) {
            // Skip if already in failover cooldown
            if (this.isInCooldown(rule, endpoint)) {
                continue;
            }
            // Check if conditions are met
            const conditionResults = await this.evaluateConditions(rule.triggerConditions, endpoint);
            const shouldFailover = conditionResults.every(result => result.passed);
            if (shouldFailover) {
                await this.initiateFailover(rule, endpoint, conditionResults);
            }
        }
    }
    async evaluateConditions(conditions, endpoint) {
        const results = [];
        for (const condition of conditions) {
            const actualValue = await this.getMetricValue(condition.metric, endpoint);
            const passed = this.evaluateCondition(condition, actualValue);
            results.push({
                type: condition.type,
                actualValue,
                threshold: condition.threshold,
                passed,
                condition
            });
        }
        return results;
    }
    async getMetricValue(metric, endpoint) {
        const metrics = this.metrics.get(endpoint.id) || [];
        const recentMetrics = metrics.filter(m => m.timestamp > Date.now() - 60000); // Last minute
        switch (metric) {
            case 'response_time':
                return recentMetrics.length > 0 ?
                    recentMetrics.reduce((sum, m) => sum + (m.responseTime || 0), 0) / recentMetrics.length : 0;
            case 'error_rate':
                const errorCount = recentMetrics.filter(m => !m.healthy).length;
                return recentMetrics.length > 0 ? (errorCount / recentMetrics.length) * 100 : 0;
            case 'availability':
                const healthyCount = recentMetrics.filter(m => m.healthy).length;
                return recentMetrics.length > 0 ? (healthyCount / recentMetrics.length) * 100 : 100;
            default:
                return 0;
        }
    }
    evaluateCondition(condition, actualValue) {
        switch (condition.operator) {
            case 'gt': return actualValue > condition.threshold;
            case 'gte': return actualValue >= condition.threshold;
            case 'lt': return actualValue < condition.threshold;
            case 'lte': return actualValue <= condition.threshold;
            case 'eq': return actualValue === condition.threshold;
            case 'neq': return actualValue !== condition.threshold;
            default: return false;
        }
    }
    async initiateFailover(rule, sourceEndpoint, conditions) {
        const span = this.tracing?.startSpan('failover.initiate');
        try {
            // Check global concurrent failover limit
            if (this.activeFailovers.size >= this.config.maxConcurrentFailovers) {
                this.logger.warn('Max concurrent failovers reached, skipping', {
                    ruleId: rule.id,
                    sourceEndpointId: sourceEndpoint.id
                });
                return;
            }
            // Select failover target
            const targetEndpoint = this.selectFailoverTarget(sourceEndpoint, rule);
            if (!targetEndpoint) {
                this.logger.warn('No suitable failover target found', {
                    ruleId: rule.id,
                    sourceEndpointId: sourceEndpoint.id
                });
                return;
            }
            // Create failover event
            const failoverEvent = {
                id: this.generateFailoverId(),
                timestamp: new Date().toISOString(),
                ruleId: rule.id,
                sourceEndpoint,
                targetEndpoint,
                triggerReason: `Rule triggered: ${rule.name}`,
                conditions,
                status: FailoverStatus.TRIGGERED,
                affectedConnections: sourceEndpoint.currentLoad,
                metadata: { automatic: true }
            };
            // Execute failover
            await this.executeFailover(failoverEvent);
            span?.setTag('failover.id', failoverEvent.id);
            span?.setTag('rule.id', rule.id);
        }
        catch (error) {
            this.logger.error('Failed to initiate failover', { error, ruleId: rule.id });
            span?.setTag('error', true);
        }
        finally {
            span?.finish();
        }
    }
    async executeFailover(failoverEvent) {
        const span = this.tracing?.startSpan('failover.execute');
        try {
            // Mark as in progress
            failoverEvent.status = FailoverStatus.IN_PROGRESS;
            this.activeFailovers.set(failoverEvent.id, failoverEvent);
            this.logger.info('Executing failover', {
                failoverId: failoverEvent.id,
                source: failoverEvent.sourceEndpoint.name,
                target: failoverEvent.targetEndpoint?.name
            });
            this.emit('failover-started', failoverEvent);
            // Get the failover rule
            const rule = this.rules.get(failoverEvent.ruleId);
            const strategy = rule?.failoverStrategy;
            if (strategy) {
                await this.executeFailoverStrategy(failoverEvent, strategy);
            }
            else {
                // Default immediate failover
                await this.executeImmediateFailover(failoverEvent);
            }
            // Mark as completed
            failoverEvent.status = FailoverStatus.COMPLETED;
            failoverEvent.duration = Date.now() - new Date(failoverEvent.timestamp).getTime();
            this.logger.info('Failover completed', {
                failoverId: failoverEvent.id,
                duration: failoverEvent.duration
            });
            this.emit('failover-completed', failoverEvent);
            // Start recovery monitoring if configured
            if (rule?.recoveryStrategy.type === RecoveryType.AUTOMATIC) {
                this.startRecoveryMonitoring(failoverEvent, rule.recoveryStrategy);
            }
        }
        catch (error) {
            failoverEvent.status = FailoverStatus.FAILED;
            this.logger.error('Failover execution failed', { error, failoverId: failoverEvent.id });
            this.emit('failover-failed', failoverEvent);
            span?.setTag('error', true);
        }
        finally {
            span?.finish();
        }
    }
    async executeFailoverStrategy(failoverEvent, strategy) {
        switch (strategy.type) {
            case FailoverType.IMMEDIATE:
                await this.executeImmediateFailover(failoverEvent);
                break;
            case FailoverType.GRADUAL:
                await this.executeGradualFailover(failoverEvent, strategy);
                break;
            case FailoverType.BLUE_GREEN:
                await this.executeBlueGreenFailover(failoverEvent, strategy);
                break;
            default:
                await this.executeImmediateFailover(failoverEvent);
        }
    }
    async executeImmediateFailover(failoverEvent) {
        // Implementation would update load balancer, DNS, service registry, etc.
        this.logger.info('Executing immediate failover', { failoverId: failoverEvent.id });
        // Mark source as unhealthy
        failoverEvent.sourceEndpoint.status = ServiceStatus.UNHEALTHY;
        // Update target load
        if (failoverEvent.targetEndpoint) {
            failoverEvent.targetEndpoint.currentLoad += failoverEvent.affectedConnections;
        }
        // Simulate traffic redirection
        await this.redirectTrafficToTarget(failoverEvent);
    }
    async executeGradualFailover(failoverEvent, strategy) {
        this.logger.info('Executing gradual failover', { failoverId: failoverEvent.id });
        const steps = 5;
        const percentagePerStep = 100 / steps;
        for (let i = 1; i <= steps; i++) {
            const percentage = percentagePerStep * i;
            await this.redirectTrafficPercentage(failoverEvent, percentage);
            // Wait between steps
            await new Promise(resolve => setTimeout(resolve, strategy.drainTimeout / steps));
        }
    }
    async executeBlueGreenFailover(failoverEvent, strategy) {
        this.logger.info('Executing blue-green failover', { failoverId: failoverEvent.id });
        // Validate target is ready
        if (strategy.validateTarget && failoverEvent.targetEndpoint) {
            const targetReady = await this.validateFailoverTarget(failoverEvent.targetEndpoint);
            if (!targetReady) {
                throw new Error('Target endpoint validation failed');
            }
        }
        // Switch all traffic at once
        await this.redirectTrafficToTarget(failoverEvent);
    }
    async redirectTrafficToTarget(failoverEvent) {
        // Implementation would integrate with:
        // - Load balancers (HAProxy, NGINX, ALB, etc.)
        // - Service mesh (Istio, Consul Connect, etc.)
        // - DNS providers for DNS failover
        // - Service discovery systems
        this.logger.info('Redirecting traffic to target', {
            source: failoverEvent.sourceEndpoint.name,
            target: failoverEvent.targetEndpoint?.name
        });
        // Simulate traffic redirection delay
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    async redirectTrafficPercentage(failoverEvent, percentage) {
        this.logger.info('Redirecting traffic percentage', {
            failoverId: failoverEvent.id,
            percentage
        });
        // Implementation would update traffic weights in load balancer
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    async validateFailoverTarget(endpoint) {
        try {
            const response = await this.httpHealthCheck(endpoint);
            return response.ok;
        }
        catch (error) {
            return false;
        }
    }
    selectFailoverTarget(sourceEndpoint, rule) {
        const candidates = Array.from(this.endpoints.values())
            .filter(ep => ep.id !== sourceEndpoint.id &&
            ep.status === ServiceStatus.HEALTHY &&
            ep.region === sourceEndpoint.region // Prefer same region
        )
            .sort((a, b) => a.priority - b.priority); // Sort by priority
        if (candidates.length === 0) {
            // Try other regions if no local candidates
            const otherRegionCandidates = Array.from(this.endpoints.values())
                .filter(ep => ep.id !== sourceEndpoint.id &&
                ep.status === ServiceStatus.HEALTHY)
                .sort((a, b) => a.priority - b.priority);
            return otherRegionCandidates[0];
        }
        const targetSelection = rule?.failoverStrategy.targetSelection || TargetSelection.HIGHEST_PRIORITY;
        switch (targetSelection) {
            case TargetSelection.HIGHEST_PRIORITY:
                return candidates[0];
            case TargetSelection.LOWEST_LOAD:
                return candidates.sort((a, b) => a.currentLoad - b.currentLoad)[0];
            case TargetSelection.RANDOM:
                return candidates[Math.floor(Math.random() * candidates.length)];
            default:
                return candidates[0];
        }
    }
    startRecoveryMonitoring(failoverEvent, recovery) {
        this.logger.info('Starting recovery monitoring', { failoverId: failoverEvent.id });
        let consecutiveSuccesses = 0;
        const recoveryInterval = setInterval(async () => {
            try {
                const sourceHealthy = await this.validateFailoverTarget(failoverEvent.sourceEndpoint);
                if (sourceHealthy) {
                    consecutiveSuccesses++;
                    if (consecutiveSuccesses >= recovery.consecutiveSuccessRequired) {
                        clearInterval(recoveryInterval);
                        await this.executeRecovery(failoverEvent, recovery);
                    }
                }
                else {
                    consecutiveSuccesses = 0;
                }
            }
            catch (error) {
                this.logger.error('Recovery monitoring failed', { error, failoverId: failoverEvent.id });
                consecutiveSuccesses = 0;
            }
        }, recovery.healthCheckInterval);
        // Clean up after reasonable time
        setTimeout(() => {
            clearInterval(recoveryInterval);
        }, 24 * 60 * 60 * 1000); // 24 hours
    }
    async executeRecovery(failoverEvent, recovery) {
        this.logger.info('Executing recovery', { failoverId: failoverEvent.id });
        try {
            failoverEvent.status = FailoverStatus.RECOVERING;
            // Wait for recovery delay
            await new Promise(resolve => setTimeout(resolve, recovery.recoveryDelay));
            // Implement traffic ramp-up if configured
            if (recovery.trafficRampUp.enabled) {
                await this.executeTrafficRampUp(failoverEvent, recovery.trafficRampUp);
            }
            else {
                // Immediate recovery
                await this.redirectTrafficToSource(failoverEvent);
            }
            failoverEvent.status = FailoverStatus.RECOVERED;
            failoverEvent.recoveredAt = new Date().toISOString();
            // Update endpoint status
            failoverEvent.sourceEndpoint.status = ServiceStatus.HEALTHY;
            this.emit('failover-recovered', failoverEvent);
        }
        catch (error) {
            this.logger.error('Recovery failed', { error, failoverId: failoverEvent.id });
        }
        finally {
            // Clean up active failover
            this.activeFailovers.delete(failoverEvent.id);
        }
    }
    async executeTrafficRampUp(failoverEvent, rampUp) {
        let currentPercentage = rampUp.initialPercentage;
        while (currentPercentage < 100) {
            await this.redirectTrafficPercentageToSource(failoverEvent, currentPercentage);
            // Wait for increment interval
            await new Promise(resolve => setTimeout(resolve, rampUp.incrementInterval));
            currentPercentage = Math.min(100, currentPercentage + rampUp.incrementPercentage);
        }
        // Final switch to 100%
        await this.redirectTrafficToSource(failoverEvent);
    }
    async redirectTrafficToSource(failoverEvent) {
        this.logger.info('Redirecting traffic back to source', {
            source: failoverEvent.sourceEndpoint.name
        });
        // Implementation would restore original traffic routing
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    async redirectTrafficPercentageToSource(failoverEvent, percentage) {
        this.logger.info('Redirecting traffic percentage to source', {
            failoverId: failoverEvent.id,
            percentage
        });
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    isInCooldown(rule, endpoint) {
        // Check if endpoint has recent failovers within cooldown period
        const recentFailovers = Array.from(this.activeFailovers.values())
            .filter(f => f.sourceEndpoint.id === endpoint.id &&
            Date.now() - new Date(f.timestamp).getTime() < rule.cooldownPeriod);
        return recentFailovers.length > 0;
    }
    getRegionalHealth(endpoints) {
        const regions = new Map();
        endpoints.forEach(endpoint => {
            if (!regions.has(endpoint.region)) {
                regions.set(endpoint.region, {
                    region: endpoint.region,
                    total: 0,
                    healthy: 0,
                    degraded: 0,
                    unhealthy: 0
                });
            }
            const regionHealth = regions.get(endpoint.region);
            regionHealth.total++;
            switch (endpoint.status) {
                case ServiceStatus.HEALTHY:
                    regionHealth.healthy++;
                    break;
                case ServiceStatus.DEGRADED:
                    regionHealth.degraded++;
                    break;
                case ServiceStatus.UNHEALTHY:
                    regionHealth.unhealthy++;
                    break;
            }
        });
        return Array.from(regions.values());
    }
    getRecentFailovers(limit) {
        return Array.from(this.activeFailovers.values())
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);
    }
    calculateTrend(metrics) {
        if (metrics.length < 2)
            return 'stable';
        const recent = metrics.slice(-5);
        const older = metrics.slice(-10, -5);
        if (recent.length === 0 || older.length === 0)
            return 'stable';
        const recentAvg = recent.reduce((sum, m) => sum + (m.responseTime || 0), 0) / recent.length;
        const olderAvg = older.reduce((sum, m) => sum + (m.responseTime || 0), 0) / older.length;
        const change = ((recentAvg - olderAvg) / olderAvg) * 100;
        if (change > 10)
            return 'degrading';
        if (change < -10)
            return 'improving';
        return 'stable';
    }
    validateEndpoint(endpoint) {
        if (!endpoint.name)
            throw new Error('Endpoint name is required');
        if (!endpoint.url)
            throw new Error('Endpoint URL is required');
        if (!endpoint.region)
            throw new Error('Endpoint region is required');
        if (endpoint.priority < 0)
            throw new Error('Priority must be non-negative');
        if (endpoint.capacity <= 0)
            throw new Error('Capacity must be positive');
    }
    validateFailoverRule(rule) {
        if (!rule.name)
            throw new Error('Rule name is required');
        if (!rule.servicePattern)
            throw new Error('Service pattern is required');
        if (rule.triggerConditions.length === 0)
            throw new Error('At least one trigger condition is required');
        if (rule.priority < 0)
            throw new Error('Priority must be non-negative');
        if (rule.cooldownPeriod < 0)
            throw new Error('Cooldown period must be non-negative');
    }
    generateEndpointId() {
        return `ep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateRuleId() {
        return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateFailoverId() {
        return `fo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    startHealthChecking() {
        this.healthCheckTimer = setInterval(() => {
            this.performAllHealthChecks().catch(error => {
                this.logger.error('Health check cycle failed', { error });
            });
        }, this.config.healthCheckInterval);
    }
    startFailoverDetection() {
        this.detectionTimer = setInterval(() => {
            this.detectFailovers().catch(error => {
                this.logger.error('Failover detection cycle failed', { error });
            });
        }, this.config.detectionInterval);
    }
    startMetricsCleanup() {
        this.metricsCleanupTimer = setInterval(() => {
            this.cleanupOldMetrics();
        }, 60000); // Every minute
    }
    async performAllHealthChecks() {
        const endpoints = Array.from(this.endpoints.keys());
        await Promise.allSettled(endpoints.map(id => this.performHealthCheck(id)));
    }
    cleanupOldMetrics() {
        const cutoff = Date.now() - this.config.metricsRetentionPeriod;
        for (const [endpointId, metrics] of this.metrics.entries()) {
            const filtered = metrics.filter(m => m.timestamp > cutoff);
            this.metrics.set(endpointId, filtered);
        }
    }
    setupEventListeners() {
        process.on('SIGTERM', () => this.shutdown());
        process.on('SIGINT', () => this.shutdown());
    }
    // Shutdown cleanup
    async shutdown() {
        this.logger.info('Shutting down failover system manager');
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }
        if (this.detectionTimer) {
            clearInterval(this.detectionTimer);
        }
        if (this.metricsCleanupTimer) {
            clearInterval(this.metricsCleanupTimer);
        }
        this.emit('shutdown');
    }
    // Health check
    getHealthStatus() {
        return {
            healthy: true,
            details: {
                registeredEndpoints: this.endpoints.size,
                activeFailoverRules: this.rules.size,
                activeFailovers: this.activeFailovers.size,
                configEnabled: this.config.enabled
            }
        };
    }
}
exports.FailoverSystemManager = FailoverSystemManager;
// Factory function
function createFailoverSystemManager(serviceName, config, golemAdapter, tracing) {
    return new FailoverSystemManager(serviceName, config, golemAdapter, tracing);
}
//# sourceMappingURL=failover-system.js.map