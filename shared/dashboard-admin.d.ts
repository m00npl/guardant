import { GuardAntTracing } from "./tracing";
export declare enum WidgetType {
    METRICS_CHART = "metrics_chart",
    STATUS_OVERVIEW = "status_overview",
    INCIDENT_LIST = "incident_list",
    USER_ACTIVITY = "user_activity",
    SYSTEM_HEALTH = "system_health",
    BILLING_OVERVIEW = "billing_overview",
    ALERT_SUMMARY = "alert_summary",
    PERFORMANCE_METRICS = "performance_metrics"
}
export interface DashboardLayout {
    id: string;
    name: string;
    description: string;
    widgets: DashboardWidget[];
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface DashboardWidget {
    id: string;
    type: WidgetType;
    title: string;
    description?: string;
    position: WidgetPosition;
    size: WidgetSize;
    config: WidgetConfig;
    dataSource: DataSource;
    refreshInterval: number;
    isVisible: boolean;
    permissions: string[];
}
export interface WidgetPosition {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface WidgetSize {
    minWidth: number;
    minHeight: number;
    maxWidth?: number;
    maxHeight?: number;
}
export interface WidgetConfig {
    chartType?: "line" | "bar" | "pie" | "area" | "gauge";
    timeRange?: "1h" | "6h" | "24h" | "7d" | "30d" | "custom";
    metrics?: string[];
    thresholds?: ThresholdConfig[];
    displayOptions?: DisplayOptions;
}
export interface ThresholdConfig {
    metric: string;
    warning: number;
    critical: number;
    color: string;
}
export interface DisplayOptions {
    showLegend: boolean;
    showGrid: boolean;
    animate: boolean;
    colorScheme: "default" | "dark" | "light";
}
export interface DataSource {
    type: "api" | "database" | "websocket" | "file";
    endpoint?: string;
    query?: string;
    parameters?: Record<string, any>;
    authentication?: DataSourceAuth;
}
export interface DataSourceAuth {
    type: "api_key" | "bearer" | "basic" | "oauth";
    credentials: Record<string, string>;
}
export interface DashboardData {
    widgets: WidgetData[];
    summary: DashboardSummary;
    lastUpdated: Date;
}
export interface WidgetData {
    widgetId: string;
    data: any;
    status: "loading" | "success" | "error";
    error?: string;
    lastUpdated: Date;
}
export interface DashboardSummary {
    totalServices: number;
    activeServices: number;
    incidents: number;
    activeIncidents: number;
    users: number;
    activeUsers: number;
    systemHealth: "healthy" | "warning" | "critical";
    uptime: number;
}
export interface DashboardConfig {
    refreshInterval: number;
    realTimeUpdates: boolean;
    maxWidgets: number;
    defaultLayout: string;
    permissions: DashboardPermissions;
    customization: DashboardCustomization;
}
export interface DashboardPermissions {
    canCreateWidgets: boolean;
    canEditLayout: boolean;
    canShareDashboards: boolean;
    canExportData: boolean;
    canManageUsers: boolean;
}
export interface DashboardCustomization {
    theme: "light" | "dark" | "auto";
    language: string;
    timezone: string;
    dateFormat: string;
    numberFormat: string;
}
export declare const DashboardConfigs: {
    LOCAL: {
        refreshInterval: number;
        realTimeUpdates: boolean;
        maxWidgets: number;
        defaultLayout: string;
        permissions: {
            canCreateWidgets: boolean;
            canEditLayout: boolean;
            canShareDashboards: boolean;
            canExportData: boolean;
            canManageUsers: boolean;
        };
        customization: {
            theme: string;
            language: string;
            timezone: string;
            dateFormat: string;
            numberFormat: string;
        };
    };
    STAGING: {
        refreshInterval: number;
        realTimeUpdates: boolean;
        maxWidgets: number;
        defaultLayout: string;
        permissions: {
            canCreateWidgets: boolean;
            canEditLayout: boolean;
            canShareDashboards: boolean;
            canExportData: boolean;
            canManageUsers: boolean;
        };
        customization: {
            theme: string;
            language: string;
            timezone: string;
            dateFormat: string;
            numberFormat: string;
        };
    };
    PRODUCTION: {
        refreshInterval: number;
        realTimeUpdates: boolean;
        maxWidgets: number;
        defaultLayout: string;
        permissions: {
            canCreateWidgets: boolean;
            canEditLayout: boolean;
            canShareDashboards: boolean;
            canExportData: boolean;
            canManageUsers: boolean;
        };
        customization: {
            theme: string;
            language: string;
            timezone: string;
            dateFormat: string;
            numberFormat: string;
        };
    };
};
export declare class DashboardManager {
    private logger;
    private tracing?;
    private config;
    private layouts;
    private dataCache;
    private updateInterval?;
    private websocketConnections;
    constructor(config: DashboardConfig, tracing?: GuardAntTracing);
    private initializeDefaultLayouts;
    getDashboardData(layoutId?: string): Promise<DashboardData>;
    private getWidgetData;
    private fetchWidgetData;
    private fetchSystemOverview;
    private fetchIncidentList;
    private fetchPerformanceMetrics;
    private fetchUserActivity;
    private fetchSystemHealth;
    private fetchBillingOverview;
    private fetchAlertSummary;
    private generateDashboardSummary;
    createCustomLayout(layout: Omit<DashboardLayout, "id" | "createdAt" | "updatedAt">): Promise<DashboardLayout>;
    updateWidgetData(widgetId: string, data: any): Promise<void>;
    startRealTimeUpdates(): void;
    private refreshAllWidgets;
    stopRealTimeUpdates(): void;
    exportDashboardData(layoutId: string, format: "json" | "csv" | "pdf"): Promise<string>;
    private convertToCSV;
    private generatePDF;
    getCachedData(widgetId: string): WidgetData | undefined;
    clearCache(): void;
    destroy(): void;
}
//# sourceMappingURL=dashboard-admin.d.ts.map