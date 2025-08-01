#!/bin/bash

echo "🔧 Force reassigning ALL services to moon.pl.kr@gmail.com..."
echo ""

# Get moon nest ID
MOON_NEST_ID=$(docker compose exec -T redis redis-cli get "nest:email:moon.pl.kr@gmail.com" | tr -d '"')

if [ -z "$MOON_NEST_ID" ] || [ "$MOON_NEST_ID" = "(nil)" ]; then
    echo "❌ Could not find nest for moon.pl.kr@gmail.com"
    exit 1
fi

echo "✅ Found moon nest: $MOON_NEST_ID"
echo ""

# Get all service IDs from scheduler
SERVICE_IDS=$(docker compose exec -T redis redis-cli hkeys "scheduler:services")

echo "📋 Reassigning all services..."
echo ""

for SERVICE_ID in $SERVICE_IDS; do
    # Get service data
    SERVICE_DATA=$(docker compose exec -T redis redis-cli hget "scheduler:services" "$SERVICE_ID")
    
    # Extract service details for display
    SERVICE_NAME=$(echo "$SERVICE_DATA" | grep -o '"name":"[^"]*"' | sed 's/"name":"\([^"]*\)"/\1/')
    SERVICE_TYPE=$(echo "$SERVICE_DATA" | grep -o '"type":"[^"]*"' | sed 's/"type":"\([^"]*\)"/\1/')
    OLD_NEST_ID=$(echo "$SERVICE_DATA" | grep -o '"nestId":"[^"]*"' | sed 's/"nestId":"\([^"]*\)"/\1/')
    
    echo "Processing: $SERVICE_NAME ($SERVICE_TYPE)"
    echo "  Old nest: $OLD_NEST_ID"
    echo "  New nest: $MOON_NEST_ID"
    
    # Use a more robust JSON update approach
    # First, decode the JSON, update nestId, then re-encode
    TEMP_FILE="/tmp/service_${SERVICE_ID}.json"
    echo "$SERVICE_DATA" > "$TEMP_FILE"
    
    # Use jq if available, otherwise use python
    if command -v jq &> /dev/null; then
        UPDATED_SERVICE_DATA=$(jq ".nestId = \"$MOON_NEST_ID\"" "$TEMP_FILE")
    elif command -v python3 &> /dev/null; then
        UPDATED_SERVICE_DATA=$(python3 -c "
import json
with open('$TEMP_FILE', 'r') as f:
    data = json.load(f)
data['nestId'] = '$MOON_NEST_ID'
print(json.dumps(data))
")
    else
        # Fallback to sed (less reliable but should work)
        UPDATED_SERVICE_DATA=$(cat "$TEMP_FILE" | sed "s/\"nestId\":\"[^\"]*\"/\"nestId\":\"$MOON_NEST_ID\"/")
    fi
    
    # Update in Redis
    echo "$UPDATED_SERVICE_DATA" | docker compose exec -T redis redis-cli -x hset "scheduler:services" "$SERVICE_ID"
    
    # Clean up temp file
    rm -f "$TEMP_FILE"
    
    echo "  ✅ Reassigned"
    echo ""
done

echo "✅ All services have been reassigned to moon nest!"
echo ""
echo "Now run ./scripts/fix-nest-services.sh to update the nest's service list"