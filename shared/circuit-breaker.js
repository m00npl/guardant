"use strict";
/**
 * Circuit breaker pattern implementation for GuardAnt services
 * Prevents cascading failures and provides fast failure for degraded services
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerManager = exports.CircuitBreaker = exports.CircuitBreakerConfigs = exports.CircuitBreakerState = void 0;
exports.createCircuitBreaker = createCircuitBreaker;
exports.createCircuitBreakerManager = createCircuitBreakerManager;
const logger_1 = require("./logger");
const error_handling_1 = require("./error-handling");
var CircuitBreakerState;
(function (CircuitBreakerState) {
    CircuitBreakerState["CLOSED"] = "closed";
    CircuitBreakerState["OPEN"] = "open";
    CircuitBreakerState["HALF_OPEN"] = "half_open"; // Testing if service recovered
})(CircuitBreakerState || (exports.CircuitBreakerState = CircuitBreakerState = {}));
// Predefined circuit breaker configurations
exports.CircuitBreakerConfigs = {
    // For critical external services (strict)
    CRITICAL_SERVICE: {
        failureThreshold: 5,
        successThreshold: 3,
        timeoutMs: 10000,
        resetTimeoutMs: 60000,
        monitoringPeriodMs: 300000, // 5 minutes
        slowCallThreshold: 3,
        slowCallDurationMs: 5000,
        minimumThroughput: 5
    },
    // For external APIs (moderate)
    EXTERNAL_API: {
        failureThreshold: 10,
        successThreshold: 5,
        timeoutMs: 30000,
        resetTimeoutMs: 30000,
        monitoringPeriodMs: 300000,
        slowCallThreshold: 5,
        slowCallDurationMs: 10000,
        minimumThroughput: 10
    },
    // For database connections (lenient)
    DATABASE: {
        failureThreshold: 3,
        successThreshold: 2,
        timeoutMs: 5000,
        resetTimeoutMs: 15000,
        monitoringPeriodMs: 60000, // 1 minute
        minimumThroughput: 3
    },
    // For internal services (very lenient)
    INTERNAL_SERVICE: {
        failureThreshold: 15,
        successThreshold: 7,
        timeoutMs: 15000,
        resetTimeoutMs: 20000,
        monitoringPeriodMs: 600000, // 10 minutes
        minimumThroughput: 15
    },
    // For Ethereum/blockchain operations (very strict)
    BLOCKCHAIN: {
        failureThreshold: 3,
        successThreshold: 2,
        timeoutMs: 120000, // 2 minutes
        resetTimeoutMs: 300000, // 5 minutes
        monitoringPeriodMs: 900000, // 15 minutes
        slowCallThreshold: 2,
        slowCallDurationMs: 60000,
        minimumThroughput: 2
    }
};
class CircuitBreakerCall {
    constructor(timestamp, success, duration, error) {
        this.timestamp = timestamp;
        this.success = success;
        this.duration = duration;
        this.error = error;
    }
    isSlowCall(threshold) {
        return this.duration > threshold;
    }
    isWithinPeriod(periodMs, now = Date.now()) {
        return (now - this.timestamp) <= periodMs;
    }
}
class CircuitBreaker {
    constructor(name, config, serviceName, tracing) {
        this.name = name;
        this.config = config;
        this.serviceName = serviceName;
        this.state = CircuitBreakerState.CLOSED;
        this.calls = [];
        this.lastStateChange = Date.now();
        this.logger = (0, logger_1.createLogger)(`${serviceName}-circuit-breaker`);
        this.tracing = tracing;
        this.logger.info(`Circuit breaker initialized: ${name}`, {
            config: this.config,
            state: this.state
        });
    }
    cleanOldCalls() {
        const now = Date.now();
        const cutoff = now - this.config.monitoringPeriodMs;
        this.calls = this.calls.filter(call => call.timestamp > cutoff);
    }
    getMetrics() {
        this.cleanOldCalls();
        const now = Date.now();
        const recentCalls = this.calls.filter(call => call.isWithinPeriod(this.config.monitoringPeriodMs, now));
        const failures = recentCalls.filter(call => !call.success);
        const successes = recentCalls.filter(call => call.success);
        const slowCalls = recentCalls.filter(call => this.config.slowCallDurationMs && call.isSlowCall(this.config.slowCallDurationMs));
        const totalDuration = recentCalls.reduce((sum, call) => sum + call.duration, 0);
        const averageResponseTime = recentCalls.length > 0 ? totalDuration / recentCalls.length : 0;
        const lastFailure = failures.length > 0 ?
            Math.max(...failures.map(call => call.timestamp)) : undefined;
        const lastSuccess = successes.length > 0 ?
            Math.max(...successes.map(call => call.timestamp)) : undefined;
        return {
            state: this.state,
            failureCount: failures.length,
            successCount: successes.length,
            totalCalls: recentCalls.length,
            lastFailureTime: lastFailure,
            lastSuccessTime: lastSuccess,
            slowCallCount: slowCalls.length,
            averageResponseTime,
            uptime: now - this.lastStateChange,
            lastStateChange: this.lastStateChange
        };
    }
    shouldOpen() {
        const metrics = this.getMetrics();
        // Check minimum throughput
        if (this.config.minimumThroughput &&
            metrics.totalCalls < this.config.minimumThroughput) {
            return false;
        }
        // Check failure threshold
        if (metrics.failureCount >= this.config.failureThreshold) {
            return true;
        }
        // Check slow calls threshold if configured
        if (this.config.slowCallThreshold && this.config.slowCallDurationMs &&
            metrics.slowCallCount >= this.config.slowCallThreshold) {
            return true;
        }
        return false;
    }
    shouldClose() {
        const metrics = this.getMetrics();
        return metrics.successCount >= this.config.successThreshold;
    }
    shouldAttemptReset() {
        const now = Date.now();
        return (now - this.lastStateChange) >= this.config.resetTimeoutMs;
    }
    changeState(newState, reason) {
        const oldState = this.state;
        this.state = newState;
        this.lastStateChange = Date.now();
        this.logger.info(`Circuit breaker state changed: ${this.name}`, {
            from: oldState,
            to: newState,
            reason,
            timestamp: this.lastStateChange
        });
        if (this.tracing) {
            this.tracing.addEvent(`circuit_breaker_state_change_${this.name}`, {
                'circuit_breaker.name': this.name,
                'circuit_breaker.state.from': oldState,
                'circuit_breaker.state.to': newState,
                'circuit_breaker.reason': reason || 'unknown',
            });
        }
    }
    recordCall(success, duration, error) {
        const call = new CircuitBreakerCall(Date.now(), success, duration, error);
        this.calls.push(call);
        // Limit call history to prevent memory issues
        if (this.calls.length > 1000) {
            this.calls = this.calls.slice(-500); // Keep last 500 calls
        }
        // Update state based on the new call
        this.updateState();
    }
    updateState() {
        switch (this.state) {
            case CircuitBreakerState.CLOSED:
                if (this.shouldOpen()) {
                    this.changeState(CircuitBreakerState.OPEN, 'failure_threshold_exceeded');
                }
                break;
            case CircuitBreakerState.OPEN:
                if (this.shouldAttemptReset()) {
                    this.changeState(CircuitBreakerState.HALF_OPEN, 'attempting_reset');
                }
                break;
            case CircuitBreakerState.HALF_OPEN:
                if (this.shouldClose()) {
                    this.changeState(CircuitBreakerState.CLOSED, 'service_recovered');
                }
                else if (this.shouldOpen()) {
                    this.changeState(CircuitBreakerState.OPEN, 'still_failing');
                }
                break;
        }
    }
    createTimeoutPromise(timeoutMs) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new error_handling_1.ExternalServiceError(this.name, { service: this.serviceName, operation: 'circuit_breaker_timeout' }, new Error(`Circuit breaker timeout after ${timeoutMs}ms`)));
            }, timeoutMs);
        });
    }
    async execute(operation, fallback) {
        const startTime = Date.now();
        // Fast fail if circuit is open
        if (this.state === CircuitBreakerState.OPEN) {
            this.logger.debug(`Circuit breaker open, failing fast: ${this.name}`);
            const error = new error_handling_1.ExternalServiceError(this.name, { service: this.serviceName, operation: 'circuit_breaker_open' }, new Error('Circuit breaker is open'));
            // Try fallback if available
            if (fallback) {
                try {
                    const fallbackStart = Date.now();
                    const fallbackResult = await fallback();
                    const fallbackDuration = Date.now() - fallbackStart;
                    this.logger.info(`Fallback executed successfully: ${this.name}`, {
                        duration: fallbackDuration
                    });
                    return {
                        success: true,
                        data: fallbackResult,
                        state: this.state,
                        executionTime: fallbackDuration,
                        fromCache: true
                    };
                }
                catch (fallbackError) {
                    this.logger.warn(`Fallback failed: ${this.name}`, fallbackError);
                }
            }
            return {
                success: false,
                error,
                state: this.state,
                executionTime: Date.now() - startTime
            };
        }
        try {
            // Execute with timeout
            const result = await Promise.race([
                operation(),
                this.createTimeoutPromise(this.config.timeoutMs)
            ]);
            const duration = Date.now() - startTime;
            this.recordCall(true, duration);
            this.logger.debug(`Circuit breaker call succeeded: ${this.name}`, {
                duration,
                state: this.state
            });
            return {
                success: true,
                data: result,
                state: this.state,
                executionTime: duration
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.recordCall(false, duration, error);
            this.logger.warn(`Circuit breaker call failed: ${this.name}`, error, {
                duration,
                state: this.state
            });
            // Try fallback if available and state allows it
            if (fallback && this.state !== CircuitBreakerState.OPEN) {
                try {
                    const fallbackStart = Date.now();
                    const fallbackResult = await fallback();
                    const fallbackDuration = Date.now() - fallbackStart;
                    this.logger.info(`Fallback executed after failure: ${this.name}`, {
                        fallbackDuration,
                        primaryError: error.message
                    });
                    return {
                        success: true,
                        data: fallbackResult,
                        state: this.state,
                        executionTime: Date.now() - startTime,
                        fromCache: true
                    };
                }
                catch (fallbackError) {
                    this.logger.warn(`Fallback also failed: ${this.name}`, fallbackError);
                }
            }
            return {
                success: false,
                error: error,
                state: this.state,
                executionTime: duration
            };
        }
    }
    // Get current metrics
    getMetrics() {
        return this.getMetrics();
    }
    // Get current state
    getState() {
        return this.state;
    }
    // Force state change (for testing or manual intervention)
    forceState(state, reason = 'manual') {
        this.changeState(state, reason);
    }
    // Reset circuit breaker
    reset() {
        this.calls = [];
        this.changeState(CircuitBreakerState.CLOSED, 'manual_reset');
    }
}
exports.CircuitBreaker = CircuitBreaker;
// Circuit breaker manager to handle multiple circuit breakers
class CircuitBreakerManager {
    constructor(serviceName, tracing) {
        this.breakers = new Map();
        this.logger = (0, logger_1.createLogger)(`${serviceName}-circuit-breaker-manager`);
        this.tracing = tracing;
    }
    createCircuitBreaker(name, config) {
        if (this.breakers.has(name)) {
            throw new error_handling_1.GuardAntError({
                code: 'CIRCUIT_BREAKER_EXISTS',
                message: `Circuit breaker with name '${name}' already exists`,
                category: error_handling_1.ErrorCategory.CONFIGURATION,
                severity: error_handling_1.ErrorSeverity.HIGH,
                recoveryStrategy: 'none',
                context: { service: 'circuit-breaker-manager', operation: 'create' }
            });
        }
        const breaker = new CircuitBreaker(name, config, 'circuit-breaker-manager', this.tracing);
        this.breakers.set(name, breaker);
        this.logger.info(`Circuit breaker created: ${name}`, { config });
        return breaker;
    }
    getCircuitBreaker(name) {
        return this.breakers.get(name);
    }
    getAllMetrics() {
        const metrics = {};
        for (const [name, breaker] of this.breakers) {
            metrics[name] = breaker.getMetrics();
        }
        return metrics;
    }
    // Health check for all circuit breakers
    getHealthStatus() {
        const allMetrics = this.getAllMetrics();
        let healthy = true;
        const details = {};
        for (const [name, metrics] of Object.entries(allMetrics)) {
            const breakerHealthy = metrics.state !== CircuitBreakerState.OPEN;
            healthy = healthy && breakerHealthy;
            details[name] = {
                state: metrics.state,
                healthy: breakerHealthy,
                failureCount: metrics.failureCount,
                uptime: metrics.uptime
            };
        }
        return { healthy, details };
    }
    // Remove circuit breaker
    removeCircuitBreaker(name) {
        return this.breakers.delete(name);
    }
    // Reset all circuit breakers
    resetAll() {
        for (const breaker of this.breakers.values()) {
            breaker.reset();
        }
        this.logger.info('All circuit breakers reset');
    }
}
exports.CircuitBreakerManager = CircuitBreakerManager;
// Factory functions
function createCircuitBreaker(name, config, serviceName, tracing) {
    return new CircuitBreaker(name, config, serviceName, tracing);
}
function createCircuitBreakerManager(serviceName, tracing) {
    return new CircuitBreakerManager(serviceName, tracing);
}
// Exports already defined above
//# sourceMappingURL=circuit-breaker.js.map