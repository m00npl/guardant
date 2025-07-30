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
CONFIGURE='.*'  # Allow all - workers need to create temporary queues
# Write: can publish to exchanges and write to queues
WRITE='.*'      # Allow all - workers need to write to various queues
# Read: can consume from queues and read from exchanges  
READ='.*'       # Allow all - workers need to read from exchanges and queues

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