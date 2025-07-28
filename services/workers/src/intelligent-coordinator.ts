import { Queue } from 'bullmq';
import Redis from 'ioredis';
import type { Service, Nest, MonitoringRegion } from '@guardant/shared-types';
import { golemStorage } from '@guardant/golem-storage';
import type { WorkerAntConfig } from './worker-config';

/**
 * Intelligent Monitoring Coordinator
 * Routes monitoring tasks to optimal WorkerAnts based on user preferences and geography
 */
export class IntelligentCoordinator {
  private redis: Redis;
  private monitoringQueue: Queue;
  private availableRegions: Map<string, MonitoringRegion> = new Map();
  
  constructor(redisConfig: any) {
    this.redis = new Redis(redisConfig);
    this.monitoringQueue = new Queue('monitoring', { connection: this.redis });
    this.initializeRegions();
  }

  /**
   * Initialize available monitoring regions
   */
  private initializeRegions() {
    const regions: MonitoringRegion[] = [
      // Europe
      {
        id: 'eu-west-1',
        name: 'Europe West (Frankfurt)',
        continent: 'Europe',
        country: 'Germany',
        city: 'Frankfurt',
        coordinates: { lat: 50.1109, lng: 8.6821 },
        available: true,
      },
      {
        id: 'eu-central-1',
        name: 'Europe Central (Warsaw)',
        continent: 'Europe',
        country: 'Poland',
        city: 'Warsaw',
        coordinates: { lat: 52.2297, lng: 21.0122 },
        available: true,
      },
      {
        id: 'eu-west-2',
        name: 'Europe West (London)',
        continent: 'Europe',
        country: 'United Kingdom',
        city: 'London',
        coordinates: { lat: 51.5074, lng: -0.1278 },
        available: true,
      },
      
      // North America
      {
        id: 'us-east-1',
        name: 'US East (N. Virginia)',
        continent: 'North America',
        country: 'United States',
        city: 'Ashburn',
        coordinates: { lat: 39.0458, lng: -77.4874 },
        available: true,
      },
      {
        id: 'us-west-1',
        name: 'US West (N. California)',
        continent: 'North America',
        country: 'United States',
        city: 'San Francisco',
        coordinates: { lat: 37.7749, lng: -122.4194 },
        available: true,
      },
      {
        id: 'ca-central-1',
        name: 'Canada Central (Toronto)',
        continent: 'North America',
        country: 'Canada',
        city: 'Toronto',
        coordinates: { lat: 43.6532, lng: -79.3832 },
        available: true,
      },
      
      // Asia Pacific
      {
        id: 'ap-southeast-1',
        name: 'Asia Pacific (Singapore)',
        continent: 'Asia',
        country: 'Singapore',
        city: 'Singapore',
        coordinates: { lat: 1.3521, lng: 103.8198 },
        available: true,
      },
      {
        id: 'ap-northeast-1',
        name: 'Asia Pacific (Tokyo)',
        continent: 'Asia',
        country: 'Japan',
        city: 'Tokyo',
        coordinates: { lat: 35.6762, lng: 139.6503 },
        available: true,
      },
      {
        id: 'ap-south-1',
        name: 'Asia Pacific (Mumbai)',
        continent: 'Asia',
        country: 'India',
        city: 'Mumbai',
        coordinates: { lat: 19.0760, lng: 72.8777 },
        available: true,
      },
      
      // South America
      {
        id: 'sa-east-1',
        name: 'South America (São Paulo)',
        continent: 'South America',
        country: 'Brazil',
        city: 'São Paulo',
        coordinates: { lat: -23.5558, lng: -46.6396 },
        available: true,
      },
      
      // Australia
      {
        id: 'ap-southeast-2',
        name: 'Asia Pacific (Sydney)',
        continent: 'Oceania',
        country: 'Australia',
        city: 'Sydney',
        coordinates: { lat: -33.8688, lng: 151.2093 },
        available: true,
      },
    ];

    regions.forEach(region => {
      this.availableRegions.set(region.id, region);
    });
  }

  /**
   * Get all available monitoring regions
   */
  async getAvailableRegions(): Promise<MonitoringRegion[]> {
    // Check which regions have active WorkerAnts
    const activeWorkerAnts = await this.getActiveWorkerAnts();
    const activeRegions = new Set(
      activeWorkerAnts.map(ant => this.mapWorkerAntToRegion(ant))
    );

    return Array.from(this.availableRegions.values()).map(region => ({
      ...region,
      available: activeRegions.has(region.id),
    }));
  }

  /**
   * Schedule monitoring with user-defined region preferences
   */
  async scheduleMonitoringTasks() {
    console.log('📅 Intelligent scheduling monitoring tasks...');
    
    try {
      const nests = await this.getActiveNests();
      
      for (const nest of nests) {
        if (!this.isWithinLimits(nest)) continue;
        
        const services = await golemStorage.getServicesByNest(nest.id);
        
        for (const service of services) {
          if (!service.isActive) continue;
          
          const shouldMonitor = await this.shouldMonitorNow(service);
          if (!shouldMonitor) continue;
          
          // Route monitoring based on user preferences
          await this.routeMonitoring(nest, service);
        }
      }
      
      const stats = await this.monitoringQueue.getJobCounts();
      console.log(`✅ Scheduled tasks - Active: ${stats.active}, Waiting: ${stats.waiting}`);
      
    } catch (error) {
      console.error('❌ Error in intelligent scheduling:', error);
    }
  }

  /**
   * Route monitoring task based on user preferences
   */
  private async routeMonitoring(nest: Nest, service: Service) {
    const strategy = service.monitoring?.strategy || 'closest';
    const preferredRegions = service.monitoring?.regions || [];
    
    let targetRegions: string[] = [];
    
    switch (strategy) {
      case 'all-selected':
        targetRegions = await this.getAllSelectedRegions(service, preferredRegions);
        break;
        
      case 'closest':
        targetRegions = await this.getClosestRegions(service, preferredRegions);
        break;
        
      case 'round-robin':
        targetRegions = await this.getRoundRobinRegions(service, preferredRegions);
        break;
        
      case 'failover':
        targetRegions = await this.getFailoverRegions(service, preferredRegions);
        break;
        
      default:
        targetRegions = await this.getClosestRegions(service, preferredRegions);
    }
    
    // Apply min/max region limits
    if (service.monitoring?.minRegions) {
      const minRegions = Math.min(service.monitoring.minRegions, targetRegions.length);
      if (targetRegions.length < minRegions) {
        // Add more regions if we don't have enough
        const additionalRegions = await this.getAdditionalRegions(
          service, 
          targetRegions, 
          minRegions - targetRegions.length
        );
        targetRegions.push(...additionalRegions);
      }
    }
    
    if (service.monitoring?.maxRegions) {
      targetRegions = targetRegions.slice(0, service.monitoring.maxRegions);
    }
    
    // Queue monitoring jobs for each selected region
    for (const regionId of targetRegions) {
      await this.queueRegionalMonitoring(nest, service, regionId);
    }
  }

  /**
   * Queue monitoring job for specific region
   */
  private async queueRegionalMonitoring(nest: Nest, service: Service, regionId: string) {
    const region = this.availableRegions.get(regionId);
    if (!region) {
      console.warn(`⚠️ Unknown region: ${regionId}`);
      return;
    }
    
    // Find best WorkerAnt in this region
    const bestWorkerAnt = await this.findBestWorkerAntInRegion(service, regionId);
    if (!bestWorkerAnt) {
      console.warn(`⚠️ No available WorkerAnt in region: ${regionId}`);
      return;
    }
    
    const jobData = {
      nestId: nest.id,
      service,
      scheduledAt: Date.now(),
      routing: {
        region: regionId,
        workerAntId: bestWorkerAnt.id,
        priority: this.calculatePriority(nest, service),
        requiredCapabilities: [service.type],
      },
    };

    const jobOptions = {
      priority: jobData.routing.priority,
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600,
        count: 100,
      },
      removeOnFail: {
        age: 86400,
      },
      timeout: 60000,
    };

    await this.monitoringQueue.add(
      `check-${service.id}-${regionId}`,
      jobData,
      jobOptions
    );
    
    console.log(`📍 Queued monitoring: ${service.name} from ${region.name} via ${bestWorkerAnt.id}`);
  }

  /**
   * Get all user-selected regions that have available WorkerAnts
   */
  private async getAllSelectedRegions(service: Service, preferredRegions: string[]): Promise<string[]> {
    const availableWorkerAnts = await this.getActiveWorkerAnts();
    const availableRegions = new Set(
      availableWorkerAnts.map(ant => this.mapWorkerAntToRegion(ant))
    );
    
    return preferredRegions.filter(regionId => availableRegions.has(regionId));
  }

  /**
   * Get closest regions to the target service
   */
  private async getClosestRegions(service: Service, preferredRegions: string[]): Promise<string[]> {
    const targetLocation = await this.estimateServiceLocation(service.target);
    if (!targetLocation) {
      // Fallback to first available preferred region
      const available = await this.getAllSelectedRegions(service, preferredRegions);
      return available.slice(0, 1);
    }
    
    const regions = preferredRegions.length > 0 
      ? preferredRegions 
      : Array.from(this.availableRegions.keys());
    
    const regionsWithDistance = regions
      .map(regionId => {
        const region = this.availableRegions.get(regionId);
        if (!region) return null;
        
        const distance = this.calculateDistance(
          targetLocation,
          region.coordinates
        );
        
        return { regionId, distance };
      })
      .filter((item): item is { regionId: string; distance: number } => item !== null)
      .sort((a, b) => a.distance - b.distance);
    
    // Return closest region with available WorkerAnt
    for (const { regionId } of regionsWithDistance) {
      const hasWorkerAnt = await this.hasAvailableWorkerAntInRegion(regionId);
      if (hasWorkerAnt) {
        return [regionId];
      }
    }
    
    return [];
  }

  /**
   * Get regions using round-robin strategy
   */
  private async getRoundRobinRegions(service: Service, preferredRegions: string[]): Promise<string[]> {
    const available = await this.getAllSelectedRegions(service, preferredRegions);
    if (available.length === 0) return [];
    
    // Get last used region for this service
    const lastRegionKey = `last-region:${service.id}`;
    const lastRegion = await this.redis.get(lastRegionKey);
    
    let nextRegionIndex = 0;
    if (lastRegion) {
      const lastIndex = available.indexOf(lastRegion);
      nextRegionIndex = (lastIndex + 1) % available.length;
    }
    
    const selectedRegion = available[nextRegionIndex];
    await this.redis.setex(lastRegionKey, 86400, selectedRegion); // Cache for 24h
    
    return [selectedRegion];
  }

  /**
   * Get regions using failover strategy (primary + backup)
   */
  private async getFailoverRegions(service: Service, preferredRegions: string[]): Promise<string[]> {
    const closest = await this.getClosestRegions(service, preferredRegions);
    if (closest.length === 0) return [];
    
    const primary = closest[0];
    
    // Find backup region (second closest with different continent)
    const available = await this.getAllSelectedRegions(service, preferredRegions);
    const primaryRegion = this.availableRegions.get(primary);
    
    const backup = available.find(regionId => {
      const region = this.availableRegions.get(regionId);
      return region && 
             regionId !== primary && 
             region.continent !== primaryRegion?.continent;
    });
    
    return backup ? [primary, backup] : [primary];
  }

  /**
   * Get additional regions when min requirements not met
   */
  private async getAdditionalRegions(
    service: Service, 
    existingRegions: string[], 
    needed: number
  ): Promise<string[]> {
    const allAvailable = await this.getAllSelectedRegions(service, []);
    const additional = allAvailable
      .filter(regionId => !existingRegions.includes(regionId))
      .slice(0, needed);
    
    return additional;
  }

  /**
   * Find best WorkerAnt in specific region
   */
  private async findBestWorkerAntInRegion(service: Service, regionId: string): Promise<WorkerAntConfig | null> {
    const activeWorkerAnts = await this.getActiveWorkerAnts();
    const regionWorkerAnts = activeWorkerAnts.filter(ant => 
      this.mapWorkerAntToRegion(ant) === regionId &&
      ant.capabilities.serviceTypes.includes(service.type as any)
    );
    
    if (regionWorkerAnts.length === 0) return null;
    
    // Find least loaded WorkerAnt
    let bestWorkerAnt = regionWorkerAnts[0];
    let bestScore = this.calculateWorkerAntScore(bestWorkerAnt);
    
    for (const workerAnt of regionWorkerAnts.slice(1)) {
      const score = this.calculateWorkerAntScore(workerAnt);
      if (score > bestScore) {
        bestScore = score;
        bestWorkerAnt = workerAnt;
      }
    }
    
    return bestWorkerAnt;
  }

  /**
   * Calculate WorkerAnt suitability score
   */
  private calculateWorkerAntScore(workerAnt: WorkerAntConfig): number {
    let score = 0;
    
    // Prefer less loaded workers
    const uptime = Date.now() - workerAnt.status.startedAt;
    const checksPerMs = workerAnt.status.checksCompleted / Math.max(uptime, 1);
    const loadFactor = checksPerMs * 1000; // checks per second
    score += Math.max(0, 100 - loadFactor * 10);
    
    // Prefer workers with higher capacity
    score += workerAnt.capabilities.limits.maxConcurrency;
    
    // Prefer workers with lower failure rate
    const failureRate = workerAnt.status.checksFailed / 
                       Math.max(workerAnt.status.checksCompleted, 1);
    score += Math.max(0, 100 - failureRate * 100);
    
    return score;
  }

  /**
   * Map WorkerAnt location to monitoring region
   */
  private mapWorkerAntToRegion(workerAnt: WorkerAntConfig): string {
    // Simple mapping based on tags or location
    const { continent, country, city } = workerAnt.location;
    
    // Mapping logic - in production this would be more sophisticated
    if (continent === 'Europe') {
      if (country === 'Germany') return 'eu-west-1';
      if (country === 'Poland') return 'eu-central-1';
      if (country === 'United Kingdom') return 'eu-west-2';
      return 'eu-west-1'; // Default European region
    }
    
    if (continent === 'North America') {
      if (country === 'Canada') return 'ca-central-1';
      if (city.includes('San Francisco') || city.includes('California')) return 'us-west-1';
      return 'us-east-1'; // Default US region
    }
    
    if (continent === 'Asia') {
      if (country === 'Japan') return 'ap-northeast-1';
      if (country === 'Singapore') return 'ap-southeast-1';
      if (country === 'India') return 'ap-south-1';
      return 'ap-southeast-1'; // Default Asian region
    }
    
    if (continent === 'South America') {
      return 'sa-east-1';
    }
    
    if (continent === 'Oceania') {
      return 'ap-southeast-2';
    }
    
    return 'us-east-1'; // Ultimate fallback
  }

  /**
   * Check if region has available WorkerAnts
   */
  private async hasAvailableWorkerAntInRegion(regionId: string): Promise<boolean> {
    const activeWorkerAnts = await this.getActiveWorkerAnts();
    return activeWorkerAnts.some(ant => this.mapWorkerAntToRegion(ant) === regionId);
  }

  /**
   * Get all active WorkerAnts from Redis
   */
  private async getActiveWorkerAnts(): Promise<WorkerAntConfig[]> {
    const keys = await this.redis.keys('worker-ant:*');
    const workerAnts: WorkerAntConfig[] = [];
    
    for (const key of keys) {
      try {
        const data = await this.redis.get(key);
        if (data) {
          const workerAnt = JSON.parse(data) as WorkerAntConfig;
          // Check if worker ant is still alive (heartbeat within last 2 minutes)
          if (Date.now() - workerAnt.status.lastHeartbeat < 120000) {
            workerAnts.push(workerAnt);
          }
        }
      } catch (error) {
        console.error('Error parsing WorkerAnt data:', error);
      }
    }
    
    return workerAnts;
  }

  /**
   * Estimate service location from target URL/IP
   */
  private async estimateServiceLocation(target: string): Promise<{ lat: number; lng: number } | null> {
    // This would implement IP geolocation for the target
    // For now, return null to use fallback logic
    return null;
  }

  /**
   * Calculate distance between two coordinates
   */
  private calculateDistance(
    coord1: { lat: number; lng: number },
    coord2: { lat: number; lng: number }
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Helper methods (reused from previous implementation)
  private calculatePriority(nest: Nest, service: Service): number {
    switch (nest.subscription.tier) {
      case 'unlimited': return 1;
      case 'pro': return 5;
      case 'free': return 8;
      default: return 10;
    }
  }

  private async shouldMonitorNow(service: Service): Promise<boolean> {
    const lastCheckKey = `last-check:${service.id}`;
    const lastCheck = await this.redis.get(lastCheckKey);
    
    if (!lastCheck) {
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

  private isWithinLimits(nest: Nest): boolean {
    return nest.subscription.validUntil > Date.now() && nest.status === 'active';
  }

  private async getActiveNests(): Promise<Nest[]> {
    // Placeholder - would query Golem Base L3
    return [];
  }
}

// Export singleton
export const intelligentCoordinator = new IntelligentCoordinator({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});