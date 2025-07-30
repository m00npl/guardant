"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterPrivateData = exports.createServiceNameMap = exports.generateMockHistoricalData = exports.calculateAverageResponseTime = exports.calculateUptime = exports.transformMaintenanceData = exports.transformIncidentData = exports.transformServiceData = exports.transformNestData = void 0;
/**
 * Transform internal nest data to public API format
 */
const transformNestData = (nestData) => {
    return {
        id: nestData.id,
        name: nestData.name,
        subdomain: nestData.subdomain,
        settings: {
            isPublic: nestData.settings?.isPublic ?? true,
            customDomain: nestData.settings?.customDomain,
            timezone: nestData.settings?.timezone ?? 'UTC',
            language: nestData.settings?.language ?? 'en',
            branding: nestData.settings?.branding ? {
                logo: nestData.settings.branding.logo,
                primaryColor: nestData.settings.branding.primaryColor,
                customCss: nestData.settings.branding.customCss,
            } : undefined,
        },
    };
};
exports.transformNestData = transformNestData;
/**
 * Transform internal service data to public API format
 */
const transformServiceData = (serviceData, statusData = null) => {
    const status = statusData || serviceData;
    return {
        id: serviceData.id,
        name: serviceData.name,
        description: serviceData.description,
        type: serviceData.type,
        status: status.status || 'unknown',
        uptime: status.uptime || 0,
        responseTime: status.responseTime,
        lastCheck: status.lastCheck || Date.now(),
        metrics: {
            uptime24h: status.metrics?.uptime24h || 0,
            uptime7d: status.metrics?.uptime7d || 0,
            uptime30d: status.metrics?.uptime30d || 0,
            avgResponseTime24h: status.metrics?.avgResponseTime24h,
            avgResponseTime7d: status.metrics?.avgResponseTime7d,
            avgResponseTime30d: status.metrics?.avgResponseTime30d,
        },
        regions: (status.regions || []).map((region) => ({
            id: region.id,
            name: region.name,
            status: region.status || 'unknown',
            responseTime: region.responseTime,
            lastCheck: region.lastCheck || Date.now(),
        })),
    };
};
exports.transformServiceData = transformServiceData;
/**
 * Transform internal incident data to public API format
 */
const transformIncidentData = (incidentData, serviceNames) => {
    return {
        id: incidentData.id,
        title: incidentData.title || 'Service Incident',
        description: incidentData.description || 'An incident is affecting this service.',
        status: incidentData.status || 'investigating',
        severity: incidentData.severity || 'minor',
        affectedServices: (incidentData.affectedServices || [])
            .map((serviceId) => serviceNames.get(serviceId) || serviceId)
            .filter(Boolean),
        startedAt: incidentData.startedAt,
        resolvedAt: incidentData.resolvedAt,
        updates: (incidentData.updates || []).map((update) => ({
            id: update.id,
            message: update.message,
            status: update.status,
            timestamp: update.timestamp,
        })),
    };
};
exports.transformIncidentData = transformIncidentData;
/**
 * Transform internal maintenance data to public API format
 */
const transformMaintenanceData = (maintenanceData, serviceNames) => {
    return {
        id: maintenanceData.id,
        title: maintenanceData.title || 'Scheduled Maintenance',
        description: maintenanceData.description || 'Scheduled maintenance is planned for this service.',
        affectedServices: (maintenanceData.affectedServices || [])
            .map((serviceId) => serviceNames.get(serviceId) || serviceId)
            .filter(Boolean),
        scheduledStart: maintenanceData.scheduledStart,
        scheduledEnd: maintenanceData.scheduledEnd,
        status: maintenanceData.status || 'scheduled',
    };
};
exports.transformMaintenanceData = transformMaintenanceData;
/**
 * Calculate uptime percentage from historical data
 */
const calculateUptime = (historicalData) => {
    if (!historicalData || historicalData.length === 0)
        return 100;
    const upCount = historicalData.filter(point => point.status === 'up').length;
    return Math.round((upCount / historicalData.length) * 100 * 100) / 100; // Round to 2 decimal places
};
exports.calculateUptime = calculateUptime;
/**
 * Calculate average response time from historical data
 */
const calculateAverageResponseTime = (historicalData) => {
    if (!historicalData || historicalData.length === 0)
        return undefined;
    const validResponseTimes = historicalData
        .filter(point => point.responseTime && point.responseTime > 0)
        .map(point => point.responseTime);
    if (validResponseTimes.length === 0)
        return undefined;
    const sum = validResponseTimes.reduce((acc, time) => acc + time, 0);
    return Math.round(sum / validResponseTimes.length);
};
exports.calculateAverageResponseTime = calculateAverageResponseTime;
/**
 * Generate mock historical data for demonstration
 * In production, this would query actual historical metrics from storage
 */
const generateMockHistoricalData = (period, currentStatus = 'up', baseResponseTime = 200) => {
    const now = Date.now();
    const intervals = {
        '24h': { duration: 24 * 60 * 60 * 1000, points: 48 }, // Every 30 minutes
        '7d': { duration: 7 * 24 * 60 * 60 * 1000, points: 168 }, // Every hour
        '30d': { duration: 30 * 24 * 60 * 60 * 1000, points: 720 }, // Every hour
        '90d': { duration: 90 * 24 * 60 * 60 * 1000, points: 360 }, // Every 6 hours
    };
    const { duration, points } = intervals[period];
    const interval = duration / points;
    const data = [];
    for (let i = 0; i < points; i++) {
        const timestamp = now - duration + (i * interval);
        // Generate realistic status distribution (95% up, 4% degraded, 1% down)
        let status;
        const random = Math.random();
        if (random < 0.95) {
            status = 'up';
        }
        else if (random < 0.99) {
            status = 'degraded';
        }
        else {
            status = 'down';
        }
        // If it's the most recent point, use current status
        if (i === points - 1) {
            status = currentStatus;
        }
        // Generate response time (only for up/degraded status)
        let responseTime;
        if (status !== 'down') {
            const variation = (Math.random() - 0.5) * 0.4; // ±20% variation
            responseTime = Math.round(baseResponseTime * (1 + variation));
            // Degraded services have higher response times
            if (status === 'degraded') {
                responseTime = Math.round(responseTime * 1.5);
            }
        }
        data.push({
            timestamp,
            status,
            responseTime,
        });
    }
    return data;
};
exports.generateMockHistoricalData = generateMockHistoricalData;
/**
 * Create service name lookup map
 */
const createServiceNameMap = (services) => {
    const map = new Map();
    services.forEach(service => {
        map.set(service.id, service.name);
    });
    return map;
};
exports.createServiceNameMap = createServiceNameMap;
/**
 * Filter data based on privacy settings
 */
const filterPrivateData = (data) => {
    // If nest is not public, return minimal data
    if (!data.nest.settings.isPublic) {
        return {
            ...data,
            services: [],
            incidents: [],
            maintenance: [],
        };
    }
    return data;
};
exports.filterPrivateData = filterPrivateData;
//# sourceMappingURL=transformers.js.map