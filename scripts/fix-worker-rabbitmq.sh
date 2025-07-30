#!/bin/bash

WORKER_ID="worker-b7599ec03579-1753873868542"

echo "🔧 Fixing RabbitMQ URL for worker: $WORKER_ID"

# Get current config
CONFIG=$(docker exec guardant-redis redis-cli HGET "workers:registrations" "$WORKER_ID")

# Extract username and password
USERNAME=$(echo "$CONFIG" | jq -r '.workerUsername')
PASSWORD=$(echo "$CONFIG" | jq -r '.workerPassword')

# If username is null, generate it from workerId
if [ "$USERNAME" = "null" ] || [ -z "$USERNAME" ]; then
    USERNAME="worker-$WORKER_ID"
    echo "⚠️  Username was null, using: $USERNAME"
else
    echo "📝 Username: $USERNAME"
fi

# Get server IP or use environment variable
RABBITMQ_HOST="${RABBITMQ_PUBLIC_HOST:-guardant.me}"
echo "🌐 Using RabbitMQ host: $RABBITMQ_HOST"

# Update config with RabbitMQ URL (use public address)
# Also ensure username is set
UPDATED_CONFIG=$(echo "$CONFIG" | jq \
  --arg url "amqp://$USERNAME:$PASSWORD@$RABBITMQ_HOST:5672" \
  --arg username "$USERNAME" \
  '.rabbitmqUrl = $url | .workerUsername = $username')

# Save updated config
docker exec guardant-redis redis-cli HSET "workers:registrations" "$WORKER_ID" "$UPDATED_CONFIG"

echo "✅ Updated worker config with RabbitMQ URL"
echo ""
echo "Now restart the worker:"
echo "cd /opt/guardant-worker && docker compose restart"