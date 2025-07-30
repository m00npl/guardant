#!/bin/bash

# GuardAnt Production Deployment Script
# This script deploys the GuardAnt platform to production

set -e

echo "🚀 GuardAnt Production Deployment"
echo "================================="
echo ""

# Check if we're on production server
if [ "$HOSTNAME" != "moon" ] && [ "$HOSTNAME" != "guardant" ]; then
    echo "⚠️  Warning: This doesn't appear to be the production server"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Function to check if service is healthy
check_health() {
    local service=$1
    local max_attempts=30
    local attempt=1
    
    echo -n "Waiting for $service to be healthy..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps | grep -E "guardant-$service.*healthy|Up" > /dev/null 2>&1; then
            echo " ✅"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo " ❌"
    echo "Service $service failed to become healthy"
    return 1
}

# Step 1: Update code
echo "📥 Step 1: Pulling latest code..."
git pull origin main

# Step 2: Copy production environment
echo "🔧 Step 2: Setting up production environment..."
if [ -f .env.production ]; then
    cp .env.production .env
    echo "✅ Production environment configured"
else
    echo "❌ .env.production not found!"
    exit 1
fi

# Step 3: Build services
echo "🏗️  Step 3: Building services..."
docker-compose build --no-cache

# Step 4: Stop current services
echo "🛑 Step 4: Stopping current services..."
docker-compose down

# Step 5: Start infrastructure services
echo "🚀 Step 5: Starting infrastructure services..."
docker-compose up -d postgres redis rabbitmq vault

# Wait for infrastructure
check_health "postgres"
check_health "redis"
check_health "rabbitmq"

# Check Vault status
echo "🔐 Checking Vault status..."
sleep 5
VAULT_STATUS=$(docker-compose exec -T vault vault status 2>/dev/null || echo "failed")

if echo "$VAULT_STATUS" | grep -q "Sealed.*true"; then
    echo "⚠️  Vault is sealed."
    
    # Check if we have unseal keys in environment
    if [ -n "$VAULT_UNSEAL_KEY_1" ] && [ -n "$VAULT_UNSEAL_KEY_2" ] && [ -n "$VAULT_UNSEAL_KEY_3" ]; then
        echo "🔓 Unsealing Vault with provided keys..."
        ./unseal-vault.sh
    else
        echo "Please unseal it manually with your saved keys:"
        echo "   docker-compose exec vault vault operator unseal <KEY1>"
        echo "   docker-compose exec vault vault operator unseal <KEY2>"
        echo "   docker-compose exec vault vault operator unseal <KEY3>"
        echo ""
        echo "Or provide keys as environment variables:"
        echo "   export VAULT_UNSEAL_KEY_1=<KEY1>"
        echo "   export VAULT_UNSEAL_KEY_2=<KEY2>"
        echo "   export VAULT_UNSEAL_KEY_3=<KEY3>"
        echo ""
        echo "After unsealing, you can continue the deployment."
        read -p "Press Enter when Vault is unsealed..." 
    fi
elif echo "$VAULT_STATUS" | grep -q "Initialized.*false"; then
    echo "🚀 Initializing Vault for the first time..."
    docker-compose exec -T vault /vault/scripts/init-vault.sh
else
    echo "✅ Vault is already initialized and unsealed"
fi

# Step 6: Run database migrations
echo "📊 Step 6: Running database migrations..."
docker-compose run --rm admin-api bun run migrate

# Step 7: Create platform admin (if needed)
echo "👤 Step 7: Creating platform admin..."
docker-compose run --rm admin-api bun run scripts/create-platform-admin.ts

# Step 8: Start all services
echo "🚀 Step 8: Starting all services..."
docker-compose up -d

# Step 9: Wait for services to be healthy
echo "🏥 Step 9: Checking service health..."
check_health "admin-api"
check_health "public-api"
check_health "nginx-proxy"
check_health "monitoring-worker-1"
check_health "scheduler"

# Step 10: Run post-deployment checks
echo "✅ Step 10: Running post-deployment checks..."

# Check if admin frontend is accessible
if curl -s -o /dev/null -w "%{http_code}" http://localhost/admin/ | grep -q "200"; then
    echo "✅ Admin frontend is accessible"
else
    echo "❌ Admin frontend is not accessible"
fi

# Check if public API is accessible
if curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health | grep -q "200"; then
    echo "✅ Public API is accessible"
else
    echo "❌ Public API is not accessible"
fi

# Check if worker install script is accessible
if curl -s -o /dev/null -w "%{http_code}" http://localhost/install | grep -q "200"; then
    echo "✅ Worker install script is accessible"
else
    echo "❌ Worker install script is not accessible"
fi

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📋 Service Status:"
docker-compose ps

echo ""
echo "🔗 Access URLs:"
echo "   Admin Panel: https://guardant.me/admin"
echo "   API: https://guardant.me/api"
echo "   RabbitMQ: https://guardant.me/rabbitmq"
echo "   Prometheus: https://guardant.me/prometheus"
echo "   Grafana: https://guardant.me/grafana"
echo ""
echo "📝 Next steps:"
echo "1. Configure SSL certificates (if not done)"
echo "2. Set up domain DNS records"
echo "3. Configure firewall rules"
echo "4. Set up monitoring alerts"
echo "5. Test worker installation: curl -sSL https://guardant.me/install | bash"
echo ""
echo "⚠️  Important: Change all default passwords in .env file!"