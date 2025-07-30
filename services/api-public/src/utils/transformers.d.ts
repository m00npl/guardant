import type { PublicNestInfo, PublicServiceStatus, PublicIncident, PublicMaintenanceWindow, PublicStatusPageResponse } from '../types';
/**
 * Transform internal nest data to public API format
 */
export declare const transformNestData: (nestData: any) => PublicNestInfo;
/**
 * Transform internal service data to public API format
 */
export declare const transformServiceData: (serviceData: any, statusData?: any) => PublicServiceStatus;
/**
 * Transform internal incident data to public API format
 */
export declare const transformIncidentData: (incidentData: any, serviceNames: Map<string, string>) => PublicIncident;
/**
 * Transform internal maintenance data to public API format
 */
export declare const transformMaintenanceData: (maintenanceData: any, serviceNames: Map<string, string>) => PublicMaintenanceWindow;
/**
 * Calculate uptime percentage from historical data
 */
export declare const calculateUptime: (historicalData: any[]) => number;
/**
 * Calculate average response time from historical data
 */
export declare const calculateAverageResponseTime: (historicalData: any[]) => number | undefined;
/**
 * Generate mock historical data for demonstration
 * In production, this would query actual historical metrics from storage
 */
export declare const generateMockHistoricalData: (period: "24h" | "7d" | "30d" | "90d", currentStatus?: "up" | "down" | "degraded", baseResponseTime?: number) => any[];
/**
 * Create service name lookup map
 */
export declare const createServiceNameMap: (services: any[]) => Map<string, string>;
/**
 * Filter data based on privacy settings
 */
export declare const filterPrivateData: (data: PublicStatusPageResponse) => PublicStatusPageResponse;
//# sourceMappingURL=transformers.d.ts.map