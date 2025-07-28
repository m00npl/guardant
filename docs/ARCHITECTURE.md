# GuardAnt Architecture Deep Dive

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Architecture Principles](#core-architecture-principles)
3. [Component Architecture](#component-architecture)
4. [Data Flow](#data-flow)
5. [Multi-Tenancy Design](#multi-tenancy-design)
6. [Service Communication](#service-communication)
7. [Storage Architecture](#storage-architecture)
8. [Monitoring Architecture](#monitoring-architecture)
9. [Security Architecture](#security-architecture)
10. [Scalability Design](#scalability-design)
11. [Performance Considerations](#performance-considerations)
12. [Technology Decisions](#technology-decisions)

## System Overview

GuardAnt is a distributed, multi-tenant monitoring platform built with microservices architecture. The system is designed to handle millions of health checks per day across thousands of services while maintaining sub-second response times.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              User Layer                                  │
├─────────────────┬─────────────────┬─────────────────┬─────────────────┤
│   Admin Panel   │  Status Pages   │  Embed Widgets  │  Mobile Apps    │
│   (React SPA)   │  (React SSG)    │  (Vanilla JS)   │  (React Native) │
└────────┬────────┴────────┬────────┴────────┬────────┴────────┬────────┘
         │                 │                  │                  │
         ▼                 ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            API Gateway Layer                             │
├─────────────────┬─────────────────┬─────────────────┬─────────────────┤
│   Admin API     │   Public API    │   Widget API    │  Analytics API  │
│   (Hono.js)     │   (Hono.js)     │   (CDN Edge)    │   (Hono.js)    │
└────────┬────────┴────────┬────────┴────────┬────────┴────────┬────────┘
         │                 │                  │                  │
         ▼                 ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Service Mesh Layer                              │
├─────────────────┬─────────────────┬─────────────────┬─────────────────┤
│  Auth Service   │  Tenant Service │  Billing Service│ Notif. Service  │
└────────┬────────┴────────┬────────┴────────┬────────┴────────┬────────┘
         │                 │                  │                  │
         ▼                 ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Data Storage Layer                               │
├─────────────────┬─────────────────┬─────────────────┬─────────────────┤
│   Redis Cache   │  Time Series DB │  Golem Storage  │   PostgreSQL    │
│   (Primary)     │  (Metrics)      │  (Distributed)  │   (Metadata)    │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
         │                 │                  │                  │
         ▼                 ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Worker Infrastructure                              │
├─────────────────┬─────────────────┬─────────────────┬─────────────────┤
│  Monitor Workers│ Analytics Workers│  Alert Workers  │  Sync Workers   │
│  (Global Fleet) │  (Regional)     │  (Priority Queue)│  (Scheduled)    │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

## Core Architecture Principles

### 1. Microservices Architecture

Each service is:
- **Independent**: Can be deployed, scaled, and developed separately
- **Focused**: Single responsibility principle
- **Resilient**: Failure isolation and circuit breakers
- **Observable**: Comprehensive logging, metrics, and tracing

### 2. Event-Driven Design

```
┌─────────────┐      Event      ┌─────────────┐
│   Service   │ ─────────────▶  │   Message   │
│   Status    │                 │    Queue    │
│   Change    │                 │ (RabbitMQ)  │
└─────────────┘                 └──────┬──────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
            ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
            │  Analytics  │    │   Alerts    │    │   Billing   │
            │   Worker    │    │   Worker    │    │   Worker    │
            └─────────────┘    └─────────────┘    └─────────────┘
```

### 3. API-First Development

All functionality exposed through well-documented APIs:
- RESTful APIs for CRUD operations
- GraphQL for complex queries (future)
- WebSocket/SSE for real-time updates
- gRPC for internal service communication (future)

### 4. Cloud-Native Design

- Container-first deployment
- Stateless services
- Configuration through environment
- Health checks and readiness probes
- Graceful shutdown handling

## Component Architecture

### Frontend Architecture

```typescript
// apps/frontend-admin/src/architecture.ts

interface FrontendArchitecture {
  framework: 'React 18';
  buildTool: 'Vite';
  stateManagement: 'Zustand';
  dataFetching: 'TanStack Query';
  routing: 'React Router v6';
  styling: 'Tailwind CSS';
  components: 'Composition Pattern';
  testing: 'Vitest + React Testing Library';
}

// Component Structure
/src
  /components       # Reusable UI components
    /ui            # Base UI components (Button, Card, etc.)
    /features      # Feature-specific components
    /layouts       # Layout components
  /pages           # Route-based pages
  /hooks           # Custom React hooks  
  /stores          # Zustand stores
  /services        # API service layer
  /utils           # Helper functions
  /types           # TypeScript types
```

### Backend Service Architecture

```typescript
// services/api-admin/src/architecture.ts

interface ServiceArchitecture {
  framework: 'Hono.js';
  runtime: 'Bun';
  language: 'TypeScript';
  patterns: [
    'Repository Pattern',
    'Service Layer',
    'Dependency Injection',
    'Circuit Breaker',
    'Event Sourcing'
  ];
}

// Layered Architecture
/src
  /routes          # HTTP route handlers
  /services        # Business logic layer
  /repositories    # Data access layer
  /middleware      # Cross-cutting concerns
  /events          # Event definitions
  /types           # TypeScript interfaces
  /utils           # Helper utilities
```

### Worker Architecture

```typescript
// services/workers/src/architecture.ts

interface WorkerArchitecture {
  pattern: 'Producer-Consumer';
  queue: 'RabbitMQ';
  concurrency: 'Worker Pool';
  scheduling: 'Cron + Queue';
  monitoring: 'Prometheus Metrics';
}

// Worker Types
enum WorkerType {
  MONITOR = 'monitor',        // Health checks
  ANALYTICS = 'analytics',    // Data aggregation
  ALERT = 'alert',           // Notifications
  SYNC = 'sync',             // Data synchronization
  CLEANUP = 'cleanup'        // Maintenance tasks
}

// Worker Pool Management
class WorkerPool {
  private workers: Map<string, Worker>;
  private queue: Queue;
  
  async scale(type: WorkerType, count: number) {
    // Dynamic scaling based on queue depth
  }
  
  async distribute(task: Task) {
    // Load balancing across workers
  }
}
```

## Data Flow

### 1. Health Check Flow

```
User Creates Service → Admin API → Redis Cache → Message Queue
                                                      │
                                                      ▼
                                               Monitor Worker
                                                      │
                         ┌────────────────────────────┴────────────────┐
                         ▼                                             ▼
                   Health Check                                  Failed Check
                         │                                             │
                         ▼                                             ▼
                   Store Result ─────────────────▶               Alert System
                         │                                             │
                         ▼                                             ▼
                   Update Cache                                Send Notification
                         │                                             │
                         ▼                                             ▼
                   Publish Event ◀─────────────────────────────────────┘
```

### 2. Real-time Updates Flow

```
Status Change Event
        │
        ▼
   Redis Pub/Sub
        │
        ├──────────────┬──────────────┬──────────────┐
        ▼              ▼              ▼              ▼
    SSE Handler   WebSocket      Analytics      Status Page
        │          Handler         Worker         Cache
        ▼              ▼              ▼              ▼
   Browser SSE    Mobile App    Metrics DB    CDN Update
```

### 3. Analytics Pipeline

```
Raw Metrics → Time Series DB → Aggregation Workers → Analytics Cache
                                      │
                                      ▼
                              ┌───────────────┐
                              │  Calculations │
                              ├───────────────┤
                              │ • Uptime %    │
                              │ • Response    │
                              │ • SLA Status  │
                              │ • Trends      │
                              └───────┬───────┘
                                      ▼
                               Analytics API → Dashboard
```

## Multi-Tenancy Design

### Tenant Isolation

```typescript
// Tenant isolation at every layer

interface TenantContext {
  nestId: string;
  ownerId: string;
  plan: PlanType;
  limits: ResourceLimits;
  settings: TenantSettings;
}

// Database isolation
class TenantRepository {
  async query(sql: string, context: TenantContext) {
    // Always include tenant filter
    return db.query(`${sql} AND nest_id = $1`, [context.nestId]);
  }
}

// Cache isolation
class TenantCache {
  private getKey(key: string, context: TenantContext): string {
    return `nest:${context.nestId}:${key}`;
  }
}

// Queue isolation
class TenantQueue {
  async publish(event: Event, context: TenantContext) {
    await queue.publish({
      ...event,
      nestId: context.nestId,
      routing: `tenant.${context.nestId}`
    });
  }
}
```

### Resource Limits

```typescript
interface ResourceLimits {
  services: number;
  checks: number;
  users: number;
  apiRequests: RateLimit;
  storage: StorageLimit;
  bandwidth: BandwidthLimit;
}

class TenantLimiter {
  async checkLimit(
    resource: ResourceType,
    context: TenantContext
  ): Promise<boolean> {
    const usage = await this.getUsage(resource, context);
    const limit = context.limits[resource];
    
    if (usage >= limit) {
      await this.notifyLimitReached(resource, context);
      return false;
    }
    
    return true;
  }
}
```

## Service Communication

### Internal Communication Patterns

```typescript
// 1. Synchronous HTTP (for real-time needs)
class ServiceClient {
  async callService(service: string, endpoint: string, data: any) {
    const response = await fetch(`http://${service}:3000${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Auth': this.getInternalToken()
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new ServiceError(service, response.status);
    }
    
    return response.json();
  }
}

// 2. Asynchronous Messaging (for eventual consistency)
class EventBus {
  async publish(event: DomainEvent) {
    await this.validate(event);
    await this.enrich(event);
    await this.queue.publish(event.type, event);
  }
  
  async subscribe(pattern: string, handler: EventHandler) {
    await this.queue.subscribe(pattern, async (message) => {
      const event = this.deserialize(message);
      await this.handleWithRetry(handler, event);
    });
  }
}

// 3. Service Mesh (future)
interface ServiceMesh {
  discovery: ConsulClient;
  loadBalancer: EnvoyProxy;
  circuitBreaker: Istio;
  tracing: Jaeger;
}
```

### API Gateway Pattern

```typescript
class APIGateway {
  private services: Map<string, ServiceConfig>;
  private rateLimiter: RateLimiter;
  private auth: AuthService;
  
  async route(request: Request): Promise<Response> {
    // 1. Authentication
    const user = await this.auth.authenticate(request);
    
    // 2. Rate Limiting
    await this.rateLimiter.check(user, request);
    
    // 3. Request Routing
    const service = this.resolveService(request.path);
    const response = await service.forward(request);
    
    // 4. Response Transformation
    return this.transform(response, request.accepts);
  }
}
```

## Storage Architecture

### Hybrid Storage Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                     Storage Layer                            │
├─────────────────┬─────────────────┬────────────────────────┤
│   Hot Storage   │  Warm Storage   │    Cold Storage        │
│   (Redis)       │  (PostgreSQL)   │    (Golem L3)          │
├─────────────────┼─────────────────┼────────────────────────┤
│ • Live Status   │ • Recent History│ • Long-term Archive    │
│ • Cache         │ • Analytics     │ • Compliance Data      │
│ • Sessions      │ • Incidents     │ • Audit Logs           │
│ • Rate Limits   │ • User Data     │ • Historical Metrics   │
└─────────────────┴─────────────────┴────────────────────────┘
```

### Data Lifecycle

```typescript
class DataLifecycle {
  // Real-time data (0-1 hour)
  async storeHot(data: Metric) {
    await redis.setex(
      `metric:${data.id}`,
      3600, // 1 hour TTL
      JSON.stringify(data)
    );
  }
  
  // Recent data (1 hour - 30 days)
  async moveToWarm(data: Metric) {
    await postgres.insert('metrics', {
      ...data,
      retention: '30d'
    });
    await redis.del(`metric:${data.id}`);
  }
  
  // Archive data (30+ days)
  async moveToCold(data: Metric) {
    await golemStorage.store({
      key: `archive/metrics/${data.date}/${data.id}`,
      value: data,
      replication: 3
    });
    await postgres.delete('metrics', { id: data.id });
  }
}
```

### Golem L3 Integration

```typescript
interface GolemStorageAdapter {
  // Decentralized storage operations
  store(key: string, value: any): Promise<string>;
  retrieve(key: string): Promise<any>;
  delete(key: string): Promise<void>;
  
  // Replication management
  setReplication(key: string, factor: number): Promise<void>;
  getNodes(key: string): Promise<StorageNode[]>;
  
  // Smart contract interaction
  payForStorage(bytes: number, duration: number): Promise<TxHash>;
  getStorageProof(key: string): Promise<Proof>;
}

class GolemL3Storage implements GolemStorageAdapter {
  private contract: ethers.Contract;
  private ipfs: IPFSClient;
  
  async store(key: string, value: any): Promise<string> {
    // 1. Encrypt data
    const encrypted = await this.encrypt(value);
    
    // 2. Store to IPFS
    const cid = await this.ipfs.add(encrypted);
    
    // 3. Register on Golem L3
    const tx = await this.contract.store(key, cid, {
      replication: 3,
      duration: 365 * 24 * 60 * 60 // 1 year
    });
    
    await tx.wait();
    return cid;
  }
}
```

## Monitoring Architecture

### Distributed Monitoring

```typescript
class MonitoringOrchestrator {
  private workers: WorkerPool;
  private scheduler: Scheduler;
  private regions: Region[];
  
  async scheduleCheck(service: Service) {
    // 1. Determine monitoring strategy
    const strategy = this.getStrategy(service);
    
    // 2. Select workers based on strategy
    const workers = await this.selectWorkers(strategy);
    
    // 3. Distribute work
    const tasks = workers.map(worker => ({
      workerId: worker.id,
      serviceId: service.id,
      config: service.config,
      timeout: service.timeout
    }));
    
    // 4. Execute in parallel
    const results = await Promise.allSettled(
      tasks.map(task => this.executeCheck(task))
    );
    
    // 5. Aggregate results
    return this.aggregateResults(results, strategy);
  }
}

// Monitoring strategies
enum MonitoringStrategy {
  SINGLE_REGION = 'single',      // Check from one location
  MULTI_REGION = 'multi',        // Check from multiple locations
  GLOBAL = 'global',             // Check from all regions
  FAILOVER = 'failover'          // Primary + backup regions
}
```

### Check Types Architecture

```typescript
abstract class BaseMonitor {
  abstract type: MonitorType;
  
  async execute(config: MonitorConfig): Promise<CheckResult> {
    const start = performance.now();
    
    try {
      // Pre-check validation
      await this.validate(config);
      
      // Execute check
      const result = await this.check(config);
      
      // Post-check processing
      return await this.process(result, start);
      
    } catch (error) {
      return this.handleError(error, start);
    }
  }
  
  abstract check(config: MonitorConfig): Promise<any>;
  abstract validate(config: MonitorConfig): Promise<void>;
}

// Specific monitor implementations
class HTTPMonitor extends BaseMonitor {
  type = MonitorType.HTTP;
  
  async check(config: HTTPConfig): Promise<HTTPResult> {
    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      timeout: config.timeout,
      redirect: 'follow'
    });
    
    return {
      status: response.status,
      headers: response.headers,
      body: await response.text(),
      timing: this.extractTiming(response)
    };
  }
}
```

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
├─────────────────┬─────────────────┬────────────────────────┤
│  Network Layer  │ Application Layer│    Data Layer          │
├─────────────────┼─────────────────┼────────────────────────┤
│ • WAF (CloudFlare)│ • JWT Auth     │ • Encryption at Rest   │
│ • DDoS Protection │ • RBAC         │ • Encryption in Transit│
│ • Rate Limiting   │ • Input Valid. │ • Key Management       │
│ • IP Whitelisting │ • CSRF Protect.│ • Data Masking         │
│ • TLS 1.3        │ • XSS Prevention│ • Audit Logging        │
└─────────────────┴─────────────────┴────────────────────────┘
```

### Authentication & Authorization

```typescript
// Multi-factor authentication
class AuthService {
  async authenticate(credentials: Credentials): Promise<AuthResult> {
    // 1. Validate credentials
    const user = await this.validateCredentials(credentials);
    
    // 2. Check MFA requirement
    if (user.mfaEnabled) {
      const mfaValid = await this.validateMFA(credentials.mfaToken);
      if (!mfaValid) throw new MFARequiredError();
    }
    
    // 3. Generate tokens
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);
    
    // 4. Audit log
    await this.audit.log('user.login', {
      userId: user.id,
      ip: credentials.ip,
      userAgent: credentials.userAgent
    });
    
    return { accessToken, refreshToken, user };
  }
}

// Role-based access control
class Authorization {
  async authorize(
    user: User,
    resource: Resource,
    action: Action
  ): Promise<boolean> {
    // 1. Check user permissions
    const permissions = await this.getUserPermissions(user);
    
    // 2. Check resource permissions
    const required = this.getRequiredPermissions(resource, action);
    
    // 3. Evaluate
    return this.evaluate(permissions, required);
  }
}
```

### Data Security

```typescript
class DataSecurity {
  // Field-level encryption
  async encryptSensitive(data: any): Promise<any> {
    const sensitiveFields = ['apiKey', 'webhook', 'email'];
    
    for (const field of sensitiveFields) {
      if (data[field]) {
        data[field] = await this.encrypt(data[field]);
      }
    }
    
    return data;
  }
  
  // Data masking for logs
  maskSensitive(data: any): any {
    return JSON.parse(JSON.stringify(data), (key, value) => {
      if (this.isSensitive(key)) {
        return this.mask(value);
      }
      return value;
    });
  }
}
```

## Scalability Design

### Horizontal Scaling

```typescript
// Auto-scaling configuration
interface ScalingConfig {
  service: string;
  minInstances: number;
  maxInstances: number;
  metrics: ScalingMetric[];
  cooldown: number;
}

class AutoScaler {
  async evaluate(config: ScalingConfig): Promise<ScalingDecision> {
    // 1. Collect metrics
    const metrics = await this.collectMetrics(config);
    
    // 2. Analyze trends
    const trend = this.analyzeTrend(metrics);
    
    // 3. Make decision
    if (trend.increasing && metrics.cpu > 70) {
      return { action: 'scale-up', instances: 2 };
    } else if (trend.decreasing && metrics.cpu < 30) {
      return { action: 'scale-down', instances: 1 };
    }
    
    return { action: 'none' };
  }
}
```

### Load Distribution

```typescript
// Geographic load balancing
class GeoLoadBalancer {
  async route(request: Request): Promise<ServerEndpoint> {
    // 1. Determine client location
    const clientLocation = await this.getLocation(request.ip);
    
    // 2. Find nearest healthy servers
    const servers = await this.findNearestServers(clientLocation);
    
    // 3. Apply load balancing algorithm
    return this.selectServer(servers, {
      algorithm: 'weighted-round-robin',
      factors: ['latency', 'cpu', 'connections']
    });
  }
}

// Queue-based load leveling
class QueueManager {
  async enqueue(task: Task): Promise<void> {
    // 1. Determine priority
    const priority = this.calculatePriority(task);
    
    // 2. Select queue
    const queue = this.selectQueue(task.type, priority);
    
    // 3. Add with backpressure
    if (queue.length > queue.maxSize * 0.8) {
      await this.applyBackpressure(queue);
    }
    
    await queue.add(task, { priority });
  }
}
```

## Performance Considerations

### Caching Strategy

```typescript
// Multi-level caching
class CacheManager {
  private l1: MemoryCache;     // In-process cache
  private l2: RedisCache;      // Distributed cache
  private l3: CDNCache;        // Edge cache
  
  async get(key: string): Promise<any> {
    // Try L1 first (fastest)
    let value = await this.l1.get(key);
    if (value) return value;
    
    // Try L2
    value = await this.l2.get(key);
    if (value) {
      await this.l1.set(key, value); // Promote to L1
      return value;
    }
    
    // Try L3
    value = await this.l3.get(key);
    if (value) {
      await this.promote(key, value); // Promote to L1 & L2
      return value;
    }
    
    return null;
  }
}
```

### Query Optimization

```typescript
// Database query optimization
class QueryOptimizer {
  // Batch loading
  async batchLoad<T>(ids: string[]): Promise<Map<string, T>> {
    const results = await db.query(
      'SELECT * FROM items WHERE id = ANY($1)',
      [ids]
    );
    
    return new Map(results.map(r => [r.id, r]));
  }
  
  // Cursor-based pagination
  async paginate<T>(cursor?: string, limit = 20): Promise<Page<T>> {
    const query = cursor
      ? 'SELECT * FROM items WHERE id > $1 ORDER BY id LIMIT $2'
      : 'SELECT * FROM items ORDER BY id LIMIT $1';
      
    const params = cursor ? [cursor, limit + 1] : [limit + 1];
    const results = await db.query(query, params);
    
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, -1) : results;
    
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null
    };
  }
}
```

### Resource Pooling

```typescript
// Connection pooling
class ConnectionPool {
  private available: Connection[] = [];
  private inUse: Map<string, Connection> = new Map();
  private waiting: Array<(conn: Connection) => void> = [];
  
  async acquire(): Promise<Connection> {
    // Try to get available connection
    const conn = this.available.pop();
    if (conn) {
      this.inUse.set(conn.id, conn);
      return conn;
    }
    
    // Create new if under limit
    if (this.inUse.size < this.maxSize) {
      const newConn = await this.create();
      this.inUse.set(newConn.id, newConn);
      return newConn;
    }
    
    // Wait for available connection
    return new Promise(resolve => {
      this.waiting.push(resolve);
    });
  }
  
  async release(conn: Connection): Promise<void> {
    this.inUse.delete(conn.id);
    
    // Give to waiting request
    const waiter = this.waiting.shift();
    if (waiter) {
      this.inUse.set(conn.id, conn);
      waiter(conn);
    } else {
      this.available.push(conn);
    }
  }
}
```

## Technology Decisions

### Why Bun?

```typescript
// Performance comparison
const benchmarks = {
  'Node.js': {
    startupTime: '50ms',
    requestsPerSecond: 50000,
    memoryUsage: '120MB'
  },
  'Bun': {
    startupTime: '10ms',      // 5x faster
    requestsPerSecond: 105000, // 2.1x faster
    memoryUsage: '60MB'       // 50% less
  }
};

// Native TypeScript support
// No transpilation needed
await Bun.write('file.ts', typeScriptCode);
const module = await import('./file.ts'); // Direct execution
```

### Why Hono.js?

```typescript
// Minimal overhead
app.get('/api/health', (c) => c.json({ status: 'ok' }));
// 0.05ms overhead vs 2ms for Express

// Edge computing ready
export default {
  fetch: app.fetch, // Works on Cloudflare Workers
};

// Type safety
app.get('/api/user/:id', async (c) => {
  const id = c.req.param('id'); // Type: string
  const user = await getUser(id);
  return c.json(user); // Type checked
});
```

### Why Redis + Golem L3?

```typescript
// Redis for speed
interface RedisUseCase {
  caching: 'Sub-millisecond access';
  pubsub: 'Real-time updates';
  queues: 'High-throughput job processing';
  rateLimit: 'Atomic increment operations';
}

// Golem L3 for decentralization
interface GolemUseCase {
  archival: 'Permanent storage';
  compliance: 'Immutable audit logs';
  resilience: 'No single point of failure';
  cost: 'Pay-per-use model';
}
```

### Future Technology Considerations

```typescript
interface FutureTechnologies {
  database: {
    current: 'Redis + PostgreSQL';
    future: 'CockroachDB'; // Global distribution
  };
  messaging: {
    current: 'RabbitMQ';
    future: 'NATS'; // Better performance
  };
  search: {
    current: 'PostgreSQL Full Text';
    future: 'MeiliSearch'; // Better UX
  };
  analytics: {
    current: 'PostgreSQL';
    future: 'ClickHouse'; // Time-series optimization
  };
}
```

## Conclusion

GuardAnt's architecture is designed for:

1. **Scalability**: Handle millions of checks across thousands of services
2. **Reliability**: 99.99% uptime through redundancy and failover
3. **Performance**: Sub-second response times globally
4. **Security**: Enterprise-grade security at every layer
5. **Flexibility**: Easy to extend and modify
6. **Cost-Effectiveness**: Efficient resource utilization

The architecture will continue to evolve based on:
- User feedback and requirements
- Technology advancements
- Performance metrics and bottlenecks
- Security threats and best practices