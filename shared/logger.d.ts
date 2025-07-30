/**
 * Centralized structured logging system for GuardAnt
 * Provides consistent logging across all services with structured JSON output
 */
export interface LogContext {
    service: string;
    nestId?: string;
    serviceId?: string;
    userId?: string;
    requestId?: string;
    region?: string;
    [key: string]: any;
}
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4
}
export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    context: LogContext;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
    duration?: number;
    metadata?: Record<string, any>;
}
declare class Logger {
    private serviceName;
    private logLevel;
    constructor(serviceName: string);
    private parseLogLevel;
    private shouldLog;
    private formatLogEntry;
    private writeLog;
    debug(message: string, context?: Partial<LogContext>, metadata?: Record<string, any>): void;
    info(message: string, context?: Partial<LogContext>, metadata?: Record<string, any>): void;
    warn(message: string, context?: Partial<LogContext>, metadata?: Record<string, any>): void;
    error(message: string, error?: Error, context?: Partial<LogContext>, metadata?: Record<string, any>): void;
    fatal(message: string, error?: Error, context?: Partial<LogContext>, metadata?: Record<string, any>): void;
    performance(message: string, duration: number, context?: Partial<LogContext>, metadata?: Record<string, any>): void;
    httpRequest(method: string, path: string, statusCode: number, duration: number, context?: Partial<LogContext>): void;
    dbOperation(operation: string, table: string, duration: number, context?: Partial<LogContext>, error?: Error): void;
    serviceCheck(serviceId: string, status: 'up' | 'down' | 'degraded', responseTime: number, context?: Partial<LogContext>, error?: Error): void;
    businessEvent(event: string, context?: Partial<LogContext>, metadata?: Record<string, any>): void;
    child(additionalContext: Partial<LogContext>): Logger;
}
export declare function createLogger(serviceName: string): Logger;
export declare const logger: Logger;
export declare class PerformanceTimer {
    private startTime;
    private logger;
    private operation;
    private context?;
    constructor(logger: Logger, operation: string, context?: Partial<LogContext>);
    finish(metadata?: Record<string, any>): number;
    finishWithError(error: Error, metadata?: Record<string, any>): number;
}
export declare function createRequestLogger(logger: Logger): (req: any, res: any, next: any) => void;
export {};
//# sourceMappingURL=logger.d.ts.map