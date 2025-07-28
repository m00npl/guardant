/**
 * Circuit breaker pattern implementation for GuardAnt services
 * Prevents cascading failures and provides fast failure for degraded services
 */

import { createLogger } from './logger';
import { GuardAntError, ErrorCategory, ErrorSeverity, ExternalServiceError } from './error-handling';
import type { GuardAntTracing } from './tracing';

export enum CircuitBreakerState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Circuit is open, failing fast
  HALF_OPEN = 'half_open' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;          // Number of failures before opening
  successThreshold: number;          // Number of successes to close from half-open
  timeoutMs: number;                 // Timeout for operations
  resetTimeoutMs: number;            // Time to wait before trying half-open
  monitoringPeriodMs: number;        // Window for failure counting
  slowCallThreshold?: number;        // Threshold for slow calls (optional)
  slowCallDurationMs?: number;       // Duration considered slow
  minimumThroughput?: number;        // Minimum calls before evaluating
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

// Predefined circuit breaker configurations
export const CircuitBreakerConfigs = {
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
  constructor(
    public timestamp: number,
    public success: boolean,
    public duration: number,
    public error?: Error
  ) {}

  isSlowCall(threshold: number): boolean {
    return this.duration > threshold;
  }

  isWithinPeriod(periodMs: number, now: number = Date.now()): boolean {
    return (now - this.timestamp) <= periodMs;
  }
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private calls: CircuitBreakerCall[] = [];
  private lastStateChange: number = Date.now();
  private logger;
  private tracing?: GuardAntTracing;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig,
    private serviceName: string,
    tracing?: GuardAntTracing
  ) {
    this.logger = createLogger(`${serviceName}-circuit-breaker`);
    this.tracing = tracing;
    
    this.logger.info(`Circuit breaker initialized: ${name}`, {
      config: this.config,
      state: this.state
    });
  }

  private cleanOldCalls(): void {
    const now = Date.now();
    const cutoff = now - this.config.monitoringPeriodMs;
    this.calls = this.calls.filter(call => call.timestamp > cutoff);
  }

  private getMetrics(): CircuitBreakerMetrics {
    this.cleanOldCalls();
    const now = Date.now();
    
    const recentCalls = this.calls.filter(call => 
      call.isWithinPeriod(this.config.monitoringPeriodMs, now)
    );
    
    const failures = recentCalls.filter(call => !call.success);
    const successes = recentCalls.filter(call => call.success);
    const slowCalls = recentCalls.filter(call => 
      this.config.slowCallDurationMs && call.isSlowCall(this.config.slowCallDurationMs)
    );

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

  private shouldOpen(): boolean {
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

  private shouldClose(): boolean {
    const metrics = this.getMetrics();
    return metrics.successCount >= this.config.successThreshold;
  }

  private shouldAttemptReset(): boolean {
    const now = Date.now();
    return (now - this.lastStateChange) >= this.config.resetTimeoutMs;
  }

  private changeState(newState: CircuitBreakerState, reason?: string): void {
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

  private recordCall(success: boolean, duration: number, error?: Error): void {
    const call = new CircuitBreakerCall(Date.now(), success, duration, error);
    this.calls.push(call);

    // Limit call history to prevent memory issues
    if (this.calls.length > 1000) {
      this.calls = this.calls.slice(-500); // Keep last 500 calls
    }

    // Update state based on the new call
    this.updateState();
  }

  private updateState(): void {
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
        } else if (this.shouldOpen()) {
          this.changeState(CircuitBreakerState.OPEN, 'still_failing');
        }
        break;
    }
  }

  private createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new ExternalServiceError(
          this.name,
          { service: this.serviceName, operation: 'circuit_breaker_timeout' },
          new Error(`Circuit breaker timeout after ${timeoutMs}ms`)
        ));
      }, timeoutMs);
    });
  }

  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<CircuitBreakerResult<T>> {
    const startTime = Date.now();

    // Fast fail if circuit is open
    if (this.state === CircuitBreakerState.OPEN) {
      this.logger.debug(`Circuit breaker open, failing fast: ${this.name}`);
      
      const error = new ExternalServiceError(
        this.name,
        { service: this.serviceName, operation: 'circuit_breaker_open' },
        new Error('Circuit breaker is open')
      );

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
        } catch (fallbackError) {
          this.logger.warn(`Fallback failed: ${this.name}`, fallbackError as Error);
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
        this.createTimeoutPromise<T>(this.config.timeoutMs)
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

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordCall(false, duration, error as Error);

      this.logger.warn(`Circuit breaker call failed: ${this.name}`, error as Error, {
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
            primaryError: (error as Error).message
          });

          return {
            success: true,
            data: fallbackResult,
            state: this.state,
            executionTime: Date.now() - startTime,
            fromCache: true
          };
        } catch (fallbackError) {
          this.logger.warn(`Fallback also failed: ${this.name}`, fallbackError as Error);
        }
      }

      return {
        success: false,
        error: error as Error,
        state: this.state,
        executionTime: duration
      };
    }
  }

  // Get current metrics
  getMetrics(): CircuitBreakerMetrics {
    return this.getMetrics();
  }

  // Get current state
  getState(): CircuitBreakerState {
    return this.state;
  }

  // Force state change (for testing or manual intervention)
  forceState(state: CircuitBreakerState, reason: string = 'manual'): void {
    this.changeState(state, reason);
  }

  // Reset circuit breaker
  reset(): void {
    this.calls = [];
    this.changeState(CircuitBreakerState.CLOSED, 'manual_reset');
  }
}

// Circuit breaker manager to handle multiple circuit breakers
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();
  private logger;
  private tracing?: GuardAntTracing;

  constructor(serviceName: string, tracing?: GuardAntTracing) {
    this.logger = createLogger(`${serviceName}-circuit-breaker-manager`);
    this.tracing = tracing;
  }

  createCircuitBreaker(
    name: string,
    config: CircuitBreakerConfig
  ): CircuitBreaker {
    if (this.breakers.has(name)) {
      throw new GuardAntError({
        code: 'CIRCUIT_BREAKER_EXISTS',
        message: `Circuit breaker with name '${name}' already exists`,
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        recoveryStrategy: 'none' as any,
        context: { service: 'circuit-breaker-manager', operation: 'create' }
      });
    }

    const breaker = new CircuitBreaker(name, config, 'circuit-breaker-manager', this.tracing);
    this.breakers.set(name, breaker);
    
    this.logger.info(`Circuit breaker created: ${name}`, { config });
    return breaker;
  }

  getCircuitBreaker(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    
    for (const [name, breaker] of this.breakers) {
      metrics[name] = breaker.getMetrics();
    }
    
    return metrics;
  }

  // Health check for all circuit breakers
  getHealthStatus(): { healthy: boolean; details: Record<string, any> } {
    const allMetrics = this.getAllMetrics();
    let healthy = true;
    const details: Record<string, any> = {};

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
  removeCircuitBreaker(name: string): boolean {
    return this.breakers.delete(name);
  }

  // Reset all circuit breakers
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    this.logger.info('All circuit breakers reset');
  }
}

// Factory functions
export function createCircuitBreaker(
  name: string,
  config: CircuitBreakerConfig,
  serviceName: string,
  tracing?: GuardAntTracing
): CircuitBreaker {
  return new CircuitBreaker(name, config, serviceName, tracing);
}

export function createCircuitBreakerManager(
  serviceName: string,
  tracing?: GuardAntTracing
): CircuitBreakerManager {
  return new CircuitBreakerManager(serviceName, tracing);
}

// Exports already defined above