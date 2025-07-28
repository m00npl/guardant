/**
 * Contract tests for Public API -> Workers communication
 * Tests the contract for real-time status requests and data retrieval
 */

import { GuardAntPactSetup, GuardAntInteractions } from './pact-consumer';
import { WorkerApiClient } from '../../services/public-api/src/clients/worker-api-client';
import { describe, beforeAll, afterAll, test, expect } from 'bun:test';

describe('Public API -> Workers Contract', () => {
  let pactSetup: GuardAntPactSetup;
  let workerClient: WorkerApiClient;

  beforeAll(async () => {
    pactSetup = new GuardAntPactSetup('./tests/contract/pacts');
    await pactSetup.setupAll();
    
    // Configure client to use Pact mock server
    workerClient = new WorkerApiClient({
      baseUrl: 'http://localhost:1236',
      timeout: 5000
    });
  });

  afterAll(async () => {
    await pactSetup.teardownAll();
  });

  test('should request real-time status from workers', async () => {
    const pact = pactSetup.getPact('public-to-workers');
    
    await pact.addInteraction(GuardAntInteractions.realtimeStatusRequest());

    // Act
    const result = await workerClient.getRealtimeStatus({
      nestId: 'nest-123',
      serviceIds: ['service-456', 'service-789']
    }, {
      authorization: 'Bearer api-token-456'
    });

    // Assert
    expect(result.timestamp).toBeString();
    expect(result.services).toBeArray();
    expect(result.services[0]).toHaveProperty('status');
    expect(result.services[0]).toHaveProperty('lastCheck');
    expect(result.services[0]).toHaveProperty('nextCheck');
    expect(result.services[0].regions).toBeArray();

    await pact.verify();
  });

  test('should request historical data from workers', async () => {
    const pact = pactSetup.getPact('public-to-workers');
    
    await pact.addInteraction({
      state: 'worker has historical monitoring data',
      uponReceiving: 'a historical data request',
      withRequest: {
        method: 'GET',
        path: '/api/history',
        query: {
          nestId: 'nest-123',
          serviceId: 'service-456',
          timeRange: '24h',
          granularity: '1h'
        },
        headers: {
          'Authorization': 'Bearer api-token-456'
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          serviceId: 'service-456',
          timeRange: '24h',
          granularity: '1h',
          dataPoints: [
            {
              timestamp: '2024-01-15T09:00:00Z',
              status: 'up',
              responseTime: 145,
              uptime: 100,
              incidents: 0
            },
            {
              timestamp: '2024-01-15T10:00:00Z',
              status: 'up',
              responseTime: 152,
              uptime: 100,
              incidents: 0
            }
          ],
          summary: {
            avgResponseTime: 148.5,
            overallUptime: 100,
            totalIncidents: 0,
            availability: 100
          }
        }
      }
    });

    // Act
    const result = await workerClient.getHistoricalData({
      nestId: 'nest-123',
      serviceId: 'service-456',
      timeRange: '24h',
      granularity: '1h'
    });

    // Assert
    expect(result.serviceId).toBe('service-456');
    expect(result.timeRange).toBe('24h');
    expect(result.dataPoints).toBeArray();
    expect(result.dataPoints[0]).toHaveProperty('timestamp');
    expect(result.dataPoints[0]).toHaveProperty('responseTime');
    expect(result.summary).toHaveProperty('avgResponseTime');

    await pact.verify();
  });

  test('should request service uptime statistics', async () => {
    const pact = pactSetup.getPact('public-to-workers');
    
    await pact.addInteraction({
      state: 'worker has uptime statistics',
      uponReceiving: 'an uptime statistics request',
      withRequest: {
        method: 'GET',
        path: '/api/uptime/stats',
        query: {
          nestId: 'nest-123',
          period: '30d'
        },
        headers: {
          'Authorization': 'Bearer api-token-456'
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          period: '30d',
          services: [
            {
              id: 'service-456',
              name: 'Production API',
              uptime: 99.95,
              downtime: 21.6,
              incidents: 2,
              avgResponseTime: 145,
              p95ResponseTime: 320,
              checks: 43200,
              failures: 22
            }
          ],
          overall: {
            uptime: 99.87,
            incidents: 3,
            mttr: 10.8,
            mtbf: 14400
          }
        }
      }
    });

    // Act
    const result = await workerClient.getUptimeStats({
      nestId: 'nest-123',
      period: '30d'
    });

    // Assert
    expect(result.period).toBe('30d');
    expect(result.services).toBeArray();
    expect(result.services[0]).toHaveProperty('uptime');
    expect(result.services[0]).toHaveProperty('incidents');
    expect(result.overall).toHaveProperty('uptime');
    expect(result.overall).toHaveProperty('mttr');

    await pact.verify();
  });

  test('should stream real-time updates via Server-Sent Events', async () => {
    const pact = pactSetup.getPact('public-to-workers');
    
    await pact.addInteraction({
      state: 'worker supports SSE for real-time updates',
      uponReceiving: 'an SSE connection request',
      withRequest: {
        method: 'GET',
        path: '/api/stream/status',
        query: {
          nestId: 'nest-123'
        },
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Authorization': 'Bearer api-token-456'
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        body: `event: status-update
data: {"serviceId":"service-456","status":"up","responseTime":150,"timestamp":"2024-01-15T10:30:00Z"}

event: heartbeat
data: {"timestamp":"2024-01-15T10:30:30Z"}

`
      }
    });

    // Act - Note: SSE testing is simplified for contract testing
    const response = await fetch('http://localhost:1236/api/stream/status?nestId=nest-123', {
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Authorization': 'Bearer api-token-456'
      }
    });

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    
    const body = await response.text();
    expect(body).toContain('event: status-update');
    expect(body).toContain('event: heartbeat');

    await pact.verify();
  });

  test('should request incident timeline from workers', async () => {
    const pact = pactSetup.getPact('public-to-workers');
    
    await pact.addInteraction({
      state: 'worker has incident timeline data',
      uponReceiving: 'an incident timeline request',
      withRequest: {
        method: 'GET',
        path: '/api/incidents/timeline',
        query: {
          nestId: 'nest-123',
          days: '7'
        },
        headers: {
          'Authorization': 'Bearer api-token-456'
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          period: '7d',
          incidents: [
            {
              id: 'incident-789',
              title: 'API Response Delays',
              status: 'resolved',
              severity: 'minor',
              startTime: '2024-01-14T15:30:00Z',
              endTime: '2024-01-14T16:15:00Z',
              duration: 2700,
              affectedServices: ['service-456'],
              impact: 'Response times increased by 200%',
              rootCause: 'Database connection pool exhaustion',
              timeline: [
                {
                  timestamp: '2024-01-14T15:30:00Z',
                  event: 'incident_detected',
                  message: 'High response times detected'
                },
                {
                  timestamp: '2024-01-14T15:35:00Z',
                  event: 'investigating',
                  message: 'Team investigating root cause'
                },
                {
                  timestamp: '2024-01-14T16:15:00Z',
                  event: 'resolved',
                  message: 'Connection pool size increased'
                }
              ]
            }
          ]
        }
      }
    });

    // Act
    const result = await workerClient.getIncidentTimeline({
      nestId: 'nest-123',
      days: 7
    });

    // Assert
    expect(result.period).toBe('7d');
    expect(result.incidents).toBeArray();
    expect(result.incidents[0]).toHaveProperty('title');
    expect(result.incidents[0]).toHaveProperty('duration');
    expect(result.incidents[0].timeline).toBeArray();
    expect(result.incidents[0].timeline[0]).toHaveProperty('event');

    await pact.verify();
  });

  test('should request regional performance data', async () => {
    const pact = pactSetup.getPact('public-to-workers');
    
    await pact.addInteraction({
      state: 'worker has multi-region performance data',
      uponReceiving: 'a regional performance request',
      withRequest: {
        method: 'GET',
        path: '/api/performance/regions',
        query: {
          nestId: 'nest-123',
          serviceId: 'service-456'
        },
        headers: {
          'Authorization': 'Bearer api-token-456'
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          serviceId: 'service-456',
          regions: [
            {
              id: 'us-east-1',
              name: 'US East (Virginia)',
              status: 'up',
              responseTime: 120,
              uptime: 99.98,
              lastCheck: '2024-01-15T10:29:45Z',
              performance: {
                p50: 110,
                p95: 180,
                p99: 250
              }
            },
            {
              id: 'eu-west-1',
              name: 'EU West (Ireland)',
              status: 'up',
              responseTime: 85,
              uptime: 99.95,
              lastCheck: '2024-01-15T10:29:50Z',
              performance: {
                p50: 75,
                p95: 120,
                p99: 180
              }
            }
          ],
          globalPerformance: {
            bestRegion: 'eu-west-1',
            worstRegion: 'us-east-1',
            avgResponseTime: 102.5,
            globalUptime: 99.96
          }
        }
      }
    });

    // Act
    const result = await workerClient.getRegionalPerformance({
      nestId: 'nest-123',
      serviceId: 'service-456'
    });

    // Assert
    expect(result.serviceId).toBe('service-456');
    expect(result.regions).toBeArray();
    expect(result.regions[0]).toHaveProperty('responseTime');
    expect(result.regions[0]).toHaveProperty('uptime');
    expect(result.regions[0].performance).toHaveProperty('p95');
    expect(result.globalPerformance).toHaveProperty('bestRegion');

    await pact.verify();
  });
});