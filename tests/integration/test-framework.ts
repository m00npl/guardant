/**
 * Integration Test Framework for GuardAnt
 * Provides utilities for testing service interactions
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import type { Server } from 'bun';

export interface TestContext {
  servers: Map<string, Server>;
  databases: TestDatabase;
  redis: TestRedis;
  rabbitmq: TestRabbitMQ;
  apiClients: TestApiClients;
  testNest: TestNest;
  cleanup: () => Promise<void>;
}

export interface TestDatabase {
  client: any;
  migrate: () => Promise<void>;
  seed: (data: any) => Promise<void>;
  clean: () => Promise<void>;
  close: () => Promise<void>;
}

export interface TestRedis {
  client: any;
  flushAll: () => Promise<void>;
  close: () => Promise<void>;
}

export interface TestRabbitMQ {
  connection: any;
  channel: any;
  purgeQueues: () => Promise<void>;
  close: () => Promise<void>;
}

export interface TestApiClients {
  admin: TestApiClient;
  public: TestApiClient;
}

export interface TestApiClient {
  baseUrl: string;
  authToken?: string;
  get: (path: string, options?: RequestInit) => Promise<Response>;
  post: (path: string, body: any, options?: RequestInit) => Promise<Response>;
  put: (path: string, body: any, options?: RequestInit) => Promise<Response>;
  delete: (path: string, options?: RequestInit) => Promise<Response>;
  setAuth: (token: string) => void;
}

export interface TestNest {
  id: string;
  subdomain: string;
  email: string;
  authToken: string;
  services: TestService[];
}

export interface TestService {
  id: string;
  name: string;
  url: string;
  type: string;
}

// Test data generators
export const TestDataGenerator = {
  nest: (overrides?: Partial<TestNest>) => ({
    subdomain: `test-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    password: 'Test123!@#',
    subscriptionTier: 'free',
    ...overrides
  }),

  service: (nestId: string, overrides?: Partial<TestService>) => ({
    nestId,
    name: `Test Service ${Date.now()}`,
    url: 'https://example.com',
    type: 'web',
    checkInterval: 60,
    timeout: 5,
    enabled: true,
    ...overrides
  }),

  user: (nestId: string, overrides?: any) => ({
    nestId,
    email: `user-${Date.now()}@example.com`,
    password: 'User123!@#',
    role: 'viewer',
    ...overrides
  })
};

// Test utilities
export class TestApiClient implements TestApiClient {
  constructor(
    public baseUrl: string,
    public authToken?: string
  ) {}

  private async request(method: string, path: string, options?: RequestInit): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> || {})
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      ...options
    });

    return response;
  }

  async get(path: string, options?: RequestInit): Promise<Response> {
    return this.request('GET', path, options);
  }

  async post(path: string, body: any, options?: RequestInit): Promise<Response> {
    return this.request('POST', path, {
      ...options,
      body: JSON.stringify(body)
    });
  }

  async put(path: string, body: any, options?: RequestInit): Promise<Response> {
    return this.request('PUT', path, {
      ...options,
      body: JSON.stringify(body)
    });
  }

  async delete(path: string, options?: RequestInit): Promise<Response> {
    return this.request('DELETE', path, options);
  }

  setAuth(token: string): void {
    this.authToken = token;
  }
}

// Test setup helpers
export async function setupTestContext(): Promise<TestContext> {
  const context: TestContext = {
    servers: new Map(),
    databases: await setupTestDatabase(),
    redis: await setupTestRedis(),
    rabbitmq: await setupTestRabbitMQ(),
    apiClients: {
      admin: new TestApiClient('http://localhost:4000'),
      public: new TestApiClient('http://localhost:4001')
    },
    testNest: {} as TestNest,
    cleanup: async () => {
      // Cleanup logic
      await context.databases.clean();
      await context.redis.flushAll();
      await context.rabbitmq.purgeQueues();
      
      // Close connections
      await context.databases.close();
      await context.redis.close();
      await context.rabbitmq.close();
      
      // Stop servers
      for (const [name, server] of context.servers) {
        server.stop();
      }
    }
  };

  // Start services
  await startTestServices(context);
  
  // Wait for services to be ready
  await waitForServices(context);
  
  // Run migrations
  await context.databases.migrate();
  
  // Create test nest
  context.testNest = await createTestNest(context);

  return context;
}

async function setupTestDatabase(): Promise<TestDatabase> {
  // PostgreSQL test setup
  const { Pool } = await import('pg');
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://guardant:guardant123@localhost:5432/guardant_test'
  });

  return {
    client: pool,
    migrate: async () => {
      // Run migrations
      const fs = await import('fs');
      const path = await import('path');
      const migrationsDir = path.join(process.cwd(), 'database', 'migrations');
      const files = await fs.promises.readdir(migrationsDir);
      
      for (const file of files.sort()) {
        if (file.endsWith('.sql')) {
          const sql = await fs.promises.readFile(path.join(migrationsDir, file), 'utf8');
          await pool.query(sql);
        }
      }
    },
    seed: async (data: any) => {
      // Seed test data
      if (data.nests) {
        for (const nest of data.nests) {
          await pool.query(
            'INSERT INTO nests (id, subdomain, email, subscription_tier) VALUES ($1, $2, $3, $4)',
            [nest.id, nest.subdomain, nest.email, nest.subscriptionTier]
          );
        }
      }
    },
    clean: async () => {
      // Clean all test data
      await pool.query('TRUNCATE TABLE nests, services, service_status, users CASCADE');
    },
    close: async () => {
      await pool.end();
    }
  };
}

async function setupTestRedis(): Promise<TestRedis> {
  const Redis = await import('ioredis');
  const client = new Redis.default({
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
    db: 15 // Use separate DB for tests
  });

  return {
    client,
    flushAll: async () => {
      await client.flushdb();
    },
    close: async () => {
      client.disconnect();
    }
  };
}

async function setupTestRabbitMQ(): Promise<TestRabbitMQ> {
  const amqp = await import('amqplib');
  const connection = await amqp.default.connect(
    process.env.TEST_RABBITMQ_URL || 'amqp://guardant:guardant123@localhost:5672'
  );
  const channel = await connection.createChannel();

  // Setup test queues
  await channel.assertQueue('test_monitoring_tasks', { durable: false });
  await channel.assertQueue('test_monitoring_results', { durable: false });

  return {
    connection,
    channel,
    purgeQueues: async () => {
      await channel.purgeQueue('test_monitoring_tasks');
      await channel.purgeQueue('test_monitoring_results');
    },
    close: async () => {
      await channel.close();
      await connection.close();
    }
  };
}

async function startTestServices(context: TestContext): Promise<void> {
  // Start services with test configuration
  const services = [
    { name: 'admin-api', port: 4000, path: 'services/api-admin' },
    { name: 'public-api', port: 4001, path: 'services/api-public' },
    { name: 'worker', port: 4002, path: 'services/worker-monitoring' }
  ];

  for (const service of services) {
    // Import and start each service
    const { createServer } = await import(`../../${service.path}/src/index.ts`);
    const server = await createServer({
      port: service.port,
      env: 'test',
      database: context.databases.client,
      redis: context.redis.client,
      rabbitmq: context.rabbitmq.channel
    });
    
    context.servers.set(service.name, server);
  }
}

async function waitForServices(context: TestContext, timeout = 30000): Promise<void> {
  const start = Date.now();
  const services = [
    { url: 'http://localhost:4000/health', name: 'Admin API' },
    { url: 'http://localhost:4001/health', name: 'Public API' },
    { url: 'http://localhost:4002/health', name: 'Worker' }
  ];

  for (const service of services) {
    let ready = false;
    while (!ready && Date.now() - start < timeout) {
      try {
        const response = await fetch(service.url);
        if (response.ok) {
          ready = true;
        }
      } catch (error) {
        // Service not ready yet
      }
      
      if (!ready) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!ready) {
      throw new Error(`Service ${service.name} did not start within ${timeout}ms`);
    }
  }
}

async function createTestNest(context: TestContext): Promise<TestNest> {
  // Register a test nest
  const nestData = TestDataGenerator.nest();
  const response = await context.apiClients.admin.post('/api/nests/register', nestData);
  
  if (!response.ok) {
    throw new Error(`Failed to create test nest: ${await response.text()}`);
  }
  
  const result = await response.json();
  
  return {
    id: result.nest.id,
    subdomain: result.nest.subdomain,
    email: result.nest.email,
    authToken: result.token,
    services: []
  };
}

// Test assertion helpers
export const TestAssertions = {
  async assertStatusOk(response: Response): Promise<void> {
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Expected OK status, got ${response.status}: ${body}`);
    }
  },

  async assertJsonResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error(`Expected JSON response, got ${contentType}`);
    }
    return response.json();
  },

  assertNestIsolation(data1: any, data2: any, nestId1: string, nestId2: string): void {
    // Ensure data from different nests is properly isolated
    if (data1.nestId === nestId2 || data2.nestId === nestId1) {
      throw new Error('Nest isolation violation detected');
    }
  },

  async assertEventuallyTrue(
    condition: () => Promise<boolean>,
    timeout = 10000,
    interval = 100
  ): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error('Condition did not become true within timeout');
  }
};

// Test decorators
export function integrationTest(name: string, fn: (context: TestContext) => Promise<void>) {
  describe(name, () => {
    let context: TestContext;

    beforeAll(async () => {
      context = await setupTestContext();
    });

    afterAll(async () => {
      await context.cleanup();
    });

    test(name, async () => {
      await fn(context);
    });
  });
}

// Export everything
export {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach
};