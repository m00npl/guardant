#!/bin/bash

WORKER_ID="${1:-worker-b7599ec03579-1753873868542}"

echo "🧹 Cleaning worker registration: $WORKER_ID"

# Remove from registrations
docker exec guardant-redis redis-cli HDEL "workers:registrations" "$WORKER_ID"

# Remove from pending
docker exec guardant-redis redis-cli ZREM "workers:pending" "$WORKER_ID"

# Remove from heartbeats
docker exec guardant-redis redis-cli HDEL "workers:heartbeat" "$WORKER_ID"

# Remove from owner's list
OWNER_EMAIL="moon.pl.kr@gmail.com"
docker exec guardant-redis redis-cli SREM "workers:by-owner:$OWNER_EMAIL" "$WORKER_ID"

# Remove RabbitMQ user if exists
echo "🐰 Removing RabbitMQ user..."
docker exec guardant-rabbitmq rabbitmqctl delete_user "worker-$WORKER_ID" 2>/dev/null || echo "User not found"

echo "✅ Worker cleaned up completely"