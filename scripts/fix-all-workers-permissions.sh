#!/bin/bash

echo "🔧 Fixing RabbitMQ permissions for ALL workers..."

# Get all worker users from RabbitMQ
WORKERS=$(docker exec guardant-rabbitmq rabbitmqctl list_users | grep "^worker-" | awk '{print $1}')

if [ -z "$WORKERS" ]; then
    echo "❌ No workers found in RabbitMQ"
    exit 1
fi

echo "Found workers:"
echo "$WORKERS"
echo ""

# Full permissions for workers
PERMISSIONS='.*'

for WORKER in $WORKERS; do
    echo "Setting permissions for: $WORKER"
    
    docker exec guardant-rabbitmq rabbitmqctl set_permissions -p / "$WORKER" "$PERMISSIONS" "$PERMISSIONS" "$PERMISSIONS"
    
    if [ $? -eq 0 ]; then
        echo "✅ Updated permissions for $WORKER"
    else
        echo "❌ Failed to update permissions for $WORKER"
    fi
done

echo ""
echo "✅ Permissions update complete!"
echo ""
echo "Workers should now have full access to RabbitMQ resources."