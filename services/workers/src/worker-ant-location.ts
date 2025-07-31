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
    console.log('📍 IPAPI data:', { city: data.city, country: data.country_name, country_code: data.country_code });
    return {
      ip: data.ip,
      city: data.city || 'Unknown',
      region: data.region || data.region_code || 'Unknown',
      country: data.country_name || 'Unknown',
      country_code: data.country_code || data.country || 'XX',
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
    console.log('📍 IPInfo data:', { city: data.city, country: data.country, region: data.region });
    return {
      ip: data.ip,
      city: data.city || 'Unknown',
      region: data.region || 'Unknown',
      country: data.country || 'Unknown',
      country_code: data.country || 'XX',
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
    
    // Generate region code from location data
    const regionCode = this.generateRegionCode(geo);
    
    return {
      continent: geo.continent,
      country: geo.country,
      city: geo.city,
      region: regionCode, // Add region field
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
   * Generate region code from geolocation data
   */
  private generateRegionCode(geo: IPGeolocation): string {
    // Try to generate AWS-style region code
    const countryCode = geo.country_code?.toLowerCase();
    
    if (!countryCode) {
      console.warn('⚠️ No country code available for region generation');
      return `unknown-${geo.city?.toLowerCase().replace(/\s+/g, '-') || 'location'}`;
    }
    
    // Map countries to regions
    const regionMap: Record<string, string> = {
      // Americas
      'us': 'us-east-1',
      'ca': 'ca-central-1',
      'br': 'sa-east-1',
      
      // Europe
      'ie': 'eu-west-1',
      'gb': 'eu-west-2',
      'fr': 'eu-west-3',
      'de': 'eu-central-1',
      'se': 'eu-north-1',
      'it': 'eu-south-1',
      'es': 'eu-south-2',
      'pl': 'eu-central-2',
      'fi': 'eu-north-1',  // Finland
      'dk': 'eu-north-1',  // Denmark
      'no': 'eu-north-1',  // Norway
      'nl': 'eu-west-1',   // Netherlands
      'be': 'eu-west-1',   // Belgium
      'ch': 'eu-central-1', // Switzerland
      'at': 'eu-central-1', // Austria
      'cz': 'eu-central-2', // Czech Republic
      'sk': 'eu-central-2', // Slovakia
      'hu': 'eu-central-2', // Hungary
      'ro': 'eu-central-2', // Romania
      'bg': 'eu-central-2', // Bulgaria
      'gr': 'eu-south-1',   // Greece
      'pt': 'eu-south-2',   // Portugal
      
      // Asia Pacific
      'sg': 'ap-southeast-1',
      'au': 'ap-southeast-2',
      'jp': 'ap-northeast-1',
      'kr': 'ap-northeast-2',
      'in': 'ap-south-1',
      'cn': 'cn-north-1',
      'hk': 'ap-east-1',    // Hong Kong
      'tw': 'ap-northeast-1', // Taiwan
      'th': 'ap-southeast-1', // Thailand
      'my': 'ap-southeast-1', // Malaysia
      'id': 'ap-southeast-1', // Indonesia
      'ph': 'ap-southeast-1', // Philippines
      'vn': 'ap-southeast-1', // Vietnam
      'nz': 'ap-southeast-2', // New Zealand
      
      // Middle East & Africa
      'ae': 'me-south-1',
      'za': 'af-south-1',
    };
    
    // Check if we have a specific mapping
    if (regionMap[countryCode]) {
      return regionMap[countryCode];
    }
    
    // Generate generic region based on continent
    const continentToRegion: Record<string, string> = {
      'North America': 'us-east-1',
      'South America': 'sa-east-1',
      'Europe': 'eu-west-1',
      'Asia': 'ap-southeast-1',
      'Oceania': 'ap-southeast-2',
      'Africa': 'af-south-1',
    };
    
    return continentToRegion[geo.continent] || `${countryCode}-${geo.city.toLowerCase().replace(/\s+/g, '-')}`;
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
    
    // Generate region code based on location
    const regionCode = this.generateRegionFromLocation(location);
    
    return {
      ...location,
      region: regionCode,
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
   * Generate region code from location object
   */
  private generateRegionFromLocation(location: { continent: string; country: string; city: string }): string {
    // Map timezone locations to region codes
    const locationToRegion: Record<string, string> = {
      'Europe:Poland:Warsaw': 'eu-central-2',
      'Europe:UK:London': 'eu-west-2',
      'Europe:Germany:Berlin': 'eu-central-1',
      'Europe:France:Paris': 'eu-west-3',
      'North America:USA:New York': 'us-east-1',
      'North America:USA:Chicago': 'us-east-2',
      'North America:USA:Los Angeles': 'us-west-1',
      'Asia:Japan:Tokyo': 'ap-northeast-1',
      'Asia:China:Shanghai': 'cn-north-1',
    };
    
    const key = `${location.continent}:${location.country}:${location.city}`;
    if (locationToRegion[key]) {
      return locationToRegion[key];
    }
    
    // Generate default region based on continent
    const continentDefaults: Record<string, string> = {
      'Europe': 'eu-west-1',
      'North America': 'us-east-1',
      'South America': 'sa-east-1',
      'Asia': 'ap-southeast-1',
      'Oceania': 'ap-southeast-2',
      'Africa': 'af-south-1',
      'Unknown': 'unknown',
    };
    
    return continentDefaults[location.continent] || 'unknown';
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
      region: regionCode,
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