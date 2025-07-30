"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardManager = exports.DashboardConfigs = exports.WidgetType = void 0;
const logger_1 = require("./logger");
// Dashboard Widget Types
var WidgetType;
(function (WidgetType) {
    WidgetType["METRICS_CHART"] = "metrics_chart";
    WidgetType["STATUS_OVERVIEW"] = "status_overview";
    WidgetType["INCIDENT_LIST"] = "incident_list";
    WidgetType["USER_ACTIVITY"] = "user_activity";
    WidgetType["SYSTEM_HEALTH"] = "system_health";
    WidgetType["BILLING_OVERVIEW"] = "billing_overview";
    WidgetType["ALERT_SUMMARY"] = "alert_summary";
    WidgetType["PERFORMANCE_METRICS"] = "performance_metrics";
})(WidgetType || (exports.WidgetType = WidgetType = {}));
// Dashboard Configurations
exports.DashboardConfigs = {
    LOCAL: {
        refreshInterval: 5000,
        realTimeUpdates: true,
        maxWidgets: 20,
        defaultLayout: "default",
        permissions: {
            canCreateWidgets: true,
            canEditLayout: true,
            canShareDashboards: true,
            canExportData: true,
            canManageUsers: true,
        },
        customization: {
            theme: "auto",
            language: "en",
            timezone: "UTC",
            dateFormat: "YYYY-MM-DD HH:mm:ss",
            numberFormat: "en-US",
        },
    },
    STAGING: {
        refreshInterval: 10000,
        realTimeUpdates: true,
        maxWidgets: 15,
        defaultLayout: "default",
        permissions: {
            canCreateWidgets: true,
            canEditLayout: true,
            canShareDashboards: true,
            canExportData: true,
            canManageUsers: false,
        },
        customization: {
            theme: "auto",
            language: "en",
            timezone: "UTC",
            dateFormat: "YYYY-MM-DD HH:mm:ss",
            numberFormat: "en-US",
        },
    },
    PRODUCTION: {
        refreshInterval: 15000,
        realTimeUpdates: true,
        maxWidgets: 12,
        defaultLayout: "default",
        permissions: {
            canCreateWidgets: false,
            canEditLayout: false,
            canShareDashboards: true,
            canExportData: true,
            canManageUsers: false,
        },
        customization: {
            theme: "auto",
            language: "en",
            timezone: "UTC",
            dateFormat: "YYYY-MM-DD HH:mm:ss",
            numberFormat: "en-US",
        },
    },
};
// Dashboard Manager
class DashboardManager {
    constructor(config, tracing) {
        this.logger = (0, logger_1.createLogger)("dashboard-manager");
        this.layouts = [];
        this.dataCache = new Map();
        this.websocketConnections = new Map();
        this.config = config;
        this.tracing = tracing;
        this.initializeDefaultLayouts();
    }
    initializeDefaultLayouts() {
        // Default dashboard layout
        const defaultLayout = {
            id: "default",
            name: "Default Dashboard",
            description: "Default admin dashboard layout",
            isDefault: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            widgets: [
                {
                    id: "system-overview",
                    type: WidgetType.STATUS_OVERVIEW,
                    title: "System Overview",
                    position: { x: 0, y: 0, width: 6, height: 4 },
                    size: { minWidth: 4, minHeight: 3 },
                    config: {
                        timeRange: "24h",
                        displayOptions: {
                            showLegend: true,
                            showGrid: true,
                            animate: true,
                            colorScheme: "default",
                        },
                    },
                    dataSource: {
                        type: "api",
                        endpoint: "/api/admin/dashboard/system-overview",
                    },
                    refreshInterval: 30000,
                    isVisible: true,
                    permissions: ["admin"],
                },
                {
                    id: "incident-summary",
                    type: WidgetType.INCIDENT_LIST,
                    title: "Recent Incidents",
                    position: { x: 6, y: 0, width: 6, height: 4 },
                    size: { minWidth: 4, minHeight: 3 },
                    config: {
                        displayOptions: {
                            showLegend: false,
                            showGrid: false,
                            animate: false,
                            colorScheme: "default",
                        },
                    },
                    dataSource: {
                        type: "api",
                        endpoint: "/api/admin/dashboard/incidents",
                    },
                    refreshInterval: 60000,
                    isVisible: true,
                    permissions: ["admin"],
                },
                {
                    id: "performance-metrics",
                    type: WidgetType.PERFORMANCE_METRICS,
                    title: "Performance Metrics",
                    position: { x: 0, y: 4, width: 12, height: 4 },
                    size: { minWidth: 8, minHeight: 3 },
                    config: {
                        chartType: "line",
                        timeRange: "24h",
                        metrics: ["response_time", "error_rate", "throughput"],
                        thresholds: [
                            {
                                metric: "response_time",
                                warning: 1000,
                                critical: 2000,
                                color: "#ff9800",
                            },
                            {
                                metric: "error_rate",
                                warning: 5,
                                critical: 10,
                                color: "#f44336",
                            },
                        ],
                        displayOptions: {
                            showLegend: true,
                            showGrid: true,
                            animate: true,
                            colorScheme: "default",
                        },
                    },
                    dataSource: {
                        type: "api",
                        endpoint: "/api/admin/dashboard/performance",
                    },
                    refreshInterval: 30000,
                    isVisible: true,
                    permissions: ["admin"],
                },
            ],
        };
        this.layouts.push(defaultLayout);
    }
    async getDashboardData(layoutId = "default") {
        const layout = this.layouts.find((l) => l.id === layoutId);
        if (!layout) {
            throw new Error(`Dashboard layout not found: ${layoutId}`);
        }
        const widgets = await Promise.all(layout.widgets.map((widget) => this.getWidgetData(widget)));
        const summary = await this.generateDashboardSummary();
        return {
            widgets,
            summary,
            lastUpdated: new Date(),
        };
    }
    async getWidgetData(widget) {
        try {
            const data = await this.fetchWidgetData(widget);
            const widgetData = {
                widgetId: widget.id,
                data,
                status: "success",
                lastUpdated: new Date(),
            };
            this.dataCache.set(widget.id, widgetData);
            return widgetData;
        }
        catch (error) {
            this.logger.error(`Failed to fetch data for widget ${widget.id}:`, error);
            return {
                widgetId: widget.id,
                data: null,
                status: "error",
                error: error instanceof Error ? error.message : "Unknown error",
                lastUpdated: new Date(),
            };
        }
    }
    async fetchWidgetData(widget) {
        switch (widget.type) {
            case WidgetType.STATUS_OVERVIEW:
                return await this.fetchSystemOverview();
            case WidgetType.INCIDENT_LIST:
                return await this.fetchIncidentList();
            case WidgetType.PERFORMANCE_METRICS:
                return await this.fetchPerformanceMetrics();
            case WidgetType.USER_ACTIVITY:
                return await this.fetchUserActivity();
            case WidgetType.SYSTEM_HEALTH:
                return await this.fetchSystemHealth();
            case WidgetType.BILLING_OVERVIEW:
                return await this.fetchBillingOverview();
            case WidgetType.ALERT_SUMMARY:
                return await this.fetchAlertSummary();
            default:
                throw new Error(`Unknown widget type: ${widget.type}`);
        }
    }
    async fetchSystemOverview() {
        // Simulated system overview data
        return {
            totalServices: 150,
            activeServices: 142,
            uptime: 99.8,
            lastIncident: "2024-01-15T10:30:00Z",
            systemStatus: "healthy",
        };
    }
    async fetchIncidentList() {
        // Simulated incident data
        return {
            incidents: [
                {
                    id: "inc-001",
                    title: "Database connection timeout",
                    status: "resolved",
                    severity: "medium",
                    createdAt: "2024-01-15T08:00:00Z",
                    resolvedAt: "2024-01-15T09:30:00Z",
                },
                {
                    id: "inc-002",
                    title: "High CPU usage on server-01",
                    status: "investigating",
                    severity: "low",
                    createdAt: "2024-01-15T10:00:00Z",
                },
            ],
            total: 2,
            active: 1,
        };
    }
    async fetchPerformanceMetrics() {
        // Simulated performance metrics
        return {
            responseTime: {
                current: 850,
                average: 750,
                trend: "stable",
            },
            errorRate: {
                current: 2.1,
                average: 1.8,
                trend: "increasing",
            },
            throughput: {
                current: 1250,
                average: 1200,
                trend: "stable",
            },
        };
    }
    async fetchUserActivity() {
        // Simulated user activity data
        return {
            activeUsers: 45,
            totalUsers: 120,
            newUsers: 3,
            userSessions: 89,
        };
    }
    async fetchSystemHealth() {
        // Simulated system health data
        return {
            cpu: 65,
            memory: 78,
            disk: 45,
            network: 30,
            overall: "healthy",
        };
    }
    async fetchBillingOverview() {
        // Simulated billing data
        return {
            monthlyRevenue: 12500,
            activeSubscriptions: 89,
            churnRate: 2.1,
            averageRevenuePerUser: 140,
        };
    }
    async fetchAlertSummary() {
        // Simulated alert data
        return {
            totalAlerts: 12,
            critical: 1,
            warning: 3,
            info: 8,
            resolved: 10,
        };
    }
    async generateDashboardSummary() {
        const systemOverview = await this.fetchSystemOverview();
        const incidentList = await this.fetchIncidentList();
        const userActivity = await this.fetchUserActivity();
        return {
            totalServices: systemOverview.totalServices,
            activeServices: systemOverview.activeServices,
            incidents: incidentList.total,
            activeIncidents: incidentList.active,
            users: userActivity.totalUsers,
            activeUsers: userActivity.activeUsers,
            systemHealth: systemOverview.systemStatus,
            uptime: systemOverview.uptime,
        };
    }
    async createCustomLayout(layout) {
        const newLayout = {
            ...layout,
            id: `layout-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.layouts.push(newLayout);
        this.logger.info(`Created custom dashboard layout: ${newLayout.id}`);
        return newLayout;
    }
    async updateWidgetData(widgetId, data) {
        const widgetData = {
            widgetId,
            data,
            status: "success",
            lastUpdated: new Date(),
        };
        this.dataCache.set(widgetId, widgetData);
    }
    startRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.updateInterval = setInterval(async () => {
            try {
                await this.refreshAllWidgets();
            }
            catch (error) {
                this.logger.error("Failed to refresh widgets:", error);
            }
        }, this.config.refreshInterval);
    }
    async refreshAllWidgets() {
        const defaultLayout = this.layouts.find((l) => l.isDefault);
        if (!defaultLayout)
            return;
        for (const widget of defaultLayout.widgets) {
            try {
                await this.getWidgetData(widget);
            }
            catch (error) {
                this.logger.error(`Failed to refresh widget ${widget.id}:`, error);
            }
        }
    }
    stopRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = undefined;
        }
    }
    async exportDashboardData(layoutId, format) {
        const data = await this.getDashboardData(layoutId);
        switch (format) {
            case "json":
                return JSON.stringify(data, null, 2);
            case "csv":
                return this.convertToCSV(data);
            case "pdf":
                return await this.generatePDF(data);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }
    convertToCSV(data) {
        // Simplified CSV conversion
        const lines = ["Widget ID,Status,Last Updated"];
        for (const widget of data.widgets) {
            lines.push(`${widget.widgetId},${widget.status},${widget.lastUpdated.toISOString()}`);
        }
        return lines.join("\n");
    }
    async generatePDF(data) {
        // Simulated PDF generation
        return `PDF report generated at ${new Date().toISOString()}`;
    }
    getCachedData(widgetId) {
        return this.dataCache.get(widgetId);
    }
    clearCache() {
        this.dataCache.clear();
    }
    destroy() {
        this.stopRealTimeUpdates();
        this.clearCache();
        this.websocketConnections.forEach((ws) => ws.close());
        this.websocketConnections.clear();
    }
}
exports.DashboardManager = DashboardManager;
//# sourceMappingURL=dashboard-admin.js.map