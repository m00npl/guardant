/**
 * GuardAnt Comprehensive Service Definitions
 * Defines all types of services that can be monitored with their configurations,
 * validation schemas, and default settings for multi-tenant monitoring platform
 */

import { EventEmitter } from 'events';
import { createLogger } from './logger';
import { GuardAntTracing } from './tracing';
import { AlertError, ErrorCategory, ErrorSeverity } from './error-handling';
import { createGolemAdapter, DataType, GolemAdapter, GolemUtils } from './golem-adapter';
import { ServiceType, NestService } from './monitoring-engine';

// Extended service configuration with all possible options
export interface ServiceDefinition {
  id: string;
  nestId: string;
  name: string;
  description?: string;
  type: ServiceType;
  category: ServiceCategory;
  target: string;
  interval: number; // seconds
  timeout: number; // milliseconds
  retries: number;
  
  // Display and organization
  order?: number;
  tags: string[];
  group?: string;
  icon?: string;
  color?: string;
  
  // Status and metadata
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastCheck?: string;
  lastStatus?: ServiceStatus;
  statusMessage?: string;
  responseTime?: number;
  
  // Alerting configuration
  alerting: AlertingConfig;
  
  // Service-specific configurations
  webConfig?: WebServiceConfig;
  tcpConfig?: TcpServiceConfig;
  pingConfig?: PingServiceConfig;
  dnsConfig?: DnsServiceConfig;
  sslConfig?: SslServiceConfig;
  customConfig?: CustomServiceConfig;
  githubConfig?: GitHubServiceConfig;
  uptimeApiConfig?: UptimeApiServiceConfig;
  cloudConfig?: CloudServiceConfig;
  containerConfig?: ContainerServiceConfig;
  keywordConfig?: KeywordServiceConfig;
  heartbeatConfig?: HeartbeatServiceConfig;
  portConfig?: PortServiceConfig;
  
  // Advanced settings
  maintenanceWindows?: MaintenanceWindow[];
  regions?: string[];
  dependencies?: string[]; // Service IDs this service depends on
  criticalityLevel: CriticalityLevel;
  businessImpact: BusinessImpact;
}

export enum ServiceCategory {
  WEB_SERVICES = 'web_services',
  API_ENDPOINTS = 'api_endpoints',
  DATABASES = 'databases',
  INFRASTRUCTURE = 'infrastructure',
  THIRD_PARTY = 'third_party',
  SECURITY = 'security',
  DEVELOPMENT = 'development',
  BUSINESS_CRITICAL = 'business_critical',
  INTERNAL_TOOLS = 'internal_tools',
  MONITORING = 'monitoring'
}

export enum ServiceStatus {
  UP = 'up',
  DOWN = 'down',
  DEGRADED = 'degraded',
  MAINTENANCE = 'maintenance',
  UNKNOWN = 'unknown',
  WARNING = 'warning'
}

export enum CriticalityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface BusinessImpact {
  revenue: 'none' | 'low' | 'medium' | 'high' | 'critical';
  users: 'none' | 'few' | 'some' | 'many' | 'all';
  operations: 'none' | 'minor' | 'moderate' | 'major' | 'critical';
  reputation: 'none' | 'low' | 'medium' | 'high' | 'severe';
}

export interface AlertingConfig {
  enabled: boolean;
  channels: AlertChannel[];
  escalationRules?: EscalationRule[];
  quietHours?: QuietHours[];
  minimumFailures: number; // Minimum consecutive failures before alerting
  alertDelay: number; // Seconds to wait before first alert
  recoveryDelay: number; // Seconds to wait before sending recovery notification
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'discord' | 'teams' | 'pagerduty';
  target: string; // Email address, webhook URL, phone number, etc.
  config: Record<string, any>;
  severity: 'all' | 'critical' | 'high' | 'medium';
  enabled: boolean;
}

export interface EscalationRule {
  after: number; // Minutes after initial alert
  channels: AlertChannel[];
  message?: string;
}

export interface QuietHours {
  start: string; // HH:MM format
  end: string; // HH:MM format
  days: number[]; // 0-6, Sunday = 0
  timezone: string;
}

export interface MaintenanceWindow {
  name: string;
  description?: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number; // Every N days/weeks/months
    daysOfWeek?: number[]; // For weekly recurring
    dayOfMonth?: number; // For monthly recurring
  };
  notifyUsers: boolean;
}

// Service-specific configurations
export interface WebServiceConfig {
  method: 'GET' | 'HEAD' | 'POST';
  expectedStatusCodes: number[];
  followRedirects: boolean;
  maxRedirects: number;
  headers?: Record<string, string>;
  body?: string;
  authentication?: {
    type: 'basic' | 'bearer' | 'api_key';
    credentials: Record<string, string>;
  };
  sslVerification: boolean;
  userAgent?: string;
  cookies?: Record<string, string>;
}

export interface TcpServiceConfig {
  host: string;
  port: number;
  expectBanner?: string;
  sendData?: string;
  expectResponse?: string;
}

export interface PingServiceConfig {
  host: string;
  packetSize: number;
  fallbackToPorts: number[]; // Fallback ports if ICMP fails
  ipVersion: 4 | 6 | 'auto';
}

export interface DnsServiceConfig {
  hostname: string;
  recordType: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'PTR' | 'SOA';
  expectedValue?: string;
  dnsServer?: string;
  recursive: boolean;
}

export interface SslServiceConfig {
  hostname: string;
  port: number;
  checkExpiry: boolean;
  warningDays: number;
  checkChain: boolean;
  checkRevocation: boolean;
  expectedIssuer?: string;
  expectedSubject?: string;
}

export interface CustomServiceConfig {
  apiUrl: string;
  expectedStatusCode: number;
  responseValidation?: {
    jsonPath?: string;
    expectedValue?: any;
    regex?: string;
  };
  requestHeaders?: Record<string, string>;
  requestBody?: string;
}

export interface GitHubServiceConfig {
  repository: string; // owner/repo format
  branch?: string;
  token?: string;
  checkWorkflows: boolean;
  checkIssues: boolean;
  checkReleases: boolean;
  maxIssues?: number; // Alert if more than this many open issues
}

export interface UptimeApiServiceConfig {
  apiUrl: string;
  apiKey?: string;
  monitorIds?: string[];
  minimumUptime: number; // Percentage
  customFields?: string[];
}

export interface CloudServiceConfig {
  provider: 'aws' | 'azure' | 'gcp';
  region?: string;
  services?: string[];
  apiKey?: string;
  endpoint?: string;
  checkSpecificServices: boolean;
}

export interface ContainerServiceConfig {
  platform: 'docker' | 'kubernetes';
  namespace?: string;
  containerNames?: string[];
  imageNames?: string[];
  kubeconfig?: string;
  socketPath?: string;
  expectedRunning: number; // Minimum number of containers/pods that should be running
}

export interface KeywordServiceConfig {
  keyword: string;
  caseSensitive: boolean;
  mustContain: boolean; // true = must contain, false = must not contain
  multiple: boolean; // Check for multiple occurrences
  minimumOccurrences?: number;
}

export interface HeartbeatServiceConfig {
  expectedInterval: number; // seconds
  tolerance: number; // seconds
  lastHeartbeat?: number;
  heartbeatUrl?: string; // URL to register heartbeats
  token?: string; // Authentication token for heartbeat registration
}

export interface PortServiceConfig {
  host: string;
  ports: number[];
  protocol: 'tcp' | 'udp';
  expectBanner?: string;
  sendData?: string;
  expectResponse?: string;
  checkAllPorts: boolean; // true = all ports must be open, false = any port
}

// Service definition validation and management
export interface ServiceDefinitionConfig {
  enabled: boolean;
  validateOnCreate: boolean;
  validateOnUpdate: boolean;
  allowDuplicateNames: boolean;
  maxServicesPerNest: number;
  defaultTimeout: number;
  defaultRetries: number;
  defaultInterval: number;
  enforceNamingConventions: boolean;
  namingPattern?: RegExp;
  requiredTags?: string[];
  maxTagsPerService: number;
}

export class ServiceDefinitionManager extends EventEmitter {
  private logger;
  private tracing?: GuardAntTracing;
  private golemAdapter: GolemAdapter;
  private serviceDefinitions = new Map<string, ServiceDefinition>();
  private serviceTemplates = new Map<string, ServiceTemplate>();
  private validationRules = new Map<ServiceType, ValidationRule>();

  constructor(
    private serviceName: string,
    private config: ServiceDefinitionConfig,
    golemAdapter?: GolemAdapter,
    tracing?: GuardAntTracing
  ) {
    super();
    this.logger = createLogger(`${serviceName}-service-definitions`);
    this.tracing = tracing;
    
    // Initialize Golem adapter
    this.golemAdapter = golemAdapter || createGolemAdapter(
      serviceName,
      GolemUtils.createDefaultConfig(),
      undefined,
      tracing
    );
    
    if (config.enabled) {
      this.initializeDefaultTemplates();
      this.initializeValidationRules();
    }
  }

  // Create a new service definition
  async createServiceDefinition(
    definition: Omit<ServiceDefinition, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ServiceDefinition> {
    const span = this.tracing?.startSpan('service_def.create');
    
    try {
      // Validate the service definition
      await this.validateServiceDefinition(definition);
      
      const serviceDefinition: ServiceDefinition = {
        ...definition,
        id: this.generateServiceId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Store in Golem Base
      await this.golemAdapter.storeNestData(
        serviceDefinition.nestId,
        DataType.NEST_CONFIGURATION,
        serviceDefinition,
        {
          key: `service-definition:${serviceDefinition.id}`,
          type: 'service-definition',
          category: serviceDefinition.category,
          serviceType: serviceDefinition.type
        }
      );
      
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
      
    } catch (error) {
      this.logger.error('Failed to create service definition', { error, definition });
      span?.setTag('error', true);
      
      throw new AlertError(
        'Service definition creation failed',
        ErrorCategory.VALIDATION_ERROR,
        ErrorSeverity.MEDIUM,
        { originalError: error, definition }
      );
    } finally {
      span?.finish();
    }
  }

  // Update an existing service definition
  async updateServiceDefinition(
    serviceId: string,
    updates: Partial<Omit<ServiceDefinition, 'id' | 'nestId' | 'createdAt'>>
  ): Promise<ServiceDefinition> {
    const span = this.tracing?.startSpan('service_def.update');
    
    try {
      const existing = this.serviceDefinitions.get(serviceId);
      if (!existing) {
        throw new Error(`Service definition not found: ${serviceId}`);
      }
      
      const updatedDefinition: ServiceDefinition = {
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
      await this.golemAdapter.storeNestData(
        updatedDefinition.nestId,
        DataType.NEST_CONFIGURATION,
        updatedDefinition,
        {
          key: `service-definition:${serviceId}`,
          type: 'service-definition',
          category: updatedDefinition.category,
          serviceType: updatedDefinition.type
        }
      );
      
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
      
    } catch (error) {
      this.logger.error('Failed to update service definition', { error, serviceId, updates });
      span?.setTag('error', true);
      throw error;
    } finally {
      span?.finish();
    }
  }

  // Delete a service definition
  async deleteServiceDefinition(nestId: string, serviceId: string): Promise<boolean> {
    const span = this.tracing?.startSpan('service_def.delete');
    
    try {
      const existing = this.serviceDefinitions.get(serviceId);
      if (!existing || existing.nestId !== nestId) {
        return false;
      }
      
      // Delete from Golem Base
      await this.golemAdapter.deleteNestData(
        nestId,
        DataType.NEST_CONFIGURATION,
        `service-definition:${serviceId}`
      );
      
      // Remove from local cache
      this.serviceDefinitions.delete(serviceId);
      
      this.logger.info('Deleted service definition', { serviceId, nestId });
      this.emit('service-definition-deleted', serviceId, existing);
      
      span?.setTag('service.id', serviceId);
      span?.setTag('success', true);
      
      return true;
      
    } catch (error) {
      this.logger.error('Failed to delete service definition', { error, serviceId, nestId });
      span?.setTag('error', true);
      return false;
    } finally {
      span?.finish();
    }
  }

  // Get service definition by ID
  async getServiceDefinition(serviceId: string): Promise<ServiceDefinition | null> {
    // Check local cache first
    const cached = this.serviceDefinitions.get(serviceId);
    if (cached) {
      return cached;
    }
    
    // TODO: Could implement cross-nest lookup via Golem Base if needed
    return null;
  }

  // Get all service definitions for a nest
  async getNestServiceDefinitions(nestId: string): Promise<ServiceDefinition[]> {
    const span = this.tracing?.startSpan('service_def.get_nest_services');
    
    try {
      // Get from Golem Base
      const allNestData = await this.golemAdapter.getNestDataByType(
        nestId,
        DataType.NEST_CONFIGURATION
      );
      
      // Filter for service definitions
      const serviceDefinitions = allNestData
        .filter((data: any) => data && data.type && data.id)
        .filter((data: any) => data.type === 'web' || data.type === 'tcp' || 
                 Object.values(ServiceType).includes(data.type))
        .map((data: any) => this.normalizeServiceDefinition(data, nestId));
      
      // Update local cache
      for (const def of serviceDefinitions) {
        this.serviceDefinitions.set(def.id, def);
      }
      
      span?.setTag('nest.id', nestId);
      span?.setTag('services.count', serviceDefinitions.length);
      
      return serviceDefinitions;
      
    } catch (error) {
      this.logger.error('Failed to get nest service definitions', { error, nestId });
      span?.setTag('error', true);
      return [];
    } finally {
      span?.finish();
    }
  }

  // Get services by category
  async getServicesByCategory(nestId: string, category: ServiceCategory): Promise<ServiceDefinition[]> {
    const allServices = await this.getNestServiceDefinitions(nestId);
    return allServices.filter(service => service.category === category);
  }

  // Get services by type
  async getServicesByType(nestId: string, type: ServiceType): Promise<ServiceDefinition[]> {
    const allServices = await this.getNestServiceDefinitions(nestId);
    return allServices.filter(service => service.type === type);
  }

  // Create service from template
  async createServiceFromTemplate(
    templateId: string,
    nestId: string,
    overrides: Partial<ServiceDefinition>
  ): Promise<ServiceDefinition> {
    const template = this.serviceTemplates.get(templateId);
    if (!template) {
      throw new Error(`Service template not found: ${templateId}`);
    }
    
    const serviceDefinition = this.applyTemplate(template, nestId, overrides);
    return await this.createServiceDefinition(serviceDefinition);
  }

  // Convert ServiceDefinition to NestService for monitoring engine
  toNestService(definition: ServiceDefinition): NestService {
    const nestService: NestService = {
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
  private async validateServiceDefinition(definition: Partial<ServiceDefinition>): Promise<void> {
    if (!definition.name || definition.name.trim().length === 0) {
      throw new Error('Service name is required');
    }
    
    if (!definition.nestId || definition.nestId.trim().length === 0) {
      throw new Error('Nest ID is required');
    }
    
    if (!definition.type || !Object.values(ServiceType).includes(definition.type as ServiceType)) {
      throw new Error('Valid service type is required');
    }
    
    if (!definition.target || definition.target.trim().length === 0) {
      throw new Error('Service target is required');
    }
    
    if (definition.interval && (definition.interval < 30 || definition.interval > 86400)) {
      throw new Error('Check interval must be between 30 seconds and 24 hours');
    }
    
    // Validate type-specific configurations
    const validationRule = this.validationRules.get(definition.type as ServiceType);
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
      const missingTags = this.config.requiredTags.filter(
        tag => !definition.tags || !definition.tags.includes(tag)
      );
      if (missingTags.length > 0) {
        throw new Error(`Missing required tags: ${missingTags.join(', ')}`);
      }
    }
  }

  private normalizeServiceDefinition(data: any, nestId: string): ServiceDefinition {
    // Convert old NestService format to new ServiceDefinition format
    const definition: ServiceDefinition = {
      id: data.id || this.generateServiceId(),
      nestId: nestId,
      name: data.name || 'Unknown Service',
      description: data.description,
      type: data.type || ServiceType.WEB,
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

  private inferCategory(serviceType: ServiceType): ServiceCategory {
    switch (serviceType) {
      case ServiceType.WEB:
        return ServiceCategory.WEB_SERVICES;
      case ServiceType.TCP:
      case ServiceType.PORT:
        return ServiceCategory.INFRASTRUCTURE;
      case ServiceType.DNS:
      case ServiceType.SSL:
        return ServiceCategory.SECURITY;
      case ServiceType.GITHUB:
        return ServiceCategory.DEVELOPMENT;
      case ServiceType.AWS_HEALTH:
      case ServiceType.AZURE_HEALTH:
      case ServiceType.GCP_HEALTH:
        return ServiceCategory.THIRD_PARTY;
      case ServiceType.DOCKER:
      case ServiceType.KUBERNETES:
        return ServiceCategory.INFRASTRUCTURE;
      case ServiceType.CUSTOM:
      case ServiceType.UPTIME_API:
        return ServiceCategory.API_ENDPOINTS;
      case ServiceType.HEARTBEAT:
        return ServiceCategory.MONITORING;
      default:
        return ServiceCategory.WEB_SERVICES;
    }
  }

  private generateServiceId(): string {
    return `svc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeDefaultTemplates(): void {
    // Web Service Template
    this.serviceTemplates.set('web-basic', {
      name: 'Basic Web Service',
      description: 'Monitor a web service with HTTP/HTTPS checks',
      type: ServiceType.WEB,
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
      type: ServiceType.CUSTOM,
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
      type: ServiceType.TCP,
      category: ServiceCategory.DATABASES,
      interval: 120,
      timeout: 5000,
      retries: 3,
      tags: ['database', 'tcp'],
      criticalityLevel: CriticalityLevel.CRITICAL,
      defaultConfig: {}
    });
  }

  private initializeValidationRules(): void {
    // Web service validation
    this.validationRules.set(ServiceType.WEB, {
      validate: async (definition: Partial<ServiceDefinition>) => {
        if (!definition.target?.match(/^https?:\/\/.+/)) {
          throw new Error('Web service target must be a valid HTTP/HTTPS URL');
        }
      }
    });
    
    // TCP service validation
    this.validationRules.set(ServiceType.TCP, {
      validate: async (definition: Partial<ServiceDefinition>) => {
        if (!definition.target?.match(/^.+:\d+$/)) {
          throw new Error('TCP service target must be in format host:port');
        }
      }
    });
    
    // DNS service validation
    this.validationRules.set(ServiceType.DNS, {
      validate: async (definition: Partial<ServiceDefinition>) => {
        if (!definition.dnsConfig?.hostname) {
          throw new Error('DNS service requires hostname configuration');
        }
      }
    });
  }

  private applyTemplate(
    template: ServiceTemplate,
    nestId: string,
    overrides: Partial<ServiceDefinition>
  ): Omit<ServiceDefinition, 'id' | 'createdAt' | 'updatedAt'> {
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
  getHealthStatus(): { healthy: boolean; details: any } {
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
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down ServiceDefinitionManager');
    this.emit('shutdown');
  }
}

// Service template interface
export interface ServiceTemplate {
  name: string;
  description?: string;
  type: ServiceType;
  category: ServiceCategory;
  interval: number;
  timeout?: number;
  retries?: number;
  tags?: string[];
  criticalityLevel?: CriticalityLevel;
  defaultConfig?: Record<string, any>;
}

// Validation rule interface
export interface ValidationRule {
  validate: (definition: Partial<ServiceDefinition>) => Promise<void>;
}

// Factory function
export function createServiceDefinitionManager(
  serviceName: string,
  config: ServiceDefinitionConfig,
  golemAdapter?: GolemAdapter,
  tracing?: GuardAntTracing
): ServiceDefinitionManager {
  return new ServiceDefinitionManager(serviceName, config, golemAdapter, tracing);
}

// Default configuration factory
export function createDefaultServiceDefinitionConfig(): ServiceDefinitionConfig {
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
export class ServiceDefinitionUtils {
  static generateServiceName(type: ServiceType, target: string): string {
    const cleanTarget = target.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    return `${type.toUpperCase()} - ${cleanTarget}`;
  }
  
  static inferServiceType(target: string): ServiceType {
    if (target.startsWith('http://') || target.startsWith('https://')) {
      return ServiceType.WEB;
    }
    if (target.includes(':') && target.match(/:\d+$/)) {
      return ServiceType.TCP;
    }
    if (target.includes('github.com')) {
      return ServiceType.GITHUB;
    }
    return ServiceType.WEB;
  }
  
  static validateTarget(type: ServiceType, target: string): boolean {
    switch (type) {
      case ServiceType.WEB:
        return /^https?:\/\/.+/.test(target);
      case ServiceType.TCP:
        return /^.+:\d+$/.test(target);
      case ServiceType.PING:
        return /^[a-zA-Z0-9.-]+$/.test(target.replace(/^https?:\/\//, '').split('/')[0]);
      case ServiceType.DNS:
        return /^[a-zA-Z0-9.-]+$/.test(target);
      default:
        return target.length > 0;
    }
  }
  
  static getDefaultInterval(type: ServiceType): number {
    switch (type) {
      case ServiceType.HEARTBEAT:
        return 60; // 1 minute for heartbeats
      case ServiceType.GITHUB:
        return 1800; // 30 minutes for GitHub
      case ServiceType.SSL:
        return 3600; // 1 hour for SSL checks
      case ServiceType.DNS:
        return 900; // 15 minutes for DNS
      default:
        return 300; // 5 minutes default
    }
  }
}