import type { 
  PublicNestInfo, 
  PublicServiceStatus, 
  PublicIncident, 
  PublicMaintenanceWindow,
  PublicStatusPageResponse 
} from '../types';

/**
 * Transform internal nest data to public API format
 */
export const transformNestData = (nestData: any): PublicNestInfo => {
  return {
    id: nestData.id,
    name: nestData.name,
    subdomain: nestData.subdomain,
    settings: {
      isPublic: nestData.settings?.isPublic ?? true,
      customDomain: nestData.settings?.customDomain,
      timezone: nestData.settings?.timezone ?? 'UTC',
      language: nestData.settings?.language ?? 'en',
      branding: nestData.settings?.branding ? {
        logo: nestData.settings.branding.logo,
        primaryColor: nestData.settings.branding.primaryColor,
        customCss: nestData.settings.branding.customCss,
      } : undefined,
    },
  };
};

/**
 * Transform internal service data to public API format
 */
export const transformServiceData = (serviceData: any, statusData: any = null): PublicServiceStatus => {
  const status = statusData || serviceData;
  
  return {
    id: serviceData.id,
    name: serviceData.name,
    description: serviceData.description,
    type: serviceData.type,
    status: status.status || 'unknown',
    uptime: status.uptime || 0,
    responseTime: status.responseTime,
    lastCheck: status.lastCheck || Date.now(),
    metrics: {
      uptime24h: status.metrics?.uptime24h || 0,
      uptime7d: status.metrics?.uptime7d || 0,
      uptime30d: status.metrics?.uptime30d || 0,
      avgResponseTime24h: status.metrics?.avgResponseTime24h,
      avgResponseTime7d: status.metrics?.avgResponseTime7d,
      avgResponseTime30d: status.metrics?.avgResponseTime30d,
    },
    regions: (status.regions || []).map((region: any) => ({
      id: region.id,
      name: region.name,
      status: region.status || 'unknown',
      responseTime: region.responseTime,
      lastCheck: region.lastCheck || Date.now(),
    })),
  };
};

/**
 * Transform internal incident data to public API format
 */
export const transformIncidentData = (incidentData: any, serviceNames: Map<string, string>): PublicIncident => {
  return {
    id: incidentData.id,
    title: incidentData.title || 'Service Incident',
    description: incidentData.description || 'An incident is affecting this service.',
    status: incidentData.status || 'investigating',
    severity: incidentData.severity || 'minor',
    affectedServices: (incidentData.affectedServices || [])
      .map((serviceId: string) => serviceNames.get(serviceId) || serviceId)
      .filter(Boolean),
    startedAt: incidentData.startedAt,
    resolvedAt: incidentData.resolvedAt,
    updates: (incidentData.updates || []).map((update: any) => ({
      id: update.id,
      message: update.message,
      status: update.status,
      timestamp: update.timestamp,
    })),
  };
};

/**
 * Transform internal maintenance data to public API format
 */
export const transformMaintenanceData = (maintenanceData: any, serviceNames: Map<string, string>): PublicMaintenanceWindow => {
  return {
    id: maintenanceData.id,
    title: maintenanceData.title || 'Scheduled Maintenance',
    description: maintenanceData.description || 'Scheduled maintenance is planned for this service.',
    affectedServices: (maintenanceData.affectedServices || [])
      .map((serviceId: string) => serviceNames.get(serviceId) || serviceId)
      .filter(Boolean),
    scheduledStart: maintenanceData.scheduledStart,
    scheduledEnd: maintenanceData.scheduledEnd,
    status: maintenanceData.status || 'scheduled',
  };
};

/**
 * Calculate uptime percentage from historical data
 */
export const calculateUptime = (historicalData: any[]): number => {
  if (!historicalData || historicalData.length === 0) return 100;
  
  const upCount = historicalData.filter(point => point.status === 'up').length;
  return Math.round((upCount / historicalData.length) * 100 * 100) / 100; // Round to 2 decimal places
};

/**
 * Calculate average response time from historical data
 */
export const calculateAverageResponseTime = (historicalData: any[]): number | undefined => {
  if (!historicalData || historicalData.length === 0) return undefined;
  
  const validResponseTimes = historicalData
    .filter(point => point.responseTime && point.responseTime > 0)
    .map(point => point.responseTime);
  
  if (validResponseTimes.length === 0) return undefined;
  
  const sum = validResponseTimes.reduce((acc, time) => acc + time, 0);
  return Math.round(sum / validResponseTimes.length);
};

/**
 * Generate mock historical data for demonstration
 * In production, this would query actual historical metrics from storage
 */
export const generateMockHistoricalData = (
  period: '24h' | '7d' | '30d' | '90d',
  currentStatus: 'up' | 'down' | 'degraded' = 'up',
  baseResponseTime: number = 200
): any[] => {
  const now = Date.now();
  const intervals = {
    '24h': { duration: 24 * 60 * 60 * 1000, points: 48 }, // Every 30 minutes
    '7d': { duration: 7 * 24 * 60 * 60 * 1000, points: 168 }, // Every hour
    '30d': { duration: 30 * 24 * 60 * 60 * 1000, points: 720 }, // Every hour
    '90d': { duration: 90 * 24 * 60 * 60 * 1000, points: 360 }, // Every 6 hours
  };
  
  const { duration, points } = intervals[period];
  const interval = duration / points;
  
  const data = [];
  
  for (let i = 0; i < points; i++) {
    const timestamp = now - duration + (i * interval);
    
    // Generate realistic status distribution (95% up, 4% degraded, 1% down)
    let status: 'up' | 'down' | 'degraded';
    const random = Math.random();
    if (random < 0.95) {
      status = 'up';
    } else if (random < 0.99) {
      status = 'degraded';
    } else {
      status = 'down';
    }
    
    // If it's the most recent point, use current status
    if (i === points - 1) {
      status = currentStatus;
    }
    
    // Generate response time (only for up/degraded status)
    let responseTime: number | undefined;
    if (status !== 'down') {
      const variation = (Math.random() - 0.5) * 0.4; // ±20% variation
      responseTime = Math.round(baseResponseTime * (1 + variation));
      
      // Degraded services have higher response times
      if (status === 'degraded') {
        responseTime = Math.round(responseTime * 1.5);
      }
    }
    
    data.push({
      timestamp,
      status,
      responseTime,
    });
  }
  
  return data;
};

/**
 * Create service name lookup map
 */
export const createServiceNameMap = (services: any[]): Map<string, string> => {
  const map = new Map<string, string>();
  services.forEach(service => {
    map.set(service.id, service.name);
  });
  return map;
};

/**
 * Filter data based on privacy settings
 */
export const filterPrivateData = (data: PublicStatusPageResponse): PublicStatusPageResponse => {
  // If nest is not public, return minimal data
  if (!data.nest.settings.isPublic) {
    return {
      ...data,
      services: [],
      incidents: [],
      maintenance: [],
    };
  }
  
  return data;
};