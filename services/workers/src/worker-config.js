"use strict";
/**
 * Worker configuration and capabilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerAntRegistry = exports.WORKER_ANT_PRESETS = void 0;
// Example configurations for different worker ant types
exports.WORKER_ANT_PRESETS = {
    // Basic web monitoring worker ant
    basic: {
        capabilities: {
            serviceTypes: ['web', 'keyword'],
            features: {
                customHeaders: true,
                certificates: true,
                bandwidth: 'medium',
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
            serviceTypes: ['web', 'tcp', 'ping', 'github', 'uptime-api', 'keyword', 'heartbeat', 'port'],
            features: {
                icmp: true,
                ipv6: true,
                customHeaders: true,
                certificates: true,
                bandwidth: 'high',
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
            serviceTypes: ['ping'],
            features: {
                icmp: true,
                ipv6: true,
                bandwidth: 'low',
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
            serviceTypes: ['web', 'github', 'uptime-api', 'keyword'],
            features: {
                customHeaders: true,
                certificates: true,
                bandwidth: 'high',
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
class WorkerAntRegistry {
    constructor() {
        this.workerAnts = new Map();
    }
    /**
     * Register a worker ant in the system
     */
    async register(config) {
        this.workerAnts.set(config.id, config);
        console.log(`✅ Worker Ant ${config.id} registered from ${config.location.city}, ${config.location.country}`);
    }
    /**
     * Update worker ant heartbeat
     */
    async heartbeat(workerAntId) {
        const workerAnt = this.workerAnts.get(workerAntId);
        if (workerAnt) {
            workerAnt.status.lastHeartbeat = Date.now();
        }
    }
    /**
     * Find best worker ant for a job
     */
    findBestWorkerAnt(jobRequirements) {
        let bestWorkerAnt = null;
        let bestScore = -1;
        for (const workerAnt of this.workerAnts.values()) {
            // Check if worker ant can handle this service type
            if (!workerAnt.capabilities.serviceTypes.includes(jobRequirements.serviceType)) {
                continue;
            }
            // Check if worker ant is healthy
            const isHealthy = Date.now() - workerAnt.status.lastHeartbeat < 60000; // 1 minute
            if (!isHealthy)
                continue;
            // Calculate score based on various factors
            let score = 0;
            // Location score (if target location provided)
            if (jobRequirements.targetLocation && workerAnt.location.coordinates) {
                const distance = this.calculateDistance(workerAnt.location.coordinates, jobRequirements.targetLocation);
                score += Math.max(0, 100 - distance / 100); // Closer is better
            }
            // Capability score
            score += workerAnt.capabilities.limits.maxConcurrency;
            // Load score (less loaded is better)
            const loadFactor = workerAnt.status.checksCompleted / (Date.now() - workerAnt.status.startedAt) * 1000;
            score += Math.max(0, 100 - loadFactor);
            // Tag matching score
            if (jobRequirements.preferredTags) {
                const matchingTags = jobRequirements.preferredTags.filter(tag => workerAnt.tags.includes(tag)).length;
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
    getWorkerAntsByCapability(serviceType) {
        return Array.from(this.workerAnts.values()).filter(workerAnt => workerAnt.capabilities.serviceTypes.includes(serviceType));
    }
    /**
     * Get worker ants by location
     */
    getWorkerAntsByLocation(continent, country) {
        return Array.from(this.workerAnts.values()).filter(workerAnt => {
            if (continent && workerAnt.location.continent !== continent)
                return false;
            if (country && workerAnt.location.country !== country)
                return false;
            return true;
        });
    }
    /**
     * Get worker ant statistics
     */
    getStatistics() {
        const workerAnts = Array.from(this.workerAnts.values());
        const activeWorkerAnts = workerAnts.filter(w => Date.now() - w.status.lastHeartbeat < 60000);
        return {
            total: workerAnts.length,
            active: activeWorkerAnts.length,
            byLocation: this.groupByLocation(workerAnts),
            byCapability: this.groupByCapability(workerAnts),
            totalCapacity: workerAnts.reduce((sum, w) => sum + w.capabilities.limits.maxConcurrency, 0),
        };
    }
    calculateDistance(coord1, coord2) {
        // Simplified distance calculation (Haversine formula)
        const R = 6371; // Earth's radius in km
        const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
        const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    groupByLocation(workerAnts) {
        const groups = {};
        workerAnts.forEach(w => {
            const key = `${w.location.continent}/${w.location.country}`;
            groups[key] = (groups[key] || 0) + 1;
        });
        return groups;
    }
    groupByCapability(workerAnts) {
        const groups = {};
        workerAnts.forEach(w => {
            w.capabilities.serviceTypes.forEach(type => {
                groups[type] = (groups[type] || 0) + 1;
            });
        });
        return groups;
    }
}
exports.WorkerAntRegistry = WorkerAntRegistry;
//# sourceMappingURL=worker-config.js.map