/**
 * Worker Ant automatic location detection
 */
export declare class WorkerAntLocationDetector {
    private cache;
    private lastDetection;
    private readonly CACHE_DURATION;
    /**
     * Automatically detect worker ant location
     */
    detectLocation(): Promise<{
        continent: string;
        country: string;
        city: string;
        datacenter: string;
        coordinates: {
            lat: number;
            lng: number;
        };
        network: {
            ipv4?: string;
            ipv6?: string;
            asn?: number;
            isp?: string;
        };
    }>;
    /**
     * Try multiple geolocation services
     */
    private tryGeolocationServices;
    /**
     * Parse IPAPI response
     */
    private parseIPAPI;
    /**
     * Parse IPInfo response
     */
    private parseIPInfo;
    /**
     * Parse geolocation data into our format
     */
    private parseGeolocation;
    /**
     * Detect if running in a known datacenter
     */
    private detectDatacenter;
    /**
     * Get continent name from country code
     */
    private getContinent;
    /**
     * Fallback detection using system info
     */
    private fallbackDetection;
    /**
     * Get public IP address
     */
    getPublicIP(): Promise<string | null>;
}
export declare const locationDetector: WorkerAntLocationDetector;
//# sourceMappingURL=worker-ant-location.d.ts.map