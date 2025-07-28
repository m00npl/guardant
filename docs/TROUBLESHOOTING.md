# GuardAnt Troubleshooting Guide

## Table of Contents

1. [Common Issues](#common-issues)
2. [Service-Specific Issues](#service-specific-issues)
3. [Performance Problems](#performance-problems)
4. [Database Issues](#database-issues)
5. [Network Issues](#network-issues)
6. [Authentication Problems](#authentication-problems)
7. [Monitoring Issues](#monitoring-issues)
8. [Deployment Problems](#deployment-problems)
9. [Debugging Tools](#debugging-tools)
10. [Getting Help](#getting-help)

## Common Issues

### Application Won't Start

#### Symptoms
- Service fails to start
- Exit code 1
- No logs generated

#### Diagnosis
```bash
# Check if ports are already in use
lsof -i :3001  # Admin API
lsof -i :3002  # Public API
lsof -i :5173  # Admin Frontend
lsof -i :5174  # Status Frontend

# Check environment variables
env | grep -E "(NODE_ENV|REDIS|JWT)"

# Check dependencies
bun install
bun run typecheck
```

#### Solutions

1. **Port already in use**
```bash
# Kill process using port
kill -9 $(lsof -t -i:3001)

# Or use different port
PORT=3003 bun run dev
```

2. **Missing dependencies**
```bash
# Clean install
rm -rf node_modules bun.lockb
bun install
```

3. **Missing environment variables**
```bash
# Copy example env
cp .env.example .env
# Edit with required values
vim .env
```

### Bun Installation Issues

#### Symptoms
- `bun: command not found`
- Bun crashes
- Incompatible version

#### Solutions

1. **Install Bun**
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # or ~/.zshrc
```

2. **Update Bun**
```bash
bun upgrade
```

3. **Use Node.js fallback**
```bash
# Replace bun with npm/yarn
npm install
npm run dev
```

### TypeScript Errors

#### Common Error Messages
- `Cannot find module`
- `Type 'X' is not assignable to type 'Y'`
- `Property does not exist on type`

#### Solutions

1. **Regenerate types**
```bash
# Clean build
rm -rf dist
bun run build
```

2. **Update TypeScript**
```bash
bun update typescript @types/node
```

3. **Fix import paths**
```typescript
// Wrong
import { Service } from '../../../types';

// Correct
import { Service } from '@/types';
```

## Service-Specific Issues

### Admin API Issues

#### JWT Token Invalid

**Symptoms:**
- 401 Unauthorized errors
- "Invalid token" messages

**Diagnosis:**
```bash
# Check JWT secret
echo $JWT_SECRET | wc -c  # Should be 32+ chars

# Test token generation
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

**Solutions:**
```typescript
// Ensure JWT secret is set
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

// Verify token correctly
const token = req.headers.authorization?.replace('Bearer ', '');
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

#### RabbitMQ Connection Failed

**Symptoms:**
- "ECONNREFUSED" errors
- Workers not processing tasks

**Solutions:**
```bash
# Start RabbitMQ
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management

# Check connection
nc -zv localhost 5672
```

### Public API Issues

#### Redis Connection Errors

**Symptoms:**
- "Redis connection refused"
- Slow API responses
- Cache misses

**Diagnosis:**
```bash
# Test Redis connection
redis-cli ping

# Check Redis status
redis-cli info server
```

**Solutions:**
```bash
# Start Redis
docker run -d --name redis \
  -p 6379:6379 \
  redis:7-alpine

# Clear Redis cache
redis-cli FLUSHDB
```

#### CORS Errors

**Symptoms:**
- "CORS policy" errors in browser
- Blocked requests from frontend

**Solutions:**
```typescript
// Update CORS middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://guardant.me'
  ],
  credentials: true
}));
```

### Worker Issues

#### Workers Not Processing Jobs

**Symptoms:**
- Jobs stuck in queue
- No monitoring results
- High queue depth

**Diagnosis:**
```bash
# Check worker logs
docker logs guardant-workers

# Check RabbitMQ queues
rabbitmqctl list_queues name messages consumers

# Monitor worker health
curl http://localhost:3099/health
```

**Solutions:**

1. **Restart workers**
```bash
docker restart guardant-workers
```

2. **Scale workers**
```bash
docker-compose up -d --scale workers=5
```

3. **Clear dead letter queue**
```javascript
// Clear failed jobs
await channel.purgeQueue('monitoring.dlq');
```

#### Geolocation Errors

**Symptoms:**
- `this.getContinent is not a function`
- Location detection fails

**Solution:**
```typescript
// Fix method binding
const services = [
  { url: 'https://ipapi.co/json/', parser: this.parseIPAPI.bind(this) },
  { url: 'https://ipinfo.io/json', parser: this.parseIPInfo.bind(this) }
];
```

### Frontend Issues

#### Build Failures

**Symptoms:**
- Vite build errors
- Missing modules
- Type errors

**Solutions:**
```bash
# Clean build
rm -rf dist node_modules/.vite
bun install
bun run build

# Check for circular dependencies
npx madge --circular src
```

#### State Management Issues

**Symptoms:**
- State not updating
- Stale data displayed
- React hooks errors

**Solutions:**
```typescript
// Fix Zustand store
const useStore = create((set, get) => ({
  // Use get() to access current state
  updateService: (id, data) => set((state) => ({
    services: state.services.map(s => 
      s.id === id ? { ...s, ...data } : s
    )
  }))
}));

// Fix React Query
const queryClient = useQueryClient();
queryClient.invalidateQueries(['services']);
```

## Performance Problems

### Slow API Response Times

#### Diagnosis
```bash
# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/api/health

# Check database queries
docker exec -it postgres psql -U guardant -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Monitor Redis performance
redis-cli --latency
```

#### Solutions

1. **Add caching**
```typescript
// Cache expensive operations
const cached = await redis.get(`service:${id}`);
if (cached) return JSON.parse(cached);

const service = await db.services.findById(id);
await redis.setex(`service:${id}`, 300, JSON.stringify(service));
return service;
```

2. **Optimize queries**
```typescript
// Bad: N+1 query
const services = await db.services.findAll();
for (const service of services) {
  service.checks = await db.checks.findByService(service.id);
}

// Good: Join query
const services = await db.services.findAllWithChecks();
```

3. **Enable compression**
```typescript
import compression from 'compression';
app.use(compression());
```

### High Memory Usage

#### Diagnosis
```bash
# Check memory usage
docker stats

# Node.js heap snapshot
node --inspect src/index.js
# Open chrome://inspect

# Find memory leaks
npm install -g clinic
clinic doctor -- node src/index.js
```

#### Solutions

1. **Fix memory leaks**
```typescript
// Clear timers
const timers = new Map();

function scheduleCheck(id: string) {
  // Clear existing timer
  if (timers.has(id)) {
    clearTimeout(timers.get(id));
  }
  
  const timer = setTimeout(() => {
    performCheck(id);
    timers.delete(id); // Clean up
  }, 30000);
  
  timers.set(id, timer);
}
```

2. **Limit concurrent operations**
```typescript
import pLimit from 'p-limit';

const limit = pLimit(10); // Max 10 concurrent

const results = await Promise.all(
  services.map(service => 
    limit(() => checkService(service))
  )
);
```

### Database Connection Pool Exhausted

#### Symptoms
- "Too many connections" errors
- Timeouts waiting for connection
- Database performance degradation

#### Solutions
```typescript
// Configure connection pool
const pool = new Pool({
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Monitor pool
pool.on('error', (err) => {
  logger.error('Pool error', err);
});

pool.on('connect', () => {
  logger.debug('New client connected');
});
```

## Database Issues

### Redis Issues

#### Memory Full
```bash
# Check memory usage
redis-cli INFO memory

# Configure max memory
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Clear old data
redis-cli --scan --pattern "cache:*" | xargs redis-cli DEL
```

#### Persistence Issues
```bash
# Check persistence
redis-cli CONFIG GET save
redis-cli CONFIG GET appendonly

# Force save
redis-cli BGSAVE

# Check save status
redis-cli LASTSAVE
```

### PostgreSQL Issues (Future)

#### Slow Queries
```sql
-- Find slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check missing indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;
```

#### Connection Issues
```bash
# Check connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Kill idle connections
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < NOW() - INTERVAL '10 minutes';"
```

## Network Issues

### DNS Resolution Problems

#### Symptoms
- Service checks failing with "ENOTFOUND"
- Intermittent connection failures

#### Solutions
```typescript
// Add DNS caching
import { promises as dns } from 'dns';
import NodeCache from 'node-cache';

const dnsCache = new NodeCache({ stdTTL: 300 });

async function resolveHost(hostname: string): Promise<string> {
  const cached = dnsCache.get(hostname);
  if (cached) return cached;
  
  const { address } = await dns.resolve4(hostname)[0];
  dnsCache.set(hostname, address);
  return address;
}
```

### SSL/TLS Certificate Issues

#### Symptoms
- "Certificate verify failed"
- "UNABLE_TO_VERIFY_LEAF_SIGNATURE"

#### Solutions
```typescript
// For development only
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// For production - add CA certificate
const agent = new https.Agent({
  ca: fs.readFileSync('ca-cert.pem')
});

fetch(url, { agent });
```

### Timeout Issues

#### Solutions
```typescript
// Configure timeouts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch(url, {
    signal: controller.signal
  });
} finally {
  clearTimeout(timeout);
}
```

## Authentication Problems

### Login Failures

#### Common Causes
1. Incorrect credentials
2. Account locked
3. Session expired
4. CSRF token mismatch

#### Debugging
```typescript
// Add detailed logging
app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  
  logger.debug('Login attempt', { email });
  
  const user = await db.users.findByEmail(email);
  if (!user) {
    logger.warn('User not found', { email });
    return c.json({ error: 'Invalid credentials' }, 401);
  }
  
  if (user.locked) {
    logger.warn('Account locked', { email });
    return c.json({ error: 'Account locked' }, 403);
  }
  
  // Continue authentication...
});
```

### Token Refresh Issues

#### Solutions
```typescript
// Implement token refresh
async function refreshToken(refreshToken: string) {
  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const user = await db.users.findById(decoded.userId);
    
    if (!user || user.refreshToken !== refreshToken) {
      throw new Error('Invalid refresh token');
    }
    
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    await db.users.update(user.id, { refreshToken: newRefreshToken });
    
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch (error) {
    throw new Error('Token refresh failed');
  }
}
```

## Monitoring Issues

### Health Checks Failing

#### Diagnosis
```bash
# Test individual services
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3099/health

# Check dependencies
redis-cli ping
rabbitmqctl status
```

#### Solutions
```typescript
// Implement detailed health checks
app.get('/health', async (c) => {
  const checks = {
    api: 'healthy',
    redis: 'unknown',
    rabbitmq: 'unknown',
    database: 'unknown'
  };
  
  try {
    await redis.ping();
    checks.redis = 'healthy';
  } catch (error) {
    checks.redis = 'unhealthy';
  }
  
  // Similar checks for other services...
  
  const allHealthy = Object.values(checks).every(s => s === 'healthy');
  
  return c.json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: Date.now()
  }, allHealthy ? 200 : 503);
});
```

### Metrics Not Updating

#### Common Causes
- Prometheus scraping issues
- Metrics endpoint down
- Time sync problems

#### Solutions
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify metrics endpoint
curl http://localhost:3001/metrics

# Fix time sync
sudo ntpdate -s time.nist.gov
```

## Deployment Problems

### Docker Build Failures

#### Common Issues
1. **Out of space**
```bash
# Clean Docker
docker system prune -a --volumes

# Check disk space
df -h
```

2. **Network issues during build**
```dockerfile
# Add retry logic
RUN npm ci --network-timeout 600000 --network-concurrency 1 \
  || npm ci --network-timeout 600000 --network-concurrency 1
```

3. **Cache issues**
```bash
# Build without cache
docker build --no-cache -t guardant/api .
```

### Container Startup Issues

#### Diagnosis
```bash
# Check container logs
docker logs container_name --tail 50

# Inspect container
docker inspect container_name

# Execute commands in container
docker exec -it container_name sh
```

#### Solutions
```yaml
# Add health checks to docker-compose
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Kubernetes Deployment Issues

#### Pod Crashes
```bash
# Check pod status
kubectl get pods -n guardant
kubectl describe pod pod_name -n guardant
kubectl logs pod_name -n guardant --previous

# Check events
kubectl get events -n guardant --sort-by='.lastTimestamp'
```

#### Solutions
```yaml
# Add resource limits
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"

# Add liveness/readiness probes
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10
  
readinessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Debugging Tools

### Logging

```typescript
// Enhanced logging
import { logger } from '@/shared/logger';

// Log levels
logger.error('Critical error', { error, stack: error.stack });
logger.warn('Warning message', { context });
logger.info('Info message', { metadata });
logger.debug('Debug details', { data });

// Structured logging
logger.info('Request processed', {
  requestId: c.get('requestId'),
  userId: c.get('userId'),
  duration: Date.now() - start,
  status: c.res.status
});
```

### Tracing

```typescript
// OpenTelemetry tracing
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('guardant');

async function processRequest(req: Request) {
  const span = tracer.startSpan('process_request');
  
  try {
    span.setAttributes({
      'http.method': req.method,
      'http.url': req.url
    });
    
    const result = await doWork();
    
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}
```

### Performance Profiling

```bash
# CPU profiling
node --cpu-prof src/index.js

# Memory profiling
node --heap-prof src/index.js

# Analyze with Chrome DevTools
# chrome://inspect
```

### Network Debugging

```bash
# Monitor HTTP traffic
tcpdump -i any -n port 3001

# Test with curl
curl -v -X POST http://localhost:3001/api/test \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# WebSocket debugging
wscat -c ws://localhost:3002/ws
```

## Getting Help

### Before Asking for Help

1. **Check the logs**
```bash
tail -f logs/*.log
docker logs container_name
```

2. **Search existing issues**
- GitHub Issues: https://github.com/your-org/guardant/issues
- Stack Overflow: [guardant] tag

3. **Gather information**
- Error messages
- Stack traces
- Environment details
- Steps to reproduce

### Reporting Issues

#### Bug Report Template
```markdown
**Description**
Brief description of the issue

**Steps to Reproduce**
1. Step one
2. Step two
3. Step three

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., Ubuntu 22.04]
- Node/Bun version: [e.g., Bun 1.0.0]
- GuardAnt version: [e.g., 1.0.0]

**Logs**
```
Relevant log output
```

**Additional Context**
Any other relevant information
```

### Support Channels

1. **Documentation**: https://docs.guardant.me
2. **GitHub Issues**: https://github.com/your-org/guardant/issues
3. **Discord**: https://discord.gg/guardant
4. **Email Support**: support@guardant.me
5. **Enterprise Support**: enterprise@guardant.me

### Emergency Support

For production emergencies:
- **Hotline**: +1-xxx-xxx-xxxx (24/7)
- **Emergency Email**: emergency@guardant.me
- **SLA Response Times**:
  - P0 (Critical): 15 minutes
  - P1 (High): 1 hour
  - P2 (Medium): 4 hours
  - P3 (Low): 24 hours