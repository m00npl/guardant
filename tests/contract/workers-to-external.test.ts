/**
 * Contract tests for Workers -> External Services communication
 * Tests the contract for monitoring external services and APIs
 */

import { GuardAntPactSetup, GuardAntInteractions } from './pact-consumer';
import { ExternalServiceClient } from '../../services/workers/src/clients/external-service-client';
import { describe, beforeAll, afterAll, test, expect } from 'bun:test';

describe('Workers -> External Services Contract', () => {
  let pactSetup: GuardAntPactSetup;
  let externalClient: ExternalServiceClient;

  beforeAll(async () => {
    pactSetup = new GuardAntPactSetup('./tests/contract/pacts');
    await pactSetup.setupAll();
    
    // Configure client to use Pact mock server
    externalClient = new ExternalServiceClient({
      baseUrl: 'http://localhost:1237',
      timeout: 30000,
      userAgent: 'GuardAnt-Monitor/1.0'
    });
  });

  afterAll(async () => {
    await pactSetup.teardownAll();
  });

  test('should perform health checks on external services', async () => {
    const pact = pactSetup.getPact('workers-to-external');
    
    await pact.addInteraction(GuardAntInteractions.externalHealthCheck());

    // Act
    const result = await externalClient.checkHealth('/health');

    // Assert
    expect(result.status).toBe('healthy');
    expect(result.timestamp).toBeString();
    expect(result.version).toBeString();
    expect(result.uptime).toBeNumber();

    await pact.verify();
  });

  test('should monitor HTTP endpoints with status code validation', async () => {
    const pact = pactSetup.getPact('workers-to-external');
    
    await pact.addInteraction({
      state: 'external HTTP endpoint is operational',
      uponReceiving: 'an HTTP monitoring request',
      withRequest: {
        method: 'GET',
        path: '/api/status',
        headers: {
          'User-Agent': 'GuardAnt-Monitor/1.0',
          'Accept': 'application/json'
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Server': 'nginx/1.20.1'
        },
        body: {
          status: 'ok',
          service: 'user-api',
          version: '2.1.0',
          database: 'connected',
          cache: 'connected'
        }
      }
    });

    // Act
    const result = await externalClient.monitorHttpEndpoint('/api/status', {
      expectedStatus: 200,
      headers: {
        'Accept': 'application/json'
      }
    });

    // Assert
    expect(result.statusCode).toBe(200);
    expect(result.responseTime).toBeNumber();
    expect(result.body).toHaveProperty('status');
    expect(result.headers).toHaveProperty('content-type');

    await pact.verify();
  });

  test('should perform TCP port connectivity checks', async () => {
    const pact = pactSetup.getPact('workers-to-external');
    
    await pact.addInteraction({
      state: 'external TCP service is accepting connections',
      uponReceiving: 'a TCP connectivity check',
      withRequest: {
        method: 'CONNECT',
        path: 'tcp://example.com:443'
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Connection': 'established'
        }
      }
    });

    // Act - Note: TCP checks are simplified for contract testing
    const result = await externalClient.checkTcpPort('example.com', 443, { timeout: 10000 });

    // Assert
    expect(result.connected).toBe(true);
    expect(result.responseTime).toBeNumber();
    expect(result.port).toBe(443);

    await pact.verify();
  });

  test('should perform ping connectivity tests', async () => {
    const pact = pactSetup.getPact('workers-to-external');
    
    await pact.addInteraction({
      state: 'external host responds to ping',
      uponReceiving: 'a ping request',
      withRequest: {
        method: 'PING',
        path: 'icmp://example.com'
      },
      willRespondWith: {
        status: 200,
        body: {
          host: 'example.com',
          alive: true,
          time: 25.5,
          ttl: 64
        }
      }
    });

    // Act - Note: Ping checks are simplified for contract testing
    const result = await externalClient.pingHost('example.com', { count: 1 });

    // Assert
    expect(result.alive).toBe(true);
    expect(result.time).toBeNumber();
    expect(result.host).toBe('example.com');

    await pact.verify();
  });

  test('should monitor API endpoints with custom validation', async () => {
    const pact = pactSetup.getPact('workers-to-external');
    
    await pact.addInteraction({
      state: 'external API returns expected data structure',
      uponReceiving: 'an API monitoring request with validation',
      withRequest: {
        method: 'GET',
        path: '/api/v1/metrics',
        headers: {
          'User-Agent': 'GuardAnt-Monitor/1.0',
          'Authorization': 'Bearer api-key-123'
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '99'
        },
        body: {
          metrics: {
            requests_per_second: 150.5,
            error_rate: 0.02,
            avg_response_time: 145,
            active_connections: 1205
          },
          timestamp: '2024-01-15T10:30:00Z',
          version: 'v1.2.3'
        }
      }
    });

    // Act
    const result = await externalClient.monitorApiEndpoint('/api/v1/metrics', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer api-key-123'
      },
      validation: {
        expectedStatus: 200,
        requiredFields: ['metrics', 'timestamp'],
        jsonSchema: {
          type: 'object',
          properties: {
            metrics: { type: 'object' },
            timestamp: { type: 'string' }
          }
        }
      }
    });

    // Assert
    expect(result.statusCode).toBe(200);
    expect(result.validation.passed).toBe(true);
    expect(result.data).toHaveProperty('metrics');
    expect(result.data.metrics).toHaveProperty('requests_per_second');

    await pact.verify();
  });

  test('should handle external service errors gracefully', async () => {
    const pact = pactSetup.getPact('workers-to-external');
    
    await pact.addInteraction({
      state: 'external service is experiencing errors',
      uponReceiving: 'a request to failing service',
      withRequest: {
        method: 'GET',
        path: '/api/failing-endpoint',
        headers: {
          'User-Agent': 'GuardAnt-Monitor/1.0'
        }
      },
      willRespondWith: {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          error: 'Internal Server Error',
          message: 'Database connection failed',
          code: 'DB_CONNECTION_ERROR',
          timestamp: '2024-01-15T10:30:00Z'
        }
      }
    });

    // Act
    const result = await externalClient.monitorHttpEndpoint('/api/failing-endpoint', {
      expectedStatus: 200,
      treatErrorAsDown: true
    });

    // Assert
    expect(result.statusCode).toBe(500);
    expect(result.success).toBe(false);
    expect(result.error).toBeString();
    expect(result.errorDetails).toHaveProperty('message');

    await pact.verify();
  });

  test('should monitor SSL certificate validity', async () => {
    const pact = pactSetup.getPact('workers-to-external');
    
    await pact.addInteraction({
      state: 'external HTTPS service has valid SSL certificate',
      uponReceiving: 'an SSL certificate check',
      withRequest: {
        method: 'GET',
        path: '/ssl-check',
        headers: {
          'User-Agent': 'GuardAnt-Monitor/1.0'
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-SSL-Valid': 'true',
          'X-SSL-Expires': '2024-12-31T23:59:59Z'
        },
        body: {
          ssl: {
            valid: true,
            issuer: 'Let\'s Encrypt Authority X3',
            subject: 'example.com',
            validFrom: '2024-01-01T00:00:00Z',
            validTo: '2024-12-31T23:59:59Z',
            daysUntilExpiry: 351,
            protocol: 'TLSv1.3',
            cipher: 'TLS_AES_256_GCM_SHA384'
          }
        }
      }
    });

    // Act
    const result = await externalClient.checkSslCertificate('example.com', 443);

    // Assert
    expect(result.ssl.valid).toBe(true);
    expect(result.ssl.daysUntilExpiry).toBeNumber();
    expect(result.ssl.issuer).toBeString();
    expect(result.ssl.protocol).toBe('TLSv1.3');

    await pact.verify();
  });

  test('should monitor DNS resolution performance', async () => {
    const pact = pactSetup.getPact('workers-to-external');
    
    await pact.addInteraction({
      state: 'DNS server resolves domain successfully',
      uponReceiving: 'a DNS resolution request',
      withRequest: {
        method: 'QUERY',
        path: 'dns://example.com',
        query: {
          type: 'A',
          server: '8.8.8.8'
        }
      },
      willRespondWith: {
        status: 200,
        body: {
          domain: 'example.com',
          resolved: true,
          addresses: ['93.184.216.34'],
          resolveTime: 15.5,
          ttl: 3600,
          server: '8.8.8.8'
        }
      }
    });

    // Act - Note: DNS checks are simplified for contract testing  
    const result = await externalClient.resolveDns('example.com', {
      recordType: 'A',
      server: '8.8.8.8'
    });

    // Assert
    expect(result.resolved).toBe(true);
    expect(result.addresses).toBeArray();
    expect(result.resolveTime).toBeNumber();
    expect(result.ttl).toBeNumber();

    await pact.verify();
  });

  test('should perform custom webhook monitoring', async () => {
    const pact = pactSetup.getPact('workers-to-external');
    
    await pact.addInteraction({
      state: 'webhook endpoint accepts POST requests',
      uponReceiving: 'a webhook monitoring request',
      withRequest: {
        method: 'POST',
        path: '/webhook/test',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'GuardAnt-Monitor/1.0',
          'X-Webhook-Test': 'true'
        },
        body: {
          test: true,
          timestamp: '2024-01-15T10:30:00Z',
          source: 'guardant-monitor'
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          received: true,
          processed: true,
          webhook_id: 'hook-789',
          response_time: 25
        }
      }
    });

    // Act
    const result = await externalClient.testWebhook('/webhook/test', {
      method: 'POST',
      headers: {
        'X-Webhook-Test': 'true'
      },
      body: {
        test: true,
        timestamp: '2024-01-15T10:30:00Z',
        source: 'guardant-monitor'
      }
    });

    // Assert
    expect(result.statusCode).toBe(200);
    expect(result.data.received).toBe(true);
    expect(result.data.processed).toBe(true);
    expect(result.responseTime).toBeNumber();

    await pact.verify();
  });
});