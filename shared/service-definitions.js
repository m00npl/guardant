"use strict";
/**
 * GuardAnt Comprehensive Service Definitions
 * Defines all types of services that can be monitored with their configurations,
 * validation schemas, and default settings for multi-tenant monitoring platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceDefinitionUtils = exports.ServiceDefinitionManager = exports.CriticalityLevel = exports.ServiceStatus = exports.ServiceCategory = void 0;
exports.createServiceDefinitionManager = createServiceDefinitionManager;
exports.createDefaultServiceDefinitionConfig = createDefaultServiceDefinitionConfig;
const events_1 = require("events");
const logger_1 = require("./logger");
const error_handling_1 = require("./error-handling");
const golem_adapter_1 = require("./golem-adapter");
var ServiceCategory;
(function (ServiceCategory) {
    ServiceCategory["WEB_SERVICES"] = "web_services";
    ServiceCategory["API_ENDPOINTS"] = "api_endpoints";
    ServiceCategory["DATABASES"] = "databases";
    ServiceCategory["INFRASTRUCTURE"] = "infrastructure";
    ServiceCategory["THIRD_PARTY"] = "third_party";
    ServiceCategory["SECURITY"] = "security";
    ServiceCategory["DEVELOPMENT"] = "development";
    ServiceCategory["BUSINESS_CRITICAL"] = "business_critical";
    ServiceCategory["INTERNAL_TOOLS"] = "internal_tools";
    ServiceCategory["MONITORING"] = "monitoring";
})(ServiceCategory || (exports.ServiceCategory = ServiceCategory = {}));
var ServiceStatus;
(function (ServiceStatus) {
    ServiceStatus["UP"] = "up";
    ServiceStatus["DOWN"] = "down";
    ServiceStatus["DEGRADED"] = "degraded";
    ServiceStatus["MAINTENANCE"] = "maintenance";
    ServiceStatus["UNKNOWN"] = "unknown";
    ServiceStatus["WARNING"] = "warning";
})(ServiceStatus || (exports.ServiceStatus = ServiceStatus = {}));
var CriticalityLevel;
(function (CriticalityLevel) {
    CriticalityLevel["LOW"] = "low";
    CriticalityLevel["MEDIUM"] = "medium";
    CriticalityLevel["HIGH"] = "high";
    CriticalityLevel["CRITICAL"] = "critical";
})(CriticalityLevel || (exports.CriticalityLevel = CriticalityLevel = {}));
class ServiceDefinitionManager extends events_1.EventEmitter {
    constructor(serviceName, config, golemAdapter, tracing) {
        super();
        this.serviceName = serviceName;
        this.config = config;
        this.serviceDefinitions = new Map();
        this.serviceTemplates = new Map();
        this.validationRules = new Map();
        this.logger = (0, logger_1.createLogger)(`${serviceName}-service-definitions`);
        this.tracing = tracing;
        // Initialize Golem adapter
        this.golemAdapter = golemAdapter || (0, golem_adapter_1.createGolemAdapter)(serviceName, golem_adapter_1.GolemUtils.createDefaultConfig(), undefined, tracing);
        if (config.enabled) {
            this.initializeDefaultTemplates();
            this.initializeValidationRules();
        }
    }
    // Create a new service definition
    async createServiceDefinition(definition) {
        const span = this.tracing?.startSpan('service_def.create');
        try {
            // Validate the service definition
            await this.validateServiceDefinition(definition);
            const serviceDefinition = {
                ...definition,
                id: this.generateServiceId(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            // Store in Golem Base
            await this.golemAdapter.storeNestData(serviceDefinition.nestId, golem_adapter_1.DataType.NEST_CONFIGURATION, serviceDefinition, {
                key: `service-definition:${serviceDefinition.id}`,
                type: 'service-definition',
                category: serviceDefinition.category,
                serviceType: serviceDefinition.type
            });
            // Store in local cache
            this.serviceDefinitions.set(serviceDefinition.id, serviceDefinition);
            this.logger.info('Created service definition', {
                serviceId: serviceDefinition.id,
                nestId: serviceDefinition.nestId,
                name: serviceDefinition.name,
                type: serviceDefinition.type
            });
            this.emit('service-definition-created', serviceDefinition);
            span?.setTag('service.id', serviceDefinition.id);
            span?.setTag('service.type', serviceDefinition.type);
            span?.setTag('service.category', serviceDefinition.category);
            return serviceDefinition;
        }
        catch (error) {
            this.logger.error('Failed to create service definition', { error, definition });
            span?.setTag('error', true);
            throw new error_handling_1.AlertError('Service definition creation failed', error_handling_1.ErrorCategory.VALIDATION_ERROR, error_handling_1.ErrorSeverity.MEDIUM, { originalError: error, definition });
        }
        finally {
            span?.finish();
        }
    }
    // Update an existing service definition
    async updateServiceDefinition(serviceId, updates) {
        const span = this.tracing?.startSpan('service_def.update');
        try {
            const existing = this.serviceDefinitions.get(serviceId);
            if (!existing) {
                throw new Error(`Service definition not found: ${serviceId}`);
            }
            const updatedDefinition = {
                ...existing,
                ...updates,
                id: serviceId,
                nestId: existing.nestId,
                createdAt: existing.createdAt,
                updatedAt: new Date().toISOString()
            };
            // Validate the updated definition
            await this.validateServiceDefinition(updatedDefinition);
            // Store in Golem Base
            await this.golemAdapter.storeNestData(updatedDefinition.nestId, golem_adapter_1.DataType.NEST_CONFIGURATION, updatedDefinition, {
                key: `service-definition:${serviceId}`,
                type: 'service-definition',
                category: updatedDefinition.category,
                serviceType: updatedDefinition.type
            });
            // Update local cache
            this.serviceDefinitions.set(serviceId, updatedDefinition);
            this.logger.info('Updated service definition', {
                serviceId,
                nestId: updatedDefinition.nestId,
                changes: Object.keys(updates)
            });
            this.emit('service-definition-updated', updatedDefinition, existing);
            span?.setTag('service.id', serviceId);
            span?.setTag('changes.count', Object.keys(updates).length);
            return updatedDefinition;
        }
        catch (error) {
            this.logger.error('Failed to update service definition', { error, serviceId, updates });
            span?.setTag('error', true);
            throw error;
        }
        finally {
            span?.finish();
        }
    }
    // Delete a service definition
    async deleteServiceDefinition(nestId, serviceId) {
        const span = this.tracing?.startSpan('service_def.delete');
        try {
            const existing = this.serviceDefinitions.get(serviceId);
            if (!existing || existing.nestId !== nestId) {
                return false;
            }
            // Delete from Golem Base
            await this.golemAdapter.deleteNestData(nestId, golem_adapter_1.DataType.NEST_CONFIGURATION, `service-definition:${serviceId}`);
            // Remove from local cache
            this.serviceDefinitions.delete(serviceId);
            this.logger.info('Deleted service definition', { serviceId, nestId });
            this.emit('service-definition-deleted', serviceId, existing);
            span?.setTag('service.id', serviceId);
            span?.setTag('success', true);
            return true;
        }
        catch (error) {
            this.logger.error('Failed to delete service definition', { error, serviceId, nestId });
            span?.setTag('error', true);
            return false;
        }
        finally {
            span?.finish();
        }
    }
    // Get service definition by ID
    async getServiceDefinition(serviceId) {
        // Check local cache first
        const cached = this.serviceDefinitions.get(serviceId);
        if (cached) {
            return cached;
        }
        // TODO: Could implement cross-nest lookup via Golem Base if needed
        return null;
    }
    // Get all service definitions for a nest
    async getNestServiceDefinitions(nestId) {
        const span = this.tracing?.startSpan('service_def.get_nest_services');
        try {
            // Get from Golem Base
            const allNestData = await this.golemAdapter.getNestDataByType(nestId, golem_adapter_1.DataType.NEST_CONFIGURATION);
            // Filter for service definitions
            const serviceDefinitions = allNestData
                .filter((data) => data && data.type && data.id)
                .filter((data) => data.type === 'web' || data.type === 'tcp' ||
                Object.values(monitoring_engine_1.ServiceType).includes(data.type))
                .map((data) => this.normalizeServiceDefinition(data, nestId));
            // Update local cache
            for (const def of serviceDefinitions) {
                this.serviceDefinitions.set(def.id, def);
            }
            span?.setTag('nest.id', nestId);
            span?.setTag('services.count', serviceDefinitions.length);
            return serviceDefinitions;
        }
        catch (error) {
            this.logger.error('Failed to get nest service definitions', { error, nestId });
            span?.setTag('error', true);
            return [];
        }
        finally {
            span?.finish();
        }
    }
    // Get services by category
    async getServicesByCategory(nestId, category) {
        const allServices = await this.getNestServiceDefinitions(nestId);
        return allServices.filter(service => service.category === category);
    }
    // Get services by type
    async getServicesByType(nestId, type) {
        const allServices = await this.getNestServiceDefinitions(nestId);
        return allServices.filter(service => service.type === type);
    }
    // Create service from template
    async createServiceFromTemplate(templateId, nestId, overrides) {
        const template = this.serviceTemplates.get(templateId);
        if (!template) {
            throw new Error(`Service template not found: ${templateId}`);
        }
        const serviceDefinition = this.applyTemplate(template, nestId, overrides);
        return await this.createServiceDefinition(serviceDefinition);
    }
    // Convert ServiceDefinition to NestService for monitoring engine
    toNestService(definition) {
        const nestService = {
            id: definition.id,
            nestId: definition.nestId,
            name: definition.name,
            type: definition.type,
            target: definition.target,
            interval: definition.interval,
            order: definition.order,
            lastStatus: definition.lastStatus,
            lastCheck: definition.lastCheck ? new Date(definition.lastCheck).getTime() : undefined,
            message: definition.statusMessage,
            responseTime: definition.responseTime,
            alertingEnabled: definition.alerting.enabled,
            tags: definition.tags,
            createdAt: new Date(definition.createdAt).getTime(),
            updatedAt: new Date(definition.updatedAt).getTime()
        };
        // Map service-specific configurations
        if (definition.webConfig) {
            // Web service configs can be embedded in target or metadata
        }
        if (definition.tcpConfig) {
            nestService.target = `${definition.tcpConfig.host}:${definition.tcpConfig.port}`;
        }
        if (definition.dnsConfig) {
            nestService.dnsConfig = {
                recordType: definition.dnsConfig.recordType,
                expectedValue: definition.dnsConfig.expectedValue,
                resolver: definition.dnsConfig.dnsServer
            };
        }
        if (definition.sslConfig) {
            nestService.sslConfig = {
                checkExpiry: definition.sslConfig.checkExpiry,
                warningDays: definition.sslConfig.warningDays,
                checkChain: definition.sslConfig.checkChain
            };
        }
        if (definition.githubConfig) {
            nestService.github = {
                repository: definition.githubConfig.repository,
                branch: definition.githubConfig.branch || 'main',
                token: definition.githubConfig.token
            };
        }
        if (definition.keywordConfig) {
            nestService.keywordConfig = {
                keyword: definition.keywordConfig.keyword,
                caseSensitive: definition.keywordConfig.caseSensitive,
                mustContain: definition.keywordConfig.mustContain
            };
        }
        if (definition.heartbeatConfig) {
            nestService.heartbeatConfig = {
                expectedInterval: definition.heartbeatConfig.expectedInterval,
                tolerance: definition.heartbeatConfig.tolerance,
                lastHeartbeat: definition.heartbeatConfig.lastHeartbeat
            };
        }
        if (definition.portConfig) {
            nestService.portConfig = {
                host: definition.portConfig.host,
                port: definition.portConfig.ports[0] || 80,
                protocol: definition.portConfig.protocol,
                banner: definition.portConfig.expectBanner,
                timeout: definition.timeout
            };
        }
        return nestService;
    }
    // Private helper methods
    async validateServiceDefinition(definition) {
        if (!definition.name || definition.name.trim().length === 0) {
            throw new Error('Service name is required');
        }
        if (!definition.nestId || definition.nestId.trim().length === 0) {
            throw new Error('Nest ID is required');
        }
        if (!definition.type || !Object.values(monitoring_engine_1.ServiceType).includes(definition.type)) {
            throw new Error('Valid service type is required');
        }
        if (!definition.target || definition.target.trim().length === 0) {
            throw new Error('Service target is required');
        }
        if (definition.interval && (definition.interval < 30 || definition.interval > 86400)) {
            throw new Error('Check interval must be between 30 seconds and 24 hours');
        }
        // Validate type-specific configurations
        const validationRule = this.validationRules.get(definition.type);
        if (validationRule) {
            await validationRule.validate(definition);
        }
        // Check naming conventions
        if (this.config.enforceNamingConventions && this.config.namingPattern) {
            if (!this.config.namingPattern.test(definition.name)) {
                throw new Error('Service name does not match required naming pattern');
            }
        }
        // Check required tags
        if (this.config.requiredTags && this.config.requiredTags.length > 0) {
            const missingTags = this.config.requiredTags.filter(tag => !definition.tags || !definition.tags.includes(tag));
            if (missingTags.length > 0) {
                throw new Error(`Missing required tags: ${missingTags.join(', ')}`);
            }
        }
    }
    normalizeServiceDefinition(data, nestId) {
        // Convert old NestService format to new ServiceDefinition format
        const definition = {
            id: data.id || this.generateServiceId(),
            nestId: nestId,
            name: data.name || 'Unknown Service',
            description: data.description,
            type: data.type || monitoring_engine_1.ServiceType.WEB,
            category: this.inferCategory(data.type),
            target: data.target || '',
            interval: data.interval || this.config.defaultInterval,
            timeout: data.timeout || this.config.defaultTimeout,
            retries: data.retries || this.config.defaultRetries,
            order: data.order,
            tags: data.tags || [],
            group: data.group,
            enabled: data.enabled !== false,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            lastCheck: data.lastCheck ? new Date(data.lastCheck).toISOString() : undefined,
            lastStatus: data.lastStatus,
            statusMessage: data.message,
            responseTime: data.responseTime,
            criticalityLevel: data.criticalityLevel || CriticalityLevel.MEDIUM,
            businessImpact: data.businessImpact || {
                revenue: 'low',
                users: 'some',
                operations: 'minor',
                reputation: 'low'
            },
            alerting: {
                enabled: data.alertingEnabled !== false,
                channels: [],
                minimumFailures: 3,
                alertDelay: 300,
                recoveryDelay: 60
            }
        };
        // Map legacy configurations
        if (data.dnsConfig) {
            definition.dnsConfig = {
                hostname: data.target,
                recordType: data.dnsConfig.recordType || 'A',
                expectedValue: data.dnsConfig.expectedValue,
                dnsServer: data.dnsConfig.resolver,
                recursive: true
            };
        }
        if (data.sslConfig) {
            definition.sslConfig = {
                hostname: data.target,
                port: 443,
                checkExpiry: data.sslConfig.checkExpiry !== false,
                warningDays: data.sslConfig.warningDays || 30,
                checkChain: data.sslConfig.checkChain !== false,
                checkRevocation: false
            };
        }
        return definition;
    }
    inferCategory(serviceType) {
        switch (serviceType) {
            case monitoring_engine_1.ServiceType.WEB:
                return ServiceCategory.WEB_SERVICES;
            case monitoring_engine_1.ServiceType.TCP:
            case monitoring_engine_1.ServiceType.PORT:
                return ServiceCategory.INFRASTRUCTURE;
            case monitoring_engine_1.ServiceType.DNS:
            case monitoring_engine_1.ServiceType.SSL:
                return ServiceCategory.SECURITY;
            case monitoring_engine_1.ServiceType.GITHUB:
                return ServiceCategory.DEVELOPMENT;
            case monitoring_engine_1.ServiceType.AWS_HEALTH:
            case monitoring_engine_1.ServiceType.AZURE_HEALTH:
            case monitoring_engine_1.ServiceType.GCP_HEALTH:
                return ServiceCategory.THIRD_PARTY;
            case monitoring_engine_1.ServiceType.DOCKER:
            case monitoring_engine_1.ServiceType.KUBERNETES:
                return ServiceCategory.INFRASTRUCTURE;
            case monitoring_engine_1.ServiceType.CUSTOM:
            case monitoring_engine_1.ServiceType.UPTIME_API:
                return ServiceCategory.API_ENDPOINTS;
            case monitoring_engine_1.ServiceType.HEARTBEAT:
                return ServiceCategory.MONITORING;
            default:
                return ServiceCategory.WEB_SERVICES;
        }
    }
    generateServiceId() {
        return `svc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    initializeDefaultTemplates() {
        // Web Service Template
        this.serviceTemplates.set('web-basic', {
            name: 'Basic Web Service',
            description: 'Monitor a web service with HTTP/HTTPS checks',
            type: monitoring_engine_1.ServiceType.WEB,
            category: ServiceCategory.WEB_SERVICES,
            interval: 300,
            timeout: 10000,
            retries: 3,
            tags: ['web', 'http'],
            criticalityLevel: CriticalityLevel.MEDIUM,
            defaultConfig: {
                webConfig: {
                    method: 'HEAD',
                    expectedStatusCodes: [200, 301, 302],
                    followRedirects: true,
                    maxRedirects: 3,
                    sslVerification: true
                }
            }
        });
        // API Endpoint Template
        this.serviceTemplates.set('api-endpoint', {
            name: 'API Endpoint',
            description: 'Monitor an API endpoint with JSON response validation',
            type: monitoring_engine_1.ServiceType.CUSTOM,
            category: ServiceCategory.API_ENDPOINTS,
            interval: 180,
            timeout: 15000,
            retries: 2,
            tags: ['api', 'json'],
            criticalityLevel: CriticalityLevel.HIGH,
            defaultConfig: {
                customConfig: {
                    expectedStatusCode: 200,
                    responseValidation: {
                        jsonPath: '$.status',
                        expectedValue: 'ok'
                    }
                }
            }
        });
        // Database Template
        this.serviceTemplates.set('database-tcp', {
            name: 'Database Connection',
            description: 'Monitor database connectivity via TCP port check',
            type: monitoring_engine_1.ServiceType.TCP,
            category: ServiceCategory.DATABASES,
            interval: 120,
            timeout: 5000,
            retries: 3,
            tags: ['database', 'tcp'],
            criticalityLevel: CriticalityLevel.CRITICAL,
            defaultConfig: {}
        });
    }
    initializeValidationRules() {
        // Web service validation
        this.validationRules.set(monitoring_engine_1.ServiceType.WEB, {
            validate: async (definition) => {
                if (!definition.target?.match(/^https?:\/\/.+/)) {
                    throw new Error('Web service target must be a valid HTTP/HTTPS URL');
                }
            }
        });
        // TCP service validation
        this.validationRules.set(monitoring_engine_1.ServiceType.TCP, {
            validate: async (definition) => {
                if (!definition.target?.match(/^.+:\d+$/)) {
                    throw new Error('TCP service target must be in format host:port');
                }
            }
        });
        // DNS service validation
        this.validationRules.set(monitoring_engine_1.ServiceType.DNS, {
            validate: async (definition) => {
                if (!definition.dnsConfig?.hostname) {
                    throw new Error('DNS service requires hostname configuration');
                }
            }
        });
    }
    applyTemplate(template, nestId, overrides) {
        return {
            nestId,
            name: overrides.name || template.name,
            description: overrides.description || template.description,
            type: template.type,
            category: template.category,
            target: overrides.target || '',
            interval: overrides.interval || template.interval,
            timeout: overrides.timeout || template.timeout || this.config.defaultTimeout,
            retries: overrides.retries || template.retries || this.config.defaultRetries,
            tags: [...(template.tags || []), ...(overrides.tags || [])],
            enabled: overrides.enabled !== false,
            criticalityLevel: overrides.criticalityLevel || template.criticalityLevel || CriticalityLevel.MEDIUM,
            businessImpact: overrides.businessImpact || {
                revenue: 'low',
                users: 'some',
                operations: 'minor',
                reputation: 'low'
            },
            alerting: overrides.alerting || {
                enabled: true,
                channels: [],
                minimumFailures: 3,
                alertDelay: 300,
                recoveryDelay: 60
            },
            ...template.defaultConfig,
            ...overrides
        };
    }
    // Health check
    getHealthStatus() {
        return {
            healthy: true,
            details: {
                serviceDefinitions: this.serviceDefinitions.size,
                templates: this.serviceTemplates.size,
                validationRules: this.validationRules.size,
                golemConnected: this.golemAdapter.getConnectionStatus().connected
            }
        };
    }
    // Shutdown cleanup
    async shutdown() {
        this.logger.info('Shutting down ServiceDefinitionManager');
        this.emit('shutdown');
    }
}
exports.ServiceDefinitionManager = ServiceDefinitionManager;
// Factory function
function createServiceDefinitionManager(serviceName, config, golemAdapter, tracing) {
    return new ServiceDefinitionManager(serviceName, config, golemAdapter, tracing);
}
// Default configuration factory
function createDefaultServiceDefinitionConfig() {
    return {
        enabled: true,
        validateOnCreate: true,
        validateOnUpdate: true,
        allowDuplicateNames: false,
        maxServicesPerNest: 100,
        defaultTimeout: 10000,
        defaultRetries: 3,
        defaultInterval: 300,
        enforceNamingConventions: false,
        maxTagsPerService: 10
    };
}
// Utility functions
class ServiceDefinitionUtils {
    static generateServiceName(type, target) {
        const cleanTarget = target.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        return `${type.toUpperCase()} - ${cleanTarget}`;
    }
    static inferServiceType(target) {
        if (target.startsWith('http://') || target.startsWith('https://')) {
            return monitoring_engine_1.ServiceType.WEB;
        }
        if (target.includes(':') && target.match(/:\d+$/)) {
            return monitoring_engine_1.ServiceType.TCP;
        }
        if (target.includes('github.com')) {
            return monitoring_engine_1.ServiceType.GITHUB;
        }
        return monitoring_engine_1.ServiceType.WEB;
    }
    static validateTarget(type, target) {
        switch (type) {
            case monitoring_engine_1.ServiceType.WEB:
                return /^https?:\/\/.+/.test(target);
            case monitoring_engine_1.ServiceType.TCP:
                return /^.+:\d+$/.test(target);
            case monitoring_engine_1.ServiceType.PING:
                return /^[a-zA-Z0-9.-]+$/.test(target.replace(/^https?:\/\//, '').split('/')[0]);
            case monitoring_engine_1.ServiceType.DNS:
                return /^[a-zA-Z0-9.-]+$/.test(target);
            default:
                return target.length > 0;
        }
    }
    static getDefaultInterval(type) {
        switch (type) {
            case monitoring_engine_1.ServiceType.HEARTBEAT:
                return 60; // 1 minute for heartbeats
            case monitoring_engine_1.ServiceType.GITHUB:
                return 1800; // 30 minutes for GitHub
            case monitoring_engine_1.ServiceType.SSL:
                return 3600; // 1 hour for SSL checks
            case monitoring_engine_1.ServiceType.DNS:
                return 900; // 15 minutes for DNS
            default:
                return 300; // 5 minutes default
        }
    }
}
exports.ServiceDefinitionUtils = ServiceDefinitionUtils;
//# sourceMappingURL=service-definitions.js.map