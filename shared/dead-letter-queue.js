"use strict";
/**
 * Dead Letter Queue (DLQ) implementation for GuardAnt RabbitMQ operations
 * Handles failed messages, retry logic, and message recovery
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DLQManager = exports.DeadLetterQueue = exports.DLQConfigs = void 0;
exports.createDLQ = createDLQ;
exports.createDLQManager = createDLQManager;
const logger_1 = require("./logger");
const error_handling_1 = require("./error-handling");
// Predefined DLQ configurations
exports.DLQConfigs = {
    // For critical operations that must not be lost
    CRITICAL: {
        maxRetries: 10,
        retryDelayMs: 5000,
        retryBackoffFactor: 2,
        maxRetryDelayMs: 300000, // 5 minutes
        dlqTtlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
        enableAnalytics: true,
        alertThreshold: 100
    },
    // For standard operations
    STANDARD: {
        maxRetries: 5,
        retryDelayMs: 2000,
        retryBackoffFactor: 1.5,
        maxRetryDelayMs: 60000, // 1 minute
        dlqTtlMs: 3 * 24 * 60 * 60 * 1000, // 3 days
        enableAnalytics: true,
        alertThreshold: 50
    },
    // For non-critical operations
    FAST_FAIL: {
        maxRetries: 2,
        retryDelayMs: 1000,
        retryBackoffFactor: 2,
        maxRetryDelayMs: 10000,
        dlqTtlMs: 24 * 60 * 60 * 1000, // 1 day
        enableAnalytics: false,
        alertThreshold: 20
    },
    // For monitoring and metrics (can afford some loss)
    MONITORING: {
        maxRetries: 3,
        retryDelayMs: 500,
        retryBackoffFactor: 2,
        maxRetryDelayMs: 30000,
        dlqTtlMs: 12 * 60 * 60 * 1000, // 12 hours
        enableAnalytics: false,
        alertThreshold: 10
    }
};
class DeadLetterQueue {
    constructor(queueName, config, serviceName, tracing) {
        this.queueName = queueName;
        this.config = config;
        this.serviceName = serviceName;
        this.connection = null;
        this.channel = null;
        this.stats = {
            totalMessages: 0,
            retriedMessages: 0,
            permanentFailures: 0,
            averageRetries: 0,
            messagesByQueue: {},
            messagesByError: {}
        };
        this.dlqName = `${queueName}.dlq`;
        this.retryQueueName = `${queueName}.retry`;
        this.logger = (0, logger_1.createLogger)(`${serviceName}-dlq`);
        this.tracing = tracing;
    }
    async initialize(connection) {
        try {
            this.connection = connection;
            this.channel = await connection.createChannel();
            // Create DLQ with TTL if configured
            const dlqArgs = {};
            if (this.config.dlqTtlMs) {
                dlqArgs['x-message-ttl'] = this.config.dlqTtlMs;
            }
            await this.channel.assertQueue(this.dlqName, {
                durable: true,
                arguments: dlqArgs
            });
            // Create retry queue with delay
            await this.channel.assertQueue(this.retryQueueName, {
                durable: true,
                arguments: {
                    'x-dead-letter-exchange': '',
                    'x-dead-letter-routing-key': this.queueName,
                }
            });
            // Set up DLQ consumer
            await this.setupDLQConsumer();
            this.logger.info(`Dead Letter Queue initialized: ${this.dlqName}`, {
                config: this.config
            });
            if (this.tracing) {
                this.tracing.addEvent(`dlq_initialized_${this.queueName}`, {
                    'dlq.queue_name': this.dlqName,
                    'dlq.retry_queue': this.retryQueueName,
                });
            }
        }
        catch (error) {
            this.logger.error('Failed to initialize DLQ', error);
            throw new error_handling_1.GuardAntError({
                code: 'DLQ_INIT_FAILED',
                message: 'Failed to initialize Dead Letter Queue',
                category: error_handling_1.ErrorCategory.CONFIGURATION,
                severity: error_handling_1.ErrorSeverity.CRITICAL,
                recoveryStrategy: 'none',
                context: { service: this.serviceName, operation: 'dlq_init' },
                originalError: error
            });
        }
    }
    async setupDLQConsumer() {
        if (!this.channel)
            return;
        await this.channel.consume(this.dlqName, async (msg) => {
            if (!msg)
                return;
            try {
                const dlqMessage = this.parseDLQMessage(msg);
                await this.processDLQMessage(dlqMessage, msg);
            }
            catch (error) {
                this.logger.error('Error processing DLQ message', error);
                // Reject without requeue to prevent infinite loop
                this.channel?.nack(msg, false, false);
            }
        });
        this.logger.info(`DLQ consumer started: ${this.dlqName}`);
    }
    parseDLQMessage(msg) {
        const headers = msg.properties.headers || {};
        const timestamp = Date.now();
        return {
            id: headers['x-message-id'] || `dlq_${timestamp}_${Math.random()}`,
            originalQueue: headers['x-original-queue'] || this.queueName,
            originalExchange: headers['x-original-exchange'] || '',
            originalRoutingKey: headers['x-original-routing-key'] || this.queueName,
            content: msg.content,
            headers,
            timestamp,
            retryCount: parseInt(headers['x-retry-count'] || '0', 10),
            maxRetries: this.config.maxRetries,
            lastError: headers['x-last-error'],
            firstFailedAt: parseInt(headers['x-first-failed-at'] || timestamp.toString(), 10),
            properties: msg.properties
        };
    }
    async processDLQMessage(dlqMessage, msg) {
        this.stats.totalMessages++;
        this.updateQueueStats(dlqMessage.originalQueue);
        if (dlqMessage.lastError) {
            this.updateErrorStats(dlqMessage.lastError);
        }
        // Check if message can be retried
        if (dlqMessage.retryCount < dlqMessage.maxRetries) {
            await this.scheduleRetry(dlqMessage, msg);
        }
        else {
            await this.handlePermanentFailure(dlqMessage, msg);
        }
    }
    async scheduleRetry(dlqMessage, msg) {
        if (!this.channel)
            return;
        try {
            // Calculate retry delay with exponential backoff
            const delay = Math.min(this.config.retryDelayMs * Math.pow(this.config.retryBackoffFactor, dlqMessage.retryCount), this.config.maxRetryDelayMs);
            // Update headers for retry
            const retryHeaders = {
                ...dlqMessage.headers,
                'x-retry-count': dlqMessage.retryCount + 1,
                'x-retry-scheduled-at': Date.now(),
                'x-retry-delay': delay,
                'x-original-queue': dlqMessage.originalQueue,
                'x-original-exchange': dlqMessage.originalExchange,
                'x-original-routing-key': dlqMessage.originalRoutingKey,
                'x-first-failed-at': dlqMessage.firstFailedAt
            };
            // Send to retry queue with delay
            await this.channel.sendToQueue(this.retryQueueName, dlqMessage.content, {
                ...dlqMessage.properties,
                headers: retryHeaders,
                expiration: delay.toString()
            });
            this.stats.retriedMessages++;
            this.logger.info(`Message scheduled for retry: ${dlqMessage.id}`, {
                retryCount: dlqMessage.retryCount + 1,
                maxRetries: dlqMessage.maxRetries,
                delay,
                originalQueue: dlqMessage.originalQueue
            });
            if (this.tracing) {
                this.tracing.addEvent(`dlq_message_retry_scheduled_${this.queueName}`, {
                    'dlq.message_id': dlqMessage.id,
                    'dlq.retry_count': (dlqMessage.retryCount + 1).toString(),
                    'dlq.delay': delay.toString(),
                });
            }
            // Acknowledge the DLQ message
            this.channel.ack(msg);
        }
        catch (error) {
            this.logger.error(`Failed to schedule retry for message: ${dlqMessage.id}`, error);
            this.channel.nack(msg, false, false);
        }
    }
    async handlePermanentFailure(dlqMessage, msg) {
        if (!this.channel)
            return;
        this.stats.permanentFailures++;
        this.logger.error(`Message permanently failed: ${dlqMessage.id}`, new Error(dlqMessage.lastError || 'Unknown error'), {
            retryCount: dlqMessage.retryCount,
            originalQueue: dlqMessage.originalQueue,
            firstFailedAt: new Date(dlqMessage.firstFailedAt).toISOString(),
            ageMs: Date.now() - dlqMessage.firstFailedAt
        });
        if (this.tracing) {
            this.tracing.addEvent(`dlq_message_permanent_failure_${this.queueName}`, {
                'dlq.message_id': dlqMessage.id,
                'dlq.retry_count': dlqMessage.retryCount.toString(),
                'dlq.age_ms': (Date.now() - dlqMessage.firstFailedAt).toString(),
            });
        }
        // Store permanently failed message for analysis if analytics enabled
        if (this.config.enableAnalytics) {
            await this.storePermanentFailure(dlqMessage);
        }
        // Acknowledge the message to remove it from DLQ
        this.channel.ack(msg);
        // Send alert if threshold exceeded
        if (this.config.alertThreshold &&
            this.stats.permanentFailures % this.config.alertThreshold === 0) {
            await this.sendAlert();
        }
    }
    async storePermanentFailure(dlqMessage) {
        // This could be extended to store in a database or external system
        // For now, we just log it with structured data
        this.logger.error('Permanent failure record', new Error('Message permanently failed'), {
            messageId: dlqMessage.id,
            originalQueue: dlqMessage.originalQueue,
            content: dlqMessage.content.toString('base64'),
            headers: dlqMessage.headers,
            retryCount: dlqMessage.retryCount,
            firstFailedAt: dlqMessage.firstFailedAt,
            lastError: dlqMessage.lastError,
            type: 'permanent_failure'
        });
    }
    updateQueueStats(queue) {
        this.stats.messagesByQueue[queue] = (this.stats.messagesByQueue[queue] || 0) + 1;
    }
    updateErrorStats(error) {
        this.stats.messagesByError[error] = (this.stats.messagesByError[error] || 0) + 1;
    }
    async sendAlert() {
        this.logger.error('DLQ alert threshold exceeded', new Error('Too many permanent failures'), {
            dlqName: this.dlqName,
            permanentFailures: this.stats.permanentFailures,
            threshold: this.config.alertThreshold,
            stats: this.stats
        });
        // This could be extended to send to external alerting systems
        // (Slack, email, PagerDuty, etc.)
    }
    // Send a message to DLQ (used by main queue error handlers)
    async sendToDLQ(content, originalQueue, originalExchange = '', originalRoutingKey = '', error, retryCount = 0, properties = {}) {
        if (!this.channel) {
            throw new error_handling_1.GuardAntError({
                code: 'DLQ_NOT_INITIALIZED',
                message: 'DLQ channel not initialized',
                category: error_handling_1.ErrorCategory.CONFIGURATION,
                severity: error_handling_1.ErrorSeverity.HIGH,
                recoveryStrategy: 'none',
                context: { service: this.serviceName, operation: 'send_to_dlq' }
            });
        }
        const timestamp = Date.now();
        const messageId = `dlq_${timestamp}_${Math.random()}`;
        const headers = {
            ...properties.headers,
            'x-message-id': messageId,
            'x-original-queue': originalQueue,
            'x-original-exchange': originalExchange,
            'x-original-routing-key': originalRoutingKey,
            'x-retry-count': retryCount,
            'x-last-error': error.message,
            'x-first-failed-at': timestamp,
            'x-dlq-timestamp': timestamp
        };
        try {
            await this.channel.sendToQueue(this.dlqName, content, {
                ...properties,
                headers,
                persistent: true
            });
            this.logger.warn(`Message sent to DLQ: ${messageId}`, error, {
                originalQueue,
                retryCount,
                dlqName: this.dlqName
            });
            if (this.tracing) {
                this.tracing.addEvent(`dlq_message_sent_${this.queueName}`, {
                    'dlq.message_id': messageId,
                    'dlq.original_queue': originalQueue,
                    'dlq.error': error.message,
                });
            }
        }
        catch (dlqError) {
            this.logger.error('Failed to send message to DLQ', dlqError, {
                messageId,
                originalQueue,
                originalError: error.message
            });
            throw dlqError;
        }
    }
    // Get current statistics
    getStats() {
        // Calculate average retries
        if (this.stats.retriedMessages > 0) {
            this.stats.averageRetries = this.stats.retriedMessages / this.stats.totalMessages;
        }
        return { ...this.stats };
    }
    // Get queue length (for monitoring)
    async getQueueLength() {
        if (!this.channel) {
            throw new error_handling_1.GuardAntError({
                code: 'DLQ_NOT_INITIALIZED',
                message: 'DLQ channel not initialized',
                category: error_handling_1.ErrorCategory.CONFIGURATION,
                severity: error_handling_1.ErrorSeverity.MEDIUM,
                recoveryStrategy: 'none',
                context: { service: this.serviceName, operation: 'get_queue_length' }
            });
        }
        try {
            const [dlqInfo, retryInfo] = await Promise.all([
                this.channel.checkQueue(this.dlqName),
                this.channel.checkQueue(this.retryQueueName)
            ]);
            return {
                dlq: dlqInfo.messageCount,
                retry: retryInfo.messageCount
            };
        }
        catch (error) {
            this.logger.error('Failed to get queue lengths', error);
            return { dlq: -1, retry: -1 };
        }
    }
    // Purge DLQ (for maintenance)
    async purgeDLQ() {
        if (!this.channel) {
            throw new error_handling_1.GuardAntError({
                code: 'DLQ_NOT_INITIALIZED',
                message: 'DLQ channel not initialized',
                category: error_handling_1.ErrorCategory.CONFIGURATION,
                severity: error_handling_1.ErrorSeverity.MEDIUM,
                recoveryStrategy: 'none',
                context: { service: this.serviceName, operation: 'purge_dlq' }
            });
        }
        try {
            const result = await this.channel.purgeQueue(this.dlqName);
            this.logger.warn(`DLQ purged: ${this.dlqName}`, new Error('Manual purge'), {
                messagesPurged: result.messageCount
            });
            return { purged: result.messageCount };
        }
        catch (error) {
            this.logger.error('Failed to purge DLQ', error);
            throw error;
        }
    }
    // Close DLQ
    async close() {
        if (this.channel) {
            await this.channel.close();
            this.channel = null;
        }
        this.connection = null;
        this.logger.info(`DLQ closed: ${this.dlqName}`);
    }
}
exports.DeadLetterQueue = DeadLetterQueue;
// DLQ Manager to handle multiple DLQs
class DLQManager {
    constructor(serviceName, tracing) {
        this.dlqs = new Map();
        this.logger = (0, logger_1.createLogger)(`${serviceName}-dlq-manager`);
        this.tracing = tracing;
    }
    createDLQ(queueName, config) {
        if (this.dlqs.has(queueName)) {
            throw new error_handling_1.GuardAntError({
                code: 'DLQ_EXISTS',
                message: `DLQ for queue '${queueName}' already exists`,
                category: error_handling_1.ErrorCategory.CONFIGURATION,
                severity: error_handling_1.ErrorSeverity.MEDIUM,
                recoveryStrategy: 'none',
                context: { service: 'dlq-manager', operation: 'create' }
            });
        }
        const dlq = new DeadLetterQueue(queueName, config, 'dlq-manager', this.tracing);
        this.dlqs.set(queueName, dlq);
        this.logger.info(`DLQ created for queue: ${queueName}`);
        return dlq;
    }
    getDLQ(queueName) {
        return this.dlqs.get(queueName);
    }
    async initializeAll(connection) {
        const promises = Array.from(this.dlqs.values()).map(dlq => dlq.initialize(connection));
        await Promise.all(promises);
        this.logger.info(`All DLQs initialized: ${this.dlqs.size} queues`);
    }
    getAllStats() {
        const stats = {};
        for (const [queueName, dlq] of this.dlqs) {
            stats[queueName] = dlq.getStats();
        }
        return stats;
    }
    async closeAll() {
        const promises = Array.from(this.dlqs.values()).map(dlq => dlq.close());
        await Promise.all(promises);
        this.dlqs.clear();
        this.logger.info('All DLQs closed');
    }
}
exports.DLQManager = DLQManager;
// Factory functions
function createDLQ(queueName, config, serviceName, tracing) {
    return new DeadLetterQueue(queueName, config, serviceName, tracing);
}
function createDLQManager(serviceName, tracing) {
    return new DLQManager(serviceName, tracing);
}
// Exports already defined above
//# sourceMappingURL=dead-letter-queue.js.map