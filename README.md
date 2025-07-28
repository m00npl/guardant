# GuardAnt 🐜 - Enterprise Multi-Tenant Monitoring Platform

<!-- Build Status -->
[![Build Status](https://github.com/m00npl/guardant/workflows/CI/badge.svg)](https://github.com/m00npl/guardant/actions)
[![Tests](https://github.com/m00npl/guardant/workflows/Tests/badge.svg)](https://github.com/m00npl/guardant/actions)
[![codecov](https://codecov.io/gh/m00npl/guardant/branch/main/graph/badge.svg)](https://codecov.io/gh/m00npl/guardant)

<!-- Code Quality -->
[![Code Quality](https://img.shields.io/codacy/grade/your-project-id.svg)](https://www.codacy.com/app/m00npl/guardant)
[![Maintainability](https://api.codeclimate.com/v1/badges/your-badge-id/maintainability)](https://codeclimate.com/github/m00npl/guardant/maintainability)
[![Technical Debt](https://img.shields.io/codacy/tech-debt/your-project-id.svg)](https://www.codacy.com/app/m00npl/guardant)

<!-- Project Info -->
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)
[![Golem Base](https://img.shields.io/badge/Golem%20Base-SDK-green.svg)](https://golem.network/)

<!-- Version & Release -->
[![GitHub release](https://img.shields.io/github/release/m00npl/guardant.svg)](https://github.com/m00npl/guardant/releases/)
[![GitHub commits](https://img.shields.io/github/commits-since/m00npl/guardant/latest.svg)](https://github.com/m00npl/guardant/commits/main)
[![Last Commit](https://img.shields.io/github/last-commit/m00npl/guardant.svg)](https://github.com/m00npl/guardant/commits/main)

<!-- Community -->
[![GitHub stars](https://img.shields.io/github/stars/m00npl/guardant.svg?style=social&label=Star)](https://github.com/m00npl/guardant)
[![GitHub forks](https://img.shields.io/github/forks/m00npl/guardant.svg?style=social&label=Fork)](https://github.com/m00npl/guardant/fork)
[![GitHub watchers](https://img.shields.io/github/watchers/m00npl/guardant.svg?style=social&label=Watch)](https://github.com/m00npl/guardant)
[![Contributors](https://img.shields.io/github/contributors/m00npl/guardant.svg)](https://github.com/m00npl/guardant/graphs/contributors)

<!-- Dependencies & Security -->
[![Dependencies](https://img.shields.io/david/m00npl/guardant.svg)](https://david-dm.org/m00npl/guardant)
[![Known Vulnerabilities](https://snyk.io/test/github/m00npl/guardant/badge.svg)](https://snyk.io/test/github/m00npl/guardant)
[![Security Score](https://img.shields.io/security-headers?url=https://guardant.dev)](https://securityheaders.com/?q=https://guardant.dev)

<!-- Documentation & Support -->
[![Documentation](https://img.shields.io/badge/docs-latest-brightgreen.svg)](https://m00npl.github.io/guardant/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/m00npl/guardant/blob/main/CONTRIBUTING.md)
[![Discord](https://img.shields.io/discord/your-discord-id?label=Discord&logo=discord)](https://discord.gg/guardant)

> **GuardAnt** is a next-generation, enterprise-ready multi-tenant monitoring platform with decentralized storage powered by Golem Base. Built from the ground up for scalability, reliability, and tenant isolation.

## 🚀 Overview

GuardAnt transforms traditional monitoring into a decentralized, multi-tenant ecosystem where each "nest" (tenant) operates with complete isolation while benefiting from shared infrastructure. The platform combines modern web technologies with blockchain-based storage for unprecedented reliability and data sovereignty.

### Key Features

- 🏢 **True Multi-Tenancy**: Complete tenant isolation with "nest" architecture
- 🌐 **Decentralized Storage**: Powered by Golem Base L3 for censorship-resistant data persistence
- 📊 **Real-time Analytics**: Privacy-compliant usage tracking and business intelligence
- 📈 **SLA Management**: Comprehensive service level agreement monitoring and reporting
- 💰 **Cost Tracking**: Advanced resource usage monitoring with Golem network integration
- ⚡ **Auto-Failover**: Enterprise-grade high availability with intelligent failover
- 🔒 **Security First**: End-to-end encryption, rate limiting, and comprehensive audit logging
- 📱 **Modern UI**: React-based admin dashboards and public status pages

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Frontend      │    │   Frontend      │
│   (Admin)       │    │   (Status)      │    │   (Marketing)   │
│   Port: 3001    │    │   Port: 3002    │    │   Port: 3003    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Admin     │    │   API Public    │    │   Workers       │
│   Port: 4001    │    │   Port: 4002    │    │   Background    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌─────────────────────────────────────────┐
         │              Shared Layer               │
         │  • Golem Base Integration              │
         │  • Analytics & SLA Reporting           │
         │  • Cost Tracking & Failover            │
         │  • Logging, Tracing & Error Handling   │
         └─────────────────────────────────────────┘
                                 │
         ┌─────────────────────────────────────────┐
         │           Golem Base L3                 │
         │     Decentralized Storage Layer         │
         └─────────────────────────────────────────┘
```

## 🛠️ Technology Stack

### Core Technologies
- **Runtime**: Bun (optimized for performance)
- **Language**: TypeScript 5.0+
- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: Hono.js (ultra-fast web framework)
- **Storage**: Golem Base SDK (decentralized)
- **Message Queue**: RabbitMQ
- **Caching**: Redis

### Enterprise Features
- **Observability**: OpenTelemetry, Prometheus, Jaeger
- **Testing**: Bun Test, Playwright, k6 Load Testing
- **Security**: OWASP ZAP integration, comprehensive validation
- **CI/CD**: Automated deployment pipelines with blue-green strategy

## 🚦 Quick Start

### Prerequisites

- **Bun** >= 1.0.0
- **Docker** and **Docker Compose**
- **Node.js** >= 18.0.0 (fallback)
- **Git**

### Environment Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-org/guardant.git
cd guardant
```

2. **Install dependencies**
```bash
bun install
```

3. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
```env
# Golem Base Configuration
GOLEM_CHAIN_ID=600606
GOLEM_HTTP_URL=https://kaolin.holesky.golem-base.io/rpc
GOLEM_WS_URL=wss://kaolin.holesky.golem-base.io/rpc/ws
GOLEM_PRIVATE_KEY=your_private_key_hex
GOLEM_WALLET_ADDRESS=your_wallet_address

# Database
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672

# Authentication
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# Monitoring
JAEGER_ENDPOINT=http://localhost:14268/api/traces
PROMETHEUS_ENDPOINT=http://localhost:9090
```

4. **Start the development environment**
```bash
# Start all services
bun dev:start

# Or use Docker Compose
docker compose up --build
```

### Service URLs

- **Admin Dashboard**: http://localhost:3001
- **Public Status Pages**: http://localhost:3002
- **Marketing Site**: http://localhost:3003
- **Admin API**: http://localhost:4001
- **Public API**: http://localhost:4002

## 📚 Core Concepts

### Nests (Multi-Tenancy)
Each **nest** represents an isolated tenant with:
- Unique namespace and data isolation
- Independent service monitoring
- Separate billing and analytics
- Custom branding and domains

### Service Types
GuardAnt supports multiple monitoring types:
- **HTTP/HTTPS**: Website and API monitoring
- **TCP**: Port connectivity checks  
- **ICMP**: Ping-based monitoring
- **DNS**: Domain resolution monitoring
- **SSL**: Certificate expiration tracking

### Data Storage
All tenant data is stored in **Golem Base L3**:
- Immutable and censorship-resistant
- Automatic conflict resolution
- Built-in versioning and backup
- Local caching for performance

## 🔧 Development

### Project Structure

```
guardant/
├── apps/                          # Frontend applications
│   ├── frontend-admin/           # Tenant admin dashboard
│   ├── frontend-status/          # Public status pages
│   └── frontend-marketing/       # Marketing website
├── services/                     # Backend services
│   ├── api-admin/               # Admin API server
│   ├── api-public/              # Public API server
│   └── workers/                 # Background monitoring workers
├── shared/                      # Shared libraries and utilities
│   ├── golem/                   # Golem Base integration
│   ├── analytics/               # Usage analytics system
│   ├── sla/                     # SLA monitoring and reporting
│   ├── cost/                    # Cost tracking and billing
│   ├── failover/                # High availability system
│   └── utils/                   # Common utilities
├── tests/                       # Test suites
│   ├── integration/             # Integration tests
│   ├── e2e/                     # End-to-end tests
│   ├── load/                    # Load testing with k6
│   └── security/                # Security testing
└── docs/                        # Documentation
```

### Development Commands

```bash
# Development
bun dev:start          # Start all services in development
bun dev:stop           # Stop all development services
bun dev:logs           # View aggregated logs

# Testing
bun test               # Run unit tests
bun test:integration   # Run integration tests
bun test:e2e          # Run end-to-end tests
bun test:load         # Run load tests
bun test:security     # Run security tests

# Building
bun build             # Build all services
bun build:frontend    # Build frontend only
bun build:backend     # Build backend only

# Database
bun db:migrate        # Run database migrations
bun db:seed           # Seed database with test data
bun db:reset          # Reset database

# Monitoring
bun monitor:health    # Check service health
bun monitor:metrics   # View system metrics
bun monitor:traces    # View distributed traces
```

### Adding a New Nest

```typescript
import { createGolemAdapter, DataType } from '@guardant/shared';

// Initialize Golem adapter
const golemAdapter = createGolemAdapter(
  'your-service',
  {
    enabled: true,
    nestIsolation: true,
    encryptionEnabled: true
  }
);

await golemAdapter.initialize();

// Store nest configuration
const nestConfig = {
  name: 'My Monitoring Nest',
  services: [
    {
      id: 'web-1',
      name: 'Main Website',
      url: 'https://example.com',
      type: 'web'
    }
  ]
};

await golemAdapter.storeNestData(
  'my-nest-id',
  DataType.NEST_CONFIGURATION,
  nestConfig
);
```

## 📊 Monitoring & Analytics

### Usage Analytics
Track user behavior with privacy-first analytics:

```typescript
import { createUsageAnalyticsManager } from '@guardant/shared';

const analytics = createUsageAnalyticsManager('my-service', {
  enabled: true,
  anonymizeIPs: true,
  respectDoNotTrack: true,
  samplingRate: 0.1 // 10% sampling
});

// Track page views
await analytics.trackPageView('nest-id', '/dashboard', 'user-id');

// Track API calls
await analytics.trackApiCall('nest-id', '/api/status', 'GET', 200, 150);

// Get insights
const metrics = await analytics.getUsageMetrics('nest-id', startDate, endDate);
```

### SLA Monitoring
Define and monitor service level agreements:

```typescript
import { createSLAReportingManager } from '@guardant/shared';

const slaManager = createSLAReportingManager('sla-service', {
  enabled: true,
  automaticReporting: true,
  reportFormats: ['pdf', 'json']
});

// Create SLA target
const sla = await slaManager.createSLATarget({
  nestId: 'my-nest',
  name: 'Gold SLA',
  uptime: { target: 99.9, measurement: 'monthly' },
  responseTime: { target: 200, percentile: 95 }
});

// Generate report
const report = await slaManager.generateSLAReport(
  'my-nest',
  'summary',
  startDate,
  endDate,
  ['pdf', 'json']
);
```

### Cost Tracking
Monitor resource usage and costs:

```typescript
import { createCostTrackingManager } from '@guardant/shared';

const costManager = createCostTrackingManager('cost-service', {
  enabled: true,
  includeGolemCredits: true,
  enableOptimizationSuggestions: true
});

// Track resource usage
await costManager.trackResourceUsage({
  nestId: 'my-nest',
  resourceType: 'monitoring_check',
  quantity: 1000,
  unit: 'count'
});

// Get cost summary
const costs = await costManager.calculateCostSummary(
  'my-nest',
  startOfMonth,
  endOfMonth
);
```

## 🔄 High Availability

### Automatic Failover
Configure intelligent failover for critical services:

```typescript
import { createFailoverSystemManager } from '@guardant/shared';

const failover = createFailoverSystemManager('failover-service', {
  enabled: true,
  healthCheckInterval: 30000,
  maxConcurrentFailovers: 3
});

// Register service endpoint
const endpoint = await failover.registerEndpoint({
  name: 'api-primary',
  url: 'https://api.example.com',
  region: 'us-east-1',
  priority: 1,
  healthCheckPath: '/health',
  capacity: 1000
});

// Add failover rule
await failover.addFailoverRule({
  name: 'API Failover Rule',
  servicePattern: 'api-.*',
  triggerConditions: [{
    type: 'health_check_failure',
    threshold: 3,
    duration: 60000,
    operator: 'gte'
  }],
  failoverStrategy: {
    type: 'immediate',
    targetSelection: 'highest_priority'
  }
});
```

## 🔒 Security

GuardAnt implements security best practices:

- **Authentication**: JWT-based with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Data Encryption**: End-to-end encryption for sensitive data
- **Rate Limiting**: Per-tenant rate limiting and DDoS protection
- **Input Validation**: Comprehensive request validation
- **Audit Logging**: Complete audit trail for all actions
- **Security Headers**: OWASP security headers implementation

### Security Testing

```bash
# Run security scan
bun test:security

# Generate security report
bun security:report

# Check for vulnerabilities
bun audit
```

## 📖 API Documentation

### Admin API Endpoints

```
POST   /api/v1/nests                 # Create new nest
GET    /api/v1/nests/:id             # Get nest details
PUT    /api/v1/nests/:id             # Update nest
DELETE /api/v1/nests/:id             # Delete nest

POST   /api/v1/nests/:id/services    # Add service to nest
GET    /api/v1/nests/:id/services    # List nest services
PUT    /api/v1/services/:id          # Update service
DELETE /api/v1/services/:id          # Delete service

GET    /api/v1/analytics/:nestId     # Get analytics data
GET    /api/v1/sla/:nestId           # Get SLA reports
GET    /api/v1/costs/:nestId         # Get cost data
```

### Public API Endpoints

```
GET    /api/v1/status/:nestId        # Get nest status
GET    /api/v1/status/:nestId/history # Get status history
GET    /api/v1/incidents/:nestId     # Get incidents
GET    /api/v1/metrics/:nestId       # Get public metrics
```

## 🚀 Deployment

### Production Deployment

1. **Build for production**
```bash
bun build:production
```

2. **Configure environment**
```bash
cp .env.production.example .env.production
# Configure production settings
```

3. **Deploy using Docker**
```bash
docker compose -f docker-compose.prod.yml up -d
```

4. **Set up monitoring**
```bash
# Deploy monitoring stack
kubectl apply -f k8s/monitoring/
```

### Scaling Considerations

- **Horizontal Scaling**: Services are stateless and can be scaled independently
- **Database Sharding**: Implement tenant-based sharding for large deployments
- **CDN Integration**: Use CDN for status pages and static assets
- **Load Balancing**: Configure load balancers with health checks
- **Auto-scaling**: Implement container auto-scaling based on metrics

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `bun test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Standardized commit messages
- **Test Coverage**: Minimum 80% coverage required

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Golem Network** for providing decentralized storage infrastructure
- **Bun** for the incredibly fast JavaScript runtime
- **Hono.js** for the lightweight web framework
- **OpenTelemetry** for observability standards

## 📞 Support

- **Documentation**: [https://docs.guardant.dev](https://docs.guardant.dev)
- **Discord**: [https://discord.gg/guardant](https://discord.gg/guardant)
- **GitHub Issues**: [https://github.com/your-org/guardant/issues](https://github.com/your-org/guardant/issues)
- **Email**: moon.pl.kr@gmail.com

---

**GuardAnt** - Monitoring reimagined for the decentralized age 🐜⚡