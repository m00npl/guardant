#!/bin/bash

# Fix RabbitMQ permissions for all approved workers

echo "🔧 Fixing RabbitMQ permissions for all workers..."

# Get all worker usernames
WORKERS=$(docker exec guardant-rabbitmq rabbitmqctl list_users | grep "^worker-" | awk '{print $1}')

for WORKER in $WORKERS; do
    echo "Updating permissions for: $WORKER"
    
    # Update permissions to allow configuration of required exchanges
    docker exec guardant-rabbitmq rabbitmqctl set_permissions -p / "$WORKER" \
        '^(worker_commands|worker_heartbeat|monitoring_workers|monitoring_results)$' \
        '^(worker_commands|worker_heartbeat|monitoring_results)$' \
        '^(monitoring_workers.*|worker\..*|monitoring_results)$'
    
    if [ $? -eq 0 ]; then
        echo "✅ Updated permissions for $WORKER"
    else
        echo "❌ Failed to update permissions for $WORKER"
    fi
done

echo ""
echo "✅ Permissions update complete!"