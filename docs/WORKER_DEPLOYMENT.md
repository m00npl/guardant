# GuardAnt Worker Deployment Guide

This guide explains how to deploy GuardAnt monitoring workers on external servers.

## Prerequisites

- Docker and Docker Compose installed on the worker server
- Network connectivity to main GuardAnt server (PostgreSQL, Redis, RabbitMQ ports)
- Git installed (for pulling code)

## Deployment Steps

### 1. Clone Repository

```bash
git clone https://github.com/m00npl/guardant.git
cd guardant
```

### 2. Configure Environment

Copy the example environment file and configure it:

```bash
cp .env.worker.example .env
```

Edit `.env` file with your main server details:

```env
# Main server connection settings
DATABASE_URL=postgresql://guardant:guardant123@main.example.com:5432/guardant
REDIS_URL=redis://main.example.com:6379
RABBITMQ_URL=amqp://guardant:guardant123@main.example.com:5672

# Worker identification
WORKER_ID=worker-eu-1
WORKER_REGION=eu-west-1
```

### 3. Deploy Worker

Use the deployment script:

```bash
./deploy-worker.sh [worker-id] [region]
```

Example:
```bash
./deploy-worker.sh worker-eu-1 eu-west-1
```

Or manually with docker-compose:

```bash
export WORKER_ID=worker-eu-1
export WORKER_REGION=eu-west-1
docker-compose -f docker-compose.worker.yml up -d
```

### 4. Verify Deployment

Check worker status:
```bash
docker-compose -f docker-compose.worker.yml ps
docker-compose -f docker-compose.worker.yml logs -f
```

## Multiple Workers on Same Server

To run multiple workers on the same server, use different WORKER_ID:

```bash
# Terminal 1
WORKER_ID=worker-1 docker-compose -f docker-compose.worker.yml up -d

# Terminal 2
WORKER_ID=worker-2 docker-compose -f docker-compose.worker.yml up -d
```

## Network Requirements

Workers need access to these ports on the main server:

- **5432** - PostgreSQL
- **6379** - Redis  
- **5672** - RabbitMQ

Make sure firewall rules allow these connections.

## Monitoring Worker Health

Workers report their status to the main server. You can monitor them:

1. In GuardAnt admin panel
2. Via logs: `docker logs guardant-worker-[id]`
3. Via RabbitMQ management UI (port 15672 on main server)

## Scaling Considerations

- Deploy workers in different geographic regions for global monitoring
- Use region codes like: us-east-1, eu-west-1, ap-southeast-1
- Workers automatically detect their location if WORKER_REGION is not set

## Troubleshooting

### Worker can't connect to RabbitMQ
- Check firewall rules
- Verify RabbitMQ credentials
- Test connection: `telnet main-server 5672`

### Worker not picking up tasks
- Check if scheduler is running on main server
- Verify worker appears in RabbitMQ consumers
- Check worker logs for errors

### High memory usage
- Workers cache monitoring results locally
- Restart periodically if needed: `docker-compose -f docker-compose.worker.yml restart`