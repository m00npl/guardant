/**
 * Centralized error handling system for GuardAnt services
 * Provides consistent error handling, categorization, and recovery mechanisms
 */
import type { GuardAntTracing } from './tracing';
export declare enum ErrorCategory {
    VALIDATION = "validation",
    AUTHENTICATION = "authentication",
    AUTHORIZATION = "authorization",
    NOT_FOUND = "not_found",
    RATE_LIMIT = "rate_limit",
    EXTERNAL_SERVICE = "external_service",
    DATABASE = "database",
    NETWORK = "network",
    INTERNAL = "internal",
    BUSINESS_LOGIC = "business_logic",
    CONFIGURATION = "configuration"
}
export declare enum ErrorSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare enum RecoveryStrategy {
    NONE = "none",
    RETRY = "retry",
    FALLBACK = "fallback",
    CIRCUIT_BREAKER = "circuit_breaker",
    QUEUE_RETRY = "queue_retry"
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
export declare class GuardAntError extends Error {
    readonly code: string;
    readonly category: ErrorCategory;
    readonly severity: ErrorSeverity;
    readonly recoveryStrategy: RecoveryStrategy;
    readonly context: ErrorContext;
    readonly timestamp: number;
    readonly originalError?: Error;
    retryCount: number;
    maxRetries: number;
    constructor(details: Omit<ErrorDetails, 'timestamp'>);
    toJSON(): ErrorDetails;
    canRetry(): boolean;
    incrementRetry(): void;
}
export declare class ValidationError extends GuardAntError {
    constructor(message: string, context: ErrorContext, field?: string);
}
export declare class NotFoundError extends GuardAntError {
    constructor(resource: string, context: ErrorContext);
}
export declare class DatabaseError extends GuardAntError {
    constructor(operation: string, context: ErrorContext, originalError?: Error);
}
export declare class SecretError extends GuardAntError {
    constructor(message: string, context: ErrorContext);
}
export declare class ExternalServiceError extends GuardAntError {
    constructor(service: string, context: ErrorContext, originalError?: Error);
}
export declare class NetworkError extends GuardAntError {
    constructor(context: ErrorContext, originalError?: Error);
}
export declare class AuthenticationError extends GuardAntError {
    constructor(context: ErrorContext, reason?: string);
}
export declare class AuthorizationError extends GuardAntError {
    constructor(context: ErrorContext, resource?: string);
}
export declare class RateLimitError extends GuardAntError {
    constructor(context: ErrorContext, limit: number, window: number);
}
export declare class BusinessLogicError extends GuardAntError {
    constructor(message: string, context: ErrorContext, code?: string);
}
export interface ErrorHandler {
    canHandle(error: Error | GuardAntError): boolean;
    handle(error: Error | GuardAntError, context?: ErrorContext): Promise<any>;
}
export declare class ErrorManager {
    private logger;
    private tracing?;
    private handlers;
    private errorCounts;
    private lastResetTime;
    private readonly resetInterval;
    constructor(serviceName: string, tracing?: GuardAntTracing);
    addHandler(handler: ErrorHandler): void;
    private normalizeError;
    private updateErrorCount;
    getErrorCount(errorCode: string): number;
    handleError(error: Error | GuardAntError, context?: ErrorContext): Promise<GuardAntError>;
    toHttpResponse(error: GuardAntError): {
        status: number;
        body: any;
    };
}
export declare function createErrorMiddleware(errorManager: ErrorManager): (c: any, next: any) => Promise<any>;
export declare function createError(code: string, message: string, category: ErrorCategory, context: ErrorContext, options?: {
    severity?: ErrorSeverity;
    recoveryStrategy?: RecoveryStrategy;
    originalError?: Error;
    maxRetries?: number;
}): GuardAntError;
//# sourceMappingURL=error-handling.d.ts.map