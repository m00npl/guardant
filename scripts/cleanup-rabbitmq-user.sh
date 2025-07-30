#!/bin/bash

echo "🧹 Cleaning up incorrect RabbitMQ user..."

# Remove null user
docker exec guardant-rabbitmq rabbitmqctl delete_user "null" 2>/dev/null || echo "User 'null' not found"

echo "✅ Cleanup done"