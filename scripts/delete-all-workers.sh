#!/bin/bash
# Script to delete all workers from GuardAnt system

echo "🗑️  Deleting all workers from GuardAnt..."

# Connect to Redis and delete all worker-related keys
docker exec guardant-redis redis-cli << REDIS_COMMANDS
# Delete worker registrations
DEL workers:registrations

# Delete worker heartbeats
DEL workers:heartbeats
DEL workers:heartbeat

# Delete pending workers
DEL workers:pending

# Delete worker owners mapping
EVAL "return redis.call('del', unpack(redis.call('keys', 'workers:by-owner:*')))" 0

# Delete region changes
DEL workers:region-changes
DEL workers:pending-region-changes

# Delete any worker-specific keys
EVAL "return redis.call('del', unpack(redis.call('keys', 'worker:*')))" 0

# Show remaining worker keys (should be empty)
KEYS workers:*
KEYS worker:*
REDIS_COMMANDS

echo "✅ All worker data deleted from Redis"

# Also need to delete RabbitMQ users
echo "📋 Listing RabbitMQ worker users to delete..."
docker exec guardant-rabbitmq rabbitmqctl list_users | grep "worker-" || echo "No worker users found"

echo ""
echo "To delete RabbitMQ worker users, run:"
echo "docker exec guardant-rabbitmq rabbitmqctl list_users | grep 'worker-' | awk '{print \$1}' | xargs -I {} docker exec guardant-rabbitmq rabbitmqctl delete_user {}"