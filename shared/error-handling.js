"use strict";
/**
 * Centralized error handling system for GuardAnt services
 * Provides consistent error handling, categorization, and recovery mechanisms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorManager = exports.BusinessLogicError = exports.RateLimitError = exports.AuthorizationError = exports.AuthenticationError = exports.NetworkError = exports.ExternalServiceError = exports.SecretError = exports.DatabaseError = exports.NotFoundError = exports.ValidationError = exports.GuardAntError = exports.RecoveryStrategy = exports.ErrorSeverity = exports.ErrorCategory = void 0;
exports.createErrorMiddleware = createErrorMiddleware;
exports.createError = createError;
const logger_1 = require("./logger");
// Error categories for different types of failures
var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["VALIDATION"] = "validation";
    ErrorCategory["AUTHENTICATION"] = "authentication";
    ErrorCategory["AUTHORIZATION"] = "authorization";
    ErrorCategory["NOT_FOUND"] = "not_found";
    ErrorCategory["RATE_LIMIT"] = "rate_limit";
    ErrorCategory["EXTERNAL_SERVICE"] = "external_service";
    ErrorCategory["DATABASE"] = "database";
    ErrorCategory["NETWORK"] = "network";
    ErrorCategory["INTERNAL"] = "internal";
    ErrorCategory["BUSINESS_LOGIC"] = "business_logic";
    ErrorCategory["CONFIGURATION"] = "configuration";
})(ErrorCategory || (exports.ErrorCategory = ErrorCategory = {}));
// Error severity levels
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["LOW"] = "low";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["HIGH"] = "high";
    ErrorSeverity["CRITICAL"] = "critical";
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
// Error recovery strategies
var RecoveryStrategy;
(function (RecoveryStrategy) {
    RecoveryStrategy["NONE"] = "none";
    RecoveryStrategy["RETRY"] = "retry";
    RecoveryStrategy["FALLBACK"] = "fallback";
    RecoveryStrategy["CIRCUIT_BREAKER"] = "circuit_breaker";
    RecoveryStrategy["QUEUE_RETRY"] = "queue_retry";
})(RecoveryStrategy || (exports.RecoveryStrategy = RecoveryStrategy = {}));
class GuardAntError extends Error {
    constructor(details) {
        super(details.message);
        this.retryCount = 0;
        this.maxRetries = 0;
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
        }
        else if (Error.captureStackTrace) {
            Error.captureStackTrace(this, GuardAntError);
        }
    }
    toJSON() {
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
    canRetry() {
        return this.recoveryStrategy === RecoveryStrategy.RETRY &&
            this.retryCount < this.maxRetries;
    }
    incrementRetry() {
        this.retryCount++;
    }
}
exports.GuardAntError = GuardAntError;
// Predefined error types for common scenarios
class ValidationError extends GuardAntError {
    constructor(message, context, field) {
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
exports.ValidationError = ValidationError;
class NotFoundError extends GuardAntError {
    constructor(resource, context) {
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
exports.NotFoundError = NotFoundError;
class DatabaseError extends GuardAntError {
    constructor(operation, context, originalError) {
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
exports.DatabaseError = DatabaseError;
class SecretError extends GuardAntError {
    constructor(message, context) {
        super({
            code: 'SECRET_ERROR',
            message: `Secret management error: ${message}`,
            category: ErrorCategory.CONFIGURATION,
            severity: ErrorSeverity.HIGH,
            recoveryStrategy: RecoveryStrategy.NONE,
            context
        });
    }
}
exports.SecretError = SecretError;
class ExternalServiceError extends GuardAntError {
    constructor(service, context, originalError) {
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
exports.ExternalServiceError = ExternalServiceError;
class NetworkError extends GuardAntError {
    constructor(context, originalError) {
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
exports.NetworkError = NetworkError;
class AuthenticationError extends GuardAntError {
    constructor(context, reason) {
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
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends GuardAntError {
    constructor(context, resource) {
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
exports.AuthorizationError = AuthorizationError;
class RateLimitError extends GuardAntError {
    constructor(context, limit, window) {
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
exports.RateLimitError = RateLimitError;
class BusinessLogicError extends GuardAntError {
    constructor(message, context, code) {
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
exports.BusinessLogicError = BusinessLogicError;
// Central error manager
class ErrorManager {
    constructor(serviceName, tracing) {
        this.handlers = [];
        this.errorCounts = new Map();
        this.lastResetTime = Date.now();
        this.resetInterval = 60000; // 1 minute
        this.logger = (0, logger_1.createLogger)(`${serviceName}-error-manager`);
        this.tracing = tracing;
    }
    addHandler(handler) {
        this.handlers.push(handler);
    }
    normalizeError(error, context) {
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
    updateErrorCount(errorCode) {
        const now = Date.now();
        if (now - this.lastResetTime > this.resetInterval) {
            this.errorCounts.clear();
            this.lastResetTime = now;
        }
        const count = this.errorCounts.get(errorCode) || 0;
        this.errorCounts.set(errorCode, count + 1);
    }
    getErrorCount(errorCode) {
        return this.errorCounts.get(errorCode) || 0;
    }
    async handleError(error, context) {
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
                }
                catch (handlerError) {
                    this.logger.error('Error handler failed', handlerError, {
                        originalError: guardantError.code,
                        handler: handler.constructor.name
                    });
                }
            }
        }
        return guardantError;
    }
    // HTTP response helpers
    toHttpResponse(error) {
        let status;
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
exports.ErrorManager = ErrorManager;
// Middleware factory for HTTP frameworks
function createErrorMiddleware(errorManager) {
    return async (c, next) => {
        try {
            await next();
        }
        catch (error) {
            const context = {
                service: c.get('serviceName') || 'unknown',
                operation: `${c.req.method} ${c.req.path}`,
                requestId: c.get('requestId'),
                traceId: c.get('traceId'),
                nestId: c.get('nestId'),
                userId: c.get('userId'),
            };
            const guardantError = await errorManager.handleError(error, context);
            const response = errorManager.toHttpResponse(guardantError);
            return c.json(response.body, response.status);
        }
    };
}
// Utility functions for error creation
function createError(code, message, category, context, options) {
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
//# sourceMappingURL=error-handling.js.map