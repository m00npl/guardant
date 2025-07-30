import type { StatusPageData, HistoricalData } from '../types';
export declare const getSubdomain: () => string;
declare class StatusPageAPI {
    private subdomain;
    constructor();
    /**
     * Fetch status page data for the current subdomain/nest
     */
    getStatusPage(): Promise<StatusPageData>;
    /**
     * Fetch historical data for a specific service
     */
    getHistoricalData(serviceId: string, period: '24h' | '7d' | '30d' | '90d'): Promise<HistoricalData>;
    /**
     * Subscribe to real-time updates via Server-Sent Events
     */
    subscribeToUpdates(onUpdate: (data: Partial<StatusPageData>) => void): EventSource;
}
export declare const statusAPI: StatusPageAPI;
export declare const getStatusColor: (status: string) => string;
export declare const getStatusBadgeClass: (status: string) => string;
export declare const formatUptime: (uptime: number) => string;
export declare const formatResponseTime: (responseTime: number | undefined) => string;
export declare const getRelativeTime: (timestamp: number) => string;
export declare const formatDateTime: (timestamp: number) => string;
export {};
//# sourceMappingURL=api.d.ts.map