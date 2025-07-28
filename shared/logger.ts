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

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
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

class Logger {
  private serviceName: string;
  private logLevel: LogLevel;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.logLevel = this.parseLogLevel(process.env.LOG_LEVEL || 'INFO');
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toUpperCase()) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'FATAL': return LogLevel.FATAL;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatLogEntry(
    level: LogLevel,
    message: string,
    context: Partial<LogContext> = {},
    error?: Error,
    duration?: number,
    metadata?: Record<string, any>
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context: {
        service: this.serviceName,
        ...context,
      },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (duration !== undefined) {
      entry.duration = duration;
    }

    if (metadata && Object.keys(metadata).length > 0) {
      entry.metadata = metadata;
    }

    return entry;
  }

  private writeLog(entry: LogEntry): void {
    const output = JSON.stringify(entry);
    
    if (entry.level === 'ERROR' || entry.level === 'FATAL') {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  debug(message: string, context?: Partial<LogContext>, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.formatLogEntry(LogLevel.DEBUG, message, context, undefined, undefined, metadata);
    this.writeLog(entry);
  }

  info(message: string, context?: Partial<LogContext>, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.formatLogEntry(LogLevel.INFO, message, context, undefined, undefined, metadata);
    this.writeLog(entry);
  }

  warn(message: string, context?: Partial<LogContext>, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.formatLogEntry(LogLevel.WARN, message, context, undefined, undefined, metadata);
    this.writeLog(entry);
  }

  error(message: string, error?: Error, context?: Partial<LogContext>, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const entry = this.formatLogEntry(LogLevel.ERROR, message, context, error, undefined, metadata);
    this.writeLog(entry);
  }

  fatal(message: string, error?: Error, context?: Partial<LogContext>, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.FATAL)) return;
    const entry = this.formatLogEntry(LogLevel.FATAL, message, context, error, undefined, metadata);
    this.writeLog(entry);
  }

  // Performance logging with duration tracking
  performance(message: string, duration: number, context?: Partial<LogContext>, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.formatLogEntry(LogLevel.INFO, message, context, undefined, duration, metadata);
    this.writeLog(entry);
  }

  // HTTP request logging helper
  httpRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: Partial<LogContext>
  ): void {
    const metadata = {
      http: {
        method,
        path,
        statusCode,
        responseTime: duration,
      },
    };

    const level = statusCode >= 500 ? LogLevel.ERROR : 
                 statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;

    if (!this.shouldLog(level)) return;

    const message = `${method} ${path} ${statusCode} - ${duration}ms`;
    const entry = this.formatLogEntry(level, message, context, undefined, duration, metadata);
    this.writeLog(entry);
  }

  // Database operation logging
  dbOperation(
    operation: string,
    table: string,
    duration: number,
    context?: Partial<LogContext>,
    error?: Error
  ): void {
    const metadata = {
      database: {
        operation,
        table,
        duration,
      },
    };

    const level = error ? LogLevel.ERROR : LogLevel.DEBUG;
    if (!this.shouldLog(level)) return;

    const message = error 
      ? `Database ${operation} on ${table} failed: ${error.message}`
      : `Database ${operation} on ${table} completed in ${duration}ms`;

    const entry = this.formatLogEntry(level, message, context, error, duration, metadata);
    this.writeLog(entry);
  }

  // Service monitoring logging
  serviceCheck(
    serviceId: string,
    status: 'up' | 'down' | 'degraded',
    responseTime: number,
    context?: Partial<LogContext>,
    error?: Error
  ): void {
    const metadata = {
      monitoring: {
        serviceId,
        status,
        responseTime,
      },
    };

    const level = status === 'down' ? LogLevel.WARN : LogLevel.INFO;
    if (!this.shouldLog(level)) return;

    const message = `Service ${serviceId} is ${status} (${responseTime}ms)`;
    const entry = this.formatLogEntry(level, message, { ...context, serviceId }, error, responseTime, metadata);
    this.writeLog(entry);
  }

  // Business event logging
  businessEvent(
    event: string,
    context?: Partial<LogContext>,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const eventMetadata = {
      event: {
        type: event,
        timestamp: new Date().toISOString(),
      },
      ...metadata,
    };

    const entry = this.formatLogEntry(LogLevel.INFO, `Business event: ${event}`, context, undefined, undefined, eventMetadata);
    this.writeLog(entry);
  }

  // Create child logger with additional context
  child(additionalContext: Partial<LogContext>): Logger {
    const childLogger = new Logger(this.serviceName);
    childLogger.logLevel = this.logLevel;
    
    // Override log methods to include additional context
    const originalMethods = {
      debug: childLogger.debug.bind(childLogger),
      info: childLogger.info.bind(childLogger),
      warn: childLogger.warn.bind(childLogger),
      error: childLogger.error.bind(childLogger),
      fatal: childLogger.fatal.bind(childLogger),
    };

    childLogger.debug = (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) => {
      originalMethods.debug(message, { ...additionalContext, ...context }, metadata);
    };

    childLogger.info = (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) => {
      originalMethods.info(message, { ...additionalContext, ...context }, metadata);
    };

    childLogger.warn = (message: string, context?: Partial<LogContext>, metadata?: Record<string, any>) => {
      originalMethods.warn(message, { ...additionalContext, ...context }, metadata);
    };

    childLogger.error = (message: string, error?: Error, context?: Partial<LogContext>, metadata?: Record<string, any>) => {
      originalMethods.error(message, error, { ...additionalContext, ...context }, metadata);
    };

    childLogger.fatal = (message: string, error?: Error, context?: Partial<LogContext>, metadata?: Record<string, any>) => {
      originalMethods.fatal(message, error, { ...additionalContext, ...context }, metadata);
    };

    return childLogger;
  }
}

// Factory function to create service-specific loggers
export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}

// Default logger instance
export const logger = createLogger('guardant');

// Performance timing helper
export class PerformanceTimer {
  private startTime: number;
  private logger: Logger;
  private operation: string;
  private context?: Partial<LogContext>;

  constructor(logger: Logger, operation: string, context?: Partial<LogContext>) {
    this.logger = logger;
    this.operation = operation;
    this.context = context;
    this.startTime = performance.now();
  }

  finish(metadata?: Record<string, any>): number {
    const duration = performance.now() - this.startTime;
    this.logger.performance(`${this.operation} completed`, duration, this.context, metadata);
    return duration;
  }

  finishWithError(error: Error, metadata?: Record<string, any>): number {
    const duration = performance.now() - this.startTime;
    this.logger.error(`${this.operation} failed`, error, this.context, {
      ...metadata,
      duration,
    });
    return duration;
  }
}

// Middleware for request logging
export function createRequestLogger(logger: Logger) {
  return (req: any, res: any, next: any) => {
    const startTime = performance.now();
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add request ID to headers for downstream services
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    // Create child logger with request context
    req.logger = logger.child({
      requestId,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
    });

    // Log request start
    req.logger.info('Request started', {
      method: req.method,
      path: req.path,
      query: req.query,
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const duration = performance.now() - startTime;
      
      logger.httpRequest(
        req.method,
        req.path,
        res.statusCode,
        duration,
        { requestId }
      );

      originalEnd.apply(res, args);
    };

    next();
  };
}