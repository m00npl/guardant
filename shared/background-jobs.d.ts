/**
 * Advanced background job processing system for GuardAnt services
 * Provides job queuing, scheduling, processing, and monitoring with fault tolerance
 */
import type { GuardAntTracing } from './tracing';
export interface JobDefinition {
    id: string;
    type: JobType;
    name: string;
    data: Record<string, any>;
    priority: JobPriority;
    delay?: number;
    retryConfig?: JobRetryConfig;
    timeout?: number;
    tags?: string[];
    schedule?: JobSchedule;
    dependencies?: string[];
    maxConcurrency?: number;
}
export declare enum JobType {
    MONITORING_CHECK = "monitoring_check",
    SERVICE_HEALTH_CHECK = "service_health_check",
    NEST_CLEANUP = "nest_cleanup",
    METRICS_AGGREGATION = "metrics_aggregation",
    CACHE_WARMING = "cache_warming",
    DATABASE_BACKUP = "database_backup",
    EMAIL_NOTIFICATION = "email_notification",
    WEBHOOK_DELIVERY = "webhook_delivery",
    REPORT_GENERATION = "report_generation",
    DATA_MIGRATION = "data_migration",
    SUBSCRIPTION_RENEWAL = "subscription_renewal",
    PAYMENT_PROCESSING = "payment_processing",
    LOG_ARCHIVAL = "log_archival",
    ANALYTICS_PROCESSING = "analytics_processing",
    SECURITY_SCAN = "security_scan"
}
export declare enum JobPriority {
    CRITICAL = 0,// Highest priority
    HIGH = 1,
    NORMAL = 2,// Default
    LOW = 3,
    BULK = 4
}
export declare enum JobStatus {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed",
    RETRYING = "retrying",
    CANCELLED = "cancelled",
    PAUSED = "paused",
    SCHEDULED = "scheduled"
}
export interface JobRetryConfig {
    maxAttempts: number;
    backoffType: 'fixed' | 'exponential' | 'linear';
    baseDelay: number;
    maxDelay: number;
    jitter: boolean;
}
export interface JobSchedule {
    type: ScheduleType;
    expression: string;
    timezone?: string;
    startDate?: Date;
    endDate?: Date;
}
export declare enum ScheduleType {
    CRON = "cron",
    INTERVAL = "interval",
    ONCE = "once"
}
export interface JobExecution {
    id: string;
    jobId: string;
    startedAt: number;
    completedAt?: number;
    status: JobStatus;
    attempt: number;
    result?: any;
    error?: JobError;
    logs: JobLog[];
    metrics: JobMetrics;
    worker?: string;
}
export interface JobError {
    message: string;
    stack?: string;
    code?: string;
    recoverable: boolean;
    category: string;
}
export interface JobLog {
    timestamp: number;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    data?: any;
}
export interface JobMetrics {
    executionTime: number;
    memoryUsage: number;
    cpuUsage: number;
    networkRequests: number;
    dbQueries: number;
}
export interface JobQueue {
    name: string;
    maxConcurrency: number;
    maxRetries: number;
    defaultTimeout: number;
    rateLimitPerSecond?: number;
    deadLetterQueue?: string;
    paused: boolean;
}
export declare const JobConfigs: {
    MONITORING_CHECK: {
        priority: JobPriority;
        timeout: number;
        retryConfig: {
            maxAttempts: number;
            backoffType: "exponential";
            baseDelay: number;
            maxDelay: number;
            jitter: boolean;
        };
        maxConcurrency: number;
        tags: string[];
    };
    SERVICE_HEALTH_CHECK: {
        priority: JobPriority;
        timeout: number;
        retryConfig: {
            maxAttempts: number;
            backoffType: "fixed";
            baseDelay: number;
            maxDelay: number;
            jitter: boolean;
        };
        maxConcurrency: number;
        tags: string[];
    };
    NEST_CLEANUP: {
        priority: JobPriority;
        timeout: number;
        retryConfig: {
            maxAttempts: number;
            backoffType: "fixed";
            baseDelay: number;
            maxDelay: number;
            jitter: boolean;
        };
        maxConcurrency: number;
        tags: string[];
    };
    METRICS_AGGREGATION: {
        priority: JobPriority;
        timeout: number;
        retryConfig: {
            maxAttempts: number;
            backoffType: "linear";
            baseDelay: number;
            maxDelay: number;
            jitter: boolean;
        };
        maxConcurrency: number;
        tags: string[];
    };
    CACHE_WARMING: {
        priority: JobPriority;
        timeout: number;
        retryConfig: {
            maxAttempts: number;
            backoffType: "exponential";
            baseDelay: number;
            maxDelay: number;
            jitter: boolean;
        };
        maxConcurrency: number;
        tags: string[];
    };
    DATABASE_BACKUP: {
        priority: JobPriority;
        timeout: number;
        retryConfig: {
            maxAttempts: number;
            backoffType: "exponential";
            baseDelay: number;
            maxDelay: number;
            jitter: boolean;
        };
        maxConcurrency: number;
        tags: string[];
    };
    EMAIL_NOTIFICATION: {
        priority: JobPriority;
        timeout: number;
        retryConfig: {
            maxAttempts: number;
            backoffType: "exponential";
            baseDelay: number;
            maxDelay: number;
            jitter: boolean;
        };
        maxConcurrency: number;
        tags: string[];
    };
    WEBHOOK_DELIVERY: {
        priority: JobPriority;
        timeout: number;
        retryConfig: {
            maxAttempts: number;
            backoffType: "exponential";
            baseDelay: number;
            maxDelay: number;
            jitter: boolean;
        };
        maxConcurrency: number;
        tags: string[];
    };
    REPORT_GENERATION: {
        priority: JobPriority;
        timeout: number;
        retryConfig: {
            maxAttempts: number;
            backoffType: "linear";
            baseDelay: number;
            maxDelay: number;
            jitter: boolean;
        };
        maxConcurrency: number;
        tags: string[];
    };
    PAYMENT_PROCESSING: {
        priority: JobPriority;
        timeout: number;
        retryConfig: {
            maxAttempts: number;
            backoffType: "exponential";
            baseDelay: number;
            maxDelay: number;
            jitter: boolean;
        };
        maxConcurrency: number;
        tags: string[];
    };
};
export interface JobProcessor {
    process(job: JobDefinition, execution: JobExecution): Promise<any>;
    canProcess(jobType: JobType): boolean;
    getEstimatedDuration(job: JobDefinition): number;
}
export declare class BackgroundJobManager {
    private serviceName;
    private logger;
    private tracing?;
    private retryManager;
    private queues;
    private processors;
    private jobs;
    private executions;
    private scheduledJobs;
    private runningJobs;
    private isProcessing;
    private processingInterval?;
    private metrics;
    constructor(serviceName: string, tracing?: GuardAntTracing);
    private initializeDefaultQueues;
    createQueue(name: string, config: JobQueue): void;
    registerProcessor(jobType: JobType, processor: JobProcessor): void;
    addJob(job: JobDefinition): Promise<string>;
    private enqueueJob;
    private scheduleJob;
    cancelJob(jobId: string): Promise<boolean>;
    pauseQueue(queueName: string): Promise<boolean>;
    resumeQueue(queueName: string): Promise<boolean>;
    startProcessing(intervalMs?: number): void;
    stopProcessing(): void;
    private processJobs;
    private processJobExecution;
    private executeJob;
    private handleJobError;
    private isRecoverableError;
    private getQueueForPriority;
    private getQueueForJobExecution;
    private generateJobId;
    private generateExecutionId;
    private updateAverageExecutionTime;
    getMetrics(): any;
    getJobStatus(jobId: string): JobExecution[];
    getQueueStatus(queueName: string): any;
    getHealthStatus(): {
        healthy: boolean;
        details: any;
    };
    shutdown(): Promise<void>;
}
export declare function createBackgroundJobManager(serviceName: string, tracing?: GuardAntTracing): BackgroundJobManager;
export { JobConfigs, JobType, JobPriority, JobStatus, ScheduleType };
//# sourceMappingURL=background-jobs.d.ts.map