"use strict";
/**
 * Integration Test Framework for GuardAnt
 * Provides utilities for testing service interactions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.afterEach = exports.beforeEach = exports.afterAll = exports.beforeAll = exports.expect = exports.test = exports.describe = exports.TestAssertions = exports.TestApiClient = exports.TestDataGenerator = void 0;
exports.setupTestContext = setupTestContext;
exports.integrationTest = integrationTest;
const bun_test_1 = require("bun:test");
Object.defineProperty(exports, "describe", { enumerable: true, get: function () { return bun_test_1.describe; } });
Object.defineProperty(exports, "test", { enumerable: true, get: function () { return bun_test_1.test; } });
Object.defineProperty(exports, "expect", { enumerable: true, get: function () { return bun_test_1.expect; } });
Object.defineProperty(exports, "beforeAll", { enumerable: true, get: function () { return bun_test_1.beforeAll; } });
Object.defineProperty(exports, "afterAll", { enumerable: true, get: function () { return bun_test_1.afterAll; } });
Object.defineProperty(exports, "beforeEach", { enumerable: true, get: function () { return bun_test_1.beforeEach; } });
Object.defineProperty(exports, "afterEach", { enumerable: true, get: function () { return bun_test_1.afterEach; } });
// Test data generators
exports.TestDataGenerator = {
    nest: (overrides) => ({
        subdomain: `test-${Date.now()}`,
        email: `test-${Date.now()}@example.com`,
        password: 'Test123!@#',
        subscriptionTier: 'free',
        ...overrides
    }),
    service: (nestId, overrides) => ({
        nestId,
        name: `Test Service ${Date.now()}`,
        url: 'https://example.com',
        type: 'web',
        checkInterval: 60,
        timeout: 5,
        enabled: true,
        ...overrides
    }),
    user: (nestId, overrides) => ({
        nestId,
        email: `user-${Date.now()}@example.com`,
        password: 'User123!@#',
        role: 'viewer',
        ...overrides
    })
};
// Test utilities
class TestApiClient {
    constructor(baseUrl, authToken) {
        this.baseUrl = baseUrl;
        this.authToken = authToken;
    }
    async request(method, path, options) {
        const headers = {
            'Content-Type': 'application/json',
            ...(options?.headers || {})
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
    async get(path, options) {
        return this.request('GET', path, options);
    }
    async post(path, body, options) {
        return this.request('POST', path, {
            ...options,
            body: JSON.stringify(body)
        });
    }
    async put(path, body, options) {
        return this.request('PUT', path, {
            ...options,
            body: JSON.stringify(body)
        });
    }
    async delete(path, options) {
        return this.request('DELETE', path, options);
    }
    setAuth(token) {
        this.authToken = token;
    }
}
exports.TestApiClient = TestApiClient;
// Test setup helpers
async function setupTestContext() {
    const context = {
        servers: new Map(),
        databases: await setupTestDatabase(),
        redis: await setupTestRedis(),
        rabbitmq: await setupTestRabbitMQ(),
        apiClients: {
            admin: new TestApiClient('http://localhost:4000'),
            public: new TestApiClient('http://localhost:4001')
        },
        testNest: {},
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
async function setupTestDatabase() {
    // PostgreSQL test setup
    const { Pool } = await Promise.resolve().then(() => __importStar(require('pg')));
    const pool = new Pool({
        connectionString: process.env.TEST_DATABASE_URL || 'postgresql://guardant:guardant123@localhost:5432/guardant_test'
    });
    return {
        client: pool,
        migrate: async () => {
            // Run migrations
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            const migrationsDir = path.join(process.cwd(), 'database', 'migrations');
            const files = await fs.promises.readdir(migrationsDir);
            for (const file of files.sort()) {
                if (file.endsWith('.sql')) {
                    const sql = await fs.promises.readFile(path.join(migrationsDir, file), 'utf8');
                    await pool.query(sql);
                }
            }
        },
        seed: async (data) => {
            // Seed test data
            if (data.nests) {
                for (const nest of data.nests) {
                    await pool.query('INSERT INTO nests (id, subdomain, email, subscription_tier) VALUES ($1, $2, $3, $4)', [nest.id, nest.subdomain, nest.email, nest.subscriptionTier]);
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
async function setupTestRedis() {
    const Redis = await Promise.resolve().then(() => __importStar(require('ioredis')));
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
async function setupTestRabbitMQ() {
    const amqp = await Promise.resolve().then(() => __importStar(require('amqplib')));
    const connection = await amqp.default.connect(process.env.TEST_RABBITMQ_URL || 'amqp://guardant:guardant123@localhost:5672');
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
async function startTestServices(context) {
    // Start services with test configuration
    const services = [
        { name: 'admin-api', port: 4000, path: 'services/api-admin' },
        { name: 'public-api', port: 4001, path: 'services/api-public' },
        { name: 'worker', port: 4002, path: 'services/worker-monitoring' }
    ];
    for (const service of services) {
        // Import and start each service
        const { createServer } = await Promise.resolve(`${`../../${service.path}/src/index.ts`}`).then(s => __importStar(require(s)));
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
async function waitForServices(context, timeout = 30000) {
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
            }
            catch (error) {
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
async function createTestNest(context) {
    // Register a test nest
    const nestData = exports.TestDataGenerator.nest();
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
exports.TestAssertions = {
    async assertStatusOk(response) {
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Expected OK status, got ${response.status}: ${body}`);
        }
    },
    async assertJsonResponse(response) {
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
            throw new Error(`Expected JSON response, got ${contentType}`);
        }
        return response.json();
    },
    assertNestIsolation(data1, data2, nestId1, nestId2) {
        // Ensure data from different nests is properly isolated
        if (data1.nestId === nestId2 || data2.nestId === nestId1) {
            throw new Error('Nest isolation violation detected');
        }
    },
    async assertEventuallyTrue(condition, timeout = 10000, interval = 100) {
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
function integrationTest(name, fn) {
    (0, bun_test_1.describe)(name, () => {
        let context;
        (0, bun_test_1.beforeAll)(async () => {
            context = await setupTestContext();
        });
        (0, bun_test_1.afterAll)(async () => {
            await context.cleanup();
        });
        (0, bun_test_1.test)(name, async () => {
            await fn(context);
        });
    });
}
//# sourceMappingURL=test-framework.js.map