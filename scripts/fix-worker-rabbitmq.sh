#!/bin/bash

WORKER_ID="worker-b7599ec03579-1753873868542"

echo "🔧 Fixing RabbitMQ URL for worker: $WORKER_ID"

# Get current config
CONFIG=$(docker exec guardant-redis redis-cli HGET "workers:registrations" "$WORKER_ID")

# Extract username and password
USERNAME=$(echo "$CONFIG" | jq -r '.workerUsername')
PASSWORD=$(echo "$CONFIG" | jq -r '.workerPassword')

echo "📝 Username: $USERNAME"

# Update config with RabbitMQ URL (use local RabbitMQ)
UPDATED_CONFIG=$(echo "$CONFIG" | jq \
  --arg url "amqp://$USERNAME:$PASSWORD@guardant-rabbitmq:5672" \
  '.rabbitmqUrl = $url')

# Save updated config
docker exec guardant-redis redis-cli HSET "workers:registrations" "$WORKER_ID" "$UPDATED_CONFIG"

echo "✅ Updated worker config with RabbitMQ URL"
echo ""
echo "Now restart the worker:"
echo "cd /opt/guardant-worker && docker compose restart"