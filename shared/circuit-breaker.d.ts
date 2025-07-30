/**
 * Circuit breaker pattern implementation for GuardAnt services
 * Prevents cascading failures and provides fast failure for degraded services
 */
import type { GuardAntTracing } from './tracing';
export declare enum CircuitBreakerState {
    CLOSED = "closed",// Normal operation
    OPEN = "open",// Circuit is open, failing fast
    HALF_OPEN = "half_open"
}
export interface CircuitBreakerConfig {
    failureThreshold: number;
    successThreshold: number;
    timeoutMs: number;
    resetTimeoutMs: number;
    monitoringPeriodMs: number;
    slowCallThreshold?: number;
    slowCallDurationMs?: number;
    minimumThroughput?: number;
}
export interface CircuitBreakerMetrics {
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
    totalCalls: number;
    lastFailureTime?: number;
    lastSuccessTime?: number;
    slowCallCount: number;
    averageResponseTime: number;
    uptime: number;
    lastStateChange: number;
}
export interface CircuitBreakerResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
    state: CircuitBreakerState;
    executionTime: number;
    fromCache?: boolean;
}
export declare const CircuitBreakerConfigs: {
    CRITICAL_SERVICE: {
        failureThreshold: number;
        successThreshold: number;
        timeoutMs: number;
        resetTimeoutMs: number;
        monitoringPeriodMs: number;
        slowCallThreshold: number;
        slowCallDurationMs: number;
        minimumThroughput: number;
    };
    EXTERNAL_API: {
        failureThreshold: number;
        successThreshold: number;
        timeoutMs: number;
        resetTimeoutMs: number;
        monitoringPeriodMs: number;
        slowCallThreshold: number;
        slowCallDurationMs: number;
        minimumThroughput: number;
    };
    DATABASE: {
        failureThreshold: number;
        successThreshold: number;
        timeoutMs: number;
        resetTimeoutMs: number;
        monitoringPeriodMs: number;
        minimumThroughput: number;
    };
    INTERNAL_SERVICE: {
        failureThreshold: number;
        successThreshold: number;
        timeoutMs: number;
        resetTimeoutMs: number;
        monitoringPeriodMs: number;
        minimumThroughput: number;
    };
    BLOCKCHAIN: {
        failureThreshold: number;
        successThreshold: number;
        timeoutMs: number;
        resetTimeoutMs: number;
        monitoringPeriodMs: number;
        slowCallThreshold: number;
        slowCallDurationMs: number;
        minimumThroughput: number;
    };
};
export declare class CircuitBreaker {
    private name;
    private config;
    private serviceName;
    private state;
    private calls;
    private lastStateChange;
    private logger;
    private tracing?;
    constructor(name: string, config: CircuitBreakerConfig, serviceName: string, tracing?: GuardAntTracing);
    private cleanOldCalls;
    private shouldOpen;
    private shouldClose;
    private shouldAttemptReset;
    private changeState;
    private recordCall;
    private updateState;
    private createTimeoutPromise;
    execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<CircuitBreakerResult<T>>;
    getState(): CircuitBreakerState;
    forceState(state: CircuitBreakerState, reason?: string): void;
    reset(): void;
}
export declare class CircuitBreakerManager {
    private breakers;
    private logger;
    private tracing?;
    constructor(serviceName: string, tracing?: GuardAntTracing);
    createCircuitBreaker(name: string, config: CircuitBreakerConfig): CircuitBreaker;
    getCircuitBreaker(name: string): CircuitBreaker | undefined;
    getAllMetrics(): Record<string, CircuitBreakerMetrics>;
    getHealthStatus(): {
        healthy: boolean;
        details: Record<string, any>;
    };
    removeCircuitBreaker(name: string): boolean;
    resetAll(): void;
}
export declare function createCircuitBreaker(name: string, config: CircuitBreakerConfig, serviceName: string, tracing?: GuardAntTracing): CircuitBreaker;
export declare function createCircuitBreakerManager(serviceName: string, tracing?: GuardAntTracing): CircuitBreakerManager;
//# sourceMappingURL=circuit-breaker.d.ts.map