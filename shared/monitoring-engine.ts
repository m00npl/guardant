/**
 * GuardAnt Comprehensive Monitoring Engine
 * Ports all monitoring checkpoint types from the original project
 * with full Golem Base integration for multi-tenant data persistence
 */

import { EventEmitter } from 'events';
import { createLogger } from './logger';
import { GuardAntTracing } from './tracing';
import { AlertError, ErrorCategory, ErrorSeverity } from './error-handling';
import { createGolemAdapter, DataType, GolemAdapter } from './golem-adapter';
import * as net from 'net';
import * as dns from 'dns';
import * as tls from 'tls';
import { spawn } from 'child_process';

// Service types from original monitoring.ts
export type ServiceType =
  | "web"
  | "tcp"
  | "ping"
  | "custom"
  | "github"
  | "uptime-api"
  | "dns"
  | "ssl"
  | "aws-health"
  | "azure-health"
  | "gcp-health"
  | "kubernetes"
  | "docker"
  | "keyword"
  | "heartbeat"
  | "port";

// Enhanced service interface with nest isolation
export interface NestService {
  id: string;
  nestId: string; // Multi-tenant isolation
  name: string;
  type: ServiceType;
  target: string;
  interval: number; // in seconds
  order?: number; // display order
  lastStatus?: "up" | "down" | "unknown";
  lastCheck?: number; // timestamp
  message?: string;
  responseTime?: number; // in milliseconds
  retryCount?: number; // Failed check attempts
  
  // Type-specific configurations
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
  
  // Alert configuration
  alertingEnabled?: boolean;
  notificationChannels?: string[];
  
  // Metadata
  createdAt?: number;
  updatedAt?: number;
  tags?: string[];
}

// Check result interface
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

// Configuration for the monitoring engine
export interface MonitoringEngineConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number; // seconds
  checkTimeout: number; // milliseconds
  concurrentChecks: number;
  enableMetrics: boolean;
  enableDetailedLogging: boolean;
  storeMetrics: boolean;
  
  // Golem Base integration
  golemAdapter: GolemAdapter;
  
  // Network settings
  networkConnectivityCheck: boolean;
  networkTestUrls: string[];
}

export class MonitoringEngine extends EventEmitter {
  private logger;
  private tracing?: GuardAntTracing;
  private config: MonitoringEngineConfig;
  private activeChecks = new Map<string, Promise<CheckResult>>();
  private checkIntervals = new Map<string, NodeJS.Timeout>();
  private isInitialized = false;
  private checkQueue: NestService[] = [];
  private isProcessingQueue = false;

  constructor(
    private serviceName: string,
    config: MonitoringEngineConfig,
    tracing?: GuardAntTracing
  ) {
    super();
    this.logger = createLogger(`${serviceName}-monitoring-engine`);
    this.tracing = tracing;
    this.config = config;
  }

  // Initialize the monitoring engine
  async initialize(): Promise<void> {
    const span = this.tracing?.startSpan('monitoring.engine.initialize');
    
    try {
      this.logger.info('Initializing GuardAnt Monitoring Engine');
      
      // Ensure Golem adapter is initialized
      if (!this.config.golemAdapter) {
        throw new Error('Golem adapter is required for monitoring engine');
      }
      
      this.isInitialized = true;
      this.emit('initialized');
      
      this.logger.info('GuardAnt Monitoring Engine initialized successfully');
      
      span?.setTag('monitoring.initialized', true);
      
    } catch (error) {
      this.logger.error('Failed to initialize monitoring engine', { error });
      span?.setTag('error', true);
      throw error;
    } finally {
      span?.finish();
    }
  }

  // Add a service to monitor
  async addService(service: NestService): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Monitoring engine not initialized');
    }

    const span = this.tracing?.startSpan('monitoring.engine.add_service');
    
    try {
      // Store service configuration in Golem Base
      await this.config.golemAdapter.storeNestData(
        service.nestId,
        DataType.NEST_CONFIGURATION,
        service,
        { key: `service:${service.id}`, serviceType: 'monitoring' }
      );

      // Schedule the service for monitoring
      this.scheduleService(service);
      
      this.logger.info('Service added to monitoring', {
        serviceId: service.id,
        nestId: service.nestId,
        type: service.type,
        interval: service.interval
      });

      this.emit('service-added', { service });
      
      span?.setTag('service.id', service.id);
      span?.setTag('service.type', service.type);
      span?.setTag('nest.id', service.nestId);
      
    } catch (error) {
      this.logger.error('Failed to add service to monitoring', { error, serviceId: service.id });
      span?.setTag('error', true);
      throw error;
    } finally {
      span?.finish();
    }
  }

  // Remove a service from monitoring
  async removeService(nestId: string, serviceId: string): Promise<void> {
    const span = this.tracing?.startSpan('monitoring.engine.remove_service');
    
    try {
      // Clear scheduled interval
      const intervalId = this.checkIntervals.get(serviceId);
      if (intervalId) {
        clearInterval(intervalId);
        this.checkIntervals.delete(serviceId);
      }

      // Remove from active checks
      this.activeChecks.delete(serviceId);

      // Remove from Golem Base
      await this.config.golemAdapter.deleteNestData(
        nestId,
        DataType.NEST_CONFIGURATION,
        `service:${serviceId}`
      );

      this.logger.info('Service removed from monitoring', { serviceId, nestId });
      this.emit('service-removed', { serviceId, nestId });
      
      span?.setTag('service.id', serviceId);
      span?.setTag('nest.id', nestId);
      
    } catch (error) {
      this.logger.error('Failed to remove service from monitoring', { error, serviceId, nestId });
      span?.setTag('error', true);
      throw error;
    } finally {
      span?.finish();
    }
  }

  // Get all services for a nest
  async getNestServices(nestId: string): Promise<NestService[]> {
    if (!this.isInitialized) {
      throw new Error('Monitoring engine not initialized');
    }

    try {
      const services = await this.config.golemAdapter.getNestDataByType(
        nestId,
        DataType.NEST_CONFIGURATION
      );

      return services.filter(service => 
        service && service.id && service.type
      ) as NestService[];
      
    } catch (error) {
      this.logger.error('Failed to get nest services', { error, nestId });
      return [];
    }
  }

  // Perform a manual check on a service
  async checkService(service: NestService): Promise<CheckResult> {
    const span = this.tracing?.startSpan('monitoring.engine.check_service');
    const startTime = Date.now();
    
    try {
      span?.setTag('service.id', service.id);
      span?.setTag('service.type', service.type);
      span?.setTag('nest.id', service.nestId);

      this.logger.debug('Starting service check', {
        serviceId: service.id,
        nestId: service.nestId,
        type: service.type
      });

      // Perform the check with retries
      const result = await this.performCheckWithRetries(service);
      
      // Store result in Golem Base
      if (this.config.storeMetrics) {
        await this.storeCheckResult(result);
      }

      // Update service status
      await this.updateServiceStatus(service, result);

      const checkDuration = Date.now() - startTime;
      this.logger.debug('Service check completed', {
        serviceId: service.id,
        status: result.status,
        duration: checkDuration,
        responseTime: result.responseTime
      });

      this.emit('check-completed', { service, result });
      
      span?.setTag('check.status', result.status);
      span?.setTag('check.duration', checkDuration);
      
      return result;
      
    } catch (error) {
      const checkDuration = Date.now() - startTime;
      
      const result: CheckResult = {
        serviceId: service.id,
        nestId: service.nestId,
        status: 'unknown',
        message: `Check failed: ${error.message}`,
        timestamp: Date.now(),
        checkDuration,
        attempt: 1
      };

      this.logger.error('Service check failed', { 
        error, 
        serviceId: service.id,
        nestId: service.nestId 
      });

      this.emit('check-failed', { service, error, result });
      
      span?.setTag('error', true);
      span?.setTag('check.duration', checkDuration);
      
      return result;
    } finally {
      span?.finish();
    }
  }

  // Private: Schedule a service for regular monitoring
  private scheduleService(service: NestService): void {
    // Clear existing interval if any
    const existingInterval = this.checkIntervals.get(service.id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Schedule new interval
    const intervalId = setInterval(async () => {
      try {
        await this.checkService(service);
      } catch (error) {
        this.logger.error('Scheduled check failed', { 
          error, 
          serviceId: service.id,
          nestId: service.nestId 
        });
      }
    }, service.interval * 1000);

    this.checkIntervals.set(service.id, intervalId);
    
    this.logger.debug('Service scheduled for monitoring', {
      serviceId: service.id,
      interval: service.interval
    });
  }

  // Private: Perform check with retry logic
  private async performCheckWithRetries(service: NestService): Promise<CheckResult> {
    let lastError: Error | null = null;
    let lastResult: CheckResult | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await this.performSingleCheck(service, attempt);
        
        if (result.status === 'up') {
          return result;
        }
        
        lastResult = result;
        
        // If not the last attempt and service is down, wait before retry
        if (attempt < this.config.maxRetries) {
          await this.wait(this.config.retryDelay);
        }
        
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.maxRetries) {
          await this.wait(this.config.retryDelay);
        }
      }
    }

    // All attempts failed, check network connectivity
    if (this.config.networkConnectivityCheck) {
      const hasConnectivity = await this.checkNetworkConnectivity();
      if (!hasConnectivity) {
        return {
          serviceId: service.id,
          nestId: service.nestId,
          status: 'unknown',
          message: 'Network connectivity issue - unable to verify service status',
          timestamp: Date.now(),
          checkDuration: 0,
          attempt: this.config.maxRetries
        };
      }
    }

    // Return the last result or create error result
    return lastResult || {
      serviceId: service.id,
      nestId: service.nestId,
      status: 'down',
      message: lastError?.message || `Service failed all ${this.config.maxRetries} attempts`,
      timestamp: Date.now(),
      checkDuration: 0,
      attempt: this.config.maxRetries
    };
  }

  // Private: Perform a single check attempt
  private async performSingleCheck(service: NestService, attempt: number): Promise<CheckResult> {
    const startTime = Date.now();
    let status: "up" | "down" | "unknown" = "down";
    let message = "";
    let responseTime: number | undefined;
    let metadata: Record<string, any> = {};

    try {
      switch (service.type) {
        case "web":
          const webResult = await this.checkWebService(service.target);
          status = webResult.status;
          responseTime = webResult.responseTime;
          message = webResult.message || (status === 'up' ? 'OK' : 'Service unavailable');
          break;

        case "tcp":
          const [host, portStr] = service.target.split(":");
          const port = portStr ? parseInt(portStr, 10) : NaN;
          if (host && !isNaN(port)) {
            const tcpResult = await this.checkTcpService(host, port);
            status = tcpResult.status;
            responseTime = tcpResult.responseTime;
            message = tcpResult.message || `TCP ${host}:${port}`;
          } else {
            status = "down";
            message = "Invalid TCP target format. Expected host:port.";
          }
          break;

        case "ping":
          const pingResult = await this.checkPingService(service.target);
          status = pingResult.status;
          message = pingResult.message || `Ping ${service.target}`;
          break;

        case "dns":
          const dnsResult = await this.checkDnsService(service.target, service.dnsConfig);
          status = dnsResult.status;
          message = dnsResult.message;
          break;

        case "ssl":
          const sslResult = await this.checkSslService(service.target, service.sslConfig);
          status = sslResult.status;
          message = sslResult.message;
          break;

        case "keyword":
          if (service.keywordConfig && service.target) {
            const keywordResult = await this.checkKeywordService(service.target, service.keywordConfig);
            status = keywordResult.status;
            message = keywordResult.message;
            responseTime = keywordResult.responseTime;
          } else {
            status = "down";
            message = "Invalid keyword service configuration";
          }
          break;

        case "port":
          if (service.portConfig) {
            const portResult = await this.checkPortService(service.portConfig);
            status = portResult.status;
            message = portResult.message;
            responseTime = portResult.responseTime;
          } else {
            status = "down";
            message = "Invalid port service configuration";
          }
          break;

        case "heartbeat":
          const heartbeatResult = await this.checkHeartbeatService(service);
          status = heartbeatResult.status;
          message = heartbeatResult.message;
          break;

        case "github":
          if (service.target) {
            const githubResult = await this.checkGitHubRepository(service.target, service);
            status = githubResult.status;
            message = githubResult.message;
            metadata = githubResult.metrics || {};
          } else {
            status = "down";
            message = "Invalid GitHub service configuration";
          }
          break;

        case "uptime-api":
          const uptimeResult = await this.checkUptimeApiService(service.target, service);
          status = uptimeResult.status;
          message = uptimeResult.message;
          metadata = uptimeResult.metrics || {};
          break;

        case "custom":
          if (service.target.startsWith("custom:")) {
            const config = service.target.substring(7);
            const customResult = await this.checkExternalMonitoringApi(config);
            status = customResult.status;
            message = customResult.message;
          } else {
            const [apiUrl, expectedStatusStr] = service.target.split(":");
            const expectedStatus = expectedStatusStr ? parseInt(expectedStatusStr, 10) : 200;
            if (apiUrl) {
              const customResult = await this.checkCustomApiService(apiUrl, expectedStatus);
              status = customResult.status;
              message = customResult.message || `Custom API ${apiUrl}`;
            } else {
              status = "down";
              message = "Invalid Custom API target format.";
            }
          }
          break;

        case "aws-health":
          const awsResult = await this.checkAwsHealth(service.cloudConfig);
          status = awsResult.status;
          message = awsResult.message;
          break;

        case "azure-health":
          const azureResult = await this.checkAzureHealth(service.cloudConfig);
          status = azureResult.status;
          message = azureResult.message;
          break;

        case "gcp-health":
          const gcpResult = await this.checkGcpHealth(service.cloudConfig);
          status = gcpResult.status;
          message = gcpResult.message;
          break;

        case "kubernetes":
          const k8sResult = await this.checkKubernetesHealth(service.kubernetesConfig);
          status = k8sResult.status;
          message = k8sResult.message;
          break;

        case "docker":
          const dockerResult = await this.checkDockerHealth(service.dockerConfig);
          status = dockerResult.status;
          message = dockerResult.message;
          break;

        default:
          status = "down";
          message = `Unknown service type: ${service.type}`;
      }
    } catch (error: any) {
      status = "down";
      message = error.message || "An unknown error occurred during check.";
    }

    return {
      serviceId: service.id,
      nestId: service.nestId,
      status,
      message,
      responseTime,
      timestamp: Date.now(),
      checkDuration: Date.now() - startTime,
      attempt,
      metadata
    };
  }

  // Store check result in Golem Base
  private async storeCheckResult(result: CheckResult): Promise<void> {
    try {
      await this.config.golemAdapter.storeNestData(
        result.nestId,
        DataType.MONITORING_DATA,
        result,
        { 
          key: `check:${result.serviceId}:${result.timestamp}`,
          serviceId: result.serviceId,
          status: result.status 
        }
      );
    } catch (error) {
      this.logger.error('Failed to store check result', { error, result });
    }
  }

  // Update service status in Golem Base
  private async updateServiceStatus(service: NestService, result: CheckResult): Promise<void> {
    try {
      const updatedService = {
        ...service,
        lastStatus: result.status,
        lastCheck: result.timestamp,
        message: result.message,
        responseTime: result.responseTime,
        updatedAt: Date.now()
      };

      await this.config.golemAdapter.storeNestData(
        service.nestId,
        DataType.NEST_CONFIGURATION,
        updatedService,
        { key: `service:${service.id}`, serviceType: 'monitoring' }
      );
    } catch (error) {
      this.logger.error('Failed to update service status', { error, serviceId: service.id });
    }
  }

  // Utility: Wait for specified seconds
  private wait(seconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  // Network connectivity check
  private async checkNetworkConnectivity(): Promise<boolean> {
    const testUrls = this.config.networkTestUrls || [
      "https://dns.google",
      "https://cloudflare.com",
      "https://google.com"
    ];

    for (const url of testUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(url, {
          method: "HEAD",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Continue to next URL
      }
    }

    return false;
  }

  // Health check
  getHealthStatus(): { healthy: boolean; details: any } {
    return {
      healthy: this.isInitialized,
      details: {
        initialized: this.isInitialized,
        activeChecks: this.activeChecks.size,
        scheduledServices: this.checkIntervals.size,
        queueSize: this.checkQueue.length,
        processingQueue: this.isProcessingQueue
      }
    };
  }

  // Shutdown cleanup
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down MonitoringEngine');
    
    // Clear all intervals
    for (const [serviceId, intervalId] of this.checkIntervals) {
      clearInterval(intervalId);
    }
    this.checkIntervals.clear();

    // Wait for active checks to complete
    if (this.activeChecks.size > 0) {
      this.logger.info(`Waiting for ${this.activeChecks.size} active checks to complete`);
      await Promise.allSettled(Array.from(this.activeChecks.values()));
    }

    this.emit('shutdown');
  }

  // CHECK IMPLEMENTATIONS (ported from original monitoring.ts)
  // Web Service Check
  private async checkWebService(url: string): Promise<{ status: "up" | "down"; responseTime?: number; message?: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.checkTimeout);
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
      });
      const responseTime = Date.now() - startTime;
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return { status: "up", responseTime, message: "OK" };
      }
      
      // Fallback: if HEAD returns 405 or other method not allowed errors, try GET
      if (response.status === 405 || response.status === 403 || response.status === 404) {
        try {
          const getStartTime = Date.now();
          const getResponse = await fetch(url, {
            method: "GET",
            signal: controller.signal,
          });
          const getResponseTime = Date.now() - getStartTime;
          return { 
            status: getResponse.ok ? "up" : "down", 
            responseTime: getResponse.ok ? getResponseTime : undefined,
            message: getResponse.ok ? "OK (GET fallback)" : `HTTP ${getResponse.status}`
          };
        } catch (getError: any) {
          return { status: "down", message: `GET fallback failed: ${getError.message}` };
        }
      }
      return { status: "down", message: `HTTP ${response.status}` };
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        return { status: "down", message: "Request timeout" };
      }
      return { status: "down", message: error.message };
    }
  }

  // TCP Service Check
  private async checkTcpService(host: string, port: number): Promise<{ status: "up" | "down"; responseTime?: number; message?: string }> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const startTime = Date.now();
      socket.setTimeout(this.config.checkTimeout);

      socket.on("connect", () => {
        const responseTime = Date.now() - startTime;
        socket.destroy();
        resolve({ status: "up", responseTime, message: `Connected to ${host}:${port}` });
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve({ status: "down", message: `Connection timeout to ${host}:${port}` });
      });

      socket.on("error", (err: any) => {
        socket.destroy();
        resolve({ status: "down", message: `Connection failed: ${err.message}` });
      });

      socket.connect(port, host);
    });
  }

  // Ping Service Check
  private async checkPingService(host: string): Promise<{ status: "up" | "down"; message?: string }> {
    // Remove protocol if present to get just the hostname/IP
    const cleanHost = host
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      ?.split(":")[0];

    if (!cleanHost) {
      return { status: "down", message: `Invalid host format: ${host}` };
    }

    // Try ICMP ping first
    const pingResult = await this.trySystemPing(cleanHost);
    if (pingResult.status === "up") {
      return pingResult;
    }

    // Fallback to TCP port scanning on common ports
    const commonPorts = [80, 443, 22, 21, 25, 53, 110, 993, 995];
    for (const port of commonPorts) {
      const tcpResult = await this.checkTcpService(cleanHost, port);
      if (tcpResult.status === "up") {
        return { status: "up", message: `Reachable via TCP port ${port}` };
      }
    }

    // Final fallback to HTTP/HTTPS check
    return await this.tryHttpPing(host);
  }

  private async trySystemPing(host: string): Promise<{ status: "up" | "down"; message?: string }> {
    return new Promise((resolve) => {
      const pingCmd = process.platform === "win32" ? "ping" : "ping";
      const pingArgs = process.platform === "win32"
        ? ["-n", "1", "-w", "3000", host]
        : ["-c", "1", "-W", "3", host];

      const pingProcess = spawn(pingCmd, pingArgs);
      let timeoutId: NodeJS.Timeout;

      timeoutId = setTimeout(() => {
        pingProcess.kill();
        resolve({ status: "down", message: "Ping timeout" });
      }, 5000);

      pingProcess.on("exit", (code) => {
        clearTimeout(timeoutId);
        resolve({ 
          status: code === 0 ? "up" : "down", 
          message: code === 0 ? "Ping successful" : "Ping failed" 
        });
      });

      pingProcess.on("error", (error) => {
        clearTimeout(timeoutId);
        resolve({ status: "down", message: `Ping error: ${error.message}` });
      });
    });
  }

  private async tryHttpPing(host: string): Promise<{ status: "up" | "down"; message?: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const url = host.startsWith("http") ? host : `http://${host}`;
      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return { 
        status: response.ok ? "up" : "down", 
        message: response.ok ? "HTTP ping successful" : `HTTP ${response.status}` 
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      // If HTTP fails, try HTTPS
      try {
        const httpsUrl = host.startsWith("http")
          ? host.replace("http:", "https:")
          : `https://${host}`;
        const response = await fetch(httpsUrl, {
          method: "HEAD",
          signal: controller.signal,
        });
        return { 
          status: response.ok ? "up" : "down", 
          message: response.ok ? "HTTPS ping successful" : `HTTPS ${response.status}` 
        };
      } catch (httpsError) {
        return { status: "down", message: `HTTP/HTTPS ping failed: ${error.message}` };
      }
    }
  }

  // DNS Service Check
  private async checkDnsService(
    hostname: string,
    config?: {
      recordType?: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS";
      expectedValue?: string;
      resolver?: string;
    }
  ): Promise<{ status: "up" | "down"; message: string }> {
    try {
      const recordType = config?.recordType || "A";
      const resolver = config?.resolver || "8.8.8.8";
      
      return new Promise((resolve) => {
        const dnsResolver = new dns.Resolver();
        dnsResolver.setServers([resolver]);
        
        const timeout = setTimeout(() => {
          resolve({
            status: "down",
            message: `DNS resolution timeout for ${hostname} (${recordType})`,
          });
        }, 5000);
        
        const handleResult = (err: any, records: any) => {
          clearTimeout(timeout);
          if (err) {
            resolve({
              status: "down",
              message: `DNS resolution failed: ${err.message}`,
            });
            return;
          }
          
          if (config?.expectedValue) {
            const recordValues = Array.isArray(records) ? records : [records];
            const hasExpected = recordValues.some((record: any) => 
              typeof record === 'string' 
                ? record === config.expectedValue
                : record.name === config.expectedValue || record.exchange === config.expectedValue
            );
            
            if (!hasExpected) {
              resolve({
                status: "down",
                message: `Expected value "${config.expectedValue}" not found in DNS records`,
              });
              return;
            }
          }
          
          resolve({
            status: "up",
            message: `DNS resolution successful: ${recordType} records found`,
          });
        };
        
        switch (recordType) {
          case "A":
            dnsResolver.resolve4(hostname, handleResult);
            break;
          case "AAAA":
            dnsResolver.resolve6(hostname, handleResult);
            break;
          case "CNAME":
            dnsResolver.resolveCname(hostname, handleResult);
            break;
          case "MX":
            dnsResolver.resolveMx(hostname, handleResult);
            break;
          case "TXT":
            dnsResolver.resolveTxt(hostname, handleResult);
            break;
          case "NS":
            dnsResolver.resolveNs(hostname, handleResult);
            break;
          default:
            clearTimeout(timeout);
            resolve({
              status: "down",
              message: `Unsupported DNS record type: ${recordType}`,
            });
        }
      });
    } catch (error: any) {
      return {
        status: "down",
        message: `DNS check error: ${error.message}`,
      };
    }
  }

  // SSL Certificate Check
  private async checkSslService(
    hostname: string,
    config?: {
      checkExpiry?: boolean;
      warningDays?: number;
      checkChain?: boolean;
    }
  ): Promise<{ status: "up" | "down"; message: string }> {
    try {
      const host = hostname.replace(/^https?:\/\//, "").split('/')[0]?.split(':')[0];
      const port = hostname.includes(':') ? parseInt(hostname.split(':')[1] || "443") : 443;
      const warningDays = config?.warningDays || 30;
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({
            status: "down",
            message: `SSL connection timeout for ${host}:${port}`,
          });
        }, 10000);
        
        const socket = tls.connect(port, host, { servername: host }, () => {
          clearTimeout(timeout);
          const cert = socket.getPeerCertificate();
          
          if (!cert || Object.keys(cert).length === 0) {
            socket.destroy();
            resolve({
              status: "down",
              message: "No SSL certificate found",
            });
            return;
          }
          
          // Check certificate expiry
          if (config?.checkExpiry !== false) {
            const expiryDate = new Date(cert.valid_to);
            const now = new Date();
            const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysUntilExpiry <= 0) {
              socket.destroy();
              resolve({
                status: "down",
                message: `SSL certificate expired on ${cert.valid_to}`,
              });
              return;
            }
            
            if (daysUntilExpiry <= warningDays) {
              socket.destroy();
              resolve({
                status: "down",
                message: `SSL certificate expires in ${daysUntilExpiry} days (${cert.valid_to})`,
              });
              return;
            }
          }
          
          socket.destroy();
          resolve({
            status: "up",
            message: `SSL certificate valid until ${cert.valid_to}`,
          });
        });
        
        socket.on("error", (err) => {
          clearTimeout(timeout);
          socket.destroy();
          resolve({
            status: "down",
            message: `SSL connection failed: ${err.message}`,
          });
        });
      });
    } catch (error: any) {
      return {
        status: "down",
        message: `SSL check error: ${error.message}`,
      };
    }
  }

  // Additional check implementations would continue here...
  // For brevity, I'll implement the key ones above and indicate the rest

  private async checkKeywordService(
    url: string,
    config: {
      keyword: string;
      caseSensitive?: boolean;
      mustContain?: boolean;
    }
  ): Promise<{ status: "up" | "down"; responseTime?: number; message: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
      });
      const responseTime = Date.now() - startTime;
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          status: "down",
          responseTime,
          message: `HTTP ${response.status} - Cannot fetch content for keyword check`,
        };
      }

      const content = await response.text();
      const { keyword, caseSensitive = false, mustContain = true } = config;
      
      const searchContent = caseSensitive ? content : content.toLowerCase();
      const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();
      const containsKeyword = searchContent.includes(searchKeyword);

      if (mustContain && containsKeyword) {
        return {
          status: "up",
          responseTime,
          message: `Keyword "${keyword}" found in response`,
        };
      } else if (!mustContain && !containsKeyword) {
        return {
          status: "up",
          responseTime,
          message: `Keyword "${keyword}" not found in response (as expected)`,
        };
      } else {
        return {
          status: "down",
          responseTime,
          message: mustContain
            ? `Keyword "${keyword}" not found in response`
            : `Keyword "${keyword}" found in response (should not be present)`,
        };
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        return {
          status: "down",
          message: `Keyword check timed out for ${url}`,
        };
      }
      return {
        status: "down",
        message: `Keyword check failed: ${error.message}`,
      };
    }
  }

  private async checkPortService(
    config: {
      host: string;
      port: number;
      protocol?: 'tcp' | 'udp';
      banner?: string;
      timeout?: number;
    }
  ): Promise<{ status: "up" | "down"; responseTime?: number; message: string }> {
    const { host, port, protocol = 'tcp', banner, timeout = 5000 } = config;
    const startTime = Date.now();

    if (protocol === 'udp') {
      return {
        status: "down",
        message: "UDP monitoring not yet implemented",
      };
    }

    return new Promise((resolve) => {
      const socket = new net.Socket();
      let responseTime: number;
      let receivedData = '';

      socket.setTimeout(timeout);

      socket.on("connect", () => {
        responseTime = Date.now() - startTime;
        
        if (!banner) {
          socket.destroy();
          resolve({
            status: "up",
            responseTime,
            message: `Port ${port} open on ${host}`,
          });
          return;
        }

        setTimeout(() => {
          if (receivedData.trim() === '') {
            socket.destroy();
            resolve({
              status: "down",
              responseTime,
              message: `Port ${port} open but no banner received (expected: "${banner}")`,
            });
          }
        }, 2000);
      });

      socket.on("data", (data) => {
        receivedData += data.toString();
        
        if (banner) {
          const receivedBanner = receivedData.trim();
          if (receivedBanner.includes(banner)) {
            socket.destroy();
            resolve({
              status: "up",
              responseTime: responseTime || Date.now() - startTime,
              message: `Port ${port} open with expected banner: "${banner}"`,
            });
          } else if (receivedData.length > 1000) {
            socket.destroy();
            resolve({
              status: "down",
              responseTime: responseTime || Date.now() - startTime,
              message: `Port ${port} open but banner mismatch. Expected: "${banner}", Got: "${receivedBanner.substring(0, 100)}..."`,
            });
          }
        }
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve({
          status: "down",
          message: `Connection to ${host}:${port} timed out`,
        });
      });

      socket.on("error", (err: any) => {
        socket.destroy();
        let errorMessage = `Port ${port} on ${host} is closed or unreachable`;
        
        if (err.code === 'ECONNREFUSED') {
          errorMessage = `Connection refused to ${host}:${port}`;
        } else if (err.code === 'ETIMEDOUT') {
          errorMessage = `Connection to ${host}:${port} timed out`;
        } else if (err.code === 'EHOSTUNREACH') {
          errorMessage = `Host ${host} is unreachable`;
        } else if (err.code === 'ENETUNREACH') {
          errorMessage = `Network unreachable to ${host}`;
        }

        resolve({
          status: "down",
          message: errorMessage,
        });
      });

      try {
        socket.connect(port, host);
      } catch (error: any) {
        resolve({
          status: "down",
          message: `Failed to connect to ${host}:${port}: ${error.message}`,
        });
      }
    });
  }

  private async checkHeartbeatService(service: NestService): Promise<{ status: "up" | "down"; message: string }> {
    const config = service.heartbeatConfig;
    if (!config) {
      return {
        status: "down",
        message: "Heartbeat configuration missing",
      };
    }

    const { expectedInterval, tolerance, lastHeartbeat } = config;
    const now = Date.now();

    if (!lastHeartbeat) {
      return {
        status: "down",
        message: "No heartbeat received yet",
      };
    }

    const timeSinceLastHeartbeat = (now - lastHeartbeat) / 1000;
    const maxAllowedDelay = expectedInterval + tolerance;

    if (timeSinceLastHeartbeat <= maxAllowedDelay) {
      const nextExpected = Math.max(0, expectedInterval - timeSinceLastHeartbeat);
      return {
        status: "up",
        message: `Last heartbeat ${Math.round(timeSinceLastHeartbeat)}s ago (next expected in ${Math.round(nextExpected)}s)`,
      };
    } else {
      const overdue = timeSinceLastHeartbeat - expectedInterval;
      return {
        status: "down",
        message: `Heartbeat overdue by ${Math.round(overdue)}s (last seen ${Math.round(timeSinceLastHeartbeat)}s ago)`,
      };
    }
  }

  // GitHub Repository Check with detailed metrics
  private async checkGitHubRepository(repoUrl: string, service: NestService): Promise<{ status: "up" | "down"; message: string; metrics?: any }> {
    try {
      // Extract owner/repo from URL
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        return {
          status: "down",
          message: "Invalid GitHub repository URL format",
        };
      }

      const [, owner, repo] = match;
      const repoName = repo.replace(/\.git$/, ""); // Remove .git suffix if present

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.checkTimeout);

      // First check if repo is accessible via web
      const webResult = await this.checkWebService(repoUrl);
      if (webResult.status === "down") {
        clearTimeout(timeoutId);
        return {
          status: "down",
          message: "Repository not accessible",
        };
      }

      // Fetch repository data from GitHub API
      const apiUrl = `https://api.github.com/repos/${owner}/${repoName}`;
      const headers: Record<string, string> = {
        "User-Agent": "GuardAnt-Monitor/1.0",
        "Accept": "application/vnd.github.v3+json",
      };

      // Add GitHub token if available (for private repos)
      const token = service?.github?.token || process.env.GITHUB_TOKEN;
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          return {
            status: "down",
            message: "Repository not found",
          };
        }
        if (response.status === 403) {
          return {
            status: "up", // Repo exists but API rate limited
            message: "Repository accessible (GitHub API rate limited - add GITHUB_TOKEN for metrics)",
          };
        }
        return {
          status: "up", // Repo exists but API might be limited
          message: `Repository accessible (API: ${response.status})`,
        };
      }

      const repoData = await response.json();

      // Fetch additional metrics
      const [issuesResponse, pullsResponse, releasesResponse] = await Promise.allSettled([
        fetch(`${apiUrl}/issues?state=open&per_page=1`, { headers }),
        fetch(`${apiUrl}/pulls?state=open&per_page=1`, { headers }),
        fetch(`${apiUrl}/releases/latest`, { headers }),
      ]);

      // Parse additional data
      let openIssues = 0;
      let openPulls = 0;
      let latestRelease = null;

      if (issuesResponse.status === "fulfilled" && issuesResponse.value.ok) {
        const linkHeader = issuesResponse.value.headers.get("Link");
        if (linkHeader) {
          const match = linkHeader.match(/page=(\d+)>; rel="last"/);
          openIssues = match ? parseInt(match[1]) : 1;
        } else {
          const issues = await issuesResponse.value.json();
          openIssues = issues.length;
        }
      }

      if (pullsResponse.status === "fulfilled" && pullsResponse.value.ok) {
        const linkHeader = pullsResponse.value.headers.get("Link");
        if (linkHeader) {
          const match = linkHeader.match(/page=(\d+)>; rel="last"/);
          openPulls = match ? parseInt(match[1]) : 1;
        } else {
          const pulls = await pullsResponse.value.json();
          openPulls = pulls.length;
        }
      }

      if (releasesResponse.status === "fulfilled" && releasesResponse.value.ok) {
        latestRelease = await releasesResponse.value.json();
      }

      // Calculate repository health score
      const now = new Date();
      const lastUpdate = new Date(repoData.updated_at);
      const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      
      let healthScore = 100;
      if (daysSinceUpdate > 365) healthScore -= 30;
      else if (daysSinceUpdate > 180) healthScore -= 15;
      else if (daysSinceUpdate > 30) healthScore -= 5;
      
      if (openIssues > 100) healthScore -= 10;
      else if (openIssues > 50) healthScore -= 5;

      const metrics = {
        owner: repoData.owner.login,
        name: repoData.name,
        description: repoData.description,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        watchers: repoData.watchers_count,
        openIssues,
        openPulls,
        language: repoData.language,
        license: repoData.license?.name || "None",
        isPrivate: repoData.private,
        lastUpdate: repoData.updated_at,
        daysSinceUpdate,
        defaultBranch: repoData.default_branch,
        size: repoData.size, // KB
        hasWiki: repoData.has_wiki,
        hasPages: repoData.has_pages,
        latestRelease: latestRelease ? {
          tag: latestRelease.tag_name,
          name: latestRelease.name,
          publishedAt: latestRelease.published_at,
          prerelease: latestRelease.prerelease,
        } : null,
        healthScore: Math.max(0, healthScore),
        url: repoData.html_url,
      };

      return {
        status: "up",
        message: `Repository active (${repoData.stargazers_count} stars, updated ${daysSinceUpdate}d ago)`,
        metrics,
      };
    } catch (error: any) {
      return {
        status: "down",
        message: `GitHub API check failed: ${error.message}`,
      };
    }
  }

  private async checkUptimeApiService(url: string, service?: NestService): Promise<{ status: "up" | "down"; message: string; metrics?: any }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout for uptime APIs

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "GuardAnt-Monitor/1.0",
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          status: "down",
          message: `Uptime API returned status ${response.status}`,
        };
      }

      const data = await response.json();

      // Check if this looks like an uptime API response
      const dataObj = data as any;
      if (!dataObj.monitors || !Array.isArray(dataObj.monitors)) {
        return {
          status: "down",
          message: "Invalid uptime API response - no monitors array found",
        };
      }

      // Analyze the monitors
      const monitors = dataObj.monitors;
      const totalMonitors = monitors.length;
      const upMonitors = monitors.filter((m: any) => m.status === "up").length;
      const downMonitors = monitors.filter(
        (m: any) => m.status === "down"
      ).length;
      const maintenanceMonitors = monitors.filter(
        (m: any) => m.status === "maintenance"
      ).length;

      // Calculate overall status
      let overallStatus: "up" | "down" = "up";
      let message = "";

      if (downMonitors > 0) {
        overallStatus = "down";
        message = `${downMonitors}/${totalMonitors} monitors down`;
      } else if (maintenanceMonitors > 0) {
        overallStatus = "up"; // Maintenance is considered operational
        message = `${maintenanceMonitors}/${totalMonitors} monitors in maintenance`;
      } else {
        message = `All ${totalMonitors} monitors operational`;
      }

      // Calculate average availability if available
      let avgAvailability = null;
      if (monitors.some((m: any) => m.availbilitySummary?.availability)) {
        const totalAvailability = monitors.reduce(
          (sum: number, m: any) =>
            sum + (m.availbilitySummary?.availability || 0),
          0
        );
        avgAvailability = totalAvailability / totalMonitors;
      }

      // Extract metrics for detailed monitoring
      const metrics = {
        totalMonitors,
        upMonitors,
        downMonitors,
        maintenanceMonitors,
        avgAvailability,
        monitors: monitors.map((m: any) => {
          // Use custom name if available, otherwise use monitor ID
          const customName = service?.uptimeConfig?.monitorNames?.[m.id];
          const displayName = customName || `Monitor ${m.id}`;

          return {
            id: m.id,
            name: displayName,
            status: m.status,
            availability: m.availbilitySummary?.availability,
            incidents: m.availbilitySummary?.number_of_incidents,
            downtime: m.availbilitySummary?.total_downtime,
          };
        }),
      };

      return {
        status: overallStatus,
        message: `${message}${
          avgAvailability ? ` (${avgAvailability.toFixed(2)}% avg uptime)` : ""
        }`,
        metrics,
      };
    } catch (error: any) {
      return {
        status: "down",
        message: `Uptime API check failed: ${error.message}`,
      };
    }
  }

  private async checkExternalMonitoringApi(config: string): Promise<{ status: "up" | "down"; message: string }> {
    try {
      // Decode the base64 encoded configuration
      const decodedConfig = JSON.parse(Buffer.from(config, "base64").toString());
      const { url, fields } = decodedConfig;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout for external APIs

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          status: "down",
          message: `External API returned status ${response.status}`,
        };
      }

      const data = await response.json();

      // Extract values from the specified fields
      const extractValue = (obj: any, path: string): any => {
        const parts = path.split(/[\.\[\]]+/).filter(Boolean);
        let current = obj;

        for (const part of parts) {
          if (current === null || current === undefined) {
            return undefined;
          }
          current = current[part];
        }

        return current;
      };

      // Check if any of the monitored fields indicate a down state
      let hasDownStatus = false;
      let allFieldsFound = true;

      for (const field of fields) {
        const value = extractValue(data, field);

        if (value === undefined) {
          allFieldsFound = false;
          continue;
        }

        // Check for common "down" indicators
        if (
          value === "down" ||
          value === false ||
          value === 0 ||
          (field.includes("status") && value !== "up") ||
          (field.includes("availability") &&
            typeof value === "number" &&
            value < 90)
        ) {
          hasDownStatus = true;
          break;
        }
      }

      // If not all fields were found, consider it a configuration issue but still "up"
      if (!allFieldsFound) {
        return {
          status: "up",
          message: "Some monitored fields were not found in the API response",
        };
      }

      return {
        status: hasDownStatus ? "down" : "up",
        message: hasDownStatus ? "External API indicates service issues" : "External API reports all services operational",
      };
    } catch (error: any) {
      return {
        status: "down",
        message: `External monitoring API check failed: ${error.message}`,
      };
    }
  }

  private async checkCustomApiService(url: string, expectedStatus: number = 200): Promise<{ status: "up" | "down"; message: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.checkTimeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return { 
        status: response.status === expectedStatus ? "up" : "down",
        message: `API returned ${response.status} (expected ${expectedStatus})`
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        return { status: "down", message: "API request timeout" };
      }
      return { status: "down", message: `API check failed: ${error.message}` };
    }
  }

  private async checkAwsHealth(config?: any): Promise<{ status: "up" | "down"; message: string }> {
    try {
      const region = config?.region || "us-east-1";
      const endpoint = config?.endpoint || `https://status.aws.amazon.com/rss/${region}.rss`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: {
          "User-Agent": "GuardAnt-Monitor/1.0",
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return {
          status: "down",
          message: `AWS Health API returned ${response.status}`,
        };
      }
      
      const rssText = await response.text();
      
      // Simple RSS parsing to check for service issues
      const hasIssues = !rssText.includes("Service is operating normally") ||
                       rssText.includes("degraded") ||
                       rssText.includes("disruption") ||
                       rssText.includes("outage");
      
      if (hasIssues) {
        return {
          status: "down",
          message: `AWS services experiencing issues in ${region}`,
        };
      }
      
      return {
        status: "up",
        message: `AWS services operational in ${region}`,
      };
    } catch (error: any) {
      return {
        status: "down",
        message: `AWS health check failed: ${error.message}`,
      };
    }
  }

  private async checkAzureHealth(config?: any): Promise<{ status: "up" | "down"; message: string }> {
    try {
      const endpoint = config?.endpoint || "https://status.azure.com/en-us/status/feed/";
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: {
          "User-Agent": "GuardAnt-Monitor/1.0",
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return {
          status: "down",
          message: `Azure Health API returned ${response.status}`,
        };
      }
      
      const rssText = await response.text();
      
      // Check for active incidents
      const hasIssues = rssText.includes("degraded") ||
                       rssText.includes("disruption") ||
                       rssText.includes("outage") ||
                       rssText.includes("incident");
      
      if (hasIssues) {
        return {
          status: "down",
          message: "Azure services experiencing issues",
        };
      }
      
      return {
        status: "up",
        message: "Azure services operational",
      };
    } catch (error: any) {
      return {
        status: "down",
        message: `Azure health check failed: ${error.message}`,
      };
    }
  }

  private async checkGcpHealth(config?: any): Promise<{ status: "up" | "down"; message: string }> {
    try {
      const endpoint = config?.endpoint || "https://status.cloud.google.com/incidents.json";
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: {
          "User-Agent": "GuardAnt-Monitor/1.0",
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return {
          status: "down",
          message: `GCP Health API returned ${response.status}`,
        };
      }
      
      const incidents = await response.json() as any[];
      
      // Check for active incidents
      const activeIncidents = incidents.filter(incident => 
        incident.end === null || new Date(incident.end) > new Date()
      );
      
      if (activeIncidents.length > 0) {
        return {
          status: "down",
          message: `${activeIncidents.length} active GCP incidents`,
        };
      }
      
      return {
        status: "up",
        message: "GCP services operational",
      };
    } catch (error: any) {
      return {
        status: "down",
        message: `GCP health check failed: ${error.message}`,
      };
    }
  }

  private async checkKubernetesHealth(config?: any): Promise<{ status: "up" | "down"; message: string }> {
    try {
      // This is a simplified check - in production you'd use the Kubernetes client library
      // For now, we'll use kubectl commands if available
      const namespace = config?.namespace || "default";
      const resources = config?.resources || ["pods", "services"];
      
      return new Promise((resolve) => {
        const kubectl = spawn("kubectl", ["get", "pods", "-n", namespace, "--no-headers"]);
        
        // Set timeout for the kubectl process
        const timeoutId = setTimeout(() => {
          kubectl.kill();
          resolve({
            status: "down",
            message: "kubectl command timed out",
          });
        }, 10000);
        
        let output = "";
        let error = "";
        
        kubectl.stdout.on("data", (data) => {
          output += data.toString();
        });
        
        kubectl.stderr.on("data", (data) => {
          error += data.toString();
        });
        
        kubectl.on("close", (code) => {
          clearTimeout(timeoutId);
          if (code !== 0) {
            resolve({
              status: "down",
              message: `kubectl failed: ${error || "Unknown error"}`,
            });
            return;
          }
          
          const lines = output.trim().split('\n').filter(line => line.length > 0);
          const totalPods = lines.length;
          const runningPods = lines.filter(line => line.includes("Running")).length;
          
          if (totalPods === 0) {
            resolve({
              status: "down",
              message: `No pods found in namespace ${namespace}`,
            });
            return;
          }
          
          if (runningPods < totalPods) {
            resolve({
              status: "down",
              message: `${runningPods}/${totalPods} pods running in ${namespace}`,
            });
            return;
          }
          
          resolve({
            status: "up",
            message: `${runningPods}/${totalPods} pods running in ${namespace}`,
          });
        });
        
        kubectl.on("error", (err) => {
          clearTimeout(timeoutId);
          resolve({
            status: "down",
            message: `kubectl not available: ${err.message}`,
          });
        });
      });
    } catch (error: any) {
      return {
        status: "down",
        message: `Kubernetes check error: ${error.message}`,
      };
    }
  }

  private async checkDockerHealth(config?: any): Promise<{ status: "up" | "down"; message: string }> {
    try {
      const containers = config?.containers || [];
      
      return new Promise((resolve) => {
        const docker = spawn("docker", ["ps", "--format", "table {{.Names}}\\t{{.Status}}"]);
        
        // Set timeout for the docker process
        const timeoutId = setTimeout(() => {
          docker.kill();
          resolve({
            status: "down",
            message: "Docker command timed out",
          });
        }, 10000);
        
        let output = "";
        let error = "";
        
        docker.stdout.on("data", (data) => {
          output += data.toString();
        });
        
        docker.stderr.on("data", (data) => {
          error += data.toString();
        });
        
        docker.on("close", (code) => {
          clearTimeout(timeoutId);
          if (code !== 0) {
            resolve({
              status: "down",
              message: `Docker command failed: ${error || "Docker not available"}`,
            });
            return;
          }
          
          const lines = output.trim().split('\n').slice(1); // Skip header
          const runningContainers = lines.filter(line => line.includes("Up")).length;
          const totalContainers = lines.length;
          
          if (containers.length > 0) {
            // Check specific containers
            const requestedContainers = containers.filter((name: string) => 
              lines.some(line => line.includes(name))
            );
            
            if (requestedContainers.length < containers.length) {
              resolve({
                status: "down",
                message: `${requestedContainers.length}/${containers.length} requested containers found`,
              });
              return;
            }
          }
          
          if (totalContainers === 0) {
            resolve({
              status: "down",
              message: "No Docker containers running",
            });
            return;
          }
          
          resolve({
            status: "up",
            message: `${runningContainers}/${totalContainers} containers running`,
          });
        });
        
        docker.on("error", (err) => {
          clearTimeout(timeoutId);
          resolve({
            status: "down",
            message: `Docker not available: ${err.message}`,
          });
        });
      });
    } catch (error: any) {
      return {
        status: "down",
        message: `Docker check error: ${error.message}`,
      };
    }
  }
}

// Factory function
export function createMonitoringEngine(
  serviceName: string,
  config: MonitoringEngineConfig,
  tracing?: GuardAntTracing
): MonitoringEngine {
  return new MonitoringEngine(serviceName, config, tracing);
}

// Default configuration factory
export function createDefaultMonitoringConfig(golemAdapter: GolemAdapter): MonitoringEngineConfig {
  return {
    enabled: true,
    maxRetries: 3,
    retryDelay: 5, // seconds
    checkTimeout: 10000, // 10 seconds
    concurrentChecks: 10,
    enableMetrics: true,
    enableDetailedLogging: true,
    storeMetrics: true,
    golemAdapter,
    networkConnectivityCheck: true,
    networkTestUrls: [
      "https://dns.google",
      "https://cloudflare.com",
      "https://google.com"
    ]
  };
}