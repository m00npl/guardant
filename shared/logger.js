"use strict";
/**
 * Centralized structured logging system for GuardAnt
 * Provides consistent logging across all services with structured JSON output
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceTimer = exports.logger = exports.LogLevel = void 0;
exports.createLogger = createLogger;
exports.createRequestLogger = createRequestLogger;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["FATAL"] = 4] = "FATAL";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor(serviceName) {
        this.serviceName = serviceName;
        this.logLevel = this.parseLogLevel(process.env.LOG_LEVEL || 'INFO');
    }
    parseLogLevel(level) {
        switch (level.toUpperCase()) {
            case 'DEBUG': return LogLevel.DEBUG;
            case 'INFO': return LogLevel.INFO;
            case 'WARN': return LogLevel.WARN;
            case 'ERROR': return LogLevel.ERROR;
            case 'FATAL': return LogLevel.FATAL;
            default: return LogLevel.INFO;
        }
    }
    shouldLog(level) {
        return level >= this.logLevel;
    }
    formatLogEntry(level, message, context = {}, error, duration, metadata) {
        const entry = {
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
    writeLog(entry) {
        const output = JSON.stringify(entry);
        if (entry.level === 'ERROR' || entry.level === 'FATAL') {
            console.error(output);
        }
        else {
            console.log(output);
        }
    }
    debug(message, context, metadata) {
        if (!this.shouldLog(LogLevel.DEBUG))
            return;
        const entry = this.formatLogEntry(LogLevel.DEBUG, message, context, undefined, undefined, metadata);
        this.writeLog(entry);
    }
    info(message, context, metadata) {
        if (!this.shouldLog(LogLevel.INFO))
            return;
        const entry = this.formatLogEntry(LogLevel.INFO, message, context, undefined, undefined, metadata);
        this.writeLog(entry);
    }
    warn(message, context, metadata) {
        if (!this.shouldLog(LogLevel.WARN))
            return;
        const entry = this.formatLogEntry(LogLevel.WARN, message, context, undefined, undefined, metadata);
        this.writeLog(entry);
    }
    error(message, error, context, metadata) {
        if (!this.shouldLog(LogLevel.ERROR))
            return;
        const entry = this.formatLogEntry(LogLevel.ERROR, message, context, error, undefined, metadata);
        this.writeLog(entry);
    }
    fatal(message, error, context, metadata) {
        if (!this.shouldLog(LogLevel.FATAL))
            return;
        const entry = this.formatLogEntry(LogLevel.FATAL, message, context, error, undefined, metadata);
        this.writeLog(entry);
    }
    // Performance logging with duration tracking
    performance(message, duration, context, metadata) {
        if (!this.shouldLog(LogLevel.INFO))
            return;
        const entry = this.formatLogEntry(LogLevel.INFO, message, context, undefined, duration, metadata);
        this.writeLog(entry);
    }
    // HTTP request logging helper
    httpRequest(method, path, statusCode, duration, context) {
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
        if (!this.shouldLog(level))
            return;
        const message = `${method} ${path} ${statusCode} - ${duration}ms`;
        const entry = this.formatLogEntry(level, message, context, undefined, duration, metadata);
        this.writeLog(entry);
    }
    // Database operation logging
    dbOperation(operation, table, duration, context, error) {
        const metadata = {
            database: {
                operation,
                table,
                duration,
            },
        };
        const level = error ? LogLevel.ERROR : LogLevel.DEBUG;
        if (!this.shouldLog(level))
            return;
        const message = error
            ? `Database ${operation} on ${table} failed: ${error.message}`
            : `Database ${operation} on ${table} completed in ${duration}ms`;
        const entry = this.formatLogEntry(level, message, context, error, duration, metadata);
        this.writeLog(entry);
    }
    // Service monitoring logging
    serviceCheck(serviceId, status, responseTime, context, error) {
        const metadata = {
            monitoring: {
                serviceId,
                status,
                responseTime,
            },
        };
        const level = status === 'down' ? LogLevel.WARN : LogLevel.INFO;
        if (!this.shouldLog(level))
            return;
        const message = `Service ${serviceId} is ${status} (${responseTime}ms)`;
        const entry = this.formatLogEntry(level, message, { ...context, serviceId }, error, responseTime, metadata);
        this.writeLog(entry);
    }
    // Business event logging
    businessEvent(event, context, metadata) {
        if (!this.shouldLog(LogLevel.INFO))
            return;
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
    child(additionalContext) {
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
        childLogger.debug = (message, context, metadata) => {
            originalMethods.debug(message, { ...additionalContext, ...context }, metadata);
        };
        childLogger.info = (message, context, metadata) => {
            originalMethods.info(message, { ...additionalContext, ...context }, metadata);
        };
        childLogger.warn = (message, context, metadata) => {
            originalMethods.warn(message, { ...additionalContext, ...context }, metadata);
        };
        childLogger.error = (message, error, context, metadata) => {
            originalMethods.error(message, error, { ...additionalContext, ...context }, metadata);
        };
        childLogger.fatal = (message, error, context, metadata) => {
            originalMethods.fatal(message, error, { ...additionalContext, ...context }, metadata);
        };
        return childLogger;
    }
}
// Factory function to create service-specific loggers
function createLogger(serviceName) {
    return new Logger(serviceName);
}
// Default logger instance
exports.logger = createLogger('guardant');
// Performance timing helper
class PerformanceTimer {
    constructor(logger, operation, context) {
        this.logger = logger;
        this.operation = operation;
        this.context = context;
        this.startTime = performance.now();
    }
    finish(metadata) {
        const duration = performance.now() - this.startTime;
        this.logger.performance(`${this.operation} completed`, duration, this.context, metadata);
        return duration;
    }
    finishWithError(error, metadata) {
        const duration = performance.now() - this.startTime;
        this.logger.error(`${this.operation} failed`, error, this.context, {
            ...metadata,
            duration,
        });
        return duration;
    }
}
exports.PerformanceTimer = PerformanceTimer;
// Middleware for request logging
function createRequestLogger(logger) {
    return (req, res, next) => {
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
        res.end = function (...args) {
            const duration = performance.now() - startTime;
            logger.httpRequest(req.method, req.path, res.statusCode, duration, { requestId });
            originalEnd.apply(res, args);
        };
        next();
    };
}
//# sourceMappingURL=logger.js.map