"use strict";
/**
 * GuardAnt System Usage Example
 * Demonstrates how to use the complete GuardAnt multi-tenant monitoring system
 * with Golem Base decentralized storage integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.demonstrateGuardAntSystem = demonstrateGuardAntSystem;
const logger_1 = require("./logger");
const tracing_1 = require("./tracing");
const golem_adapter_1 = require("./golem-adapter");
const usage_analytics_1 = require("./usage-analytics");
const sla_reporting_1 = require("./sla-reporting");
const cost_tracking_1 = require("./cost-tracking");
const failover_system_1 = require("./failover-system");
async function demonstrateGuardAntSystem() {
    const logger = (0, logger_1.createLogger)('guardant-demo');
    logger.info('🚀 Initializing GuardAnt Multi-Tenant Monitoring System');
    // 1. Initialize OpenTelemetry tracing
    const tracing = (0, tracing_1.createGuardAntTracing)('guardant-demo', {
        enabled: true,
        serviceName: 'guardant-demo',
        jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
        environment: 'development'
    });
    // 2. Initialize Golem Base adapter for decentralized storage
    const golemAdapter = (0, golem_adapter_1.createGolemAdapter)('guardant-demo', golem_adapter_1.GolemUtils.createDefaultConfig(), {
        chainId: parseInt(process.env.GOLEM_CHAIN_ID || "600606"),
        httpUrl: process.env.GOLEM_HTTP_URL || "https://kaolin.holesky.golem-base.io/rpc",
        wsUrl: process.env.GOLEM_WS_URL || "wss://kaolin.holesky.golem-base.io/rpc/ws"
    }, tracing);
    // Initialize the Golem adapter
    await golemAdapter.initialize();
    logger.info('✅ Golem Base adapter initialized');
    // 3. Initialize usage analytics system
    const analyticsManager = (0, usage_analytics_1.createUsageAnalyticsManager)('guardant-analytics', {
        enabled: true,
        samplingRate: 1.0, // 100% sampling for demo
        retentionDays: 90,
        realTimeEnabled: true,
        anonymizeIPs: true,
        respectDoNotTrack: true,
        cookieConsent: false, // Server-side tracking
        batchSize: 50,
        flushInterval: 30000, // 30 seconds
        maxQueueSize: 1000,
        features: {
            heatmaps: false,
            userRecordings: false,
            funnelAnalysis: true,
            cohortAnalysis: true,
            abtesting: false
        }
    }, golemAdapter, // Pass shared Golem adapter
    tracing);
    // 4. Initialize SLA reporting system
    const slaManager = (0, sla_reporting_1.createSLAReportingManager)('guardant-sla', {
        enabled: true,
        defaultTargets: {
            uptime: 99.9,
            responseTime: 200,
            errorRate: 0.1,
            availability: 99.95
        },
        calculationFrequency: 5, // 5 minutes
        dataRetentionDays: 365,
        excludeMaintenanceWindows: true,
        automaticReporting: true,
        reportFormats: ['pdf', 'csv', 'json'],
        emailNotifications: true,
        slackIntegration: false,
        currency: 'USD',
        timezone: 'UTC',
        businessHours: {
            start: '09:00',
            end: '17:00',
            days: [1, 2, 3, 4, 5] // Monday to Friday
        },
        alertThresholds: {
            atRisk: 5, // 5% below target
            breachWarning: 15 // 15 minutes before breach
        }
    }, golemAdapter, // Pass shared Golem adapter
    tracing);
    // 5. Initialize cost tracking system
    const costManager = (0, cost_tracking_1.createCostTrackingManager)('guardant-cost', {
        enabled: true,
        currency: 'USD',
        aggregationInterval: 15, // 15 minutes
        retentionDays: 365,
        realTimeUpdates: true,
        defaultPricingModel: 'tiered',
        includeGolemCredits: true,
        regionalizePricing: false,
        enableBillingAlerts: true,
        budgetThresholds: [
            { percentage: 80, alertLevel: 'warning' },
            { percentage: 95, alertLevel: 'critical' }
        ],
        enableOptimizationSuggestions: true,
        analysisFrequency: 24, // 24 hours
        golemNetworkIntegration: true,
        paymentGatewayIntegration: false,
        automaticReporting: true,
        reportingFrequency: 'monthly',
        stakeholders: ['admin@example.com']
    }, golemAdapter, // Pass shared Golem adapter
    tracing);
    // 6. Initialize failover system
    const failoverManager = (0, failover_system_1.createFailoverSystemManager)('guardant-failover', {
        enabled: true,
        healthCheckInterval: 30000, // 30 seconds
        healthCheckTimeout: 5000, // 5 seconds
        healthCheckRetries: 3,
        detectionInterval: 15000, // 15 seconds
        metricsRetentionPeriod: 3600000, // 1 hour
        maxConcurrentFailovers: 3,
        globalCooldownPeriod: 300000, // 5 minutes
        enableMetrics: true,
        enableTracing: true,
        enableAlerting: true,
        loadBalancerIntegration: false,
        dnsFailoverEnabled: false,
        serviceDiscoveryIntegration: false,
        notificationChannels: [
            {
                type: 'webhook',
                config: {
                    url: 'https://api.example.com/webhooks/failover',
                    secret: 'webhook-secret'
                }
            }
        ]
    }, golemAdapter, // Pass shared Golem adapter
    tracing);
    logger.info('✅ All GuardAnt systems initialized');
    // Demo: Create a sample nest and store configuration
    const demoNestId = 'demo-nest-001';
    // Store nest configuration in Golem Base
    const nestConfig = {
        name: 'Demo Nest',
        description: 'Demonstration monitoring nest for GuardAnt',
        services: [
            {
                id: 'web-service-1',
                name: 'Main Website',
                url: 'https://example.com',
                type: 'web',
                checkInterval: 60
            },
            {
                id: 'api-service-1',
                name: 'API Gateway',
                url: 'https://api.example.com',
                type: 'api',
                checkInterval: 30
            }
        ],
        alerting: {
            emailEnabled: true,
            slackEnabled: false,
            webhookEnabled: true
        },
        settings: {
            timezone: 'UTC',
            maintenanceWindow: {
                start: '02:00',
                end: '04:00',
                days: [0] // Sunday
            }
        }
    };
    try {
        // Store nest configuration
        const configEntityKey = await golemAdapter.storeNestData(demoNestId, golem_adapter_1.DataType.NEST_CONFIGURATION, nestConfig, { key: 'main-config', version: '1.0' });
        if (configEntityKey) {
            logger.info(`✅ Nest configuration stored in Golem Base: ${configEntityKey}`);
        }
        else {
            logger.info('📦 Nest configuration cached locally (Golem Base offline)');
        }
        // Track some usage analytics
        await analyticsManager.trackPageView(demoNestId, '/dashboard', 'demo-user-1', 'session-123', { userAgent: 'GuardAnt-Demo/1.0', referrer: '/' });
        await analyticsManager.trackApiCall(demoNestId, '/api/services', 'GET', 200, 145, 'demo-user-1', { endpoint: 'services-list' });
        logger.info('✅ Usage analytics tracked');
        // Create an SLA target
        const slaTarget = await slaManager.createSLATarget({
            nestId: demoNestId,
            name: 'Standard SLA',
            description: 'Standard service level agreement for demo nest',
            uptime: {
                target: 99.9,
                measurement: 'monthly',
                excludeScheduledMaintenance: true
            },
            responseTime: {
                target: 200,
                percentile: 95,
                measurement: 'monthly'
            },
            errorRate: {
                target: 0.1,
                measurement: 'monthly'
            },
            availability: {
                target: 99.95,
                measurement: 'monthly'
            },
            penalties: [
                {
                    metric: 'uptime',
                    threshold: 99.0,
                    penalty: {
                        type: 'percentage',
                        value: 5,
                        description: '5% service credit for uptime below 99%'
                    }
                }
            ],
            credits: [
                {
                    condition: 'uptime_above_99.99',
                    creditAmount: 2,
                    maxCreditsPerPeriod: 10
                }
            ],
            reportingFrequency: 'monthly',
            stakeholders: ['admin@example.com'],
            active: true
        });
        logger.info(`✅ SLA target created: ${slaTarget.id}`);
        // Register a service endpoint for failover
        const endpoint = await failoverManager.registerEndpoint({
            name: 'demo-api-primary',
            url: 'https://api.example.com',
            region: 'us-east-1',
            priority: 1,
            healthCheckPath: '/health',
            capacity: 1000,
            status: 'healthy',
            metadata: { environment: 'production' }
        });
        logger.info(`✅ Service endpoint registered: ${endpoint.id}`);
        // Track some resource usage for cost calculation
        await costManager.trackResourceUsage({
            nestId: demoNestId,
            resourceType: 'monitoring_check',
            action: 'execute',
            quantity: 100,
            unit: 'count',
            metadata: { serviceId: 'web-service-1' }
        });
        await costManager.trackResourceUsage({
            nestId: demoNestId,
            resourceType: 'api_request',
            action: 'process',
            quantity: 250,
            unit: 'requests',
            metadata: { endpoint: '/api/status' }
        });
        logger.info('✅ Resource usage tracked for cost calculation');
        // Generate a cost summary
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const costSummary = await costManager.calculateCostSummary(demoNestId, startOfMonth, now);
        logger.info('💰 Cost Summary:', {
            totalCost: costSummary.totalCost,
            resourceTypes: costSummary.resourceBreakdown.length,
            topResource: costSummary.resourceBreakdown[0]?.resourceType
        });
        // Get system health overview
        const systemHealth = failoverManager.getSystemHealth();
        logger.info('🏥 System Health:', {
            overallStatus: systemHealth.overall.status,
            totalEndpoints: systemHealth.overall.totalEndpoints,
            utilization: `${systemHealth.capacity.utilization.toFixed(1)}%`
        });
        // Get connection status
        const golemStatus = golemAdapter.getConnectionStatus();
        logger.info('🌐 Golem Base Status:', {
            connected: golemStatus.connected,
            totalEntries: golemStatus.cacheStats.totalEntries,
            unsyncedEntries: golemStatus.cacheStats.unsyncedEntries
        });
        logger.info('🎉 GuardAnt system demonstration completed successfully!');
        // Retrieve the stored configuration to verify
        const retrievedConfig = await golemAdapter.retrieveNestData(demoNestId, golem_adapter_1.DataType.NEST_CONFIGURATION, 'main-config');
        if (retrievedConfig) {
            logger.info('✅ Configuration retrieved successfully from Golem Base');
            logger.info('📋 Retrieved nest name:', retrievedConfig.name);
        }
    }
    catch (error) {
        logger.error('❌ Demo failed:', error);
    }
    // Cleanup
    logger.info('🧹 Cleaning up demo resources...');
    // Shutdown all systems gracefully
    await Promise.allSettled([
        golemAdapter.shutdown(),
        analyticsManager.shutdown(),
        slaManager.shutdown(),
        costManager.shutdown(),
        failoverManager.shutdown()
    ]);
    logger.info('✅ Demo cleanup completed');
}
// Run the demonstration
if (require.main === module) {
    demonstrateGuardAntSystem()
        .then(() => {
        console.log('Demo completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Demo failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=example-usage.js.map