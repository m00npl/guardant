import type { Service } from '/app/packages/shared-types/src/index';
import { localCache } from '../local-cache';
import { v4 as uuidv4 } from 'uuid';

export interface MonitoringResult {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
  details?: Record<string, any>;
}

export class MonitoringService {
  private region: string;

  constructor(region: string = process.env.WORKER_REGION || 'unknown') {
    this.region = region;
  }

  async checkService(service: Service): Promise<MonitoringResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.performCheck(service, startTime);
      
      // Store result in local cache (will send to RabbitMQ or cache locally if connection failed)
      await this.storeCheckResult(service, result, startTime);
      
      return result;
    } catch (error: any) {
      const failedResult = {
        status: 'down' as const,
        message: error.message || 'Check failed',
        responseTime: Date.now() - startTime,
      };

      // Store failed result too
      await this.storeCheckResult(service, failedResult, startTime);
      
      return failedResult;
    }
  }

  private async performCheck(service: Service, startTime: number): Promise<MonitoringResult> {
    switch (service.type) {
      case 'web':
        return await this.checkWeb(service, startTime);
      case 'tcp':
        return await this.checkTcp(service, startTime);
      case 'ping':
        return await this.checkPing(service, startTime);
      case 'github':
        return await this.checkGitHub(service, startTime);
      case 'uptime-api':
        return await this.checkUptimeApi(service, startTime);
      case 'keyword':
        return await this.checkKeyword(service, startTime);
      case 'heartbeat':
        return await this.checkHeartbeat(service, startTime);
      case 'port':
        return await this.checkPort(service, startTime);
      default:
        throw new Error(`Unknown service type: ${service.type}`);
    }
  }

  private async storeCheckResult(service: Service, result: MonitoringResult, startTime: number): Promise<void> {
    try {
      await localCache.storeCheckResult({
        id: uuidv4(),
        serviceId: service.id,
        nestId: service.nestId,
        timestamp: startTime,
        region: this.region,
        status: result.status,
        responseTime: result.responseTime || 0,
        statusCode: result.details?.statusCode,
        error: result.message,
      });
    } catch (error) {
      console.error('❌ Failed to store check result:', error);
      // Don't throw - monitoring should continue even if storage fails
    }
  }

  private async checkWeb(service: Service, startTime: number): Promise<MonitoringResult> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(service.target, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Guardant/1.0 (https://guardant.me)',
        },
      });

      clearTimeout(timeout);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          status: 'up',
          responseTime,
          message: `HTTP ${response.status}`,
        };
      } else {
        return {
          status: response.status >= 500 ? 'down' : 'degraded',
          responseTime,
          message: `HTTP ${response.status}`,
        };
      }
    } catch (error: any) {
      throw new Error(`Web check failed: ${error.message}`);
    }
  }

  private async checkTcp(service: Service, startTime: number): Promise<MonitoringResult> {
    // TCP check implementation
    // For now, return a placeholder
    return {
      status: 'up',
      responseTime: Date.now() - startTime,
      message: 'TCP check not implemented',
    };
  }

  private async checkPing(service: Service, startTime: number): Promise<MonitoringResult> {
    // ICMP ping implementation
    // For now, return a placeholder
    return {
      status: 'up',
      responseTime: Date.now() - startTime,
      message: 'Ping check not implemented',
    };
  }

  private async checkGitHub(service: Service, startTime: number): Promise<MonitoringResult> {
    try {
      const headers: HeadersInit = {
        'User-Agent': 'Guardant/1.0',
      };

      if (service.config.token) {
        headers['Authorization'] = `token ${service.config.token}`;
      }

      const response = await fetch(`https://api.github.com/repos/${service.target}`, {
        headers,
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          status: 'up',
          responseTime,
          message: 'Repository accessible',
          details: {
            stars: data.stargazers_count,
            forks: data.forks_count,
            openIssues: data.open_issues_count,
          },
        };
      } else if (response.status === 404) {
        return {
          status: 'down',
          responseTime,
          message: 'Repository not found',
        };
      } else {
        return {
          status: 'degraded',
          responseTime,
          message: `GitHub API returned ${response.status}`,
        };
      }
    } catch (error: any) {
      throw new Error(`GitHub check failed: ${error.message}`);
    }
  }

  private async checkUptimeApi(service: Service, startTime: number): Promise<MonitoringResult> {
    // Uptime API check implementation
    return {
      status: 'up',
      responseTime: Date.now() - startTime,
      message: 'Uptime API check not implemented',
    };
  }

  private async checkKeyword(service: Service, startTime: number): Promise<MonitoringResult> {
    try {
      const response = await fetch(service.target);
      const text = await response.text();
      const responseTime = Date.now() - startTime;

      const keyword = service.config.keyword;
      const shouldContain = service.config.shouldContain !== false;
      const caseSensitive = service.config.caseSensitive === true;

      const content = caseSensitive ? text : text.toLowerCase();
      const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();
      const found = content.includes(searchKeyword);

      if ((shouldContain && found) || (!shouldContain && !found)) {
        return {
          status: 'up',
          responseTime,
          message: shouldContain ? 'Keyword found' : 'Keyword not found (as expected)',
        };
      } else {
        return {
          status: 'down',
          responseTime,
          message: shouldContain ? 'Keyword not found' : 'Keyword found (unexpected)',
        };
      }
    } catch (error: any) {
      throw new Error(`Keyword check failed: ${error.message}`);
    }
  }

  private async checkHeartbeat(service: Service, startTime: number): Promise<MonitoringResult> {
    // Check last heartbeat timestamp from Redis
    // Implementation would check if heartbeat was received within tolerance
    return {
      status: 'up',
      responseTime: Date.now() - startTime,
      message: 'Heartbeat check not implemented',
    };
  }

  private async checkPort(service: Service, startTime: number): Promise<MonitoringResult> {
    // Port monitoring implementation
    return {
      status: 'up',
      responseTime: Date.now() - startTime,
      message: 'Port check not implemented',
    };
  }
}