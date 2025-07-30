import type { Service } from '/app/packages/shared-types/src/index';
export interface MonitoringResult {
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    message?: string;
    details?: Record<string, any>;
}
export declare class MonitoringService {
    private region;
    constructor(region?: string);
    checkService(service: Service): Promise<MonitoringResult>;
    private performCheck;
    private storeCheckResult;
    private checkWeb;
    private checkTcp;
    private checkPing;
    private checkGitHub;
    private checkUptimeApi;
    private checkKeyword;
    private checkHeartbeat;
    private checkPort;
}
//# sourceMappingURL=monitoring.d.ts.map