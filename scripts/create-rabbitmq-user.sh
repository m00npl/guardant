#!/bin/bash

WORKER_ID="worker-b7599ec03579-1753873868542"

echo "🐰 Creating RabbitMQ user for worker: $WORKER_ID"

# Get worker config
CONFIG=$(docker exec guardant-redis redis-cli HGET "workers:registrations" "$WORKER_ID")

# Extract credentials
USERNAME=$(echo "$CONFIG" | jq -r '.workerUsername')
PASSWORD=$(echo "$CONFIG" | jq -r '.workerPassword')

echo "📝 Username: $USERNAME"

# Create RabbitMQ user
echo "👤 Creating user..."
docker exec guardant-rabbitmq rabbitmqctl add_user "$USERNAME" "$PASSWORD" 2>/dev/null || echo "User might already exist"

# Set permissions
echo "🔐 Setting permissions..."
docker exec guardant-rabbitmq rabbitmqctl set_permissions -p "/" "$USERNAME" \
  "^$" \
  "^(worker_commands|worker_heartbeat|monitoring_results)$" \
  "^(monitoring_workers.*|worker\..*|monitoring_results)$"

# Set user tags
echo "🏷️  Setting user tags..."
docker exec guardant-rabbitmq rabbitmqctl set_user_tags "$USERNAME" worker

echo "✅ RabbitMQ user created successfully!"
echo ""
echo "Now the worker should be able to connect."