export interface PublicNestInfo {
    id: string;
    name: string;
    subdomain: string;
    settings: {
        isPublic: boolean;
        customDomain?: string;
        timezone: string;
        language: string;
        branding?: {
            logo?: string;
            primaryColor?: string;
            customCss?: string;
        };
    };
}
export interface PublicServiceStatus {
    id: string;
    name: string;
    description?: string;
    type: 'web' | 'tcp' | 'ping' | 'github' | 'uptime-api' | 'keyword' | 'heartbeat' | 'port';
    status: 'up' | 'down' | 'degraded' | 'maintenance';
    uptime: number;
    responseTime?: number;
    lastCheck: number;
    metrics: {
        uptime24h: number;
        uptime7d: number;
        uptime30d: number;
        avgResponseTime24h?: number;
        avgResponseTime7d?: number;
        avgResponseTime30d?: number;
    };
    regions: PublicRegionStatus[];
}
export interface PublicRegionStatus {
    id: string;
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    lastCheck: number;
}
export interface PublicIncident {
    id: string;
    title: string;
    description: string;
    status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
    severity: 'minor' | 'major' | 'critical';
    affectedServices: string[];
    startedAt: number;
    resolvedAt?: number;
    updates: PublicIncidentUpdate[];
}
export interface PublicIncidentUpdate {
    id: string;
    message: string;
    status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
    timestamp: number;
}
export interface PublicMaintenanceWindow {
    id: string;
    title: string;
    description: string;
    affectedServices: string[];
    scheduledStart: number;
    scheduledEnd: number;
    status: 'scheduled' | 'in-progress' | 'completed';
}
export interface PublicStatusPageResponse {
    nest: PublicNestInfo;
    services: PublicServiceStatus[];
    incidents: PublicIncident[];
    maintenance: PublicMaintenanceWindow[];
    lastUpdated: number;
}
export interface PublicHistoricalDataPoint {
    timestamp: number;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
}
export interface PublicHistoricalData {
    serviceId: string;
    serviceName: string;
    period: '24h' | '7d' | '30d' | '90d';
    data: PublicHistoricalDataPoint[];
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: number;
}
export interface SSEUpdateData {
    type: 'service_update' | 'incident_update' | 'maintenance_update' | 'full_refresh';
    data: any;
    timestamp: number;
}
//# sourceMappingURL=index.d.ts.map