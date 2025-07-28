import { createLogger } from "./logger";
import { GuardAntTracing } from "./tracing";

// Dashboard Widget Types
export enum WidgetType {
  METRICS_CHART = "metrics_chart",
  STATUS_OVERVIEW = "status_overview",
  INCIDENT_LIST = "incident_list",
  USER_ACTIVITY = "user_activity",
  SYSTEM_HEALTH = "system_health",
  BILLING_OVERVIEW = "billing_overview",
  ALERT_SUMMARY = "alert_summary",
  PERFORMANCE_METRICS = "performance_metrics",
}

// Dashboard Layout
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
  refreshInterval: number; // milliseconds
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

// Dashboard Data Types
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

// Dashboard Configuration
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

// Dashboard Configurations
export const DashboardConfigs = {
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
export class DashboardManager {
  private logger = createLogger("dashboard-manager");
  private tracing?: GuardAntTracing;
  private config: DashboardConfig;
  private layouts: DashboardLayout[] = [];
  private dataCache: Map<string, WidgetData> = new Map();
  private updateInterval?: NodeJS.Timeout;
  private websocketConnections: Map<string, WebSocket> = new Map();

  constructor(config: DashboardConfig, tracing?: GuardAntTracing) {
    this.config = config;
    this.tracing = tracing;
    this.initializeDefaultLayouts();
  }

  private initializeDefaultLayouts(): void {
    // Default dashboard layout
    const defaultLayout: DashboardLayout = {
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

  async getDashboardData(layoutId: string = "default"): Promise<DashboardData> {
    const layout = this.layouts.find((l) => l.id === layoutId);
    if (!layout) {
      throw new Error(`Dashboard layout not found: ${layoutId}`);
    }

    const widgets = await Promise.all(
      layout.widgets.map((widget) => this.getWidgetData(widget))
    );

    const summary = await this.generateDashboardSummary();

    return {
      widgets,
      summary,
      lastUpdated: new Date(),
    };
  }

  private async getWidgetData(widget: DashboardWidget): Promise<WidgetData> {
    try {
      const data = await this.fetchWidgetData(widget);
      const widgetData: WidgetData = {
        widgetId: widget.id,
        data,
        status: "success",
        lastUpdated: new Date(),
      };

      this.dataCache.set(widget.id, widgetData);
      return widgetData;
    } catch (error) {
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

  private async fetchWidgetData(widget: DashboardWidget): Promise<any> {
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

  private async fetchSystemOverview(): Promise<any> {
    // Simulated system overview data
    return {
      totalServices: 150,
      activeServices: 142,
      uptime: 99.8,
      lastIncident: "2024-01-15T10:30:00Z",
      systemStatus: "healthy",
    };
  }

  private async fetchIncidentList(): Promise<any> {
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

  private async fetchPerformanceMetrics(): Promise<any> {
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

  private async fetchUserActivity(): Promise<any> {
    // Simulated user activity data
    return {
      activeUsers: 45,
      totalUsers: 120,
      newUsers: 3,
      userSessions: 89,
    };
  }

  private async fetchSystemHealth(): Promise<any> {
    // Simulated system health data
    return {
      cpu: 65,
      memory: 78,
      disk: 45,
      network: 30,
      overall: "healthy",
    };
  }

  private async fetchBillingOverview(): Promise<any> {
    // Simulated billing data
    return {
      monthlyRevenue: 12500,
      activeSubscriptions: 89,
      churnRate: 2.1,
      averageRevenuePerUser: 140,
    };
  }

  private async fetchAlertSummary(): Promise<any> {
    // Simulated alert data
    return {
      totalAlerts: 12,
      critical: 1,
      warning: 3,
      info: 8,
      resolved: 10,
    };
  }

  private async generateDashboardSummary(): Promise<DashboardSummary> {
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
      systemHealth: systemOverview.systemStatus as
        | "healthy"
        | "warning"
        | "critical",
      uptime: systemOverview.uptime,
    };
  }

  async createCustomLayout(
    layout: Omit<DashboardLayout, "id" | "createdAt" | "updatedAt">
  ): Promise<DashboardLayout> {
    const newLayout: DashboardLayout = {
      ...layout,
      id: `layout-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.layouts.push(newLayout);
    this.logger.info(`Created custom dashboard layout: ${newLayout.id}`);
    return newLayout;
  }

  async updateWidgetData(widgetId: string, data: any): Promise<void> {
    const widgetData: WidgetData = {
      widgetId,
      data,
      status: "success",
      lastUpdated: new Date(),
    };

    this.dataCache.set(widgetId, widgetData);
  }

  startRealTimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      try {
        await this.refreshAllWidgets();
      } catch (error) {
        this.logger.error("Failed to refresh widgets:", error);
      }
    }, this.config.refreshInterval);
  }

  private async refreshAllWidgets(): Promise<void> {
    const defaultLayout = this.layouts.find((l) => l.isDefault);
    if (!defaultLayout) return;

    for (const widget of defaultLayout.widgets) {
      try {
        await this.getWidgetData(widget);
      } catch (error) {
        this.logger.error(`Failed to refresh widget ${widget.id}:`, error);
      }
    }
  }

  stopRealTimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }

  async exportDashboardData(
    layoutId: string,
    format: "json" | "csv" | "pdf"
  ): Promise<string> {
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

  private convertToCSV(data: DashboardData): string {
    // Simplified CSV conversion
    const lines = ["Widget ID,Status,Last Updated"];
    for (const widget of data.widgets) {
      lines.push(
        `${widget.widgetId},${widget.status},${widget.lastUpdated.toISOString()}`
      );
    }
    return lines.join("\n");
  }

  private async generatePDF(data: DashboardData): Promise<string> {
    // Simulated PDF generation
    return `PDF report generated at ${new Date().toISOString()}`;
  }

  getCachedData(widgetId: string): WidgetData | undefined {
    return this.dataCache.get(widgetId);
  }

  clearCache(): void {
    this.dataCache.clear();
  }

  destroy(): void {
    this.stopRealTimeUpdates();
    this.clearCache();
    this.websocketConnections.forEach((ws) => ws.close());
    this.websocketConnections.clear();
  }
}
