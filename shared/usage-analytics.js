"use strict";
/**
 * GuardAnt Usage Analytics System
 * Comprehensive tracking and analysis of system usage patterns, performance metrics,
 * and business intelligence for multi-tenant monitoring platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsUtils = exports.UsageAnalyticsManager = exports.EventCategory = exports.EventType = void 0;
exports.createUsageAnalyticsManager = createUsageAnalyticsManager;
const events_1 = require("events");
const logger_1 = require("./logger");
const error_handling_1 = require("./error-handling");
const golem_adapter_1 = require("./golem-adapter");
var EventType;
(function (EventType) {
    EventType["PAGE_VIEW"] = "page_view";
    EventType["API_CALL"] = "api_call";
    EventType["USER_ACTION"] = "user_action";
    EventType["SYSTEM_EVENT"] = "system_event";
    EventType["ERROR_EVENT"] = "error_event";
    EventType["PERFORMANCE_EVENT"] = "performance_event";
})(EventType || (exports.EventType = EventType = {}));
var EventCategory;
(function (EventCategory) {
    EventCategory["AUTHENTICATION"] = "authentication";
    EventCategory["SERVICE_MANAGEMENT"] = "service_management";
    EventCategory["MONITORING"] = "monitoring";
    EventCategory["ALERTS"] = "alerts";
    EventCategory["BILLING"] = "billing";
    EventCategory["ADMIN"] = "admin";
    EventCategory["INTEGRATION"] = "integration";
    EventCategory["WIDGET"] = "widget";
    EventCategory["STATUS_PAGE"] = "status_page";
})(EventCategory || (exports.EventCategory = EventCategory = {}));
class UsageAnalyticsManager extends events_1.EventEmitter {
    constructor(serviceName, config, golemAdapter, tracing) {
        super();
        this.serviceName = serviceName;
        this.config = config;
        this.eventQueue = [];
        this.sessionStore = new Map();
        this.logger = (0, logger_1.createLogger)(`${serviceName}-analytics`);
        this.tracing = tracing;
        // Initialize Golem adapter
        this.golemAdapter = golemAdapter || (0, golem_adapter_1.createGolemAdapter)(serviceName, golem_adapter_1.GolemUtils.createDefaultConfig(), undefined, tracing);
        if (config.enabled) {
            this.startFlushTimer();
            this.setupEventListeners();
        }
    }
    // Track usage event
    async trackEvent(event) {
        if (!this.config.enabled)
            return;
        // Sampling
        if (Math.random() > this.config.samplingRate)
            return;
        // Privacy checks
        if (this.config.respectDoNotTrack && this.getDoNotTrackStatus())
            return;
        const span = this.tracing?.startSpan('analytics.track_event');
        try {
            const fullEvent = {
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
        }
        catch (error) {
            this.logger.error('Failed to track event', { error, event });
            span?.setTag('error', true);
            span?.log({ error: error.message });
            throw new error_handling_1.AlertError('Analytics tracking failed', error_handling_1.ErrorCategory.SYSTEM_ERROR, error_handling_1.ErrorSeverity.LOW, { originalError: error, event });
        }
        finally {
            span?.finish();
        }
    }
    // Track page view
    async trackPageView(nestId, page, userId, sessionId, metadata = {}) {
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
    async trackApiCall(nestId, endpoint, method, statusCode, responseTime, userId, metadata = {}) {
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
    async trackUserAction(nestId, action, resource, userId, sessionId, metadata = {}) {
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
    async trackError(nestId, error, context, userId, sessionId, metadata = {}) {
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
    async trackPerformance(nestId, metric, value, unit, context, metadata = {}) {
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
    async getUsageMetrics(nestId, startDate, endDate) {
        const span = this.tracing?.startSpan('analytics.get_usage_metrics');
        try {
            // This would typically query your analytics database
            // For now, we'll return a structured response
            const metrics = {
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
        }
        catch (error) {
            this.logger.error('Failed to get usage metrics', { error, nestId });
            span?.setTag('error', true);
            throw error;
        }
        finally {
            span?.finish();
        }
    }
    // Get real-time analytics
    async getRealTimeAnalytics(nestId) {
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
    async flushEvents() {
        if (this.eventQueue.length === 0)
            return;
        const events = [...this.eventQueue];
        this.eventQueue = [];
        try {
            // Group events by nest for batch storage
            const eventsByNest = new Map();
            for (const event of events) {
                if (!eventsByNest.has(event.nestId)) {
                    eventsByNest.set(event.nestId, []);
                }
                eventsByNest.get(event.nestId).push(event);
            }
            // Store events in Golem Base
            const storeOperations = [];
            for (const [nestId, nestEvents] of eventsByNest) {
                for (const event of nestEvents) {
                    storeOperations.push({
                        nestId,
                        dataType: golem_adapter_1.DataType.ANALYTICS_DATA,
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
        }
        catch (error) {
            this.logger.error('Failed to flush events to Golem Base', { error, count: events.length });
            // Re-queue events if flush failed (with limit to prevent memory issues)
            if (this.eventQueue.length < this.config.maxQueueSize) {
                this.eventQueue.unshift(...events.slice(0, this.config.maxQueueSize - this.eventQueue.length));
            }
            throw error;
        }
    }
    // Start flush timer
    startFlushTimer() {
        this.flushTimer = setInterval(() => {
            this.flushEvents().catch(error => {
                this.logger.error('Scheduled flush failed', { error });
            });
        }, this.config.flushInterval);
    }
    // Update session data
    updateSession(event) {
        if (!event.sessionId)
            return;
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
    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }
    anonymizeIP(ip) {
        // Simple IP anonymization - replace last octet with 0
        return ip.replace(/\.\d+$/, '.0');
    }
    getDoNotTrackStatus() {
        return false; // Server-side - would check request headers
    }
    getCategoryFromAction(action) {
        const actionCategoryMap = {
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
    getErrorSeverity(error) {
        if (error.name === 'ValidationError')
            return 'low';
        if (error.name === 'AuthenticationError')
            return 'medium';
        if (error.name === 'SystemError')
            return 'high';
        return 'medium';
    }
    setupEventListeners() {
        // Set up process event listeners for cleanup
        process.on('SIGTERM', () => this.shutdown());
        process.on('SIGINT', () => this.shutdown());
    }
    // Shutdown and cleanup
    async shutdown() {
        this.logger.info('Shutting down analytics manager');
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        // Flush remaining events
        await this.flushEvents();
        this.emit('shutdown');
    }
    // Health check
    getHealthStatus() {
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
exports.UsageAnalyticsManager = UsageAnalyticsManager;
// Factory function
function createUsageAnalyticsManager(serviceName, config, golemAdapter, tracing) {
    return new UsageAnalyticsManager(serviceName, config, golemAdapter, tracing);
}
// Utility functions for common analytics operations
class AnalyticsUtils {
    static calculateBounceRate(sessions) {
        if (sessions.length === 0)
            return 0;
        const bounced = sessions.filter(s => s.pages.size === 1).length;
        return (bounced / sessions.length) * 100;
    }
    static calculateAverageSessionDuration(sessions) {
        if (sessions.length === 0)
            return 0;
        const totalDuration = sessions.reduce((sum, session) => {
            const start = new Date(session.startTime).getTime();
            const end = new Date(session.lastActivity).getTime();
            return sum + (end - start);
        }, 0);
        return totalDuration / sessions.length;
    }
    static getTopItems(items, limit = 10) {
        return Object.entries(items)
            .sort(([, a], [, b]) => Number(b) - Number(a))
            .slice(0, limit)
            .map(([item, value]) => ({ item, value }));
    }
    static calculatePercentiles(values, percentiles) {
        if (values.length === 0)
            return {};
        const sorted = values.sort((a, b) => a - b);
        const result = {};
        percentiles.forEach(p => {
            const index = Math.ceil((p / 100) * sorted.length) - 1;
            result[`p${p}`] = sorted[Math.max(0, index)];
        });
        return result;
    }
}
exports.AnalyticsUtils = AnalyticsUtils;
//# sourceMappingURL=usage-analytics.js.map