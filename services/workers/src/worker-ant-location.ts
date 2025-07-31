/**
 * Worker Ant automatic location detection
 */

interface IPGeolocation {
  ip: string;
  city: string;
  region: string;
  country: string;
  country_code: string;
  continent: string;
  timezone: string;
  loc: string; // "lat,lng"
  org: string; // ISP/Organization
  asn?: number;
}

export class WorkerAntLocationDetector {
  private cache: IPGeolocation | null = null;
  private lastDetection: number = 0;
  private readonly CACHE_DURATION = 3600000; // 1 hour
  
  /**
   * Automatically detect worker ant location
   */
  async detectLocation(): Promise<{
    continent: string;
    country: string;
    city: string;
    datacenter: string;
    coordinates: { lat: number; lng: number };
    network: {
      ipv4?: string;
      ipv6?: string;
      asn?: number;
      isp?: string;
    };
  }> {
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
      
    } catch (error) {
      console.error('❌ Failed to detect location:', error);
      return await this.fallbackDetection();
    }
  }
  
  /**
   * Try multiple geolocation services
   */
  private async tryGeolocationServices(): Promise<IPGeolocation | null> {
    const services = [
      { url: 'https://ipapi.co/json/', parser: this.parseIPAPI.bind(this) },
      { url: 'https://ipinfo.io/json', parser: this.parseIPInfo.bind(this) },
      { url: 'http://ip-api.com/json/', parser: this.parseIPAPIcom.bind(this) }, // Free, no HTTPS
    ];
    
    console.log('🌍 Attempting to detect worker location...');
    
    for (const service of services) {
      try {
        console.log(`📡 Trying ${service.url}...`);
        const response = await fetch(service.url, {
          signal: AbortSignal.timeout(5000), // 5s timeout
          headers: {
            'User-Agent': 'GuardAnt-Worker/1.0'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Got response from ${service.url}:`, { city: data.city, country: data.country || data.country_name });
          
          // If we only got IP, try to get full info from another service
          if (data.ip && !data.city) {
            continue;
          }
          
          return service.parser ? service.parser(data) : data;
        } else {
          console.warn(`⚠️ Service ${service.url} returned ${response.status}`);
        }
      } catch (error: any) {
        console.warn(`⚠️ Geolocation service ${service.url} failed:`, error.message);
      }
    }
    
    console.error('❌ All geolocation services failed');
    return null;
  }
  
  /**
   * Parse IPAPI response
   */
  private parseIPAPI(data: any): IPGeolocation {
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
  private parseIPInfo(data: any): IPGeolocation {
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
   * Parse ip-api.com response
   */
  private parseIPAPIcom(data: any): IPGeolocation {
    return {
      ip: data.query,
      city: data.city,
      region: data.regionName,
      country: data.country,
      country_code: data.countryCode,
      continent: this.getContinent(data.countryCode),
      timezone: data.timezone,
      loc: `${data.lat},${data.lon}`,
      org: data.org || data.isp,
      asn: data.as ? parseInt(data.as.split(' ')[0].replace('AS', '')) : undefined,
    };
  }
  
  /**
   * Parse geolocation data into our format
   */
  private parseGeolocation(geo: IPGeolocation) {
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
  private detectDatacenter(geo: IPGeolocation): string {
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
  private getContinent(code: string): string {
    const continentMap: Record<string, string> = {
      'AF': 'Africa',
      'AS': 'Asia',
      'EU': 'Europe',
      'NA': 'North America',
      'OC': 'Oceania',
      'SA': 'South America',
      'AN': 'Antarctica',
    };
    
    // Country to continent mapping (simplified)
    const countryToContinentMap: Record<string, string> = {
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
  private async fallbackDetection() {
    console.log('🔧 Using fallback location detection...');
    
    // Check for WORKER_REGION environment variable first
    const workerRegion = process.env.WORKER_REGION;
    if (workerRegion) {
      console.log(`📍 Found WORKER_REGION: ${workerRegion}`);
      return this.parseRegionCode(workerRegion);
    }
    
    // Try hostname-based detection
    const hostname = process.env.HOSTNAME || require('os').hostname();
    console.log(`🖥️ Hostname: ${hostname}`);
    
    // Extract region from hostname patterns like "worker-blog-1" or "worker-us-east-1"
    const regionMatch = hostname.match(/worker-([a-z]{2}-[a-z]+-\d+)/);
    if (regionMatch) {
      console.log(`📍 Extracted region from hostname: ${regionMatch[1]}`);
      return this.parseRegionCode(regionMatch[1]);
    }
    
    // Try to detect from environment variables
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log(`🕒 System timezone: ${timezone}`);
    
    // Basic mapping based on timezone
    const timezoneToLocation: Record<string, any> = {
      'Europe/Warsaw': { continent: 'Europe', country: 'Poland', city: 'Warsaw' },
      'Europe/London': { continent: 'Europe', country: 'UK', city: 'London' },
      'Europe/Berlin': { continent: 'Europe', country: 'Germany', city: 'Berlin' },
      'Europe/Paris': { continent: 'Europe', country: 'France', city: 'Paris' },
      'America/New_York': { continent: 'North America', country: 'USA', city: 'New York' },
      'America/Chicago': { continent: 'North America', country: 'USA', city: 'Chicago' },
      'America/Los_Angeles': { continent: 'North America', country: 'USA', city: 'Los Angeles' },
      'Asia/Tokyo': { continent: 'Asia', country: 'Japan', city: 'Tokyo' },
      'Asia/Shanghai': { continent: 'Asia', country: 'China', city: 'Shanghai' },
      'UTC': { continent: 'Unknown', country: 'Unknown', city: 'Docker Container' },
    };
    
    const location = timezoneToLocation[timezone] || {
      continent: 'Unknown',
      country: 'Unknown', 
      city: 'Unknown',
    };
    
    return {
      ...location,
      datacenter: process.env.DATACENTER || hostname || 'Local',
      coordinates: { lat: 0, lng: 0 },
      network: {
        ipv4: process.env.PUBLIC_IP,
        asn: process.env.ASN ? parseInt(process.env.ASN) : undefined,
        isp: process.env.ISP || 'Unknown ISP',
      },
    };
  }
  
  /**
   * Parse AWS/cloud region codes into location info
   */
  private parseRegionCode(regionCode: string) {
    const regionMappings: Record<string, any> = {
      'us-east-1': { continent: 'North America', country: 'USA', city: 'Virginia' },
      'us-east-2': { continent: 'North America', country: 'USA', city: 'Ohio' },
      'us-west-1': { continent: 'North America', country: 'USA', city: 'California' },
      'us-west-2': { continent: 'North America', country: 'USA', city: 'Oregon' },
      'eu-west-1': { continent: 'Europe', country: 'Ireland', city: 'Dublin' },
      'eu-west-2': { continent: 'Europe', country: 'UK', city: 'London' },
      'eu-west-3': { continent: 'Europe', country: 'France', city: 'Paris' },
      'eu-central-1': { continent: 'Europe', country: 'Germany', city: 'Frankfurt' },
      'eu-north-1': { continent: 'Europe', country: 'Sweden', city: 'Stockholm' },
      'ap-northeast-1': { continent: 'Asia', country: 'Japan', city: 'Tokyo' },
      'ap-northeast-2': { continent: 'Asia', country: 'South Korea', city: 'Seoul' },
      'ap-southeast-1': { continent: 'Asia', country: 'Singapore', city: 'Singapore' },
      'ap-southeast-2': { continent: 'Oceania', country: 'Australia', city: 'Sydney' },
      'ap-south-1': { continent: 'Asia', country: 'India', city: 'Mumbai' },
      'sa-east-1': { continent: 'South America', country: 'Brazil', city: 'São Paulo' },
      'ca-central-1': { continent: 'North America', country: 'Canada', city: 'Montreal' },
      'auto': { continent: 'Auto', country: 'Auto', city: 'Auto-detected' },
    };
    
    const location = regionMappings[regionCode] || {
      continent: 'Unknown',
      country: regionCode,
      city: regionCode,
    };
    
    return {
      ...location,
      datacenter: `AWS ${regionCode}`,
      coordinates: { lat: 0, lng: 0 },
      network: {
        ipv4: process.env.PUBLIC_IP,
        asn: process.env.ASN ? parseInt(process.env.ASN) : undefined,
        isp: 'Amazon Web Services',
      },
    };
  }
  
  /**
   * Get public IP address
   */
  async getPublicIP(): Promise<string | null> {
    try {
      const response = await fetch('https://api.ipify.org?format=text', {
        signal: AbortSignal.timeout(3000),
      });
      
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.error('❌ Failed to get public IP:', error);
    }
    
    return null;
  }
}

// Export singleton instance
export const locationDetector = new WorkerAntLocationDetector();