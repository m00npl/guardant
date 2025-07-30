/**
 * GuardAnt Usage Analytics System
 * Comprehensive tracking and analysis of system usage patterns, performance metrics,
 * and business intelligence for multi-tenant monitoring platform
 */
import { EventEmitter } from 'events';
import { GuardAntTracing } from './tracing';
import { GolemAdapter } from './golem-adapter';
export interface UsageEvent {
    id: string;
    timestamp: string;
    nestId: string;
    userId?: string;
    eventType: EventType;
    category: EventCategory;
    action: string;
    resource?: string;
    metadata: Record<string, any>;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
    location?: GeolocationData;
}
export declare enum EventType {
    PAGE_VIEW = "page_view",
    API_CALL = "api_call",
    USER_ACTION = "user_action",
    SYSTEM_EVENT = "system_event",
    ERROR_EVENT = "error_event",
    PERFORMANCE_EVENT = "performance_event"
}
export declare enum EventCategory {
    AUTHENTICATION = "authentication",
    SERVICE_MANAGEMENT = "service_management",
    MONITORING = "monitoring",
    ALERTS = "alerts",
    BILLING = "billing",
    ADMIN = "admin",
    INTEGRATION = "integration",
    WIDGET = "widget",
    STATUS_PAGE = "status_page"
}
export interface GeolocationData {
    country: string;
    region: string;
    city: string;
    timezone: string;
    latitude?: number;
    longitude?: number;
}
export interface UsageMetrics {
    nestId: string;
    period: {
        start: string;
        end: string;
        duration: number;
    };
    totalEvents: number;
    uniqueUsers: number;
    sessions: number;
    featuresUsed: Array<{
        feature: string;
        usageCount: number;
        uniqueUsers: number;
    }>;
    apiCalls: {
        total: number;
        byEndpoint: Record<string, number>;
        byMethod: Record<string, number>;
        errorRate: number;
        avgResponseTime: number;
    };
    services: {
        total: number;
        active: number;
        checksPerformed: number;
        avgCheckInterval: number;
    };
    performance: {
        pageLoadTime: {
            avg: number;
            p50: number;
            p95: number;
            p99: number;
        };
        apiResponseTime: {
            avg: number;
            p50: number;
            p95: number;
            p99: number;
        };
    };
    userBehavior: {
        topPages: Array<{
            page: string;
            views: number;
        }>;
        topActions: Array<{
            action: string;
            count: number;
        }>;
        avgSessionDuration: number;
        bounceRate: number;
    };
    geography: Array<{
        country: string;
        users: number;
        sessions: number;
        events: number;
    }>;
    technology: {
        browsers: Record<string, number>;
        devices: Record<string, number>;
        operatingSystems: Record<string, number>;
    };
}
export interface AnalyticsConfiguration {
    enabled: boolean;
    samplingRate: number;
    retentionDays: number;
    realTimeEnabled: boolean;
    anonymizeIPs: boolean;
    respectDoNotTrack: boolean;
    cookieConsent: boolean;
    batchSize: number;
    flushInterval: number;
    maxQueueSize: number;
    features: {
        heatmaps: boolean;
        userRecordings: boolean;
        funnelAnalysis: boolean;
        cohortAnalysis: boolean;
        abtesting: boolean;
    };
}
export declare class UsageAnalyticsManager extends EventEmitter {
    private serviceName;
    private config;
    private logger;
    private tracing?;
    private eventQueue;
    private flushTimer?;
    private sessionStore;
    private golemAdapter;
    constructor(serviceName: string, config: AnalyticsConfiguration, golemAdapter?: GolemAdapter, tracing?: GuardAntTracing);
    trackEvent(event: Omit<UsageEvent, 'id' | 'timestamp'>): Promise<void>;
    trackPageView(nestId: string, page: string, userId?: string, sessionId?: string, metadata?: Record<string, any>): Promise<void>;
    trackApiCall(nestId: string, endpoint: string, method: string, statusCode: number, responseTime: number, userId?: string, metadata?: Record<string, any>): Promise<void>;
    trackUserAction(nestId: string, action: string, resource: string, userId?: string, sessionId?: string, metadata?: Record<string, any>): Promise<void>;
    trackError(nestId: string, error: Error, context: string, userId?: string, sessionId?: string, metadata?: Record<string, any>): Promise<void>;
    trackPerformance(nestId: string, metric: string, value: number, unit: string, context: string, metadata?: Record<string, any>): Promise<void>;
    getUsageMetrics(nestId: string, startDate: Date, endDate: Date): Promise<UsageMetrics>;
    getRealTimeAnalytics(nestId: string): Promise<any>;
    private flushEvents;
    private startFlushTimer;
    private updateSession;
    private generateEventId;
    private anonymizeIP;
    private getDoNotTrackStatus;
    private getCategoryFromAction;
    private getErrorSeverity;
    private setupEventListeners;
    shutdown(): Promise<void>;
    getHealthStatus(): {
        healthy: boolean;
        details: any;
    };
}
interface SessionData {
    id: string;
    nestId: string;
    userId?: string;
    startTime: string;
    lastActivity: string;
    events: number;
    pages: Set<string>;
    actions: Set<string>;
}
export declare function createUsageAnalyticsManager(serviceName: string, config: AnalyticsConfiguration, golemAdapter?: GolemAdapter, tracing?: GuardAntTracing): UsageAnalyticsManager;
export declare class AnalyticsUtils {
    static calculateBounceRate(sessions: SessionData[]): number;
    static calculateAverageSessionDuration(sessions: SessionData[]): number;
    static getTopItems<T>(items: Record<string, T>, limit?: number): Array<{
        item: string;
        value: T;
    }>;
    static calculatePercentiles(values: number[], percentiles: number[]): Record<string, number>;
}
export {};
//# sourceMappingURL=usage-analytics.d.ts.map