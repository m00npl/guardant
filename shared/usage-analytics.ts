/**
 * GuardAnt Usage Analytics System
 * Comprehensive tracking and analysis of system usage patterns, performance metrics,
 * and business intelligence for multi-tenant monitoring platform
 */

import { EventEmitter } from 'events';
import { createLogger } from './logger';
import { GuardAntTracing } from './tracing';
import { AlertError, ErrorCategory, ErrorSeverity } from './error-handling';
import { createGolemAdapter, DataType, GolemAdapter, GolemUtils } from './golem-adapter';

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

export enum EventType {
  PAGE_VIEW = 'page_view',
  API_CALL = 'api_call',
  USER_ACTION = 'user_action',
  SYSTEM_EVENT = 'system_event',
  ERROR_EVENT = 'error_event',
  PERFORMANCE_EVENT = 'performance_event'
}

export enum EventCategory {
  AUTHENTICATION = 'authentication',
  SERVICE_MANAGEMENT = 'service_management',
  MONITORING = 'monitoring',
  ALERTS = 'alerts',
  BILLING = 'billing',
  ADMIN = 'admin',
  INTEGRATION = 'integration',
  WIDGET = 'widget',
  STATUS_PAGE = 'status_page'
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
    duration: number; // in milliseconds
  };
  
  // Basic metrics
  totalEvents: number;
  uniqueUsers: number;
  sessions: number;
  
  // Feature usage
  featuresUsed: Array<{
    feature: string;
    usageCount: number;
    uniqueUsers: number;
  }>;
  
  // API metrics
  apiCalls: {
    total: number;
    byEndpoint: Record<string, number>;
    byMethod: Record<string, number>;
    errorRate: number;
    avgResponseTime: number;
  };
  
  // Service metrics
  services: {
    total: number;
    active: number;
    checksPerformed: number;
    avgCheckInterval: number;
  };
  
  // Performance metrics
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
  
  // User behavior
  userBehavior: {
    topPages: Array<{ page: string; views: number }>;
    topActions: Array<{ action: string; count: number }>;
    avgSessionDuration: number;
    bounceRate: number;
  };
  
  // Geographic distribution
  geography: Array<{
    country: string;
    users: number;
    sessions: number;
    events: number;
  }>;
  
  // Device/browser analytics
  technology: {
    browsers: Record<string, number>;
    devices: Record<string, number>;
    operatingSystems: Record<string, number>;
  };
}

export interface AnalyticsConfiguration {
  enabled: boolean;
  samplingRate: number; // 0-1, percentage of events to capture
  retentionDays: number;
  realTimeEnabled: boolean;
  
  // Privacy settings
  anonymizeIPs: boolean;
  respectDoNotTrack: boolean;
  cookieConsent: boolean;
  
  // Storage settings
  batchSize: number;
  flushInterval: number; // in milliseconds
  maxQueueSize: number;
  
  // Feature flags
  features: {
    heatmaps: boolean;
    userRecordings: boolean;
    funnelAnalysis: boolean;
    cohortAnalysis: boolean;
    abtesting: boolean;
  };
}

export class UsageAnalyticsManager extends EventEmitter {
  private logger;
  private tracing?: GuardAntTracing;
  private eventQueue: UsageEvent[] = [];
  private flushTimer?: NodeJS.Timer;
  private sessionStore = new Map<string, SessionData>();
  private golemAdapter: GolemAdapter;
  
  constructor(
    private serviceName: string,
    private config: AnalyticsConfiguration,
    golemAdapter?: GolemAdapter,
    tracing?: GuardAntTracing
  ) {
    super();
    this.logger = createLogger(`${serviceName}-analytics`);
    this.tracing = tracing;
    
    // Initialize Golem adapter
    this.golemAdapter = golemAdapter || createGolemAdapter(
      serviceName,
      GolemUtils.createDefaultConfig(),
      undefined,
      tracing
    );
    
    if (config.enabled) {
      this.startFlushTimer();
      this.setupEventListeners();
    }
  }

  // Track usage event
  async trackEvent(event: Omit<UsageEvent, 'id' | 'timestamp'>): Promise<void> {
    if (!this.config.enabled) return;
    
    // Sampling
    if (Math.random() > this.config.samplingRate) return;
    
    // Privacy checks
    if (this.config.respectDoNotTrack && this.getDoNotTrackStatus()) return;
    
    const span = this.tracing?.startSpan('analytics.track_event');
    
    try {
      const fullEvent: UsageEvent = {
        ...event,
        id: this.generateEventId(),
        timestamp: new Date().toISOString()
      };
      
      // Anonymize sensitive data if required
      if (this.config.anonymizeIPs && fullEvent.ipAddress) {
        fullEvent.ipAddress = this.anonymizeIP(fullEvent.ipAddress);
      }
      
      // Add to queue
      this.eventQueue.push(fullEvent);
      
      // Flush if queue is full
      if (this.eventQueue.length >= this.config.batchSize) {
        await this.flushEvents();
      }
      
      // Update session data
      if (fullEvent.sessionId) {
        this.updateSession(fullEvent);
      }
      
      // Emit real-time event if enabled
      if (this.config.realTimeEnabled) {
        this.emit('event', fullEvent);
      }
      
      span?.setTag('event.type', fullEvent.eventType);
      span?.setTag('event.category', fullEvent.category);
      
    } catch (error) {
      this.logger.error('Failed to track event', { error, event });
      span?.setTag('error', true);
      span?.log({ error: error.message });
      
      throw new AlertError(
        'Analytics tracking failed',
        ErrorCategory.SYSTEM_ERROR,
        ErrorSeverity.LOW,
        { originalError: error, event }
      );
    } finally {
      span?.finish();
    }
  }

  // Track page view
  async trackPageView(
    nestId: string,
    page: string,
    userId?: string,
    sessionId?: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.trackEvent({
      nestId,
      userId,
      sessionId,
      eventType: EventType.PAGE_VIEW,
      category: EventCategory.STATUS_PAGE,
      action: 'view',
      resource: page,
      metadata: {
        ...metadata,
        url: page,
        referrer: metadata.referrer,
        userAgent: metadata.userAgent
      }
    });
  }

  // Track API call
  async trackApiCall(
    nestId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.trackEvent({
      nestId,
      userId,
      eventType: EventType.API_CALL,
      category: EventCategory.MONITORING,
      action: method.toLowerCase(),
      resource: endpoint,
      metadata: {
        ...metadata,
        method,
        statusCode,
        responseTime,
        success: statusCode >= 200 && statusCode < 400
      }
    });
  }

  // Track user action
  async trackUserAction(
    nestId: string,
    action: string,
    resource: string,
    userId?: string,
    sessionId?: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.trackEvent({
      nestId,
      userId,
      sessionId,
      eventType: EventType.USER_ACTION,
      category: this.getCategoryFromAction(action),
      action,
      resource,
      metadata
    });
  }

  // Track error event
  async trackError(
    nestId: string,
    error: Error,
    context: string,
    userId?: string,
    sessionId?: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.trackEvent({
      nestId,
      userId,
      sessionId,
      eventType: EventType.ERROR_EVENT,
      category: EventCategory.SYSTEM_EVENT,
      action: 'error',
      resource: context,
      metadata: {
        ...metadata,
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        severity: this.getErrorSeverity(error)
      }
    });
  }

  // Track performance event
  async trackPerformance(
    nestId: string,
    metric: string,
    value: number,
    unit: string,
    context: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.trackEvent({
      nestId,
      eventType: EventType.PERFORMANCE_EVENT,
      category: EventCategory.SYSTEM_EVENT,
      action: 'performance',
      resource: context,
      metadata: {
        ...metadata,
        metric,
        value,
        unit,
        timestamp: Date.now()
      }
    });
  }

  // Get usage metrics for a nest
  async getUsageMetrics(
    nestId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UsageMetrics> {
    const span = this.tracing?.startSpan('analytics.get_usage_metrics');
    
    try {
      // This would typically query your analytics database
      // For now, we'll return a structured response
      const metrics: UsageMetrics = {
        nestId,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          duration: endDate.getTime() - startDate.getTime()
        },
        totalEvents: 0,
        uniqueUsers: 0,
        sessions: 0,
        featuresUsed: [],
        apiCalls: {
          total: 0,
          byEndpoint: {},
          byMethod: {},
          errorRate: 0,
          avgResponseTime: 0
        },
        services: {
          total: 0,
          active: 0,
          checksPerformed: 0,
          avgCheckInterval: 0
        },
        performance: {
          pageLoadTime: { avg: 0, p50: 0, p95: 0, p99: 0 },
          apiResponseTime: { avg: 0, p50: 0, p95: 0, p99: 0 }
        },
        userBehavior: {
          topPages: [],
          topActions: [],
          avgSessionDuration: 0,
          bounceRate: 0
        },
        geography: [],
        technology: {
          browsers: {},
          devices: {},
          operatingSystems: {}
        }
      };
      
      // Here you would implement the actual data aggregation logic
      return metrics;
      
    } catch (error) {
      this.logger.error('Failed to get usage metrics', { error, nestId });
      span?.setTag('error', true);
      throw error;
    } finally {
      span?.finish();
    }
  }

  // Get real-time analytics
  async getRealTimeAnalytics(nestId: string): Promise<any> {
    // Implementation for real-time analytics
    return {
      activeUsers: 0,
      currentSessions: 0,
      eventsLastHour: 0,
      topPages: [],
      recentEvents: []
    };
  }

  // Flush events to Golem Base storage
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    try {
      // Group events by nest for batch storage
      const eventsByNest = new Map<string, UsageEvent[]>();
      for (const event of events) {
        if (!eventsByNest.has(event.nestId)) {
          eventsByNest.set(event.nestId, []);
        }
        eventsByNest.get(event.nestId)!.push(event);
      }

      // Store events in Golem Base
      const storeOperations = [];
      for (const [nestId, nestEvents] of eventsByNest) {
        for (const event of nestEvents) {
          storeOperations.push({
            nestId,
            dataType: DataType.ANALYTICS_DATA,
            data: event,
            key: `event:${event.id}`,
            metadata: {
              eventType: event.eventType,
              category: event.category,
              timestamp: event.timestamp
            }
          });
        }
      }

      // Batch store all events
      const results = await this.golemAdapter.batchStoreNestData(storeOperations);
      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;

      this.logger.debug('Flushed events to Golem Base', {
        total: events.length,
        successful,
        failed,
        nests: eventsByNest.size
      });

      // Emit flush event
      this.emit('events-flushed', { 
        count: events.length, 
        successful, 
        failed,
        events 
      });
      
    } catch (error) {
      this.logger.error('Failed to flush events to Golem Base', { error, count: events.length });
      
      // Re-queue events if flush failed (with limit to prevent memory issues)
      if (this.eventQueue.length < this.config.maxQueueSize) {
        this.eventQueue.unshift(...events.slice(0, this.config.maxQueueSize - this.eventQueue.length));
      }
      
      throw error;
    }
  }

  // Start flush timer
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents().catch(error => {
        this.logger.error('Scheduled flush failed', { error });
      });
    }, this.config.flushInterval);
  }

  // Update session data
  private updateSession(event: UsageEvent): void {
    if (!event.sessionId) return;
    
    const session = this.sessionStore.get(event.sessionId) || {
      id: event.sessionId,
      nestId: event.nestId,
      userId: event.userId,
      startTime: event.timestamp,
      lastActivity: event.timestamp,
      events: 0,
      pages: new Set(),
      actions: new Set()
    };
    
    session.lastActivity = event.timestamp;
    session.events++;
    
    if (event.eventType === EventType.PAGE_VIEW && event.resource) {
      session.pages.add(event.resource);
    }
    
    if (event.eventType === EventType.USER_ACTION) {
      session.actions.add(event.action);
    }
    
    this.sessionStore.set(event.sessionId, session);
  }

  // Helper methods
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private anonymizeIP(ip: string): string {
    // Simple IP anonymization - replace last octet with 0
    return ip.replace(/\.\d+$/, '.0');
  }

  private getDoNotTrackStatus(): boolean {
    return false; // Server-side - would check request headers
  }

  private getCategoryFromAction(action: string): EventCategory {
    const actionCategoryMap: Record<string, EventCategory> = {
      'login': EventCategory.AUTHENTICATION,
      'logout': EventCategory.AUTHENTICATION,
      'create_service': EventCategory.SERVICE_MANAGEMENT,
      'update_service': EventCategory.SERVICE_MANAGEMENT,
      'delete_service': EventCategory.SERVICE_MANAGEMENT,
      'view_alerts': EventCategory.ALERTS,
      'acknowledge_alert': EventCategory.ALERTS,
      'embed_widget': EventCategory.WIDGET,
      'view_status': EventCategory.STATUS_PAGE
    };
    
    return actionCategoryMap[action] || EventCategory.SYSTEM_EVENT;
  }

  private getErrorSeverity(error: Error): string {
    if (error.name === 'ValidationError') return 'low';
    if (error.name === 'AuthenticationError') return 'medium';
    if (error.name === 'SystemError') return 'high';
    return 'medium';
  }

  private setupEventListeners(): void {
    // Set up process event listeners for cleanup
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  // Shutdown and cleanup
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down analytics manager');
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Flush remaining events
    await this.flushEvents();
    
    this.emit('shutdown');
  }

  // Health check
  getHealthStatus(): { healthy: boolean; details: any } {
    return {
      healthy: true,
      details: {
        queueSize: this.eventQueue.length,
        activeSessions: this.sessionStore.size,
        configEnabled: this.config.enabled,
        samplingRate: this.config.samplingRate
      }
    };
  }
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

// Factory function
export function createUsageAnalyticsManager(
  serviceName: string,
  config: AnalyticsConfiguration,
  golemAdapter?: GolemAdapter,
  tracing?: GuardAntTracing
): UsageAnalyticsManager {
  return new UsageAnalyticsManager(serviceName, config, golemAdapter, tracing);
}

// Utility functions for common analytics operations
export class AnalyticsUtils {
  static calculateBounceRate(sessions: SessionData[]): number {
    if (sessions.length === 0) return 0;
    const bounced = sessions.filter(s => s.pages.size === 1).length;
    return (bounced / sessions.length) * 100;
  }

  static calculateAverageSessionDuration(sessions: SessionData[]): number {
    if (sessions.length === 0) return 0;
    
    const totalDuration = sessions.reduce((sum, session) => {
      const start = new Date(session.startTime).getTime();
      const end = new Date(session.lastActivity).getTime();
      return sum + (end - start);
    }, 0);
    
    return totalDuration / sessions.length;
  }

  static getTopItems<T>(items: Record<string, T>, limit = 10): Array<{ item: string; value: T }> {
    return Object.entries(items)
      .sort(([, a], [, b]) => Number(b) - Number(a))
      .slice(0, limit)
      .map(([item, value]) => ({ item, value }));
  }

  static calculatePercentiles(values: number[], percentiles: number[]): Record<string, number> {
    if (values.length === 0) return {};
    
    const sorted = values.sort((a, b) => a - b);
    const result: Record<string, number> = {};
    
    percentiles.forEach(p => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      result[`p${p}`] = sorted[Math.max(0, index)];
    });
    
    return result;
  }
}