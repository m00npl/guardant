# GuardAnt Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Deployment Strategies](#deployment-strategies)
3. [Infrastructure Requirements](#infrastructure-requirements)
4. [Production Setup](#production-setup)
5. [Docker Deployment](#docker-deployment)
6. [Kubernetes Deployment](#kubernetes-deployment)
7. [Golem Network Deployment](#golem-network-deployment)
8. [Configuration Management](#configuration-management)
9. [SSL/TLS Setup](#ssltls-setup)
10. [Monitoring & Observability](#monitoring--observability)
11. [Backup & Recovery](#backup--recovery)
12. [Scaling Strategies](#scaling-strategies)
13. [Zero-Downtime Deployment](#zero-downtime-deployment)

## Overview

GuardAnt is designed for high availability and can be deployed in various configurations:

- **Single Server**: Development and small deployments
- **Multi-Server**: Traditional high-availability setup
- **Container Orchestration**: Docker Swarm or Kubernetes
- **Decentralized**: Golem Network nodes
- **Hybrid**: Combination of cloud and Golem nodes

## Deployment Strategies

### Production Architecture

```
                            ┌─────────────────┐
                            │   CloudFlare    │
                            │   (CDN + WAF)   │
                            └────────┬────────┘
                                     │
                            ┌────────┴────────┐
                            │  Load Balancer  │
                            │   (HAProxy)     │
                            └────────┬────────┘
                                     │
                ┌────────────────────┴────────────────────┐
                │                                         │
       ┌────────┴────────┐                     ┌────────┴────────┐
       │   Web Server    │                     │   Web Server    │
       │   (Nginx)       │                     │   (Nginx)       │
       └────────┬────────┘                     └────────┬────────┘
                │                                         │
    ┌───────────┴───────────┐                 ┌───────────┴───────────┐
    │                       │                 │                       │
┌───┴────┐  ┌─────────┐ ┌──┴──────┐    ┌────┴───┐  ┌─────────┐ ┌───┴─────┐
│Admin UI│  │Status UI│ │Admin API│    │Admin UI│  │Status UI│ │Admin API│
└────────┘  └─────────┘ └────┬────┘    └────────┘  └─────────┘ └────┬────┘
                             │                                        │
                    ┌────────┴────────┐                              │
                    │     Redis       │──────────────────────────────┘
                    │   (Primary)     │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │   RabbitMQ      │
                    │   (Cluster)     │
                    └────────┬────────┘
                             │
         ┌───────────────────┴───────────────────┐
         │                                       │
    ┌────┴────┐                            ┌────┴────┐
    │ Worker  │                            │ Worker  │
    │ (EU)    │                            │ (US)    │
    └─────────┘                            └─────────┘
```

## Infrastructure Requirements

### Minimum Requirements (Single Server)

- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 50 GB SSD
- **Network**: 100 Mbps
- **OS**: Ubuntu 22.04 LTS or Debian 12

### Recommended Production Setup

#### Web Servers (2x)
- **CPU**: 8 cores
- **RAM**: 16 GB
- **Storage**: 100 GB SSD
- **Network**: 1 Gbps

#### Database Servers
- **Redis Primary**: 16 GB RAM, 100 GB SSD
- **Redis Replica**: 16 GB RAM, 100 GB SSD
- **PostgreSQL**: 32 GB RAM, 500 GB SSD (future)

#### Worker Nodes (per region)
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 50 GB SSD
- **Network**: 100 Mbps

### Software Requirements

- Docker 24.0+
- Docker Compose 2.20+
- Nginx 1.24+
- Redis 7.2+
- RabbitMQ 3.12+
- Certbot (for SSL)

## Production Setup

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y \
  curl \
  wget \
  git \
  ufw \
  fail2ban \
  htop \
  vim \
  build-essential

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3001/tcp  # Admin API
sudo ufw allow 3002/tcp  # Public API
sudo ufw enable

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Clone and Configure

```bash
# Clone repository
git clone https://github.com/your-org/guardant.git /opt/guardant
cd /opt/guardant

# Create production environment files
cp .env.production.example .env.production

# Edit configuration
vim .env.production
```

### 3. Production Environment Variables

```bash
# .env.production

# Application
NODE_ENV=production
APP_NAME=GuardAnt
APP_URL=https://guardant.me
ADMIN_URL=https://admin.guardant.me

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
SESSION_SECRET=your-super-secret-session-key-min-32-chars
ENCRYPTION_KEY=your-32-byte-encryption-key-base64

# Database
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true

# RabbitMQ
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=guardant
RABBITMQ_PASS=your-rabbitmq-password
RABBITMQ_VHOST=/guardant

# Golem Network (Production)
GOLEM_CHAIN_ID=1273227453
GOLEM_HTTP_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
GOLEM_WS_URL=wss://base-mainnet.g.alchemy.com/v2/YOUR_KEY
GOLEM_PRIVATE_KEY=0x...
GOLEM_WALLET_ADDRESS=0x...

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@guardant.me

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
PROMETHEUS_ENABLED=true
JAEGER_ENDPOINT=http://jaeger:14268/api/traces

# Feature Flags
ENABLE_GOLEM_BASE_L3=true
ENABLE_ANALYTICS=true
ENABLE_BILLING=true
```

### 4. SSL Certificate Setup

```bash
# Install Certbot
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Get certificates
sudo certbot certonly --standalone -d guardant.me -d admin.guardant.me -d api.guardant.me

# Auto-renewal
sudo systemctl enable snap.certbot.renew.timer
```

## Docker Deployment

### Production Docker Compose

```yaml
# docker-compose.production.yml
version: '3.9'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/production.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - admin-ui
      - status-ui
      - api-admin
      - api-public
    restart: always
    networks:
      - guardant

  admin-ui:
    build:
      context: ./apps/frontend-admin
      dockerfile: Dockerfile.production
    environment:
      - VITE_API_URL=https://api.guardant.me
    restart: always
    networks:
      - guardant

  status-ui:
    build:
      context: ./apps/frontend-status
      dockerfile: Dockerfile.production
    environment:
      - VITE_API_URL=https://api.guardant.me
    restart: always
    networks:
      - guardant

  api-admin:
    build:
      context: ./services/api-admin
      dockerfile: Dockerfile.production
    env_file: .env.production
    depends_on:
      - redis
      - rabbitmq
    restart: always
    networks:
      - guardant

  api-public:
    build:
      context: ./services/api-public
      dockerfile: Dockerfile.production
    env_file: .env.production
    depends_on:
      - redis
    restart: always
    networks:
      - guardant

  workers:
    build:
      context: ./services/workers
      dockerfile: Dockerfile.production
    env_file: .env.production
    depends_on:
      - redis
      - rabbitmq
    deploy:
      replicas: 2
    restart: always
    networks:
      - guardant

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: always
    networks:
      - guardant

  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      - RABBITMQ_DEFAULT_USER=${RABBITMQ_USER}
      - RABBITMQ_DEFAULT_PASS=${RABBITMQ_PASS}
      - RABBITMQ_DEFAULT_VHOST=${RABBITMQ_VHOST}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    restart: always
    networks:
      - guardant

  prometheus:
    image: prom/prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    restart: always
    networks:
      - guardant

  grafana:
    image: grafana/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    restart: always
    networks:
      - guardant

volumes:
  redis_data:
  rabbitmq_data:
  prometheus_data:
  grafana_data:

networks:
  guardant:
    driver: bridge
```

### Deployment Commands

```bash
# Build and start services
docker-compose -f docker-compose.production.yml up -d --build

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Scale workers
docker-compose -f docker-compose.production.yml up -d --scale workers=4

# Update specific service
docker-compose -f docker-compose.production.yml up -d --build api-admin
```

## Kubernetes Deployment

### Kubernetes Manifests

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: guardant
---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: guardant-config
  namespace: guardant
data:
  NODE_ENV: "production"
  REDIS_HOST: "redis-service"
  RABBITMQ_HOST: "rabbitmq-service"
---
# k8s/deployment-api.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-admin
  namespace: guardant
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-admin
  template:
    metadata:
      labels:
        app: api-admin
    spec:
      containers:
      - name: api-admin
        image: guardant/api-admin:latest
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: guardant-config
        - secretRef:
            name: guardant-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
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
---
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: api-admin-service
  namespace: guardant
spec:
  selector:
    app: api-admin
  ports:
  - port: 3001
    targetPort: 3001
  type: ClusterIP
---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: guardant-ingress
  namespace: guardant
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.guardant.me
    - admin.guardant.me
    - guardant.me
    secretName: guardant-tls
  rules:
  - host: api.guardant.me
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-admin-service
            port:
              number: 3001
```

### Helm Chart

```yaml
# helm/guardant/values.yaml
replicaCount:
  api: 3
  workers: 5
  
image:
  repository: guardant
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  ports:
    admin: 3001
    public: 3002

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: guardant.me
      paths:
        - path: /
          pathType: Prefix
    - host: api.guardant.me
      paths:
        - path: /
          pathType: Prefix

resources:
  api:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 250m
      memory: 256Mi
  workers:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 500m
      memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

### Deploy with Helm

```bash
# Add Helm repo
helm repo add guardant https://charts.guardant.me

# Install
helm install guardant guardant/guardant \
  --namespace guardant \
  --create-namespace \
  --values values.yaml

# Upgrade
helm upgrade guardant guardant/guardant \
  --namespace guardant \
  --values values.yaml
```

## Golem Network Deployment

### Setting up Golem Provider

```bash
# Install Yagna
curl -sSf https://join.golem.network/as-provider | bash -

# Initialize as provider
yagna service run
yagna payment init --receiver

# Configure provider
ya-provider preset activate wasmtime
ya-provider profile create guardant \
  --cpu-threads 4 \
  --mem-gib 8 \
  --storage-gib 50
```

### Golem Deployment Manifest

```yaml
# golem/deployment.yaml
name: guardant-workers
subnet: public
budget: 10.0
timeout: 3600

nodes:
  - name: worker-eu-west
    image: guardant/worker-golem:latest
    capabilities:
      cpu: 2
      memory: 4096
      storage: 20480
    env:
      REGION: eu-west-1
      WORKER_TYPE: monitoring
    
  - name: worker-us-east
    image: guardant/worker-golem:latest
    capabilities:
      cpu: 2
      memory: 4096
      storage: 20480
    env:
      REGION: us-east-1
      WORKER_TYPE: monitoring

  - name: storage-node
    image: guardant/storage-golem:latest
    capabilities:
      cpu: 1
      memory: 2048
      storage: 102400
    env:
      NODE_TYPE: storage
      REPLICATION: 3
```

### Deploy to Golem

```bash
# Build Golem images
docker build -t guardant/worker-golem:latest -f Dockerfile.golem ./services/workers

# Push to Golem registry
golem-registry push guardant/worker-golem:latest

# Deploy
golem-deploy apply -f golem/deployment.yaml

# Monitor deployment
golem-deploy status guardant-workers
```

## Configuration Management

### Using Ansible

```yaml
# ansible/playbook.yml
---
- name: Deploy GuardAnt
  hosts: production
  become: yes
  vars:
    guardant_version: "{{ lookup('env', 'GUARDANT_VERSION') }}"
  
  tasks:
    - name: Ensure Docker is installed
      package:
        name: docker.io
        state: present
    
    - name: Copy application files
      synchronize:
        src: ../
        dest: /opt/guardant
        delete: yes
        rsync_opts:
          - "--exclude=.git"
          - "--exclude=node_modules"
    
    - name: Copy production config
      template:
        src: env.production.j2
        dest: /opt/guardant/.env.production
        mode: '0600'
    
    - name: Build and start services
      docker_compose:
        project_src: /opt/guardant
        files:
          - docker-compose.production.yml
        build: yes
        state: present
```

### Using Terraform

```hcl
# terraform/main.tf
provider "aws" {
  region = var.aws_region
}

resource "aws_instance" "guardant_web" {
  count         = var.web_server_count
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.large"
  
  vpc_security_group_ids = [aws_security_group.guardant.id]
  key_name              = var.key_name
  
  user_data = templatefile("${path.module}/user-data.sh", {
    environment = var.environment
    version     = var.guardant_version
  })
  
  tags = {
    Name = "guardant-web-${count.index + 1}"
    Environment = var.environment
  }
}

resource "aws_elb" "guardant" {
  name               = "guardant-elb"
  availability_zones = data.aws_availability_zones.available.names
  
  listener {
    instance_port     = 443
    instance_protocol = "https"
    lb_port          = 443
    lb_protocol      = "https"
    ssl_certificate_id = var.ssl_certificate_arn
  }
  
  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout            = 3
    target             = "HTTPS:443/health"
    interval           = 30
  }
  
  instances = aws_instance.guardant_web[*].id
}
```

## SSL/TLS Setup

### Nginx SSL Configuration

```nginx
# nginx/sites/guardant-ssl.conf
server {
    listen 443 ssl http2;
    server_name guardant.me;
    
    ssl_certificate /etc/letsencrypt/live/guardant.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/guardant.me/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    location / {
        proxy_pass http://status-ui:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name api.guardant.me;
    
    ssl_certificate /etc/letsencrypt/live/guardant.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/guardant.me/privkey.pem;
    
    location / {
        proxy_pass http://api-public:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support for SSE
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

## Monitoring & Observability

### Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'guardant-api'
    static_configs:
      - targets: 
          - 'api-admin:3001'
          - 'api-public:3002'
    metrics_path: '/metrics'
    
  - job_name: 'guardant-workers'
    static_configs:
      - targets: ['workers:9090']
    
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
      
  - job_name: 'rabbitmq'
    static_configs:
      - targets: ['rabbitmq:15692']
```

### Grafana Dashboards

Import these dashboard IDs:
- **GuardAnt Overview**: 15234
- **Redis Monitoring**: 763
- **RabbitMQ Monitoring**: 4279
- **Node Exporter**: 1860

### Application Monitoring

```typescript
// Integrate APM
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
  ],
});
```

## Backup & Recovery

### Automated Backups

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/backups/guardant/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup Redis
docker exec redis redis-cli --rdb $BACKUP_DIR/redis.rdb

# Backup RabbitMQ
docker exec rabbitmq rabbitmqctl export_definitions $BACKUP_DIR/rabbitmq.json

# Backup application data
tar -czf $BACKUP_DIR/app-data.tar.gz /opt/guardant/data

# Upload to S3
aws s3 sync $BACKUP_DIR s3://guardant-backups/$(date +%Y%m%d)/

# Clean old backups (keep 30 days)
find /backups/guardant -mtime +30 -type d -exec rm -rf {} +
```

### Recovery Procedures

```bash
# Restore Redis
docker exec -i redis redis-cli --pipe < /backups/redis.rdb

# Restore RabbitMQ
docker exec rabbitmq rabbitmqctl import_definitions /backups/rabbitmq.json

# Restore application data
tar -xzf /backups/app-data.tar.gz -C /
```

## Scaling Strategies

### Horizontal Scaling

```bash
# Scale API servers
docker-compose -f docker-compose.production.yml up -d --scale api-admin=4 --scale api-public=4

# Scale workers by region
docker-compose -f docker-compose.production.yml up -d --scale workers-eu=3 --scale workers-us=3
```

### Auto-scaling Configuration

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-admin-hpa
  namespace: guardant
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-admin
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 15
      selectPolicy: Max
```

## Zero-Downtime Deployment

### Blue-Green Deployment

```bash
#!/bin/bash
# scripts/deploy-blue-green.sh

# Build new version
docker-compose -f docker-compose.blue.yml build

# Start blue environment
docker-compose -f docker-compose.blue.yml up -d

# Wait for health checks
echo "Waiting for blue environment to be healthy..."
sleep 30

# Check health
if curl -f http://localhost:3001/health; then
  echo "Blue environment is healthy"
  
  # Switch traffic
  ln -sfn /opt/guardant/nginx/blue.conf /opt/guardant/nginx/active.conf
  nginx -s reload
  
  # Stop green environment
  docker-compose -f docker-compose.green.yml down
  
  # Rename blue to green for next deployment
  mv docker-compose.blue.yml docker-compose.green.yml
else
  echo "Blue environment health check failed"
  docker-compose -f docker-compose.blue.yml down
  exit 1
fi
```

### Rolling Updates

```bash
#!/bin/bash
# scripts/rolling-update.sh

SERVICES=("api-admin" "api-public" "workers")

for service in "${SERVICES[@]}"; do
  echo "Updating $service..."
  
  # Pull new image
  docker-compose pull $service
  
  # Update one instance at a time
  REPLICAS=$(docker-compose ps -q $service | wc -l)
  
  for i in $(seq 1 $REPLICAS); do
    # Stop old instance
    docker-compose stop $service
    
    # Start new instance
    docker-compose up -d --no-deps $service
    
    # Wait for health check
    sleep 10
    
    # Verify health
    if ! docker-compose exec $service curl -f http://localhost:3001/health; then
      echo "Health check failed for $service"
      docker-compose logs $service
      exit 1
    fi
  done
done

echo "Rolling update completed successfully"
```

## Production Checklist

### Pre-deployment

- [ ] All tests passing
- [ ] Security scan completed
- [ ] Performance testing done
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] SSL certificates ready
- [ ] Backup strategy tested
- [ ] Monitoring configured
- [ ] Load balancer configured
- [ ] DNS records updated

### Post-deployment

- [ ] Health checks passing
- [ ] Monitoring dashboards active
- [ ] Log aggregation working
- [ ] Alerts configured
- [ ] Performance baseline established
- [ ] Backup job scheduled
- [ ] Security scan scheduled
- [ ] Team access configured
- [ ] Incident response plan ready
- [ ] Customer communication sent

## Troubleshooting Production

### Common Issues

#### High Memory Usage
```bash
# Check memory usage
docker stats

# Find memory leaks
docker exec api-admin node --inspect=0.0.0.0:9229

# Analyze heap dump
docker exec api-admin kill -USR2 1
```

#### Connection Timeouts
```bash
# Check network connectivity
docker exec api-admin ping redis
docker exec api-admin nc -zv rabbitmq 5672

# Check connection pools
docker exec api-admin curl http://localhost:3001/health/detailed
```

#### Performance Degradation
```bash
# Enable debug logging
docker exec api-admin kill -USR1 1

# Check slow queries
docker exec redis redis-cli SLOWLOG GET 10

# Monitor RabbitMQ
docker exec rabbitmq rabbitmqctl list_queues name messages consumers
```

### Emergency Procedures

#### Rollback
```bash
# Quick rollback to previous version
./scripts/rollback.sh

# Manual rollback
docker-compose down
git checkout v1.2.3
docker-compose up -d --build
```

#### Emergency Maintenance Mode
```bash
# Enable maintenance mode
docker exec nginx touch /usr/share/nginx/html/maintenance.flag
docker exec nginx nginx -s reload

# Disable maintenance mode
docker exec nginx rm /usr/share/nginx/html/maintenance.flag
docker exec nginx nginx -s reload
```

## Support

For production support:
- **Documentation**: https://docs.guardant.me
- **Status Page**: https://status.guardant.me
- **Support Email**: support@guardant.me
- **Emergency Hotline**: +1-xxx-xxx-xxxx