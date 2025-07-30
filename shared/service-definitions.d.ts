/**
 * GuardAnt Comprehensive Service Definitions
 * Defines all types of services that can be monitored with their configurations,
 * validation schemas, and default settings for multi-tenant monitoring platform
 */
import { EventEmitter } from 'events';
import { GuardAntTracing } from './tracing';
import { GolemAdapter } from './golem-adapter';
import { ServiceType, NestService } from './monitoring-engine';
export interface ServiceDefinition {
    id: string;
    nestId: string;
    name: string;
    description?: string;
    type: ServiceType;
    category: ServiceCategory;
    target: string;
    interval: number;
    timeout: number;
    retries: number;
    order?: number;
    tags: string[];
    group?: string;
    icon?: string;
    color?: string;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
    lastCheck?: string;
    lastStatus?: ServiceStatus;
    statusMessage?: string;
    responseTime?: number;
    alerting: AlertingConfig;
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
    maintenanceWindows?: MaintenanceWindow[];
    regions?: string[];
    dependencies?: string[];
    criticalityLevel: CriticalityLevel;
    businessImpact: BusinessImpact;
}
export declare enum ServiceCategory {
    WEB_SERVICES = "web_services",
    API_ENDPOINTS = "api_endpoints",
    DATABASES = "databases",
    INFRASTRUCTURE = "infrastructure",
    THIRD_PARTY = "third_party",
    SECURITY = "security",
    DEVELOPMENT = "development",
    BUSINESS_CRITICAL = "business_critical",
    INTERNAL_TOOLS = "internal_tools",
    MONITORING = "monitoring"
}
export declare enum ServiceStatus {
    UP = "up",
    DOWN = "down",
    DEGRADED = "degraded",
    MAINTENANCE = "maintenance",
    UNKNOWN = "unknown",
    WARNING = "warning"
}
export declare enum CriticalityLevel {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
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
    minimumFailures: number;
    alertDelay: number;
    recoveryDelay: number;
}
export interface AlertChannel {
    type: 'email' | 'slack' | 'webhook' | 'sms' | 'discord' | 'teams' | 'pagerduty';
    target: string;
    config: Record<string, any>;
    severity: 'all' | 'critical' | 'high' | 'medium';
    enabled: boolean;
}
export interface EscalationRule {
    after: number;
    channels: AlertChannel[];
    message?: string;
}
export interface QuietHours {
    start: string;
    end: string;
    days: number[];
    timezone: string;
}
export interface MaintenanceWindow {
    name: string;
    description?: string;
    start: string;
    end: string;
    recurring?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        interval: number;
        daysOfWeek?: number[];
        dayOfMonth?: number;
    };
    notifyUsers: boolean;
}
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
    fallbackToPorts: number[];
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
    repository: string;
    branch?: string;
    token?: string;
    checkWorkflows: boolean;
    checkIssues: boolean;
    checkReleases: boolean;
    maxIssues?: number;
}
export interface UptimeApiServiceConfig {
    apiUrl: string;
    apiKey?: string;
    monitorIds?: string[];
    minimumUptime: number;
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
    expectedRunning: number;
}
export interface KeywordServiceConfig {
    keyword: string;
    caseSensitive: boolean;
    mustContain: boolean;
    multiple: boolean;
    minimumOccurrences?: number;
}
export interface HeartbeatServiceConfig {
    expectedInterval: number;
    tolerance: number;
    lastHeartbeat?: number;
    heartbeatUrl?: string;
    token?: string;
}
export interface PortServiceConfig {
    host: string;
    ports: number[];
    protocol: 'tcp' | 'udp';
    expectBanner?: string;
    sendData?: string;
    expectResponse?: string;
    checkAllPorts: boolean;
}
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
export declare class ServiceDefinitionManager extends EventEmitter {
    private serviceName;
    private config;
    private logger;
    private tracing?;
    private golemAdapter;
    private serviceDefinitions;
    private serviceTemplates;
    private validationRules;
    constructor(serviceName: string, config: ServiceDefinitionConfig, golemAdapter?: GolemAdapter, tracing?: GuardAntTracing);
    createServiceDefinition(definition: Omit<ServiceDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceDefinition>;
    updateServiceDefinition(serviceId: string, updates: Partial<Omit<ServiceDefinition, 'id' | 'nestId' | 'createdAt'>>): Promise<ServiceDefinition>;
    deleteServiceDefinition(nestId: string, serviceId: string): Promise<boolean>;
    getServiceDefinition(serviceId: string): Promise<ServiceDefinition | null>;
    getNestServiceDefinitions(nestId: string): Promise<ServiceDefinition[]>;
    getServicesByCategory(nestId: string, category: ServiceCategory): Promise<ServiceDefinition[]>;
    getServicesByType(nestId: string, type: ServiceType): Promise<ServiceDefinition[]>;
    createServiceFromTemplate(templateId: string, nestId: string, overrides: Partial<ServiceDefinition>): Promise<ServiceDefinition>;
    toNestService(definition: ServiceDefinition): NestService;
    private validateServiceDefinition;
    private normalizeServiceDefinition;
    private inferCategory;
    private generateServiceId;
    private initializeDefaultTemplates;
    private initializeValidationRules;
    private applyTemplate;
    getHealthStatus(): {
        healthy: boolean;
        details: any;
    };
    shutdown(): Promise<void>;
}
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
export interface ValidationRule {
    validate: (definition: Partial<ServiceDefinition>) => Promise<void>;
}
export declare function createServiceDefinitionManager(serviceName: string, config: ServiceDefinitionConfig, golemAdapter?: GolemAdapter, tracing?: GuardAntTracing): ServiceDefinitionManager;
export declare function createDefaultServiceDefinitionConfig(): ServiceDefinitionConfig;
export declare class ServiceDefinitionUtils {
    static generateServiceName(type: ServiceType, target: string): string;
    static inferServiceType(target: string): ServiceType;
    static validateTarget(type: ServiceType, target: string): boolean;
    static getDefaultInterval(type: ServiceType): number;
}
//# sourceMappingURL=service-definitions.d.ts.map