"use strict";
/**
 * Worker Ant automatic location detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.locationDetector = exports.WorkerAntLocationDetector = void 0;
class WorkerAntLocationDetector {
    constructor() {
        this.cache = null;
        this.lastDetection = 0;
        this.CACHE_DURATION = 3600000; // 1 hour
    }
    /**
     * Automatically detect worker ant location
     */
    async detectLocation() {
        try {
            // Check cache first
            if (this.cache && Date.now() - this.lastDetection < this.CACHE_DURATION) {
                return this.parseGeolocation(this.cache);
            }
            // Try multiple geolocation services for redundancy
            const location = await this.tryGeolocationServices();
            if (location) {
                this.cache = location;
                this.lastDetection = Date.now();
                return this.parseGeolocation(location);
            }
            // Fallback to local detection
            return await this.fallbackDetection();
        }
        catch (error) {
            console.error('❌ Failed to detect location:', error);
            return await this.fallbackDetection();
        }
    }
    /**
     * Try multiple geolocation services
     */
    async tryGeolocationServices() {
        const services = [
            { url: 'https://ipapi.co/json/', parser: this.parseIPAPI.bind(this) },
            { url: 'https://ipinfo.io/json', parser: this.parseIPInfo.bind(this) },
            { url: 'https://api.ipify.org?format=json', parser: null }, // Just for IP
        ];
        for (const service of services) {
            try {
                const response = await fetch(service.url, {
                    signal: AbortSignal.timeout(5000), // 5s timeout
                });
                if (response.ok) {
                    const data = await response.json();
                    // If we only got IP, try to get full info from another service
                    if (data.ip && !data.city) {
                        continue;
                    }
                    return service.parser ? service.parser(data) : data;
                }
            }
            catch (error) {
                console.warn(`⚠️ Geolocation service ${service.url} failed:`, error);
            }
        }
        return null;
    }
    /**
     * Parse IPAPI response
     */
    parseIPAPI(data) {
        return {
            ip: data.ip,
            city: data.city,
            region: data.region,
            country: data.country_name,
            country_code: data.country_code,
            continent: this.getContinent(data.continent_code),
            timezone: data.timezone,
            loc: `${data.latitude},${data.longitude}`,
            org: data.org || data.asn,
            asn: data.asn ? parseInt(data.asn.replace('AS', '')) : undefined,
        };
    }
    /**
     * Parse IPInfo response
     */
    parseIPInfo(data) {
        return {
            ip: data.ip,
            city: data.city,
            region: data.region,
            country: data.country,
            country_code: data.country,
            continent: this.getContinent(data.country),
            timezone: data.timezone,
            loc: data.loc,
            org: data.org,
            asn: undefined, // IPInfo doesn't provide ASN in free tier
        };
    }
    /**
     * Parse geolocation data into our format
     */
    parseGeolocation(geo) {
        const [lat, lng] = geo.loc.split(',').map(Number);
        return {
            continent: geo.continent,
            country: geo.country,
            city: geo.city,
            datacenter: this.detectDatacenter(geo),
            coordinates: { lat, lng },
            network: {
                ipv4: geo.ip,
                ipv6: undefined, // Would need IPv6 detection
                asn: geo.asn,
                isp: geo.org,
            },
        };
    }
    /**
     * Detect if running in a known datacenter
     */
    detectDatacenter(geo) {
        const datacenterPatterns = [
            { pattern: /amazon|aws/i, name: 'AWS' },
            { pattern: /google|gcp/i, name: 'Google Cloud' },
            { pattern: /microsoft|azure/i, name: 'Azure' },
            { pattern: /digitalocean/i, name: 'DigitalOcean' },
            { pattern: /vultr/i, name: 'Vultr' },
            { pattern: /linode/i, name: 'Linode' },
            { pattern: /ovh/i, name: 'OVH' },
            { pattern: /hetzner/i, name: 'Hetzner' },
        ];
        if (geo.org) {
            for (const dc of datacenterPatterns) {
                if (dc.pattern.test(geo.org)) {
                    return `${dc.name} - ${geo.city}`;
                }
            }
        }
        return `${geo.city} Datacenter`;
    }
    /**
     * Get continent name from country code
     */
    getContinent(code) {
        const continentMap = {
            'AF': 'Africa',
            'AS': 'Asia',
            'EU': 'Europe',
            'NA': 'North America',
            'OC': 'Oceania',
            'SA': 'South America',
            'AN': 'Antarctica',
        };
        // Country to continent mapping (simplified)
        const countryToContinentMap = {
            'US': 'North America', 'CA': 'North America', 'MX': 'North America',
            'BR': 'South America', 'AR': 'South America', 'CL': 'South America',
            'GB': 'Europe', 'DE': 'Europe', 'FR': 'Europe', 'PL': 'Europe',
            'CN': 'Asia', 'JP': 'Asia', 'IN': 'Asia', 'KR': 'Asia',
            'AU': 'Oceania', 'NZ': 'Oceania',
            'ZA': 'Africa', 'EG': 'Africa', 'NG': 'Africa',
        };
        if (continentMap[code]) {
            return continentMap[code];
        }
        return countryToContinentMap[code] || 'Unknown';
    }
    /**
     * Fallback detection using system info
     */
    async fallbackDetection() {
        // Try to detect from environment variables
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const locale = Intl.DateTimeFormat().resolvedOptions().locale;
        // Basic mapping based on timezone
        const timezoneToLocation = {
            'Europe/Warsaw': { continent: 'Europe', country: 'Poland', city: 'Warsaw' },
            'Europe/London': { continent: 'Europe', country: 'UK', city: 'London' },
            'America/New_York': { continent: 'North America', country: 'USA', city: 'New York' },
            'Asia/Tokyo': { continent: 'Asia', country: 'Japan', city: 'Tokyo' },
            // Add more mappings as needed
        };
        const location = timezoneToLocation[timezone] || {
            continent: 'Unknown',
            country: 'Unknown',
            city: 'Unknown',
        };
        return {
            ...location,
            datacenter: process.env.DATACENTER || 'Local',
            coordinates: { lat: 0, lng: 0 },
            network: {
                ipv4: process.env.PUBLIC_IP,
                asn: process.env.ASN ? parseInt(process.env.ASN) : undefined,
                isp: process.env.ISP,
            },
        };
    }
    /**
     * Get public IP address
     */
    async getPublicIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=text', {
                signal: AbortSignal.timeout(3000),
            });
            if (response.ok) {
                return await response.text();
            }
        }
        catch (error) {
            console.error('❌ Failed to get public IP:', error);
        }
        return null;
    }
}
exports.WorkerAntLocationDetector = WorkerAntLocationDetector;
// Export singleton instance
exports.locationDetector = new WorkerAntLocationDetector();
//# sourceMappingURL=worker-ant-location.js.map