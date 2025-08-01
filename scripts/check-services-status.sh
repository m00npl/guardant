#!/bin/bash

echo "🔍 Checking services status..."
echo ""

# Get moon nest ID
MOON_NEST_ID=$(docker compose exec -T redis redis-cli get "nest:email:moon.pl.kr@gmail.com" | tr -d '"')
echo "Moon nest ID: $MOON_NEST_ID"
echo ""

echo "📋 Checking which services are assigned to moon nest in scheduler..."
echo "=================================================================="

# Check each service in scheduler
SERVICE_COUNT=0
MOON_SERVICE_COUNT=0

# Get all service IDs
SERVICE_IDS=$(docker compose exec -T redis redis-cli hkeys "scheduler:services")

for SERVICE_ID in $SERVICE_IDS; do
    SERVICE_DATA=$(docker compose exec -T redis redis-cli hget "scheduler:services" "$SERVICE_ID")
    SERVICE_NAME=$(echo "$SERVICE_DATA" | grep -o '"name":"[^"]*"' | sed 's/"name":"\([^"]*\)"/\1/')
    SERVICE_TYPE=$(echo "$SERVICE_DATA" | grep -o '"type":"[^"]*"' | sed 's/"type":"\([^"]*\)"/\1/')
    NEST_ID=$(echo "$SERVICE_DATA" | grep -o '"nestId":"[^"]*"' | sed 's/"nestId":"\([^"]*\)"/\1/')
    
    ((SERVICE_COUNT++))
    
    if [ "$NEST_ID" = "$MOON_NEST_ID" ]; then
        echo "✅ $SERVICE_NAME ($SERVICE_TYPE) - Assigned to moon nest"
        ((MOON_SERVICE_COUNT++))
    else
        echo "❌ $SERVICE_NAME ($SERVICE_TYPE) - Different nest: $NEST_ID"
    fi
done

echo ""
echo "Summary: $MOON_SERVICE_COUNT out of $SERVICE_COUNT services are assigned to moon nest"
echo ""

echo "📋 Checking moon nest's service list..."
echo "====================================="
SERVICES=$(docker compose exec -T redis redis-cli get "nest:$MOON_NEST_ID:services")
if [ "$SERVICES" = "(nil)" ] || [ -z "$SERVICES" ]; then
    echo "❌ No services found in nest's service list!"
    echo "   Run: node scripts/fix-orphaned-services.js"
    echo "   to fix this issue"
else
    echo "✅ Services found in nest's service list"
    # Count services in the list
    SERVICE_LIST_COUNT=$(echo "$SERVICES" | grep -o '"id"' | wc -l)
    echo "   Total: $SERVICE_LIST_COUNT services"
fi