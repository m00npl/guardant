#!/bin/bash

echo "🔧 Fixing RabbitMQ permissions for standalone workers..."

# Array of worker usernames
WORKERS=(
    "worker-worker-standalone-1-1753901234567"
    "worker-worker-standalone-2-1753901234568"
    "worker-worker-standalone-3-1753901234569"
)

# Permissions pattern
# Configure: can declare exchanges and queues
CONFIGURE='^(worker_commands|worker_heartbeat|monitoring_workers.*|monitoring_results|worker\..*|amq\.gen-.*)$'
# Write: can publish to exchanges and write to queues
WRITE='^(worker_commands|worker_heartbeat|monitoring_workers.*|monitoring_results|worker\..*|amq\.gen-.*)$'
# Read: can consume from queues
READ='^(monitoring_workers.*|worker\..*|monitoring_results|amq\.gen-.*)$'

for WORKER in "${WORKERS[@]}"; do
    echo "Setting permissions for: $WORKER"
    
    docker exec guardant-rabbitmq rabbitmqctl set_permissions -p / "$WORKER" "$CONFIGURE" "$WRITE" "$READ"
    
    if [ $? -eq 0 ]; then
        echo "✅ Updated permissions for $WORKER"
    else
        echo "❌ Failed to update permissions for $WORKER"
    fi
done

echo ""
echo "✅ Permissions update complete!"
echo ""
echo "Now restart the workers on the worker server:"
echo "ssh worker 'cd /home/ubuntu/projects/workers/workers && docker compose -f docker-compose.multi.yml restart'"