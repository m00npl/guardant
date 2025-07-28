# GuardAnt API Documentation

## Overview

GuardAnt provides two main APIs:
- **Admin API** (Port 3001) - For tenant management, authentication, and configuration
- **Public API** (Port 3002) - For public status pages and widgets

All API endpoints return JSON responses with consistent error handling.

## Authentication

### Admin API Authentication

Admin API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Getting a Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

## Admin API Endpoints

### Authentication

#### POST /api/auth/register
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "company": "ACME Corp"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

#### POST /api/auth/logout
Logout the current user.

**Headers:** Requires authentication

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /api/auth/me
Get current user information.

**Headers:** Requires authentication

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "nests": ["nest_123", "nest_456"]
  }
}
```

### Nests (Tenants)

#### GET /api/nests
List all nests for the authenticated user.

**Headers:** Requires authentication

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "nests": [
      {
        "id": "nest_123",
        "name": "Production Environment",
        "subdomain": "acme-prod",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2
    }
  }
}
```

#### POST /api/nests
Create a new nest.

**Headers:** Requires authentication

**Request:**
```json
{
  "name": "Production Environment",
  "subdomain": "acme-prod",
  "description": "Main production monitoring",
  "settings": {
    "isPublic": true,
    "customDomain": "status.acme.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "nest_123",
    "name": "Production Environment",
    "subdomain": "acme-prod",
    "apiKey": "gnt_1234567890abcdef"
  }
}
```

#### GET /api/nests/:nestId
Get details of a specific nest.

**Headers:** Requires authentication

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "nest_123",
    "name": "Production Environment",
    "subdomain": "acme-prod",
    "description": "Main production monitoring",
    "settings": {
      "isPublic": true,
      "customDomain": "status.acme.com",
      "branding": {
        "primaryColor": "#3b82f6",
        "logo": "https://..."
      }
    },
    "statistics": {
      "services": 12,
      "incidents": 3,
      "uptime": 99.95
    }
  }
}
```

#### PUT /api/nests/:nestId
Update nest settings.

**Headers:** Requires authentication

**Request:**
```json
{
  "name": "Production Environment Updated",
  "settings": {
    "isPublic": false
  }
}
```

#### DELETE /api/nests/:nestId
Delete a nest (requires confirmation).

**Headers:** Requires authentication

### Services

#### GET /api/nests/:nestId/services
List all services in a nest.

**Headers:** Requires authentication

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "srv_123",
      "name": "API Server",
      "type": "web",
      "target": "https://api.example.com",
      "interval": 30,
      "status": "up",
      "lastCheck": "2024-01-01T00:00:00Z",
      "responseTime": 245,
      "uptime": {
        "24h": 100,
        "7d": 99.95,
        "30d": 99.99
      }
    }
  ]
}
```

#### POST /api/nests/:nestId/services
Create a new service to monitor.

**Headers:** Requires authentication

**Request:**
```json
{
  "name": "API Server",
  "type": "web",
  "target": "https://api.example.com",
  "interval": 30,
  "timeout": 10000,
  "method": "HEAD",
  "regions": ["eu-west-1", "us-east-1"],
  "alerts": {
    "email": true,
    "webhook": "https://hooks.slack.com/..."
  }
}
```

**Service Types:**
- `web` - HTTP/HTTPS monitoring
- `tcp` - TCP port monitoring
- `ping` - ICMP ping monitoring
- `dns` - DNS resolution monitoring
- `keyword` - Keyword presence check
- `port` - Port availability check

#### PUT /api/nests/:nestId/services/:serviceId
Update service configuration.

#### DELETE /api/nests/:nestId/services/:serviceId
Remove a service from monitoring.

### Incidents

#### GET /api/nests/:nestId/incidents
List incidents for a nest.

**Headers:** Requires authentication

**Query Parameters:**
- `status` (optional): Filter by status (active, resolved)
- `severity` (optional): Filter by severity (critical, major, minor)
- `limit` (optional): Number of results (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "inc_123",
      "title": "API Server Outage",
      "description": "Complete service unavailability",
      "severity": "critical",
      "status": "resolved",
      "affectedServices": ["srv_123"],
      "startedAt": "2024-01-01T00:00:00Z",
      "resolvedAt": "2024-01-01T01:00:00Z",
      "updates": [
        {
          "timestamp": "2024-01-01T00:30:00Z",
          "message": "Team is investigating the issue"
        }
      ]
    }
  ]
}
```

#### POST /api/nests/:nestId/incidents
Create a new incident.

**Headers:** Requires authentication

**Request:**
```json
{
  "title": "Database Performance Degradation",
  "description": "Slow query response times",
  "severity": "major",
  "affectedServices": ["srv_456"],
  "message": "We are aware of performance issues and investigating"
}
```

#### POST /api/nests/:nestId/incidents/:incidentId/updates
Add an update to an incident.

**Request:**
```json
{
  "message": "Issue has been identified, working on a fix",
  "status": "identified"
}
```

### Analytics

#### GET /api/nests/:nestId/analytics/overview
Get analytics overview for a nest.

**Headers:** Requires authentication

**Query Parameters:**
- `period` (optional): Time period (24h, 7d, 30d, 90d)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "7d",
    "uptime": {
      "average": 99.95,
      "byService": {
        "srv_123": 100,
        "srv_456": 99.9
      }
    },
    "incidents": {
      "total": 2,
      "bySeverity": {
        "critical": 0,
        "major": 1,
        "minor": 1
      }
    },
    "responseTime": {
      "average": 234,
      "p95": 456,
      "p99": 789
    },
    "checks": {
      "total": 20160,
      "failed": 10
    }
  }
}
```

#### GET /api/nests/:nestId/analytics/sla
Get SLA report for a nest.

**Headers:** Requires authentication

**Query Parameters:**
- `month` (required): Month in YYYY-MM format

**Response:**
```json
{
  "success": true,
  "data": {
    "month": "2024-01",
    "target": 99.9,
    "achieved": 99.95,
    "details": {
      "totalMinutes": 44640,
      "downMinutes": 22,
      "excludedMinutes": 0
    },
    "breaches": []
  }
}
```

### Billing & Usage

#### GET /api/billing/usage
Get current billing period usage.

**Headers:** Requires authentication

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "plan": "professional",
    "usage": {
      "checks": {
        "used": 150000,
        "limit": 500000
      },
      "services": {
        "used": 25,
        "limit": 50
      },
      "nests": {
        "used": 3,
        "limit": 5
      }
    },
    "golemUsage": {
      "computeUnits": 1234,
      "storageGB": 5.6,
      "networkGB": 12.3
    }
  }
}
```

#### GET /api/billing/invoices
List invoices.

**Headers:** Requires authentication

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "inv_123",
      "date": "2024-01-01",
      "amount": 4900,
      "currency": "USD",
      "status": "paid",
      "downloadUrl": "/api/billing/invoices/inv_123/download"
    }
  ]
}
```

## Public API Endpoints

### Status Pages

#### POST /api/status/page
Get complete status page data for a subdomain.

**Request:**
```json
{
  "subdomain": "acme-prod"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nest": {
      "name": "ACME Production",
      "description": "Production environment status"
    },
    "services": [
      {
        "id": "srv_123",
        "name": "API Server",
        "status": "up",
        "uptime": 99.95,
        "responseTime": 234
      }
    ],
    "incidents": [],
    "maintenance": [],
    "lastUpdated": "2024-01-01T00:00:00Z"
  }
}
```

#### POST /api/status/history
Get historical data for a service.

**Request:**
```json
{
  "subdomain": "acme-prod",
  "serviceId": "srv_123",
  "period": "7d"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "serviceId": "srv_123",
    "serviceName": "API Server",
    "period": "7d",
    "data": [
      {
        "timestamp": "2024-01-01T00:00:00Z",
        "status": "up",
        "responseTime": 234
      }
    ]
  }
}
```

### Real-time Updates

#### GET /api/status/:subdomain/events
Server-Sent Events endpoint for real-time status updates.

**Example:**
```javascript
const eventSource = new EventSource('/api/status/acme-prod/events');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Status update:', data);
};
```

**Event Types:**
- `service_update` - Service status change
- `incident_created` - New incident
- `incident_updated` - Incident update
- `maintenance_scheduled` - New maintenance window
- `heartbeat` - Keep-alive signal

### RSS Feeds

#### GET /api/status/:subdomain/rss
RSS feed for incidents and maintenance.

**Response:** RSS XML format

### Status Widgets

#### GET /api/status/:subdomain/widget.js
JavaScript widget for embedding status on external sites.

**Query Parameters:**
- `theme` (optional): Widget theme (light, dark)
- `services` (optional): Comma-separated service IDs to show
- `compact` (optional): Show compact version (true, false)

**Usage:**
```html
<div data-guardant="acme-prod"></div>
<script src="https://api.guardant.me/status/acme-prod/widget.js" async></script>
```

#### POST /api/status/widget-config
Get widget configuration and embed codes.

**Request:**
```json
{
  "subdomain": "acme-prod",
  "theme": "light",
  "services": ["srv_123", "srv_456"],
  "compact": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "embedCode": "<div data-guardant=\"acme-prod\"></div>\n<script src=\"...\" async></script>",
    "iframeCode": "<iframe src=\"https://acme-prod.guardant.me/embed\" ...></iframe>",
    "widgetUrl": "https://api.guardant.me/status/acme-prod/widget.js?theme=light"
  }
}
```

## Worker Communication

Workers communicate via RabbitMQ messages:

### Monitor Service Command
```json
{
  "type": "monitor",
  "serviceId": "srv_123",
  "config": {
    "type": "web",
    "target": "https://api.example.com",
    "method": "HEAD",
    "timeout": 10000
  }
}
```

### Health Check Result
```json
{
  "serviceId": "srv_123",
  "status": "up",
  "responseTime": 234,
  "timestamp": "2024-01-01T00:00:00Z",
  "workerId": "ant-eu-west-1",
  "details": {
    "statusCode": 200,
    "headers": {},
    "certificate": {
      "valid": true,
      "daysRemaining": 45
    }
  }
}
```

## Error Responses

All endpoints use consistent error formatting:

```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE",
  "timestamp": 1704067200000
}
```

### Common Error Codes

- `AUTH_REQUIRED` - Authentication required
- `AUTH_INVALID` - Invalid credentials
- `PERMISSION_DENIED` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Request validation failed
- `RATE_LIMITED` - Too many requests
- `SERVER_ERROR` - Internal server error

## Rate Limiting

API endpoints are rate limited:

- **Authentication endpoints**: 5 requests per minute
- **Public status endpoints**: 60 requests per minute
- **Admin API endpoints**: 120 requests per minute per user
- **Analytics endpoints**: 30 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 119
X-RateLimit-Reset: 1704067200
```

## Webhooks

GuardAnt can send webhooks for various events:

### Webhook Payload Format
```json
{
  "event": "incident.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "incident": {
      "id": "inc_123",
      "title": "Service Outage",
      "severity": "critical"
    },
    "nest": {
      "id": "nest_123",
      "name": "Production"
    }
  }
}
```

### Webhook Events
- `incident.created`
- `incident.updated`
- `incident.resolved`
- `service.down`
- `service.recovered`
- `maintenance.scheduled`
- `maintenance.started`
- `maintenance.completed`

### Webhook Security

Webhooks include an HMAC signature in the `X-GuardAnt-Signature` header:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}
```

## SDK Examples

### Node.js
```javascript
const GuardAnt = require('@guardant/sdk');

const client = new GuardAnt({
  apiKey: 'your_api_key',
  nestId: 'nest_123'
});

// Report custom metric
await client.metrics.report({
  service: 'srv_123',
  metric: 'custom_metric',
  value: 42
});

// Create incident
await client.incidents.create({
  title: 'Database issues',
  severity: 'major',
  affectedServices: ['srv_456']
});
```

### Python
```python
from guardant import GuardAnt

client = GuardAnt(
    api_key='your_api_key',
    nest_id='nest_123'
)

# Check service status
status = client.services.get_status('srv_123')
print(f"Service is {status['status']}")

# Get analytics
analytics = client.analytics.get_overview(period='7d')
print(f"Uptime: {analytics['uptime']['average']}%")
```

### cURL Examples

```bash
# Get status page
curl -X POST https://api.guardant.me/status/page \
  -H "Content-Type: application/json" \
  -d '{"subdomain":"acme-prod"}'

# Create incident (authenticated)
curl -X POST https://api.guardant.me/api/nests/nest_123/incidents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API Outage",
    "severity": "critical",
    "description": "Complete API unavailability"
  }'

# Get analytics
curl https://api.guardant.me/api/nests/nest_123/analytics/overview?period=7d \
  -H "Authorization: Bearer YOUR_TOKEN"
```