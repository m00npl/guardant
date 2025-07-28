/**
 * Worker configuration and capabilities
 */

export interface WorkerAntLocation {
  continent: string;
  country: string;
  city: string;
  datacenter: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface WorkerAntCapabilities {
  // Service types this worker can handle
  serviceTypes: Array<'web' | 'tcp' | 'ping' | 'github' | 'uptime-api' | 'keyword' | 'heartbeat' | 'port'>;
  
  // Special capabilities
  features: {
    icmp?: boolean;          // Can send ICMP packets (requires privileges)
    ipv6?: boolean;          // Supports IPv6
    customHeaders?: boolean; // Can send custom headers
    certificates?: boolean;  // Can validate SSL certificates
    bandwidth?: 'low' | 'medium' | 'high'; // Available bandwidth
  };
  
  // Performance limits
  limits: {
    maxConcurrency: number;      // Max parallel checks
    maxRequestsPerMinute: number; // Rate limiting
    maxResponseSize: number;      // Max response size in MB
    timeoutSeconds: number;       // Max check duration
  };
}

export interface WorkerAntConfig {
  // Unique worker identification
  id: string;                    // e.g., "ant-eu-west-1-001"
  name: string;                  // Human-friendly name
  version: string;               // Worker software version
  
  // Location information
  location: WorkerAntLocation;
  
  // What this worker can do
  capabilities: WorkerAntCapabilities;
  
  // Network information
  network: {
    ipv4?: string;
    ipv6?: string;
    asn?: number;                // Autonomous System Number
    isp?: string;                // Internet Service Provider
  };
  
  // Operational status
  status: {
    startedAt: number;
    lastHeartbeat: number;
    checksCompleted: number;
    checksFailed: number;
    averageResponseTime: number;
  };
  
  // Tags for grouping/filtering
  tags: string[];                // e.g., ["production", "premium", "eu-gdpr"]
}

// Example configurations for different worker ant types
export const WORKER_ANT_PRESETS = {
  // Basic web monitoring worker ant
  basic: {
    capabilities: {
      serviceTypes: ['web', 'keyword'] as const,
      features: {
        customHeaders: true,
        certificates: true,
        bandwidth: 'medium' as const,
      },
      limits: {
        maxConcurrency: 10,
        maxRequestsPerMinute: 600,
        maxResponseSize: 10,
        timeoutSeconds: 30,
      },
    },
  },
  
  // Advanced monitoring worker with all capabilities
  advanced: {
    capabilities: {
      serviceTypes: ['web', 'tcp', 'ping', 'github', 'uptime-api', 'keyword', 'heartbeat', 'port'] as const,
      features: {
        icmp: true,
        ipv6: true,
        customHeaders: true,
        certificates: true,
        bandwidth: 'high' as const,
      },
      limits: {
        maxConcurrency: 50,
        maxRequestsPerMinute: 3000,
        maxResponseSize: 100,
        timeoutSeconds: 60,
      },
    },
  },
  
  // Specialized ping worker
  ping: {
    capabilities: {
      serviceTypes: ['ping'] as const,
      features: {
        icmp: true,
        ipv6: true,
        bandwidth: 'low' as const,
      },
      limits: {
        maxConcurrency: 100,
        maxRequestsPerMinute: 6000,
        maxResponseSize: 1,
        timeoutSeconds: 10,
      },
    },
  },
  
  // API monitoring specialist
  api: {
    capabilities: {
      serviceTypes: ['web', 'github', 'uptime-api', 'keyword'] as const,
      features: {
        customHeaders: true,
        certificates: true,
        bandwidth: 'high' as const,
      },
      limits: {
        maxConcurrency: 20,
        maxRequestsPerMinute: 1200,
        maxResponseSize: 50,
        timeoutSeconds: 45,
      },
    },
  },
};

// Worker Ant registration and discovery
export class WorkerAntRegistry {
  private workerAnts: Map<string, WorkerAntConfig> = new Map();
  
  /**
   * Register a worker ant in the system
   */
  async register(config: WorkerAntConfig): Promise<void> {
    this.workerAnts.set(config.id, config);
    console.log(`✅ Worker Ant ${config.id} registered from ${config.location.city}, ${config.location.country}`);
  }
  
  /**
   * Update worker ant heartbeat
   */
  async heartbeat(workerAntId: string): Promise<void> {
    const workerAnt = this.workerAnts.get(workerAntId);
    if (workerAnt) {
      workerAnt.status.lastHeartbeat = Date.now();
    }
  }
  
  /**
   * Find best worker ant for a job
   */
  findBestWorkerAnt(jobRequirements: {
    serviceType: string;
    targetLocation?: { lat: number; lng: number };
    requiredFeatures?: string[];
    preferredTags?: string[];
  }): WorkerAntConfig | null {
    let bestWorkerAnt: WorkerAntConfig | null = null;
    let bestScore = -1;
    
    for (const workerAnt of this.workerAnts.values()) {
      // Check if worker ant can handle this service type
      if (!workerAnt.capabilities.serviceTypes.includes(jobRequirements.serviceType as any)) {
        continue;
      }
      
      // Check if worker ant is healthy
      const isHealthy = Date.now() - workerAnt.status.lastHeartbeat < 60000; // 1 minute
      if (!isHealthy) continue;
      
      // Calculate score based on various factors
      let score = 0;
      
      // Location score (if target location provided)
      if (jobRequirements.targetLocation && workerAnt.location.coordinates) {
        const distance = this.calculateDistance(
          workerAnt.location.coordinates,
          jobRequirements.targetLocation
        );
        score += Math.max(0, 100 - distance / 100); // Closer is better
      }
      
      // Capability score
      score += workerAnt.capabilities.limits.maxConcurrency;
      
      // Load score (less loaded is better)
      const loadFactor = workerAnt.status.checksCompleted / (Date.now() - workerAnt.status.startedAt) * 1000;
      score += Math.max(0, 100 - loadFactor);
      
      // Tag matching score
      if (jobRequirements.preferredTags) {
        const matchingTags = jobRequirements.preferredTags.filter(tag => 
          workerAnt.tags.includes(tag)
        ).length;
        score += matchingTags * 10;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestWorkerAnt = workerAnt;
      }
    }
    
    return bestWorkerAnt;
  }
  
  /**
   * Get worker ants by capability
   */
  getWorkerAntsByCapability(serviceType: string): WorkerAntConfig[] {
    return Array.from(this.workerAnts.values()).filter(workerAnt =>
      workerAnt.capabilities.serviceTypes.includes(serviceType as any)
    );
  }
  
  /**
   * Get worker ants by location
   */
  getWorkerAntsByLocation(continent?: string, country?: string): WorkerAntConfig[] {
    return Array.from(this.workerAnts.values()).filter(workerAnt => {
      if (continent && workerAnt.location.continent !== continent) return false;
      if (country && workerAnt.location.country !== country) return false;
      return true;
    });
  }
  
  /**
   * Get worker ant statistics
   */
  getStatistics() {
    const workerAnts = Array.from(this.workerAnts.values());
    const activeWorkerAnts = workerAnts.filter(w => 
      Date.now() - w.status.lastHeartbeat < 60000
    );
    
    return {
      total: workerAnts.length,
      active: activeWorkerAnts.length,
      byLocation: this.groupByLocation(workerAnts),
      byCapability: this.groupByCapability(workerAnts),
      totalCapacity: workerAnts.reduce((sum, w) => 
        sum + w.capabilities.limits.maxConcurrency, 0
      ),
    };
  }
  
  private calculateDistance(
    coord1: { lat: number; lng: number },
    coord2: { lat: number; lng: number }
  ): number {
    // Simplified distance calculation (Haversine formula)
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
  
  private groupByLocation(workerAnts: WorkerAntConfig[]) {
    const groups: Record<string, number> = {};
    workerAnts.forEach(w => {
      const key = `${w.location.continent}/${w.location.country}`;
      groups[key] = (groups[key] || 0) + 1;
    });
    return groups;
  }
  
  private groupByCapability(workerAnts: WorkerAntConfig[]) {
    const groups: Record<string, number> = {};
    workerAnts.forEach(w => {
      w.capabilities.serviceTypes.forEach(type => {
        groups[type] = (groups[type] || 0) + 1;
      });
    });
    return groups;
  }
}