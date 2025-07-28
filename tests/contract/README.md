# GuardAnt Contract Tests

This directory contains contract tests for the GuardAnt multi-tenant monitoring system. Contract tests ensure API compatibility between services and help prevent breaking changes during development.

## Overview

Contract testing uses the [Pact](https://pact.io/) framework to verify that services can communicate correctly with each other. Each test defines the expected interactions between a consumer (client) and provider (server).

## Service Interactions

The GuardAnt system has the following service interactions:

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Admin API   │────│ Public API   │────│ Workers     │
│ (Provider)  │    │ (Consumer/   │    │ (Provider)  │
│             │    │  Provider)   │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
       │                                       │
       │            ┌─────────────────┐        │
       └────────────│ External        │────────┘
                    │ Services        │
                    │ (Provider)      │
                    └─────────────────┘
```

### Contract Test Files

- `admin-to-public.test.ts` - Admin API → Public API contracts
- `admin-to-workers.test.ts` - Admin API → Workers contracts  
- `workers-to-admin.test.ts` - Workers → Admin API contracts
- `public-to-workers.test.ts` - Public API → Workers contracts
- `workers-to-external.test.ts` - Workers → External Services contracts

## Running Tests

### Prerequisites

```bash
# Install dependencies
bun install

# Ensure directories exist
mkdir -p pacts logs
```

### Run All Contract Tests

```bash
# Run all contract tests
bun test

# Run tests with publishing
bun run test:all

# Run only consumer tests
bun run test:consumer

# Verify existing contracts
bun run test:verify

# Publish contracts to broker
bun run test:publish
```

### Run Individual Test Suites

```bash
# Run specific contract test
bun test admin-to-public.test.ts

# Run with verbose output
bun test --verbose workers-to-admin.test.ts
```

## Test Structure

### Consumer Tests

Consumer tests define what the consumer expects from the provider:

```typescript
test('should fetch nest status data', async () => {
  const pact = pactSetup.getPact('admin-to-public');
  
  // Define expected interaction
  await pact.addInteraction({
    state: 'nest has services with status data',
    uponReceiving: 'a request for nest status data',
    withRequest: {
      method: 'GET',
      path: '/api/status',
      headers: { 'X-Nest-Subdomain': 'test-nest' }
    },
    willRespondWith: {
      status: 200,
      body: { /* expected response */ }
    }
  });

  // Make actual request
  const result = await statusClient.getNestStatus('test-nest');
  
  // Verify expectations
  expect(result.nest.subdomain).toBe('test-nest');
  await pact.verify();
});
```

### Provider Verification

Provider verification ensures the actual service meets the contract:

```bash
# Verify Admin API meets contracts
bun run verify:admin-api

# Verify Workers meet contracts  
bun run verify:workers

# Verify Public API meets contracts
bun run verify:public-api
```

## Contract Scenarios

### Admin API ↔ Public API

- **Status Data Sync**: Admin API provides nest configuration and service status
- **Incident Sync**: Incident data synchronization between services
- **Branding Config**: Custom branding and theming data
- **Maintenance Windows**: Scheduled maintenance coordination

### Admin API ↔ Workers

- **Service Config Updates**: Service monitoring configuration changes
- **Worker Health Checks**: Worker status and performance monitoring
- **Scaling Coordination**: Dynamic worker scaling decisions
- **Configuration Management**: Worker settings and feature flags

### Workers ↔ Admin API

- **Status Reporting**: Workers report service check results
- **Incident Reporting**: Workers report detected failures
- **Heartbeat & Metrics**: Worker health and performance data
- **Configuration Requests**: Workers request latest configurations

### Public API ↔ Workers

- **Real-time Status**: Live status data for public pages
- **Historical Data**: Historical monitoring and uptime data
- **SSE Streaming**: Real-time updates via Server-Sent Events
- **Regional Performance**: Multi-region performance metrics

### Workers ↔ External Services

- **Health Checks**: HTTP endpoint monitoring
- **TCP Connectivity**: Port connectivity testing
- **SSL Monitoring**: Certificate validity checks
- **DNS Resolution**: DNS performance testing
- **Custom Validation**: API-specific validation rules

## Configuration

### Pact Broker Integration

Configure Pact Broker in `package.json`:

```json
{
  "config": {
    "pact": {
      "brokerUrl": "https://guardant.pactflow.io",
      "brokerToken": "$PACT_BROKER_TOKEN",
      "consumerVersion": "1.0.0",
      "tags": ["main", "develop"]
    }
  }
}
```

### Environment Variables

```bash
# Pact Broker authentication
export PACT_BROKER_TOKEN="your-token-here"

# Test environment URLs
export ADMIN_API_URL="http://localhost:4000"
export PUBLIC_API_URL="http://localhost:4001"
export WORKERS_URL="http://localhost:4002"

# Enable debug logging
export PACT_LOG_LEVEL="DEBUG"
```

## Mock Servers

Pact automatically starts mock servers on these ports:

- `1234` - Admin API → Public API mocks
- `1235` - Admin API → Workers mocks  
- `1236` - Public API → Workers mocks
- `1237` - Workers → External Services mocks
- `1238` - Workers → Admin API mocks

## Generated Files

### Pact Files (`./pacts/`)

JSON files containing contract definitions:

- `admin_api-public_api.json`
- `admin_api-workers.json`
- `workers-admin_api.json`
- `public_api-workers.json`
- `workers-external_services.json`

### Logs (`./logs/`)

Detailed test execution logs:

- `pact-admin-public.log`
- `pact-admin-workers.log`
- `pact-workers-admin.log`
- `pact-public-workers.log`
- `pact-workers-external.log`

## CI/CD Integration

### GitHub Actions

```yaml
name: Contract Tests
on: [push, pull_request]

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install
        
      - name: Run contract tests
        run: bun run test:all
        env:
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
          
      - name: Publish contracts
        if: github.ref == 'refs/heads/main'
        run: bun run test:publish
```

### Provider Verification

```yaml
name: Provider Verification
on: [deployment]

jobs:
  verify-contracts:
    runs-on: ubuntu-latest
    steps:
      - name: Verify Admin API
        run: |
          curl -X POST "$PACT_BROKER_URL/webhooks/provider/admin-api/verification" \
            -H "Authorization: Bearer $PACT_BROKER_TOKEN"
```

## Best Practices

### 1. Keep Contracts Minimal

Only test the essential data needed by consumers:

```typescript
// Good - only test required fields
body: {
  status: like('up'),
  responseTime: like(150)
}

// Avoid - testing internal implementation details
body: {
  status: like('up'),
  responseTime: like(150),
  internalId: like('svc-12345'), // Not needed by consumer
  debugInfo: like({...}) // Internal details
}
```

### 2. Use Matchers Appropriately

```typescript
import { like, eachLike, term } from '@pact-foundation/pact';

// Type matching
status: like('up') // Matches any string

// Array matching  
services: eachLike({ id: like('service-123') })

// Regex matching
email: term({ generate: 'test@example.com', matcher: '^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$' })
```

### 3. Provider States

Use clear, descriptive provider states:

```typescript
// Good
state: 'nest has active services with recent status data'

// Avoid
state: 'test data exists'
```

### 4. Test Data Independence

Each test should be independent and set up its own data:

```typescript
test('should handle empty service list', async () => {
  await pact.addInteraction({
    state: 'nest has no configured services', // Clear state
    // ...
  });
});
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure mock server ports (1234-1238) are available
2. **Network Issues**: Check firewall settings for mock servers
3. **Pact File Corruption**: Clear `./pacts/` directory and re-run tests
4. **Version Mismatches**: Ensure all services use compatible API versions

### Debug Mode

```bash
# Enable verbose logging
export PACT_LOG_LEVEL="DEBUG"

# Run with debug output
bun test --verbose admin-to-public.test.ts
```

### Log Analysis

Check `./logs/` directory for detailed interaction logs:

```bash
# View latest pact log
tail -f logs/pact-admin-public.log

# Search for errors
grep -i error logs/*.log
```

## Contributing

1. Add new contract tests when introducing new service interactions
2. Update existing tests when modifying API contracts
3. Ensure all tests pass before submitting PRs
4. Document any new interaction patterns in this README

## Resources

- [Pact Documentation](https://docs.pact.io/)
- [Contract Testing Best Practices](https://docs.pact.io/getting_started/how_pact_works)
- [GuardAnt API Documentation](../../docs/api/)
- [Service Architecture](../../ARCHITECTURE.md)