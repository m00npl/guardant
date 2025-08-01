#!/bin/bash

echo "🔍 Checking for orphaned services in scheduler..."

# Get all service IDs from scheduler
SERVICE_IDS=$(docker compose exec -T redis redis-cli hkeys "scheduler:services")

if [ -z "$SERVICE_IDS" ]; then
    echo "No services found in scheduler"
    exit 0
fi

echo "Found services in scheduler. Checking which ones are orphaned..."
echo ""

ORPHANED_COUNT=0

# Check each service
for SERVICE_ID in $SERVICE_IDS; do
    # Get service data
    SERVICE_DATA=$(docker compose exec -T redis redis-cli hget "scheduler:services" "$SERVICE_ID")
    
    # Extract nestId using grep and sed
    NEST_ID=$(echo "$SERVICE_DATA" | grep -o '"nestId":"[^"]*"' | sed 's/"nestId":"\([^"]*\)"/\1/')
    
    # Check if nest exists
    NEST_EXISTS=$(docker compose exec -T redis redis-cli exists "nest:$NEST_ID")
    
    if [ "$NEST_EXISTS" = "0" ]; then
        echo "❌ Found orphaned service: $SERVICE_ID"
        echo "   Nest ID: $NEST_ID (does not exist)"
        
        # Extract service name for display
        SERVICE_NAME=$(echo "$SERVICE_DATA" | grep -o '"name":"[^"]*"' | sed 's/"name":"\([^"]*\)"/\1/')
        echo "   Service Name: $SERVICE_NAME"
        echo ""
        
        ((ORPHANED_COUNT++))
    fi
done

if [ $ORPHANED_COUNT -eq 0 ]; then
    echo "✅ No orphaned services found!"
    exit 0
fi

echo "Found $ORPHANED_COUNT orphaned service(s)"
echo ""
echo "Do you want to remove these orphaned services? (y/n)"
read -r ANSWER

if [ "$ANSWER" = "y" ] || [ "$ANSWER" = "Y" ]; then
    echo "Removing orphaned services..."
    
    for SERVICE_ID in $SERVICE_IDS; do
        SERVICE_DATA=$(docker compose exec -T redis redis-cli hget "scheduler:services" "$SERVICE_ID")
        NEST_ID=$(echo "$SERVICE_DATA" | grep -o '"nestId":"[^"]*"' | sed 's/"nestId":"\([^"]*\)"/\1/')
        NEST_EXISTS=$(docker compose exec -T redis redis-cli exists "nest:$NEST_ID")
        
        if [ "$NEST_EXISTS" = "0" ]; then
            echo "Removing service: $SERVICE_ID"
            docker compose exec -T redis redis-cli hdel "scheduler:services" "$SERVICE_ID"
            
            # Also remove service history
            docker compose exec -T redis redis-cli del "service:$SERVICE_ID:checks"
            docker compose exec -T redis redis-cli del "service:$SERVICE_ID:history"
        fi
    done
    
    echo "✅ Orphaned services removed!"
else
    echo "Cancelled. No changes made."
fi