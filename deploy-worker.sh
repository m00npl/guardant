#!/bin/bash

# GuardAnt Worker Deployment Script
# Usage: ./deploy-worker.sh [worker-id] [region]

WORKER_ID=${1:-worker-1}
WORKER_REGION=${2:-us-east-1}

echo "🚀 Deploying GuardAnt Worker: $WORKER_ID in region $WORKER_REGION"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found! Please copy .env.worker.example to .env and configure it."
    exit 1
fi

# Export variables for docker-compose
export WORKER_ID=$WORKER_ID
export WORKER_REGION=$WORKER_REGION

# Pull latest code
echo "📦 Pulling latest code..."
git pull

# Build and start worker
echo "🔨 Building worker container..."
docker-compose -f docker-compose.worker.yml build

echo "🏃 Starting worker..."
docker-compose -f docker-compose.worker.yml up -d

# Check status
echo "✅ Worker deployed! Checking status..."
sleep 5
docker-compose -f docker-compose.worker.yml ps
docker-compose -f docker-compose.worker.yml logs --tail=20

echo "
📊 Worker Information:
- Worker ID: $WORKER_ID
- Region: $WORKER_REGION
- Container: guardant-worker-$WORKER_ID

Commands:
- View logs: docker-compose -f docker-compose.worker.yml logs -f
- Stop worker: docker-compose -f docker-compose.worker.yml down
- Restart worker: docker-compose -f docker-compose.worker.yml restart
"