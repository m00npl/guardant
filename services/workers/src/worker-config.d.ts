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
    serviceTypes: Array<'web' | 'tcp' | 'ping' | 'github' | 'uptime-api' | 'keyword' | 'heartbeat' | 'port'>;
    features: {
        icmp?: boolean;
        ipv6?: boolean;
        customHeaders?: boolean;
        certificates?: boolean;
        bandwidth?: 'low' | 'medium' | 'high';
    };
    limits: {
        maxConcurrency: number;
        maxRequestsPerMinute: number;
        maxResponseSize: number;
        timeoutSeconds: number;
    };
}
export interface WorkerAntConfig {
    id: string;
    name: string;
    version: string;
    location: WorkerAntLocation;
    capabilities: WorkerAntCapabilities;
    network: {
        ipv4?: string;
        ipv6?: string;
        asn?: number;
        isp?: string;
    };
    status: {
        startedAt: number;
        lastHeartbeat: number;
        checksCompleted: number;
        checksFailed: number;
        averageResponseTime: number;
    };
    tags: string[];
}
export declare const WORKER_ANT_PRESETS: {
    basic: {
        capabilities: {
            serviceTypes: readonly ["web", "keyword"];
            features: {
                customHeaders: boolean;
                certificates: boolean;
                bandwidth: "medium";
            };
            limits: {
                maxConcurrency: number;
                maxRequestsPerMinute: number;
                maxResponseSize: number;
                timeoutSeconds: number;
            };
        };
    };
    advanced: {
        capabilities: {
            serviceTypes: readonly ["web", "tcp", "ping", "github", "uptime-api", "keyword", "heartbeat", "port"];
            features: {
                icmp: boolean;
                ipv6: boolean;
                customHeaders: boolean;
                certificates: boolean;
                bandwidth: "high";
            };
            limits: {
                maxConcurrency: number;
                maxRequestsPerMinute: number;
                maxResponseSize: number;
                timeoutSeconds: number;
            };
        };
    };
    ping: {
        capabilities: {
            serviceTypes: readonly ["ping"];
            features: {
                icmp: boolean;
                ipv6: boolean;
                bandwidth: "low";
            };
            limits: {
                maxConcurrency: number;
                maxRequestsPerMinute: number;
                maxResponseSize: number;
                timeoutSeconds: number;
            };
        };
    };
    api: {
        capabilities: {
            serviceTypes: readonly ["web", "github", "uptime-api", "keyword"];
            features: {
                customHeaders: boolean;
                certificates: boolean;
                bandwidth: "high";
            };
            limits: {
                maxConcurrency: number;
                maxRequestsPerMinute: number;
                maxResponseSize: number;
                timeoutSeconds: number;
            };
        };
    };
};
export declare class WorkerAntRegistry {
    private workerAnts;
    /**
     * Register a worker ant in the system
     */
    register(config: WorkerAntConfig): Promise<void>;
    /**
     * Update worker ant heartbeat
     */
    heartbeat(workerAntId: string): Promise<void>;
    /**
     * Find best worker ant for a job
     */
    findBestWorkerAnt(jobRequirements: {
        serviceType: string;
        targetLocation?: {
            lat: number;
            lng: number;
        };
        requiredFeatures?: string[];
        preferredTags?: string[];
    }): WorkerAntConfig | null;
    /**
     * Get worker ants by capability
     */
    getWorkerAntsByCapability(serviceType: string): WorkerAntConfig[];
    /**
     * Get worker ants by location
     */
    getWorkerAntsByLocation(continent?: string, country?: string): WorkerAntConfig[];
    /**
     * Get worker ant statistics
     */
    getStatistics(): {
        total: number;
        active: number;
        byLocation: Record<string, number>;
        byCapability: Record<string, number>;
        totalCapacity: number;
    };
    private calculateDistance;
    private groupByLocation;
    private groupByCapability;
}
//# sourceMappingURL=worker-config.d.ts.map