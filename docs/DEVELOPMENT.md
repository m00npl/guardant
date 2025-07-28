# GuardAnt Development Guide

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Structure](#project-structure)
3. [Technology Stack](#technology-stack)
4. [Development Workflow](#development-workflow)
5. [Coding Standards](#coding-standards)
6. [Testing](#testing)
7. [Debugging](#debugging)
8. [Performance Optimization](#performance-optimization)
9. [Common Tasks](#common-tasks)

## Development Environment Setup

### Prerequisites

- **Bun** 1.0+ (recommended) or Node.js 18+
- **Docker** and Docker Compose
- **Redis** 7.0+ (or use Docker)
- **RabbitMQ** 3.12+ (or use Docker)
- **PostgreSQL** 15+ (optional, for future features)
- **Git** for version control

### Initial Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-org/guardant.git
cd guardant
```

2. **Install Bun** (if not already installed)
```bash
curl -fsSL https://bun.sh/install | bash
```

3. **Install dependencies**
```bash
# Install all dependencies including workspaces
bun install

# Or install specific workspace
cd apps/frontend-admin && bun install
```

4. **Set up environment variables**
```bash
# Copy example environment files
cp .env.example .env
cp apps/frontend-admin/.env.example apps/frontend-admin/.env
cp services/api-admin/.env.example services/api-admin/.env

# Edit .env files with your configuration
```

5. **Start infrastructure services**
```bash
# Using Docker Compose
docker compose up -d redis rabbitmq

# Or install locally
brew install redis rabbitmq
brew services start redis
brew services start rabbitmq
```

6. **Start development servers**
```bash
# Start all services
./dev-start.sh

# Or start individually
cd services/api-admin && bun run dev
cd apps/frontend-admin && bun run dev
```

### IDE Setup

#### VS Code (Recommended)

Install recommended extensions:
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - TypeScript support
- **Tailwind CSS IntelliSense** - Tailwind autocomplete
- **GitLens** - Git integration
- **Error Lens** - Inline error display

Settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "\"([^\"]*)\""]
  ]
}
```

#### WebStorm

1. Enable TypeScript service
2. Configure ESLint automatic fix on save
3. Set up Prettier as default formatter
4. Configure Bun as package manager

## Project Structure

```
guardant/
├── apps/                      # Frontend applications
│   ├── frontend-admin/        # Admin dashboard (React + Vite)
│   └── frontend-status/       # Public status page (React + Vite)
├── services/                  # Backend services
│   ├── api-admin/            # Admin API (Hono.js)
│   ├── api-public/           # Public API (Hono.js)
│   └── workers/              # Background workers
├── packages/                  # Shared packages
│   ├── shared-types/         # TypeScript types
│   ├── ui-components/        # Shared React components
│   ├── golem-storage/        # Golem integration
│   ├── auth-system/          # Authentication logic
│   └── payments/             # Payment processing
├── shared/                   # Shared utilities
│   ├── logger.ts             # Logging utilities
│   ├── metrics.ts            # Metrics collection
│   ├── tracing.ts            # OpenTelemetry tracing
│   └── health.ts             # Health check utilities
├── tests/                    # Test suites
│   ├── e2e/                  # End-to-end tests
│   ├── integration/          # Integration tests
│   ├── contract/             # Contract tests
│   └── load/                 # Load tests
└── docs/                     # Documentation
```

### Key Directories Explained

- **apps/**: User-facing applications built with React and Vite
- **services/**: Backend microservices using Hono.js framework
- **packages/**: Reusable packages following workspace pattern
- **shared/**: Utilities shared across all services
- **tests/**: Comprehensive test suites

## Technology Stack

### Backend

- **Runtime**: Bun (preferred) or Node.js
- **Framework**: Hono.js - Fast, lightweight web framework
- **Language**: TypeScript with strict mode
- **Database**: Redis (primary), PostgreSQL (future)
- **Message Queue**: RabbitMQ with AMQP
- **Storage**: Golem Network L3 (decentralized)
- **Authentication**: JWT with refresh tokens
- **Validation**: Zod schemas
- **Testing**: Vitest, Playwright

### Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development
- **Styling**: Tailwind CSS + custom design system
- **State**: Zustand for global state
- **Routing**: React Router v6
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React

### Infrastructure

- **Container**: Docker for all services
- **Orchestration**: Docker Compose (dev), Kubernetes (prod)
- **Monitoring**: OpenTelemetry + Prometheus
- **Logging**: Structured JSON logging
- **CI/CD**: GitHub Actions
- **Deployment**: Golem Network nodes

## Development Workflow

### Branch Strategy

We use Git Flow with the following branches:

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Production hotfixes
- `release/*` - Release preparation

### Making Changes

1. **Create a feature branch**
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

2. **Make your changes**
- Write clean, documented code
- Add tests for new functionality
- Update documentation if needed

3. **Commit with conventional commits**
```bash
git add .
git commit -m "feat: add new monitoring capability"
```

Commit types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance

4. **Push and create PR**
```bash
git push origin feature/your-feature-name
```

### Code Review Process

1. All code must be reviewed before merging
2. At least one approval required
3. CI checks must pass
4. No merge conflicts
5. Documentation updated if needed

## Coding Standards

### TypeScript Guidelines

```typescript
// Use explicit types
interface ServiceConfig {
  id: string;
  name: string;
  interval: number;
}

// Prefer const assertions
const INTERVALS = {
  FAST: 30,
  NORMAL: 60,
  SLOW: 300,
} as const;

// Use proper error handling
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed', { error });
  return { success: false, error: error.message };
}

// Document complex functions
/**
 * Monitors a service and reports its status
 * @param config - Service configuration
 * @returns Promise with monitoring result
 */
async function monitorService(config: ServiceConfig): Promise<MonitorResult> {
  // Implementation
}
```

### React Best Practices

```tsx
// Use functional components with TypeScript
interface ServiceCardProps {
  service: Service;
  onStatusChange?: (status: ServiceStatus) => void;
}

export function ServiceCard({ service, onStatusChange }: ServiceCardProps) {
  // Use proper hooks
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  
  // Memoize expensive computations
  const uptimePercentage = useMemo(() => {
    return calculateUptime(service.checks);
  }, [service.checks]);
  
  // Handle events properly
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await refreshService(service.id);
      onStatusChange?.(service.status);
    } finally {
      setIsLoading(false);
    }
  }, [service.id, service.status, onStatusChange]);
  
  return (
    <Card>
      {/* Component JSX */}
    </Card>
  );
}
```

### API Design

```typescript
// Use consistent response format
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// RESTful endpoints
app.get('/api/nests/:nestId/services', async (c) => {
  const { nestId } = c.req.param();
  const services = await getServices(nestId);
  
  return c.json<ApiResponse<Service[]>>({
    success: true,
    data: services,
    timestamp: Date.now(),
  });
});

// Proper error handling
app.onError((err, c) => {
  logger.error('Request failed', { error: err });
  
  return c.json<ApiResponse>({
    success: false,
    error: err.message,
    timestamp: Date.now(),
  }, 500);
});
```

## Testing

### Unit Tests

```typescript
// services/api-admin/src/__tests__/auth.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createAuthService } from '../auth';

describe('AuthService', () => {
  let authService: AuthService;
  
  beforeEach(() => {
    authService = createAuthService();
  });
  
  it('should generate valid JWT token', async () => {
    const token = await authService.generateToken({ userId: '123' });
    expect(token).toMatch(/^eyJ/);
    
    const decoded = await authService.verifyToken(token);
    expect(decoded.userId).toBe('123');
  });
});
```

### Integration Tests

```typescript
// tests/integration/api-flow.test.ts
import { describe, it, expect } from 'vitest';
import { testClient } from './test-client';

describe('API Integration', () => {
  it('should create and monitor service', async () => {
    // Create nest
    const { data: nest } = await testClient.post('/api/nests', {
      name: 'Test Nest',
      subdomain: 'test',
    });
    
    // Add service
    const { data: service } = await testClient.post(
      `/api/nests/${nest.id}/services`,
      {
        name: 'Test Service',
        type: 'web',
        target: 'https://example.com',
      }
    );
    
    // Check monitoring
    await waitFor(() => {
      const status = testClient.get(`/api/services/${service.id}/status`);
      expect(status.data.status).toBe('up');
    });
  });
});
```

### E2E Tests

```typescript
// tests/e2e/status-page.spec.ts
import { test, expect } from '@playwright/test';

test('public status page displays services', async ({ page }) => {
  await page.goto('http://localhost:5174?nest=demo');
  
  // Wait for services to load
  await page.waitForSelector('[data-testid="service-card"]');
  
  // Check service status
  const serviceCard = page.locator('[data-testid="service-card"]').first();
  await expect(serviceCard).toContainText('Operational');
  
  // Check response time
  await expect(serviceCard).toContainText('ms');
});
```

### Running Tests

```bash
# Unit tests
bun test

# Integration tests
bun test:integration

# E2E tests
bun test:e2e

# Test coverage
bun test:coverage

# Watch mode
bun test:watch
```

## Debugging

### Backend Debugging

1. **Using Bun inspector**
```bash
bun --inspect src/index.ts
```

2. **VS Code debugging**
```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug API",
  "runtimeExecutable": "bun",
  "runtimeArgs": ["--inspect", "src/index.ts"],
  "cwd": "${workspaceFolder}/services/api-admin"
}
```

3. **Logging debug information**
```typescript
import { logger } from '@/shared/logger';

logger.debug('Service check started', {
  serviceId: service.id,
  config: service.config,
});
```

### Frontend Debugging

1. **React DevTools** - Install browser extension
2. **Redux DevTools** - For state debugging
3. **Network tab** - Monitor API calls
4. **Console logging** with proper context

```tsx
console.group('ServiceCard render');
console.log('Props:', props);
console.log('State:', state);
console.groupEnd();
```

### Common Debugging Scenarios

#### Service Not Updating
```typescript
// Check worker logs
docker logs guardant-workers

// Check Redis
redis-cli
> KEYS service:*
> GET service:srv_123

// Check RabbitMQ
rabbitmqctl list_queues
```

#### Authentication Issues
```typescript
// Check JWT token
const token = localStorage.getItem('token');
console.log('Token:', jwt.decode(token));

// Check auth headers
fetch('/api/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Performance Optimization

### Backend Performance

1. **Use Redis caching**
```typescript
const cached = await redis.get(`cache:${key}`);
if (cached) return JSON.parse(cached);

const result = await expensiveOperation();
await redis.setex(`cache:${key}`, 300, JSON.stringify(result));
return result;
```

2. **Batch operations**
```typescript
// Instead of multiple queries
const results = await Promise.all(
  ids.map(id => getService(id))
);

// Use batch operation
const results = await getServicesBatch(ids);
```

3. **Use connection pooling**
```typescript
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
});
```

### Frontend Performance

1. **Code splitting**
```tsx
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

<Suspense fallback={<Loading />}>
  <AdminDashboard />
</Suspense>
```

2. **Memoization**
```tsx
const expensiveComponent = memo(({ data }) => {
  const processed = useMemo(() => processData(data), [data]);
  return <Chart data={processed} />;
});
```

3. **Virtual scrolling for long lists**
```tsx
import { VirtualList } from '@tanstack/react-virtual';

<VirtualList
  count={services.length}
  estimateSize={() => 80}
  renderItem={({ index }) => <ServiceRow service={services[index]} />}
/>
```

## Common Tasks

### Adding a New Service Type

1. **Define the type**
```typescript
// packages/shared-types/src/index.ts
export interface DnsMonitor extends BaseMonitor {
  type: 'dns';
  config: {
    hostname: string;
    recordType: 'A' | 'AAAA' | 'MX' | 'TXT';
    expectedValue?: string;
  };
}
```

2. **Implement monitor**
```typescript
// services/workers/src/monitors/dns.ts
export async function checkDns(config: DnsMonitor['config']) {
  const result = await dns.resolve(config.hostname, config.recordType);
  return {
    status: result ? 'up' : 'down',
    responseTime: performance.now(),
    details: { records: result },
  };
}
```

3. **Add UI support**
```tsx
// apps/frontend-admin/src/components/ServiceForm.tsx
{serviceType === 'dns' && (
  <DnsConfigFields
    value={config}
    onChange={setConfig}
  />
)}
```

### Adding a New API Endpoint

1. **Define the route**
```typescript
// services/api-admin/src/routes/alerts.ts
const alertRoutes = new Hono();

alertRoutes.post('/webhooks', async (c) => {
  const body = await c.req.json();
  const webhook = await createWebhook(body);
  return c.json({ success: true, data: webhook });
});

export { alertRoutes };
```

2. **Add to main app**
```typescript
// services/api-admin/src/index.ts
import { alertRoutes } from './routes/alerts';

app.route('/api/alerts', alertRoutes);
```

3. **Add types**
```typescript
// packages/shared-types/src/index.ts
export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
}
```

### Database Migrations

```typescript
// migrations/001_add_webhooks.ts
export async function up(db: Database) {
  await db.schema.createTable('webhooks', (table) => {
    table.string('id').primary();
    table.string('nest_id').notNullable();
    table.string('url').notNullable();
    table.jsonb('events').notNullable();
    table.string('secret').notNullable();
    table.timestamps(true, true);
    
    table.index('nest_id');
  });
}

export async function down(db: Database) {
  await db.schema.dropTable('webhooks');
}
```

### Updating Dependencies

```bash
# Check outdated packages
bun outdated

# Update all dependencies
bun update

# Update specific package
bun update react

# Update in workspace
cd apps/frontend-admin && bun update
```

## Troubleshooting Development Issues

### Bun specific issues

```bash
# Clear Bun cache
bun pm cache rm

# Reinstall dependencies
rm -rf node_modules bun.lockb
bun install

# Use Node.js fallback
npm install
npm run dev
```

### Port conflicts

```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or use different port
PORT=3002 bun run dev
```

### Docker issues

```bash
# Reset Docker environment
docker compose down -v
docker system prune -a
docker compose up --build
```

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [Hono.js Documentation](https://hono.dev)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Golem Network Docs](https://docs.golem.network)