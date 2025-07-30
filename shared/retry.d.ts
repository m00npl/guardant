/**
 * Retry mechanisms for external API calls and operations
 * Provides exponential backoff, jitter, and different retry strategies
 */
import type { GuardAntTracing } from './tracing';
export interface RetryOptions {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffFactor: number;
    jitter: boolean;
    retryCondition?: (error: Error) => boolean;
    onRetry?: (attempt: number, error: Error) => void;
    timeoutMs?: number;
}
export interface RetryResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
    attempts: number;
    totalDuration: number;
}
export declare enum RetryStrategy {
    EXPONENTIAL_BACKOFF = "exponential_backoff",
    LINEAR_BACKOFF = "linear_backoff",
    FIXED_DELAY = "fixed_delay",
    IMMEDIATE = "immediate"
}
export declare const RetryConfigs: {
    DATABASE: {
        maxAttempts: number;
        baseDelay: number;
        maxDelay: number;
        backoffFactor: number;
        jitter: boolean;
        retryCondition: (error: Error) => boolean;
    };
    HTTP_API: {
        maxAttempts: number;
        baseDelay: number;
        maxDelay: number;
        backoffFactor: number;
        jitter: boolean;
        timeoutMs: number;
        retryCondition: (error: Error) => boolean;
    };
    RABBITMQ: {
        maxAttempts: number;
        baseDelay: number;
        maxDelay: number;
        backoffFactor: number;
        jitter: boolean;
        retryCondition: (error: Error) => boolean;
    };
    REDIS: {
        maxAttempts: number;
        baseDelay: number;
        maxDelay: number;
        backoffFactor: number;
        jitter: boolean;
        retryCondition: (error: Error) => boolean;
    };
    GOLEM: {
        maxAttempts: number;
        baseDelay: number;
        maxDelay: number;
        backoffFactor: number;
        jitter: boolean;
        timeoutMs: number;
        retryCondition: (error: Error) => boolean;
    };
    ETHEREUM: {
        maxAttempts: number;
        baseDelay: number;
        maxDelay: number;
        backoffFactor: number;
        jitter: boolean;
        timeoutMs: number;
        retryCondition: (error: Error) => boolean;
    };
    FAST: {
        maxAttempts: number;
        baseDelay: number;
        maxDelay: number;
        backoffFactor: number;
        jitter: boolean;
    };
};
export declare class RetryManager {
    private logger;
    private tracing?;
    constructor(serviceName: string, tracing?: GuardAntTracing);
    private calculateDelay;
    private sleep;
    private shouldRetry;
    executeWithRetry<T>(operation: () => Promise<T>, options: RetryOptions, strategy?: RetryStrategy, operationName?: string): Promise<RetryResult<T>>;
    private withTimeout;
    retryDatabaseOperation<T>(operation: () => Promise<T>, operationName?: string): Promise<RetryResult<T>>;
    retryHttpCall<T>(operation: () => Promise<T>, operationName?: string): Promise<RetryResult<T>>;
    retryRabbitMQOperation<T>(operation: () => Promise<T>, operationName?: string): Promise<RetryResult<T>>;
    retryRedisOperation<T>(operation: () => Promise<T>, operationName?: string): Promise<RetryResult<T>>;
    retryGolemOperation<T>(operation: () => Promise<T>, operationName?: string): Promise<RetryResult<T>>;
    retryEthereumOperation<T>(operation: () => Promise<T>, operationName?: string): Promise<RetryResult<T>>;
}
export declare function createRetryManager(serviceName: string, tracing?: GuardAntTracing): RetryManager;
export declare function withRetry<T>(operation: () => Promise<T>, config: RetryOptions, operationName?: string): Promise<T>;
//# sourceMappingURL=retry.d.ts.map