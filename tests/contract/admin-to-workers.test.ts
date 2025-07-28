/**
 * Contract tests for Admin API -> Workers communication
 * Tests the contract for service configuration management and coordination
 */

import { GuardAntPactSetup, GuardAntInteractions } from './pact-consumer';
import { WorkerApiClient } from '../../services/admin-api/src/clients/worker-api-client';
import { describe, beforeAll, afterAll, test, expect } from 'bun:test';

describe('Admin API -> Workers Contract', () => {
  let pactSetup: GuardAntPactSetup;
  let workerClient: WorkerApiClient;

  beforeAll(async () => {
    pactSetup = new GuardAntPactSetup('./tests/contract/pacts');
    await pactSetup.setupAll();
    
    // Configure client to use Pact mock server
    workerClient = new WorkerApiClient({
      baseUrl: 'http://localhost:1235',
      timeout: 10000
    });
  });

  afterAll(async () => {
    await pactSetup.teardownAll();
  });

  test('should send service configuration updates to workers', async () => {
    const pact = pactSetup.getPact('admin-to-workers');
    
    await pact.addInteraction(GuardAntInteractions.serviceConfigUpdate());

    // Act
    const result = await workerClient.updateServiceConfig({
      action: 'update',
      service: {
        id: 'service-456',
        nestId: 'nest-123',
        name: 'Updated Service',
        url: 'https://example.com/health',
        type: 'web',
        checkInterval: 60,
        timeout: 30,
        regions: ['us-east-1'],
        expectedStatus: 200,
        enabled: true
      }
    }, {
      authorization: 'Bearer worker-token-123'
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.workerId).toBeString();
    expect(result.message).toBeString();

    await pact.verify();
  });

  test('should create new service monitoring configuration', async () => {
    const pact = pactSetup.getPact('admin-to-workers');
    
    await pact.addInteraction({
      state: 'worker is ready to monitor new services',
      uponReceiving: 'a new service creation request',
      withRequest: {
        method: 'POST',
        path: '/api/workers/config-update',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer worker-token-123'
        },
        body: {
          action: 'create',
          service: {
            id: 'service-new-789',
            nestId: 'nest-123',
            name: 'New API Service',
            url: 'https://api.example.com/status',
            type: 'api',
            checkInterval: 30,
            timeout: 15,
            regions: ['us-east-1', 'eu-west-1'],
            expectedStatus: 200,
            enabled: true,
            headers: {
              'User-Agent': 'GuardAnt-Monitor/1.0'
            },
            bodyMatch: 'status.*ok'
          }
        }
      },
      willRespondWith: {
        status: 201,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          success: true,
          workerId: 'worker-002',
          message: 'New service monitoring configured',
          scheduledChecks: ['us-east-1', 'eu-west-1']
        }
      }
    });

    // Act
    const result = await workerClient.createServiceMonitoring({
      action: 'create',
      service: {
        id: 'service-new-789',
        nestId: 'nest-123',
        name: 'New API Service',
        url: 'https://api.example.com/status',
        type: 'api',
        checkInterval: 30,
        timeout: 15,
        regions: ['us-east-1', 'eu-west-1'],
        expectedStatus: 200,
        enabled: true,
        headers: {
          'User-Agent': 'GuardAnt-Monitor/1.0'
        },
        bodyMatch: 'status.*ok'
      }
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.scheduledChecks).toEqual(['us-east-1', 'eu-west-1']);

    await pact.verify();
  });

  test('should delete service monitoring configuration', async () => {
    const pact = pactSetup.getPact('admin-to-workers');
    
    await pact.addInteraction({
      state: 'worker is monitoring specified service',
      uponReceiving: 'a service deletion request',
      withRequest: {
        method: 'POST',
        path: '/api/workers/config-update',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer worker-token-123'
        },
        body: {
          action: 'delete',
          service: {
            id: 'service-to-delete-456'
          }
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          success: true,
          workerId: 'worker-001',
          message: 'Service monitoring removed',
          cleanedUpRegions: ['us-east-1', 'eu-west-1']
        }
      }
    });

    // Act
    const result = await workerClient.deleteServiceMonitoring('service-to-delete-456');

    // Assert
    expect(result.success).toBe(true);
    expect(result.cleanedUpRegions).toBeArray();

    await pact.verify();
  });

  test('should retrieve worker health and status', async () => {
    const pact = pactSetup.getPact('admin-to-workers');
    
    await pact.addInteraction({
      state: 'worker is operational',
      uponReceiving: 'a worker health check request',
      withRequest: {
        method: 'GET',
        path: '/api/workers/health',
        headers: {
          'Authorization': 'Bearer worker-token-123'
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          workerId: 'worker-001',
          status: 'healthy',
          region: 'us-east-1',
          uptime: 3600,
          activeChecks: 25,
          lastHeartbeat: '2024-01-15T10:30:00Z',
          performance: {
            avgResponseTime: 150,
            checksPerMinute: 50,
            errorRate: 0.02
          },
          resources: {
            cpuUsage: 15.5,
            memoryUsage: 256,
            networkLatency: 25
          }
        }
      }
    });

    // Act
    const result = await workerClient.getWorkerHealth('worker-001');

    // Assert
    expect(result.status).toBe('healthy');
    expect(result.workerId).toBe('worker-001');
    expect(result.region).toBe('us-east-1');
    expect(result.activeChecks).toBeNumber();
    expect(result.performance).toHaveProperty('avgResponseTime');
    expect(result.resources).toHaveProperty('cpuUsage');

    await pact.verify();
  });

  test('should coordinate worker scaling decisions', async () => {
    const pact = pactSetup.getPact('admin-to-workers');
    
    await pact.addInteraction({
      state: 'worker can accept scaling commands',
      uponReceiving: 'a scaling coordination request',
      withRequest: {
        method: 'POST',
        path: '/api/workers/scale',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer worker-token-123'
        },
        body: {
          command: 'scale-up',
          region: 'us-east-1',
          targetCapacity: 100,
          reason: 'High load detected'
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          success: true,
          workerId: 'worker-001',
          newCapacity: 100,
          scalingTime: 30,
          message: 'Scaling initiated successfully'
        }
      }
    });

    // Act
    const result = await workerClient.coordinateScaling({
      command: 'scale-up',
      region: 'us-east-1',
      targetCapacity: 100,
      reason: 'High load detected'
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.newCapacity).toBe(100);
    expect(result.scalingTime).toBeNumber();

    await pact.verify();
  });

  test('should handle worker configuration updates', async () => {
    const pact = pactSetup.getPact('admin-to-workers');
    
    await pact.addInteraction({
      state: 'worker can accept configuration changes',
      uponReceiving: 'a worker configuration update',
      withRequest: {
        method: 'PUT',
        path: '/api/workers/config',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer worker-token-123'
        },
        body: {
          checkInterval: 30,
          timeout: 15,
          maxConcurrentChecks: 50,
          retryCount: 3,
          regions: ['us-east-1', 'us-west-2'],
          features: {
            advancedMetrics: true,
            distributedTracing: true,
            autoScaling: true
          }
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          success: true,
          workerId: 'worker-001',
          configVersion: '1.2.3',
          restartRequired: false,
          appliedAt: '2024-01-15T10:30:00Z'
        }
      }
    });

    // Act
    const result = await workerClient.updateWorkerConfig({
      checkInterval: 30,
      timeout: 15,
      maxConcurrentChecks: 50,
      retryCount: 3,
      regions: ['us-east-1', 'us-west-2'],
      features: {
        advancedMetrics: true,
        distributedTracing: true,
        autoScaling: true
      }
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.configVersion).toBeString();
    expect(result.restartRequired).toBe(false);

    await pact.verify();
  });
});