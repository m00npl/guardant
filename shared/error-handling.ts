/**
 * Centralized error handling system for GuardAnt services
 * Provides consistent error handling, categorization, and recovery mechanisms
 */

import { createLogger } from './logger';
import type { GuardAntTracing } from './tracing';

// Error categories for different types of failures
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  NETWORK = 'network',
  INTERNAL = 'internal',
  BUSINESS_LOGIC = 'business_logic',
  CONFIGURATION = 'configuration',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Error recovery strategies
export enum RecoveryStrategy {
  NONE = 'none',
  RETRY = 'retry',
  FALLBACK = 'fallback',
  CIRCUIT_BREAKER = 'circuit_breaker',
  QUEUE_RETRY = 'queue_retry',
}

export interface ErrorContext {
  service: string;
  operation: string;
  nestId?: string;
  userId?: string;
  requestId?: string;
  traceId?: string;
  metadata?: Record<string, any>;
}

export interface ErrorDetails {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoveryStrategy: RecoveryStrategy;
  context: ErrorContext;
  originalError?: Error;
  timestamp: number;
  stack?: string;
  retryCount?: number;
  maxRetries?: number;
}

export class GuardAntError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly recoveryStrategy: RecoveryStrategy;
  public readonly context: ErrorContext;
  public readonly timestamp: number;
  public readonly originalError?: Error;
  public retryCount: number = 0;
  public maxRetries: number = 0;

  constructor(details: Omit<ErrorDetails, 'timestamp'>) {
    super(details.message);
    this.name = 'GuardAntError';
    this.code = details.code;
    this.category = details.category;
    this.severity = details.severity;
    this.recoveryStrategy = details.recoveryStrategy;
    this.context = details.context;
    this.originalError = details.originalError;
    this.timestamp = Date.now();
    this.retryCount = details.retryCount || 0;
    this.maxRetries = details.maxRetries || 0;

    // Preserve stack trace
    if (details.originalError) {
      this.stack = details.originalError.stack;
    } else if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GuardAntError);
    }
  }

  toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      recoveryStrategy: this.recoveryStrategy,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
    };
  }

  canRetry(): boolean {
    return this.recoveryStrategy === RecoveryStrategy.RETRY && 
           this.retryCount < this.maxRetries;
  }

  incrementRetry(): void {
    this.retryCount++;
  }
}

// Predefined error types for common scenarios
export class ValidationError extends GuardAntError {
  constructor(message: string, context: ErrorContext, field?: string) {
    super({
      code: 'VALIDATION_ERROR',
      message,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      recoveryStrategy: RecoveryStrategy.NONE,
      context: {
        ...context,
        metadata: { field, ...context.metadata }
      }
    });
  }
}

export class NotFoundError extends GuardAntError {
  constructor(resource: string, context: ErrorContext) {
    super({
      code: 'NOT_FOUND',
      message: `${resource} not found`,
      category: ErrorCategory.NOT_FOUND,
      severity: ErrorSeverity.LOW,
      recoveryStrategy: RecoveryStrategy.NONE,
      context: {
        ...context,
        metadata: { resource, ...context.metadata }
      }
    });
  }
}

export class DatabaseError extends GuardAntError {
  constructor(operation: string, context: ErrorContext, originalError?: Error) {
    super({
      code: 'DATABASE_ERROR',
      message: `Database operation failed: ${operation}`,
      category: ErrorCategory.DATABASE,
      severity: ErrorSeverity.HIGH,
      recoveryStrategy: RecoveryStrategy.RETRY,
      context,
      originalError,
      maxRetries: 3
    });
  }
}

export class ExternalServiceError extends GuardAntError {
  constructor(service: string, context: ErrorContext, originalError?: Error) {
    super({
      code: 'EXTERNAL_SERVICE_ERROR',
      message: `External service error: ${service}`,
      category: ErrorCategory.EXTERNAL_SERVICE,
      severity: ErrorSeverity.MEDIUM,
      recoveryStrategy: RecoveryStrategy.CIRCUIT_BREAKER,
      context: {
        ...context,
        metadata: { service, ...context.metadata }
      },
      originalError,
      maxRetries: 5
    });
  }
}

export class NetworkError extends GuardAntError {
  constructor(context: ErrorContext, originalError?: Error) {
    super({
      code: 'NETWORK_ERROR',
      message: 'Network operation failed',
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      recoveryStrategy: RecoveryStrategy.RETRY,
      context,
      originalError,
      maxRetries: 3
    });
  }
}

export class AuthenticationError extends GuardAntError {
  constructor(context: ErrorContext, reason?: string) {
    super({
      code: 'AUTHENTICATION_ERROR',
      message: reason || 'Authentication failed',
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      recoveryStrategy: RecoveryStrategy.NONE,
      context
    });
  }
}

export class AuthorizationError extends GuardAntError {
  constructor(context: ErrorContext, resource?: string) {
    super({
      code: 'AUTHORIZATION_ERROR',
      message: resource ? `Access denied to ${resource}` : 'Access denied',
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      recoveryStrategy: RecoveryStrategy.NONE,
      context: {
        ...context,
        metadata: { resource, ...context.metadata }
      }
    });
  }
}

export class RateLimitError extends GuardAntError {
  constructor(context: ErrorContext, limit: number, window: number) {
    super({
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded: ${limit} requests per ${window}s`,
      category: ErrorCategory.RATE_LIMIT,
      severity: ErrorSeverity.LOW,
      recoveryStrategy: RecoveryStrategy.RETRY,
      context: {
        ...context,
        metadata: { limit, window, ...context.metadata }
      },
      maxRetries: 3
    });
  }
}

export class BusinessLogicError extends GuardAntError {
  constructor(message: string, context: ErrorContext, code?: string) {
    super({
      code: code || 'BUSINESS_LOGIC_ERROR',
      message,
      category: ErrorCategory.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      recoveryStrategy: RecoveryStrategy.NONE,
      context
    });
  }
}

// Error handler interface
export interface ErrorHandler {
  canHandle(error: Error | GuardAntError): boolean;
  handle(error: Error | GuardAntError, context?: ErrorContext): Promise<any>;
}

// Central error manager
export class ErrorManager {
  private logger;
  private tracing?: GuardAntTracing;
  private handlers: ErrorHandler[] = [];
  private errorCounts = new Map<string, number>();
  private lastResetTime = Date.now();
  private readonly resetInterval = 60000; // 1 minute

  constructor(serviceName: string, tracing?: GuardAntTracing) {
    this.logger = createLogger(`${serviceName}-error-manager`);
    this.tracing = tracing;
  }

  addHandler(handler: ErrorHandler): void {
    this.handlers.push(handler);
  }

  private normalizeError(error: Error | GuardAntError, context?: ErrorContext): GuardAntError {
    if (error instanceof GuardAntError) {
      return error;
    }

    // Detect error type based on error message/type
    if (error.name === 'ValidationError' || error.message.includes('validation')) {
      return new ValidationError(error.message, context || { service: 'unknown', operation: 'unknown' });
    }

    if (error.name === 'NotFoundError' || error.message.includes('not found')) {
      return new NotFoundError('resource', context || { service: 'unknown', operation: 'unknown' });
    }

    if (error.message.includes('database') || error.message.includes('redis')) {
      return new DatabaseError('unknown', context || { service: 'unknown', operation: 'unknown' }, error);
    }

    if (error.name === 'NetworkError' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return new NetworkError(context || { service: 'unknown', operation: 'unknown' }, error);
    }

    // Default to internal error
    return new GuardAntError({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
      category: ErrorCategory.INTERNAL,
      severity: ErrorSeverity.HIGH,
      recoveryStrategy: RecoveryStrategy.NONE,
      context: context || { service: 'unknown', operation: 'unknown' },
      originalError: error
    });
  }

  private updateErrorCount(errorCode: string): void {
    const now = Date.now();
    if (now - this.lastResetTime > this.resetInterval) {
      this.errorCounts.clear();
      this.lastResetTime = now;
    }

    const count = this.errorCounts.get(errorCode) || 0;
    this.errorCounts.set(errorCode, count + 1);
  }

  getErrorCount(errorCode: string): number {
    return this.errorCounts.get(errorCode) || 0;
  }

  async handleError(error: Error | GuardAntError, context?: ErrorContext): Promise<GuardAntError> {
    const guardantError = this.normalizeError(error, context);
    
    // Update error counts
    this.updateErrorCount(guardantError.code);

    // Add to tracing if available
    if (this.tracing) {
      this.tracing.addEvent('error_occurred', {
        'error.code': guardantError.code,
        'error.category': guardantError.category,
        'error.severity': guardantError.severity,
        'error.message': guardantError.message,
      });
    }

    // Log error with appropriate level
    switch (guardantError.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error('Critical error occurred', guardantError, guardantError.context);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error('High severity error', guardantError, guardantError.context);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn('Medium severity error', guardantError, guardantError.context);
        break;
      case ErrorSeverity.LOW:
        this.logger.info('Low severity error', guardantError, guardantError.context);
        break;
    }

    // Try to handle with custom handlers
    for (const handler of this.handlers) {
      if (handler.canHandle(guardantError)) {
        try {
          await handler.handle(guardantError, context);
        } catch (handlerError) {
          this.logger.error('Error handler failed', handlerError as Error, { 
            originalError: guardantError.code,
            handler: handler.constructor.name 
          });
        }
      }
    }

    return guardantError;
  }

  // HTTP response helpers
  toHttpResponse(error: GuardAntError): { status: number; body: any } {
    let status: number;
    
    switch (error.category) {
      case ErrorCategory.VALIDATION:
        status = 400;
        break;
      case ErrorCategory.AUTHENTICATION:
        status = 401;
        break;
      case ErrorCategory.AUTHORIZATION:
        status = 403;
        break;
      case ErrorCategory.NOT_FOUND:
        status = 404;
        break;
      case ErrorCategory.RATE_LIMIT:
        status = 429;
        break;
      case ErrorCategory.EXTERNAL_SERVICE:
      case ErrorCategory.DATABASE:
      case ErrorCategory.NETWORK:
        status = 503; // Service Unavailable
        break;
      default:
        status = 500;
    }

    return {
      status,
      body: {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          category: error.category,
          timestamp: error.timestamp,
          ...(error.context.requestId && { requestId: error.context.requestId }),
          ...(error.context.traceId && { traceId: error.context.traceId }),
        }
      }
    };
  }
}

// Middleware factory for HTTP frameworks
export function createErrorMiddleware(errorManager: ErrorManager) {
  return async (c: any, next: any) => {
    try {
      await next();
    } catch (error) {
      const context: ErrorContext = {
        service: c.get('serviceName') || 'unknown',
        operation: `${c.req.method} ${c.req.path}`,
        requestId: c.get('requestId'),
        traceId: c.get('traceId'),
        nestId: c.get('nestId'),
        userId: c.get('userId'),
      };

      const guardantError = await errorManager.handleError(error as Error, context);
      const response = errorManager.toHttpResponse(guardantError);
      
      return c.json(response.body, response.status);
    }
  };
}

// Utility functions for error creation
export function createError(
  code: string,
  message: string,
  category: ErrorCategory,
  context: ErrorContext,
  options?: {
    severity?: ErrorSeverity;
    recoveryStrategy?: RecoveryStrategy;
    originalError?: Error;
    maxRetries?: number;
  }
): GuardAntError {
  return new GuardAntError({
    code,
    message,
    category,
    severity: options?.severity || ErrorSeverity.MEDIUM,
    recoveryStrategy: options?.recoveryStrategy || RecoveryStrategy.NONE,
    context,
    originalError: options?.originalError,
    maxRetries: options?.maxRetries || 0,
  });
}

// Error types already exported above