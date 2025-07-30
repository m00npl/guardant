export interface StatusPageData {
    nest: {
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
    };
    services: ServiceStatus[];
    incidents: Incident[];
    maintenance: MaintenanceWindow[];
    lastUpdated: number;
}
export interface ServiceStatus {
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
    regions: {
        id: string;
        name: string;
        status: 'up' | 'down' | 'degraded';
        responseTime?: number;
        lastCheck: number;
    }[];
}
export interface Incident {
    id: string;
    title: string;
    description: string;
    status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
    severity: 'minor' | 'major' | 'critical';
    affectedServices: string[];
    startedAt: number;
    resolvedAt?: number;
    updates: IncidentUpdate[];
}
export interface IncidentUpdate {
    id: string;
    message: string;
    status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
    timestamp: number;
}
export interface MaintenanceWindow {
    id: string;
    title: string;
    description: string;
    affectedServices: string[];
    scheduledStart: number;
    scheduledEnd: number;
    status: 'scheduled' | 'in-progress' | 'completed';
}
export interface HistoricalData {
    serviceId: string;
    period: '24h' | '7d' | '30d' | '90d';
    data: {
        timestamp: number;
        status: 'up' | 'down' | 'degraded';
        responseTime?: number;
    }[];
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: number;
}
//# sourceMappingURL=index.d.ts.map