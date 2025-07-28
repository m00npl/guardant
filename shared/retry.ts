/**
 * Retry mechanisms for external API calls and operations
 * Provides exponential backoff, jitter, and different retry strategies
 */

import { createLogger } from './logger';
import { GuardAntError, ErrorCategory, ErrorSeverity, NetworkError } from './error-handling';
import type { GuardAntTracing } from './tracing';

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
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

export enum RetryStrategy {
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  LINEAR_BACKOFF = 'linear_backoff',
  FIXED_DELAY = 'fixed_delay',
  IMMEDIATE = 'immediate',
}

// Default retry configurations for different scenarios
export const RetryConfigs = {
  // For critical database operations
  DATABASE: {
    maxAttempts: 3,
    baseDelay: 100,
    maxDelay: 2000,
    backoffFactor: 2,
    jitter: true,
    retryCondition: (error: Error) => {
      // Retry on connection errors, timeouts, but not on validation errors
      return error.message.includes('ECONNREFUSED') ||
             error.message.includes('ETIMEDOUT') ||
             error.message.includes('connection') ||
             error.message.includes('timeout');
    }
  },

  // For external HTTP API calls
  HTTP_API: {
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 10000,
    backoffFactor: 2,
    jitter: true,
    timeoutMs: 30000,
    retryCondition: (error: Error) => {
      // Retry on network errors and 5xx status codes
      if (error instanceof GuardAntError) {
        return error.category === ErrorCategory.NETWORK ||
               error.category === ErrorCategory.EXTERNAL_SERVICE;
      }
      
      // Check for HTTP status codes that should be retried
      const httpError = error as any;
      const status = httpError.status || httpError.response?.status;
      return !status || status >= 500 || status === 429; // 5xx or rate limit
    }
  },

  // For RabbitMQ operations
  RABBITMQ: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 2,
    jitter: true,
    retryCondition: (error: Error) => {
      return error.message.includes('connection') ||
             error.message.includes('channel') ||
             error.message.includes('ECONNREFUSED');
    }
  },

  // For Redis operations
  REDIS: {
    maxAttempts: 3,
    baseDelay: 200,
    maxDelay: 2000,
    backoffFactor: 1.5,
    jitter: true,
    retryCondition: (error: Error) => {
      return error.message.includes('ECONNREFUSED') ||
             error.message.includes('Connection is closed') ||
             error.message.includes('Redis connection');
    }
  },

  // For Golem network operations
  GOLEM: {
    maxAttempts: 4,
    baseDelay: 1000,
    maxDelay: 8000,
    backoffFactor: 2,
    jitter: true,
    timeoutMs: 60000, // Longer timeout for blockchain operations
    retryCondition: (error: Error) => {
      return error.message.includes('network') ||
             error.message.includes('timeout') ||
             error.message.includes('connection') ||
             error.message.includes('nonce');
    }
  },

  // For Ethereum operations
  ETHEREUM: {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 16000,
    backoffFactor: 2,
    jitter: true,
    timeoutMs: 120000, // 2 minutes for blockchain
    retryCondition: (error: Error) => {
      const message = error.message.toLowerCase();
      return message.includes('network') ||
             message.includes('timeout') ||
             message.includes('nonce too low') ||
             message.includes('replacement transaction underpriced') ||
             message.includes('connection');
    }
  },

  // Quick operations with minimal retry
  FAST: {
    maxAttempts: 2,
    baseDelay: 50,
    maxDelay: 200,
    backoffFactor: 2,
    jitter: false
  }
};

export class RetryManager {
  private logger;
  private tracing?: GuardAntTracing;

  constructor(serviceName: string, tracing?: GuardAntTracing) {
    this.logger = createLogger(`${serviceName}-retry`);
    this.tracing = tracing;
  }

  private calculateDelay(
    attempt: number, 
    strategy: RetryStrategy,
    options: RetryOptions
  ): number {
    let delay: number;

    switch (strategy) {
      case RetryStrategy.EXPONENTIAL_BACKOFF:
        delay = Math.min(
          options.baseDelay * Math.pow(options.backoffFactor, attempt - 1),
          options.maxDelay
        );
        break;
      
      case RetryStrategy.LINEAR_BACKOFF:
        delay = Math.min(
          options.baseDelay * attempt,
          options.maxDelay
        );
        break;
      
      case RetryStrategy.FIXED_DELAY:
        delay = options.baseDelay;
        break;
      
      case RetryStrategy.IMMEDIATE:
        delay = 0;
        break;
      
      default:
        delay = options.baseDelay;
    }

    // Add jitter to prevent thundering herd
    if (options.jitter && delay > 0) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  private async sleep(ms: number): Promise<void> {
    if (ms <= 0) return;
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private shouldRetry(error: Error, attempt: number, options: RetryOptions): boolean {
    if (attempt >= options.maxAttempts) {
      return false;
    }

    if (options.retryCondition) {
      return options.retryCondition(error);
    }

    // Default retry condition - retry on network/connection errors
    return error.message.includes('network') ||
           error.message.includes('connection') ||
           error.message.includes('timeout') ||
           error.message.includes('ECONNREFUSED') ||
           error.message.includes('ETIMEDOUT');
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF,
    operationName: string = 'unknown'
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let lastError: Error;
    let attempt = 0;

    // Add timeout wrapper if specified
    const wrappedOperation = options.timeoutMs ? 
      this.withTimeout(operation, options.timeoutMs) : 
      operation;

    while (attempt < options.maxAttempts) {
      attempt++;

      try {
        this.logger.debug(`Executing ${operationName}`, { 
          attempt, 
          maxAttempts: options.maxAttempts 
        });

        if (this.tracing) {
          this.tracing.addEvent(`retry_attempt_${operationName}`, {
            attempt: attempt.toString(),
            max_attempts: options.maxAttempts.toString(),
          });
        }

        const result = await wrappedOperation();
        
        const totalDuration = Date.now() - startTime;
        
        if (attempt > 1) {
          this.logger.info(`Operation ${operationName} succeeded after ${attempt} attempts`, {
            attempts: attempt,
            totalDuration,
          });

          if (this.tracing) {
            this.tracing.addEvent(`retry_success_${operationName}`, {
              attempts: attempt.toString(),
              total_duration: totalDuration.toString(),
            });
          }
        }

        return {
          success: true,
          data: result,
          attempts: attempt,
          totalDuration,
        };

      } catch (error) {
        lastError = error as Error;
        
        this.logger.warn(`Attempt ${attempt} failed for ${operationName}`, lastError, {
          attempt,
          maxAttempts: options.maxAttempts,
        });

        if (this.tracing) {
          this.tracing.addEvent(`retry_attempt_failed_${operationName}`, {
            attempt: attempt.toString(),
            error: lastError.message,
          });
        }

        // Call retry callback if provided
        if (options.onRetry) {
          try {
            options.onRetry(attempt, lastError);
          } catch (callbackError) {
            this.logger.warn('Retry callback failed', callbackError as Error);
          }
        }

        // Check if we should retry
        if (!this.shouldRetry(lastError, attempt, options)) {
          this.logger.error(`Operation ${operationName} failed permanently`, lastError, {
            finalAttempt: attempt,
            reason: 'no_more_retries_or_non_retryable_error'
          });
          break;
        }

        // Calculate delay before next attempt
        if (attempt < options.maxAttempts) {
          const delay = this.calculateDelay(attempt, strategy, options);
          
          if (delay > 0) {
            this.logger.debug(`Waiting ${delay}ms before retry ${attempt + 1}`, {
              delay,
              nextAttempt: attempt + 1,
            });
            await this.sleep(delay);
          }
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    
    this.logger.error(`Operation ${operationName} failed after ${attempt} attempts`, lastError, {
      attempts: attempt,
      totalDuration,
    });

    if (this.tracing) {
      this.tracing.addEvent(`retry_failed_${operationName}`, {
        attempts: attempt.toString(),
        total_duration: totalDuration.toString(),
        final_error: lastError.message,
      });
    }

    return {
      success: false,
      error: lastError,
      attempts: attempt,
      totalDuration,
    };
  }

  private withTimeout<T>(operation: () => Promise<T>, timeoutMs: number): () => Promise<T> {
    return async (): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new NetworkError({
            service: 'retry-manager',
            operation: 'timeout',
          }, new Error(`Operation timed out after ${timeoutMs}ms`)));
        }, timeoutMs);

        operation()
          .then((result) => {
            clearTimeout(timeoutId);
            resolve(result);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
          });
      });
    };
  }

  // Convenience methods for common retry scenarios
  async retryDatabaseOperation<T>(
    operation: () => Promise<T>,
    operationName: string = 'database_operation'
  ): Promise<RetryResult<T>> {
    return this.executeWithRetry(
      operation,
      RetryConfigs.DATABASE,
      RetryStrategy.EXPONENTIAL_BACKOFF,
      operationName
    );
  }

  async retryHttpCall<T>(
    operation: () => Promise<T>,
    operationName: string = 'http_call'
  ): Promise<RetryResult<T>> {
    return this.executeWithRetry(
      operation,
      RetryConfigs.HTTP_API,
      RetryStrategy.EXPONENTIAL_BACKOFF,
      operationName
    );
  }

  async retryRabbitMQOperation<T>(
    operation: () => Promise<T>,
    operationName: string = 'rabbitmq_operation'
  ): Promise<RetryResult<T>> {
    return this.executeWithRetry(
      operation,
      RetryConfigs.RABBITMQ,
      RetryStrategy.EXPONENTIAL_BACKOFF,
      operationName
    );
  }

  async retryRedisOperation<T>(
    operation: () => Promise<T>,
    operationName: string = 'redis_operation'
  ): Promise<RetryResult<T>> {
    return this.executeWithRetry(
      operation,
      RetryConfigs.REDIS,
      RetryStrategy.EXPONENTIAL_BACKOFF,
      operationName
    );
  }

  async retryGolemOperation<T>(
    operation: () => Promise<T>,
    operationName: string = 'golem_operation'
  ): Promise<RetryResult<T>> {
    return this.executeWithRetry(
      operation,
      RetryConfigs.GOLEM,
      RetryStrategy.EXPONENTIAL_BACKOFF,
      operationName
    );
  }

  async retryEthereumOperation<T>(
    operation: () => Promise<T>,
    operationName: string = 'ethereum_operation'
  ): Promise<RetryResult<T>> {
    return this.executeWithRetry(
      operation,
      RetryConfigs.ETHEREUM,
      RetryStrategy.EXPONENTIAL_BACKOFF,
      operationName
    );
  }
}

// Factory function to create retry manager
export function createRetryManager(serviceName: string, tracing?: GuardAntTracing): RetryManager {
  return new RetryManager(serviceName, tracing);
}

// Utility function for simple retry without manager
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryOptions,
  operationName?: string
): Promise<T> {
  const manager = new RetryManager('simple-retry');
  const result = await manager.executeWithRetry(operation, config, RetryStrategy.EXPONENTIAL_BACKOFF, operationName);
  
  if (!result.success) {
    throw result.error || new Error('Operation failed after retries');
  }
  
  return result.data!;
}

// Exports already defined above