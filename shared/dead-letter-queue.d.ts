/**
 * Dead Letter Queue (DLQ) implementation for GuardAnt RabbitMQ operations
 * Handles failed messages, retry logic, and message recovery
 */
import amqp from 'amqplib';
import type { GuardAntTracing } from './tracing';
export interface DLQMessage {
    id: string;
    originalQueue: string;
    originalExchange: string;
    originalRoutingKey: string;
    content: Buffer;
    headers: Record<string, any>;
    timestamp: number;
    retryCount: number;
    maxRetries: number;
    lastError?: string;
    firstFailedAt: number;
    properties: amqp.MessageProperties;
}
export interface DLQConfig {
    maxRetries: number;
    retryDelayMs: number;
    retryBackoffFactor: number;
    maxRetryDelayMs: number;
    dlqTtlMs?: number;
    enableAnalytics: boolean;
    alertThreshold?: number;
}
export interface DLQStats {
    totalMessages: number;
    retriedMessages: number;
    permanentFailures: number;
    averageRetries: number;
    oldestMessage?: number;
    newestMessage?: number;
    messagesByQueue: Record<string, number>;
    messagesByError: Record<string, number>;
}
export declare const DLQConfigs: {
    CRITICAL: {
        maxRetries: number;
        retryDelayMs: number;
        retryBackoffFactor: number;
        maxRetryDelayMs: number;
        dlqTtlMs: number;
        enableAnalytics: boolean;
        alertThreshold: number;
    };
    STANDARD: {
        maxRetries: number;
        retryDelayMs: number;
        retryBackoffFactor: number;
        maxRetryDelayMs: number;
        dlqTtlMs: number;
        enableAnalytics: boolean;
        alertThreshold: number;
    };
    FAST_FAIL: {
        maxRetries: number;
        retryDelayMs: number;
        retryBackoffFactor: number;
        maxRetryDelayMs: number;
        dlqTtlMs: number;
        enableAnalytics: boolean;
        alertThreshold: number;
    };
    MONITORING: {
        maxRetries: number;
        retryDelayMs: number;
        retryBackoffFactor: number;
        maxRetryDelayMs: number;
        dlqTtlMs: number;
        enableAnalytics: boolean;
        alertThreshold: number;
    };
};
export declare class DeadLetterQueue {
    private queueName;
    private config;
    private serviceName;
    private connection;
    private channel;
    private dlqName;
    private retryQueueName;
    private logger;
    private tracing?;
    private stats;
    constructor(queueName: string, config: DLQConfig, serviceName: string, tracing?: GuardAntTracing);
    initialize(connection: amqp.Connection): Promise<void>;
    private setupDLQConsumer;
    private parseDLQMessage;
    private processDLQMessage;
    private scheduleRetry;
    private handlePermanentFailure;
    private storePermanentFailure;
    private updateQueueStats;
    private updateErrorStats;
    private sendAlert;
    sendToDLQ(content: Buffer, originalQueue: string, originalExchange: string | undefined, originalRoutingKey: string | undefined, error: Error, retryCount?: number, properties?: amqp.MessageProperties): Promise<void>;
    getStats(): DLQStats;
    getQueueLength(): Promise<{
        dlq: number;
        retry: number;
    }>;
    purgeDLQ(): Promise<{
        purged: number;
    }>;
    close(): Promise<void>;
}
export declare class DLQManager {
    private dlqs;
    private logger;
    private tracing?;
    constructor(serviceName: string, tracing?: GuardAntTracing);
    createDLQ(queueName: string, config: DLQConfig): DeadLetterQueue;
    getDLQ(queueName: string): DeadLetterQueue | undefined;
    initializeAll(connection: amqp.Connection): Promise<void>;
    getAllStats(): Record<string, DLQStats>;
    closeAll(): Promise<void>;
}
export declare function createDLQ(queueName: string, config: DLQConfig, serviceName: string, tracing?: GuardAntTracing): DeadLetterQueue;
export declare function createDLQManager(serviceName: string, tracing?: GuardAntTracing): DLQManager;
//# sourceMappingURL=dead-letter-queue.d.ts.map