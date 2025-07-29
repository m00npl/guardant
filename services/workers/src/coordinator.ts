import { Queue } from 'bullmq';
import Redis from 'ioredis';
import type { Service, Nest } from '/app/packages/shared-types/src/index';
import { golemStorage } from '/app/packages/golem-base-l3/src/index';

/**
 * Coordinator odpowiedzialny za rozdzielanie zadań między workerami
 * Może działać jako osobny serwis lub być częścią API
 */
export class MonitoringCoordinator {
  private redis: Redis;
  private monitoringQueue: Queue;
  
  constructor(redisConfig: any) {
    this.redis = new Redis(redisConfig);
    this.monitoringQueue = new Queue('monitoring', { connection: this.redis });
  }

  /**
   * Schedules monitoring tasks for all active services
   * This method is called periodically (e.g., every minute)
   */
  async scheduleMonitoringTasks() {
    console.log('📅 Scheduling monitoring tasks...');
    
    try {
      // Get all active nests from Golem Base L3
      // In production, this would be optimized with proper indexing
      const nests = await this.getActiveNests();
      
      for (const nest of nests) {
        // Check subscription limits
        if (!this.isWithinLimits(nest)) {
          console.log(`⚠️ Nest ${nest.id} exceeded limits`);
          continue;
        }
        
        // Get services for nest
        const services = await golemStorage.getServicesByNest(nest.id);
        
        for (const service of services) {
          if (!service.isActive) continue;
          
          // Check if it's time to monitor this service
          const shouldMonitor = await this.shouldMonitorNow(service);
          if (!shouldMonitor) continue;
          
          // Queue monitoring job with intelligent routing
          await this.queueMonitoringJob(nest, service);
        }
      }
      
      const stats = await this.monitoringQueue.getJobCounts();
      console.log(`✅ Scheduled tasks - Active: ${stats.active}, Waiting: ${stats.waiting}`);
      
    } catch (error) {
      console.error('❌ Error scheduling monitoring tasks:', error);
    }
  }

  /**
   * Queue a monitoring job with intelligent routing
   */
  private async queueMonitoringJob(nest: Nest, service: Service) {
    const jobData = {
      nestId: nest.id,
      service,
      scheduledAt: Date.now(),
      // Routing hints for workers
      routing: {
        region: this.getOptimalRegion(service),
        priority: this.calculatePriority(nest, service),
        requiredCapabilities: this.getRequiredCapabilities(service),
      },
    };

    const jobOptions = {
      // Job priority (1-10, 1 is highest)
      priority: jobData.routing.priority,
      
      // Retry configuration
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 2000,
      },
      
      // Remove job after completion to save memory
      removeOnComplete: {
        age: 3600, // Keep for 1 hour
        count: 100, // Keep last 100
      },
      removeOnFail: {
        age: 86400, // Keep failed jobs for 24 hours
      },
      
      // Job timeout
      timeout: 60000, // 60 seconds
    };

    // Use service ID as job ID for deduplication
    await this.monitoringQueue.add(
      `check-${service.id}`,
      jobData,
      jobOptions
    );
  }

  /**
   * Determine optimal region for monitoring
   */
  private getOptimalRegion(service: Service): string {
    // Simple geo-routing based on domain
    const target = service.target.toLowerCase();
    
    if (target.includes('.eu') || target.includes('.de') || target.includes('.fr')) {
      return 'eu-west';
    } else if (target.includes('.asia') || target.includes('.jp') || target.includes('.cn')) {
      return 'ap-south';
    } else {
      return 'us-east';
    }
  }

  /**
   * Calculate job priority based on subscription tier
   */
  private calculatePriority(nest: Nest, service: Service): number {
    // Priority scale: 1 (highest) to 10 (lowest)
    switch (nest.subscription.tier) {
      case 'unlimited':
        return 1;
      case 'pro':
        return 5;
      case 'free':
        return 8;
      default:
        return 10;
    }
  }

  /**
   * Determine required worker capabilities
   */
  private getRequiredCapabilities(service: Service): string[] {
    const capabilities = [service.type];
    
    // Add special capabilities
    if (service.type === 'ping') {
      capabilities.push('icmp'); // Requires special permissions
    }
    
    if (service.config.requiresAuth) {
      capabilities.push('auth'); // Can handle authentication
    }
    
    return capabilities;
  }

  /**
   * Check if service should be monitored now
   */
  private async shouldMonitorNow(service: Service): Promise<boolean> {
    const lastCheckKey = `last-check:${service.id}`;
    const lastCheck = await this.redis.get(lastCheckKey);
    
    if (!lastCheck) {
      // Never checked before
      await this.redis.setex(lastCheckKey, 86400, Date.now().toString());
      return true;
    }
    
    const timeSinceLastCheck = Date.now() - parseInt(lastCheck);
    const shouldCheck = timeSinceLastCheck >= service.interval * 1000;
    
    if (shouldCheck) {
      await this.redis.setex(lastCheckKey, 86400, Date.now().toString());
    }
    
    return shouldCheck;
  }

  /**
   * Check if nest is within subscription limits
   */
  private isWithinLimits(nest: Nest): boolean {
    // Check if subscription is valid
    if (nest.subscription.validUntil < Date.now()) {
      return false;
    }
    
    // For MVP, just check if nest is active
    return nest.status === 'active';
  }

  /**
   * Get all active nests (simplified for MVP)
   */
  private async getActiveNests(): Promise<Nest[]> {
    // In production, this would query Golem Base L3 efficiently
    // For now, return empty array
    return [];
  }

  /**
   * Get worker statistics
   */
  async getWorkerStats() {
    const stats = await this.monitoringQueue.getJobCounts();
    const workers = await this.monitoringQueue.getWorkers();
    
    return {
      queue: stats,
      workers: workers.length,
      regions: await this.getRegionalStats(),
    };
  }

  /**
   * Get regional distribution statistics
   */
  private async getRegionalStats() {
    // This would aggregate stats from workers in different regions
    return {
      'eu-west': { workers: 0, jobs: 0 },
      'us-east': { workers: 0, jobs: 0 },
      'ap-south': { workers: 0, jobs: 0 },
    };
  }

  /**
   * Manually trigger monitoring for a specific service
   */
  async triggerMonitoring(nestId: string, serviceId: string) {
    const nest = await golemStorage.getNest(nestId);
    if (!nest) throw new Error('Nest not found');
    
    const service = await golemStorage.getService(nestId, serviceId);
    if (!service) throw new Error('Service not found');
    
    await this.queueMonitoringJob(nest, service);
    
    return { success: true, message: 'Monitoring job queued' };
  }

  /**
   * Pause monitoring for a nest
   */
  async pauseNest(nestId: string) {
    // Implementation would pause all jobs for a nest
    console.log(`⏸️ Pausing monitoring for nest ${nestId}`);
  }

  /**
   * Resume monitoring for a nest
   */
  async resumeNest(nestId: string) {
    // Implementation would resume all jobs for a nest
    console.log(`▶️ Resuming monitoring for nest ${nestId}`);
  }
}

// Parse Redis URL if provided
function getRedisConfigForCoordinator() {
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
    };
  }
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  };
}

// Export singleton if used as part of API
export const coordinator = new MonitoringCoordinator(getRedisConfigForCoordinator());