/**
 * GuardAnt Comprehensive Monitoring Engine
 * Ports all monitoring checkpoint types from the original project
 * with full Golem Base integration for multi-tenant data persistence
 */
import { EventEmitter } from 'events';
import { GuardAntTracing } from './tracing';
import { GolemAdapter } from './golem-adapter';
export type ServiceType = "web" | "tcp" | "ping" | "custom" | "github" | "uptime-api" | "dns" | "ssl" | "aws-health" | "azure-health" | "gcp-health" | "kubernetes" | "docker" | "keyword" | "heartbeat" | "port";
export interface NestService {
    id: string;
    nestId: string;
    name: string;
    type: ServiceType;
    target: string;
    interval: number;
    order?: number;
    lastStatus?: "up" | "down" | "unknown";
    lastCheck?: number;
    message?: string;
    responseTime?: number;
    retryCount?: number;
    github?: {
        repository: string;
        branch: string;
        token?: string;
    };
    uptimeConfig?: {
        monitorNames?: Record<string, string>;
        customFields?: string[];
    };
    dnsConfig?: {
        recordType?: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS";
        expectedValue?: string;
        resolver?: string;
    };
    sslConfig?: {
        checkExpiry?: boolean;
        warningDays?: number;
        checkChain?: boolean;
    };
    cloudConfig?: {
        region?: string;
        services?: string[];
        apiKey?: string;
        endpoint?: string;
    };
    kubernetesConfig?: {
        namespace?: string;
        kubeconfig?: string;
        resources?: string[];
    };
    dockerConfig?: {
        socketPath?: string;
        containers?: string[];
        images?: string[];
    };
    keywordConfig?: {
        keyword: string;
        caseSensitive?: boolean;
        mustContain?: boolean;
    };
    heartbeatConfig?: {
        expectedInterval: number;
        tolerance: number;
        lastHeartbeat?: number;
    };
    portConfig?: {
        host: string;
        port: number;
        protocol?: 'tcp' | 'udp';
        banner?: string;
        timeout?: number;
    };
    alertingEnabled?: boolean;
    notificationChannels?: string[];
    createdAt?: number;
    updatedAt?: number;
    tags?: string[];
}
export interface CheckResult {
    serviceId: string;
    nestId: string;
    status: "up" | "down" | "unknown";
    message: string;
    responseTime?: number;
    timestamp: number;
    checkDuration: number;
    attempt: number;
    metadata?: Record<string, any>;
}
export interface MonitoringEngineConfig {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
    checkTimeout: number;
    concurrentChecks: number;
    enableMetrics: boolean;
    enableDetailedLogging: boolean;
    storeMetrics: boolean;
    golemAdapter: GolemAdapter;
    networkConnectivityCheck: boolean;
    networkTestUrls: string[];
}
export declare class MonitoringEngine extends EventEmitter {
    private serviceName;
    private logger;
    private tracing?;
    private config;
    private activeChecks;
    private checkIntervals;
    private isInitialized;
    private checkQueue;
    private isProcessingQueue;
    constructor(serviceName: string, config: MonitoringEngineConfig, tracing?: GuardAntTracing);
    initialize(): Promise<void>;
    addService(service: NestService): Promise<void>;
    removeService(nestId: string, serviceId: string): Promise<void>;
    getNestServices(nestId: string): Promise<NestService[]>;
    checkService(service: NestService): Promise<CheckResult>;
    private scheduleService;
    private performCheckWithRetries;
    private performSingleCheck;
    private storeCheckResult;
    private updateServiceStatus;
    private wait;
    private checkNetworkConnectivity;
    getHealthStatus(): {
        healthy: boolean;
        details: any;
    };
    shutdown(): Promise<void>;
    private checkWebService;
    private checkTcpService;
    private checkPingService;
    private trySystemPing;
    private tryHttpPing;
    private checkDnsService;
    private checkSslService;
    private checkKeywordService;
    private checkPortService;
    private checkHeartbeatService;
    private checkGitHubRepository;
    private checkUptimeApiService;
    private checkExternalMonitoringApi;
    private checkCustomApiService;
    private checkAwsHealth;
    private checkAzureHealth;
    private checkGcpHealth;
    private checkKubernetesHealth;
    private checkDockerHealth;
}
export declare function createMonitoringEngine(serviceName: string, config: MonitoringEngineConfig, tracing?: GuardAntTracing): MonitoringEngine;
export declare function createDefaultMonitoringConfig(golemAdapter: GolemAdapter): MonitoringEngineConfig;
//# sourceMappingURL=monitoring-engine.d.ts.map