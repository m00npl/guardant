/**
 * Advanced background job processing system for GuardAnt services
 * Provides job queuing, scheduling, processing, and monitoring with fault tolerance
 */

import { createLogger } from './logger';
import { ProcessingError, ErrorCategory, ErrorSeverity } from './error-handling';
import type { GuardAntTracing } from './tracing';
import { createRetryManager, RetryConfigs } from './retry';

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

export enum JobType {
  MONITORING_CHECK = 'monitoring_check',
  SERVICE_HEALTH_CHECK = 'service_health_check',
  NEST_CLEANUP = 'nest_cleanup',
  METRICS_AGGREGATION = 'metrics_aggregation',
  CACHE_WARMING = 'cache_warming',
  DATABASE_BACKUP = 'database_backup',
  EMAIL_NOTIFICATION = 'email_notification',
  WEBHOOK_DELIVERY = 'webhook_delivery',
  REPORT_GENERATION = 'report_generation',
  DATA_MIGRATION = 'data_migration',
  SUBSCRIPTION_RENEWAL = 'subscription_renewal',
  PAYMENT_PROCESSING = 'payment_processing',
  LOG_ARCHIVAL = 'log_archival',
  ANALYTICS_PROCESSING = 'analytics_processing',
  SECURITY_SCAN = 'security_scan'
}

export enum JobPriority {
  CRITICAL = 0,   // Highest priority
  HIGH = 1,
  NORMAL = 2,     // Default
  LOW = 3,
  BULK = 4        // Lowest priority
}

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
  SCHEDULED = 'scheduled'
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
  expression: string; // Cron expression or interval
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
}

export enum ScheduleType {
  CRON = 'cron',
  INTERVAL = 'interval',
  ONCE = 'once'
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

// Predefined job configurations
export const JobConfigs = {
  // High-frequency monitoring checks
  MONITORING_CHECK: {
    priority: JobPriority.HIGH,
    timeout: 30000, // 30 seconds
    retryConfig: {
      maxAttempts: 3,
      backoffType: 'exponential' as const,
      baseDelay: 5000,
      maxDelay: 30000,
      jitter: true
    },
    maxConcurrency: 50,
    tags: ['monitoring', 'health']
  },

  // Service health checks
  SERVICE_HEALTH_CHECK: {
    priority: JobPriority.NORMAL,
    timeout: 60000, // 1 minute
    retryConfig: {
      maxAttempts: 2,
      backoffType: 'fixed' as const,
      baseDelay: 10000,
      maxDelay: 10000,
      jitter: false
    },
    maxConcurrency: 20,
    tags: ['health', 'services']
  },

  // Nest cleanup operations
  NEST_CLEANUP: {
    priority: JobPriority.LOW,
    timeout: 300000, // 5 minutes
    retryConfig: {
      maxAttempts: 1,
      backoffType: 'fixed' as const,
      baseDelay: 0,
      maxDelay: 0,
      jitter: false
    },
    maxConcurrency: 2,
    tags: ['cleanup', 'maintenance']
  },

  // Metrics aggregation
  METRICS_AGGREGATION: {
    priority: JobPriority.NORMAL,
    timeout: 120000, // 2 minutes
    retryConfig: {
      maxAttempts: 3,
      backoffType: 'linear' as const,
      baseDelay: 15000,
      maxDelay: 45000,
      jitter: true
    },
    maxConcurrency: 5,
    tags: ['metrics', 'analytics']
  },

  // Cache warming
  CACHE_WARMING: {
    priority: JobPriority.LOW,
    timeout: 180000, // 3 minutes
    retryConfig: {
      maxAttempts: 2,
      backoffType: 'exponential' as const,
      baseDelay: 30000,
      maxDelay: 120000,
      jitter: true
    },
    maxConcurrency: 3,
    tags: ['cache', 'optimization']
  },

  // Database backup
  DATABASE_BACKUP: {
    priority: JobPriority.CRITICAL,
    timeout: 1800000, // 30 minutes
    retryConfig: {
      maxAttempts: 3,
      backoffType: 'exponential' as const,
      baseDelay: 60000,
      maxDelay: 300000,
      jitter: false
    },
    maxConcurrency: 1,
    tags: ['backup', 'database']
  },

  // Email notifications
  EMAIL_NOTIFICATION: {
    priority: JobPriority.HIGH,
    timeout: 30000, // 30 seconds
    retryConfig: {
      maxAttempts: 5,
      backoffType: 'exponential' as const,
      baseDelay: 2000,
      maxDelay: 60000,
      jitter: true
    },
    maxConcurrency: 10,
    tags: ['notification', 'email']
  },

  // Webhook delivery
  WEBHOOK_DELIVERY: {
    priority: JobPriority.HIGH,
    timeout: 30000, // 30 seconds
    retryConfig: {
      maxAttempts: 5,
      backoffType: 'exponential' as const,
      baseDelay: 1000,
      maxDelay: 30000,
      jitter: true
    },
    maxConcurrency: 15,
    tags: ['webhook', 'notification']
  },

  // Report generation
  REPORT_GENERATION: {
    priority: JobPriority.NORMAL,
    timeout: 600000, // 10 minutes
    retryConfig: {
      maxAttempts: 2,
      backoffType: 'linear' as const,
      baseDelay: 60000,
      maxDelay: 120000,
      jitter: false
    },
    maxConcurrency: 2,
    tags: ['report', 'analytics']
  },

  // Payment processing
  PAYMENT_PROCESSING: {
    priority: JobPriority.CRITICAL,
    timeout: 120000, // 2 minutes
    retryConfig: {
      maxAttempts: 3,
      backoffType: 'exponential' as const,
      baseDelay: 10000,
      maxDelay: 60000,
      jitter: false
    },
    maxConcurrency: 5,
    tags: ['payment', 'financial']
  }
};

export interface JobProcessor {
  process(job: JobDefinition, execution: JobExecution): Promise<any>;
  canProcess(jobType: JobType): boolean;
  getEstimatedDuration(job: JobDefinition): number;
}

export class BackgroundJobManager {
  private logger;
  private tracing?: GuardAntTracing;
  private retryManager;
  
  private queues = new Map<string, JobQueue>();
  private processors = new Map<JobType, JobProcessor>();
  private jobs = new Map<string, JobDefinition>();
  private executions = new Map<string, JobExecution>();
  private scheduledJobs = new Map<string, NodeJS.Timeout>();
  private runningJobs = new Map<string, Promise<any>>();
  
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;
  private metrics = {
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    retryCount: 0,
    averageExecutionTime: 0,
    queueSizes: new Map<string, number>()
  };

  constructor(
    private serviceName: string,
    tracing?: GuardAntTracing
  ) {
    this.logger = createLogger(`${serviceName}-job-manager`);
    this.tracing = tracing;
    this.retryManager = createRetryManager(serviceName, tracing);
    
    this.initializeDefaultQueues();
  }

  private initializeDefaultQueues(): void {
    // Critical queue for high-priority jobs
    this.createQueue('critical', {
      name: 'critical',
      maxConcurrency: 10,
      maxRetries: 5,
      defaultTimeout: 300000, // 5 minutes
      rateLimitPerSecond: 100,
      paused: false
    });

    // High priority queue
    this.createQueue('high', {
      name: 'high',
      maxConcurrency: 20,
      maxRetries: 3,
      defaultTimeout: 120000, // 2 minutes
      rateLimitPerSecond: 50,
      paused: false
    });

    // Normal priority queue
    this.createQueue('normal', {
      name: 'normal',
      maxConcurrency: 30,
      maxRetries: 3,
      defaultTimeout: 60000, // 1 minute
      rateLimitPerSecond: 30,
      paused: false
    });

    // Low priority queue
    this.createQueue('low', {
      name: 'low',
      maxConcurrency: 10,
      maxRetries: 2,
      defaultTimeout: 180000, // 3 minutes
      rateLimitPerSecond: 10,
      paused: false
    });

    // Bulk processing queue
    this.createQueue('bulk', {
      name: 'bulk',
      maxConcurrency: 5,
      maxRetries: 1,
      defaultTimeout: 600000, // 10 minutes
      rateLimitPerSecond: 5,
      paused: false
    });
  }

  createQueue(name: string, config: JobQueue): void {
    this.queues.set(name, config);
    this.metrics.queueSizes.set(name, 0);
    
    this.logger.info('Job queue created', {
      name,
      maxConcurrency: config.maxConcurrency,
      maxRetries: config.maxRetries
    });
  }

  registerProcessor(jobType: JobType, processor: JobProcessor): void {
    this.processors.set(jobType, processor);
    
    this.logger.info('Job processor registered', {
      jobType,
      processorName: processor.constructor.name
    });
  }

  async addJob(job: JobDefinition): Promise<string> {
    const jobId = job.id || this.generateJobId();
    const jobWithId = { ...job, id: jobId };
    
    // Validate job
    if (!this.processors.has(job.type)) {
      throw new ProcessingError(`No processor registered for job type: ${job.type}`, {
        service: this.serviceName,
        operation: 'job_addition'
      });
    }

    // Store job definition
    this.jobs.set(jobId, jobWithId);
    
    // Handle scheduling
    if (job.schedule) {
      await this.scheduleJob(jobWithId);
    } else if (job.delay && job.delay > 0) {
      setTimeout(() => this.enqueueJob(jobWithId), job.delay);
    } else {
      await this.enqueueJob(jobWithId);
    }

    this.metrics.totalJobs++;
    
    this.logger.info('Job added', {
      jobId,
      type: job.type,
      priority: job.priority,
      scheduled: !!job.schedule,
      delayed: !!(job.delay && job.delay > 0)
    });

    if (this.tracing) {
      this.tracing.addEvent('job_added', {
        'job.id': jobId,
        'job.type': job.type,
        'job.priority': job.priority.toString()
      });
    }

    return jobId;
  }

  private async enqueueJob(job: JobDefinition): Promise<void> {
    const queueName = this.getQueueForPriority(job.priority);
    const queue = this.queues.get(queueName);
    
    if (!queue) {
      throw new ProcessingError(`Queue not found: ${queueName}`, {
        service: this.serviceName,
        operation: 'job_enqueue'
      });
    }

    if (queue.paused) {
      this.logger.warn('Job queued to paused queue', {
        jobId: job.id,
        queue: queueName
      });
    }

    // Create execution record
    const execution: JobExecution = {
      id: this.generateExecutionId(),
      jobId: job.id,
      startedAt: 0,
      status: JobStatus.PENDING,
      attempt: 0,
      logs: [],
      metrics: {
        executionTime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        networkRequests: 0,
        dbQueries: 0
      }
    };

    this.executions.set(execution.id, execution);
    
    // Update queue size
    const currentSize = this.metrics.queueSizes.get(queueName) || 0;
    this.metrics.queueSizes.set(queueName, currentSize + 1);

    this.logger.debug('Job enqueued', {
      jobId: job.id,
      executionId: execution.id,
      queue: queueName
    });
  }

  private async scheduleJob(job: JobDefinition): Promise<void> {
    if (!job.schedule) return;

    const schedule = job.schedule;
    let nextExecution: number;

    switch (schedule.type) {
      case ScheduleType.CRON:
        // Would use a cron parser library
        nextExecution = Date.now() + 60000; // Placeholder
        break;
      case ScheduleType.INTERVAL:
        const interval = parseInt(schedule.expression);
        nextExecution = Date.now() + interval;
        break;
      case ScheduleType.ONCE:
        const delay = parseInt(schedule.expression);
        nextExecution = Date.now() + delay;
        break;
      default:
        throw new ProcessingError(`Unknown schedule type: ${schedule.type}`, {
          service: this.serviceName,
          operation: 'job_scheduling'
        });
    }

    // Schedule the job
    const timeout = setTimeout(async () => {
      await this.enqueueJob(job);
      
      // Reschedule if recurring
      if (schedule.type === ScheduleType.INTERVAL || schedule.type === ScheduleType.CRON) {
        await this.scheduleJob(job);
      } else {
        this.scheduledJobs.delete(job.id);
      }
    }, nextExecution - Date.now());

    this.scheduledJobs.set(job.id, timeout);

    this.logger.debug('Job scheduled', {
      jobId: job.id,
      nextExecution: new Date(nextExecution).toISOString(),
      scheduleType: schedule.type
    });
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    // Cancel scheduled job
    const scheduledTimeout = this.scheduledJobs.get(jobId);
    if (scheduledTimeout) {
      clearTimeout(scheduledTimeout);
      this.scheduledJobs.delete(jobId);
    }

    // Cancel running job
    const runningPromise = this.runningJobs.get(jobId);
    if (runningPromise) {
      // Note: This is a simplified cancellation
      // In a real implementation, you'd need proper cancellation tokens
      this.runningJobs.delete(jobId);
    }

    // Update execution status
    for (const [executionId, execution] of this.executions) {
      if (execution.jobId === jobId && execution.status === JobStatus.PENDING) {
        execution.status = JobStatus.CANCELLED;
        execution.completedAt = Date.now();
      }
    }

    this.logger.info('Job cancelled', { jobId });
    return true;
  }

  async pauseQueue(queueName: string): Promise<boolean> {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    queue.paused = true;
    this.logger.info('Queue paused', { queueName });
    return true;
  }

  async resumeQueue(queueName: string): Promise<boolean> {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    queue.paused = false;
    this.logger.info('Queue resumed', { queueName });
    return true;
  }

  startProcessing(intervalMs: number = 1000): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processingInterval = setInterval(async () => {
      await this.processJobs();
    }, intervalMs);

    this.logger.info('Job processing started', { intervalMs });
  }

  stopProcessing(): void {
    if (!this.isProcessing) return;

    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    this.logger.info('Job processing stopped');
  }

  private async processJobs(): Promise<void> {
    // Process each queue in priority order
    const queueNames = ['critical', 'high', 'normal', 'low', 'bulk'];
    
    for (const queueName of queueNames) {
      const queue = this.queues.get(queueName);
      if (!queue || queue.paused) continue;

      // Count running jobs for this queue
      const runningCount = Array.from(this.runningJobs.values()).filter(
        promise => promise // This is simplified - in reality you'd track by queue
      ).length;

      if (runningCount >= queue.maxConcurrency) continue;

      // Find pending jobs for this queue
      const pendingExecutions = Array.from(this.executions.values())
        .filter(execution => 
          execution.status === JobStatus.PENDING &&
          this.getQueueForJobExecution(execution) === queueName
        )
        .sort((a, b) => a.startedAt - b.startedAt)
        .slice(0, queue.maxConcurrency - runningCount);

      // Process pending jobs
      for (const execution of pendingExecutions) {
        await this.processJobExecution(execution, queue);
      }
    }
  }

  private async processJobExecution(execution: JobExecution, queue: JobQueue): Promise<void> {
    const job = this.jobs.get(execution.jobId);
    if (!job) {
      this.logger.error('Job definition not found', new Error('Missing job definition'), {
        executionId: execution.id,
        jobId: execution.jobId
      });
      return;
    }

    const processor = this.processors.get(job.type);
    if (!processor) {
      this.logger.error('Job processor not found', new Error('Missing processor'), {
        jobType: job.type
      });
      return;
    }

    // Update execution status
    execution.status = JobStatus.RUNNING;
    execution.startedAt = Date.now();
    execution.attempt++;

    const jobPromise = this.executeJob(job, execution, processor, queue);
    this.runningJobs.set(execution.jobId, jobPromise);

    try {
      await jobPromise;
    } catch (error) {
      // Error already handled in executeJob
    } finally {
      this.runningJobs.delete(execution.jobId);
    }
  }

  private async executeJob(
    job: JobDefinition,
    execution: JobExecution,
    processor: JobProcessor,
    queue: JobQueue
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Job execution started', {
        jobId: job.id,
        executionId: execution.id,
        attempt: execution.attempt,
        type: job.type
      });

      if (this.tracing) {
        this.tracing.addEvent('job_execution_started', {
          'job.id': job.id,
          'job.type': job.type,
          'job.attempt': execution.attempt.toString()
        });
      }

      // Set timeout
      const timeout = job.timeout || queue.defaultTimeout;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new ProcessingError(`Job timeout after ${timeout}ms`, {
            service: this.serviceName,
            operation: 'job_execution'
          }));
        }, timeout);
      });

      // Execute job with timeout
      const result = await Promise.race([
        processor.process(job, execution),
        timeoutPromise
      ]);

      // Job completed successfully
      execution.status = JobStatus.COMPLETED;
      execution.completedAt = Date.now();
      execution.result = result;
      execution.metrics.executionTime = Date.now() - startTime;

      this.metrics.completedJobs++;
      this.updateAverageExecutionTime(execution.metrics.executionTime);

      this.logger.info('Job execution completed', {
        jobId: job.id,
        executionId: execution.id,
        executionTime: execution.metrics.executionTime,
        attempt: execution.attempt
      });

      if (this.tracing) {
        this.tracing.addEvent('job_execution_completed', {
          'job.id': job.id,
          'job.type': job.type,
          'job.execution_time_ms': execution.metrics.executionTime.toString()
        });
      }

    } catch (error) {
      await this.handleJobError(job, execution, error as Error, queue);
    }
  }

  private async handleJobError(
    job: JobDefinition,
    execution: JobExecution,
    error: Error,
    queue: JobQueue
  ): Promise<void> {
    const jobError: JobError = {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
      recoverable: this.isRecoverableError(error),
      category: (error as any).category || 'unknown'
    };

    execution.error = jobError;
    execution.completedAt = Date.now();
    execution.metrics.executionTime = Date.now() - execution.startedAt;

    const retryConfig = job.retryConfig || {
      maxAttempts: queue.maxRetries,
      backoffType: 'exponential',
      baseDelay: 5000,
      maxDelay: 60000,
      jitter: true
    };

    // Check if should retry
    if (jobError.recoverable && execution.attempt < retryConfig.maxAttempts) {
      execution.status = JobStatus.RETRYING;
      this.metrics.retryCount++;

      // Calculate retry delay
      let delay = retryConfig.baseDelay;
      switch (retryConfig.backoffType) {
        case 'exponential':
          delay = Math.min(
            retryConfig.baseDelay * Math.pow(2, execution.attempt - 1),
            retryConfig.maxDelay
          );
          break;
        case 'linear':
          delay = Math.min(
            retryConfig.baseDelay * execution.attempt,
            retryConfig.maxDelay
          );
          break;
      }

      if (retryConfig.jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }

      this.logger.warn('Job failed, scheduling retry', new ProcessingError(error.message, {
        service: this.serviceName,
        operation: 'job_execution'
      }), {
        jobId: job.id,
        executionId: execution.id,
        attempt: execution.attempt,
        nextAttemptIn: delay,
        error: error.message
      });

      // Schedule retry
      setTimeout(async () => {
        execution.status = JobStatus.PENDING;
        await this.enqueueJob(job);
      }, delay);

    } else {
      // Job failed permanently
      execution.status = JobStatus.FAILED;
      this.metrics.failedJobs++;

      this.logger.error('Job execution failed permanently', error, {
        jobId: job.id,
        executionId: execution.id,
        attempts: execution.attempt,
        finalError: error.message
      });

      if (this.tracing) {
        this.tracing.addEvent('job_execution_failed', {
          'job.id': job.id,
          'job.type': job.type,
          'job.attempts': execution.attempt.toString(),
          'job.error': error.message
        });
      }
    }
  }

  private isRecoverableError(error: Error): boolean {
    // Simple heuristics for determining if error is recoverable
    const nonRecoverablePatterns = [
      'validation',
      'invalid input',
      'authorization',
      'not found',
      'forbidden'
    ];

    const errorMessage = error.message.toLowerCase();
    return !nonRecoverablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  private getQueueForPriority(priority: JobPriority): string {
    switch (priority) {
      case JobPriority.CRITICAL: return 'critical';
      case JobPriority.HIGH: return 'high';
      case JobPriority.NORMAL: return 'normal';
      case JobPriority.LOW: return 'low';
      case JobPriority.BULK: return 'bulk';
      default: return 'normal';
    }
  }

  private getQueueForJobExecution(execution: JobExecution): string {
    const job = this.jobs.get(execution.jobId);
    return job ? this.getQueueForPriority(job.priority) : 'normal';
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateAverageExecutionTime(executionTime: number): void {
    this.metrics.averageExecutionTime = 
      (this.metrics.averageExecutionTime * 0.9) + (executionTime * 0.1);
  }

  getMetrics(): any {
    return {
      ...this.metrics,
      queueSizes: Object.fromEntries(this.metrics.queueSizes),
      runningJobs: this.runningJobs.size,
      scheduledJobs: this.scheduledJobs.size,
      totalExecutions: this.executions.size
    };
  }

  getJobStatus(jobId: string): JobExecution[] {
    return Array.from(this.executions.values())
      .filter(execution => execution.jobId === jobId)
      .sort((a, b) => b.startedAt - a.startedAt);
  }

  getQueueStatus(queueName: string): any {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    const pendingJobs = Array.from(this.executions.values())
      .filter(execution => 
        execution.status === JobStatus.PENDING &&
        this.getQueueForJobExecution(execution) === queueName
      ).length;

    const runningJobs = Array.from(this.executions.values())
      .filter(execution => 
        execution.status === JobStatus.RUNNING &&
        this.getQueueForJobExecution(execution) === queueName
      ).length;

    return {
      ...queue,
      pendingJobs,
      runningJobs,
      queueSize: this.metrics.queueSizes.get(queueName) || 0
    };
  }

  getHealthStatus(): { healthy: boolean; details: any } {
    const failureRate = this.metrics.totalJobs > 0 
      ? this.metrics.failedJobs / this.metrics.totalJobs 
      : 0;

    const isHealthy = failureRate < 0.1 && this.metrics.averageExecutionTime < 30000;

    return {
      healthy: isHealthy,
      details: {
        isProcessing: this.isProcessing,
        failureRate,
        averageExecutionTime: this.metrics.averageExecutionTime,
        totalJobs: this.metrics.totalJobs,
        completedJobs: this.metrics.completedJobs,
        failedJobs: this.metrics.failedJobs,
        runningJobs: this.runningJobs.size,
        scheduledJobs: this.scheduledJobs.size
      }
    };
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down job manager', {
      runningJobs: this.runningJobs.size,
      scheduledJobs: this.scheduledJobs.size
    });

    // Stop processing
    this.stopProcessing();

    // Cancel all scheduled jobs
    for (const [jobId, timeout] of this.scheduledJobs) {
      clearTimeout(timeout);
    }
    this.scheduledJobs.clear();

    // Wait for running jobs to complete (with timeout)
    const runningPromises = Array.from(this.runningJobs.values());
    if (runningPromises.length > 0) {
      try {
        await Promise.race([
          Promise.all(runningPromises),
          new Promise(resolve => setTimeout(resolve, 30000)) // 30 second timeout
        ]);
      } catch (error) {
        this.logger.warn('Some jobs did not complete during shutdown', error as Error);
      }
    }

    this.logger.info('Job manager shutdown completed');
  }
}

// Factory function
export function createBackgroundJobManager(
  serviceName: string,
  tracing?: GuardAntTracing
): BackgroundJobManager {
  return new BackgroundJobManager(serviceName, tracing);
}

export { JobConfigs, JobType, JobPriority, JobStatus, ScheduleType };