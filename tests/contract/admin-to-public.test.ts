/**
 * Contract tests for Admin API -> Public API communication
 * Tests the contract between admin services and public status pages
 */

import { GuardAntPactSetup, GuardAntInteractions } from './pact-consumer';
import { StatusApiClient } from '../../services/admin-api/src/clients/status-api-client';
import { describe, beforeAll, afterAll, test, expect } from 'bun:test';

describe('Admin API -> Public API Contract', () => {
  let pactSetup: GuardAntPactSetup;
  let statusClient: StatusApiClient;

  beforeAll(async () => {
    pactSetup = new GuardAntPactSetup('./tests/contract/pacts');
    await pactSetup.setupAll();
    
    // Configure client to use Pact mock server
    statusClient = new StatusApiClient({
      baseUrl: 'http://localhost:1234',
      timeout: 5000
    });
  });

  afterAll(async () => {
    await pactSetup.teardownAll();
  });

  test('should fetch nest status data for public display', async () => {
    const pact = pactSetup.getPact('admin-to-public');
    
    await pact.addInteraction(GuardAntInteractions.statusDataSync());

    // Act
    const result = await statusClient.getNestStatus('test-nest', {
      authorization: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...'
    });

    // Assert
    expect(result.nest.subdomain).toBe('test-nest');
    expect(result.services).toBeArray();
    expect(result.services[0]).toHaveProperty('status');
    expect(result.services[0]).toHaveProperty('responseTime');
    expect(result.services[0]).toHaveProperty('uptime');
    expect(result.incidents).toBeArray();

    await pact.verify();
  });

  test('should synchronize incident data between services', async () => {
    const pact = pactSetup.getPact('admin-to-public');
    
    await pact.addInteraction(GuardAntInteractions.incidentSync());

    // Act
    const result = await statusClient.syncIncidents('nest-123', {
      since: '2024-01-15T09:00:00Z',
      authorization: 'Bearer sync-token-789'
    });

    // Assert
    expect(result.incidents).toBeArray();
    expect(result.incidents[0]).toHaveProperty('title');
    expect(result.incidents[0]).toHaveProperty('status');
    expect(result.incidents[0]).toHaveProperty('severity');
    expect(result.incidents[0].affectedServices).toBeArray();
    expect(result.incidents[0].updates).toBeArray();
    expect(result.lastSync).toBeString();

    await pact.verify();
  });

  test('should handle branding configuration sync', async () => {
    const pact = pactSetup.getPact('admin-to-public');
    
    await pact.addInteraction({
      state: 'nest has custom branding configuration',
      uponReceiving: 'a request for branding data',
      withRequest: {
        method: 'GET',
        path: '/api/branding',
        headers: {
          'X-Nest-Subdomain': 'test-nest'
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          primaryColor: '#0066cc',
          secondaryColor: '#f0f9ff',
          logo: 'https://example.com/logo.png',
          favicon: 'https://example.com/favicon.ico',
          customCss: '.status-page { font-family: "Custom Font"; }',
          customDomain: 'status.example.com'
        }
      }
    });

    // Act
    const result = await statusClient.getBranding('test-nest');

    // Assert
    expect(result.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(result.logo).toBeString();
    expect(result.customCss).toBeString();

    await pact.verify();
  });

  test('should sync service maintenance windows', async () => {
    const pact = pactSetup.getPact('admin-to-public');
    
    await pact.addInteraction({
      state: 'nest has scheduled maintenance windows',
      uponReceiving: 'a request for maintenance schedule',
      withRequest: {
        method: 'GET',
        path: '/api/maintenance',
        query: {
          nestId: 'nest-123',
          upcoming: 'true'
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          maintenanceWindows: [
            {
              id: 'maint-123',
              title: 'Database Upgrade',
              description: 'Upgrading database servers',
              startTime: '2024-01-20T02:00:00Z',
              endTime: '2024-01-20T04:00:00Z',
              affectedServices: ['service-456'],
              status: 'scheduled',
              impact: 'partial-outage'
            }
          ]
        }
      }
    });

    // Act
    const result = await statusClient.getMaintenanceWindows('nest-123', { upcoming: true });

    // Assert
    expect(result.maintenanceWindows).toBeArray();
    expect(result.maintenanceWindows[0]).toHaveProperty('title');
    expect(result.maintenanceWindows[0]).toHaveProperty('startTime');
    expect(result.maintenanceWindows[0]).toHaveProperty('endTime');
    expect(result.maintenanceWindows[0].affectedServices).toBeArray();

    await pact.verify();
  });

  test('should handle real-time status subscription setup', async () => {
    const pact = pactSetup.getPact('admin-to-public');
    
    await pact.addInteraction({
      state: 'websocket endpoint is available',
      uponReceiving: 'a websocket connection request',
      withRequest: {
        method: 'GET',
        path: '/api/status/subscribe',
        headers: {
          'X-Nest-Subdomain': 'test-nest',
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      },
      willRespondWith: {
        status: 101,
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade',
          'Sec-WebSocket-Accept': 'mock-websocket-key'
        }
      }
    });

    // Act - Note: This would typically be tested with a WebSocket client
    const response = await fetch('http://localhost:1234/api/status/subscribe', {
      method: 'GET',
      headers: {
        'X-Nest-Subdomain': 'test-nest',
        'Upgrade': 'websocket',
        'Connection': 'Upgrade'
      }
    });

    // Assert
    expect(response.status).toBe(101);
    expect(response.headers.get('Upgrade')).toBe('websocket');

    await pact.verify();
  });
});