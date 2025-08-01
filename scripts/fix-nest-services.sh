#!/bin/bash

echo "🔧 Fixing nest service list for moon.pl.kr@gmail.com..."
echo ""

# Get moon nest ID
MOON_NEST_ID=$(docker compose exec -T redis redis-cli get "nest:email:moon.pl.kr@gmail.com" | tr -d '"')

if [ -z "$MOON_NEST_ID" ] || [ "$MOON_NEST_ID" = "(nil)" ]; then
    echo "❌ Could not find nest for moon.pl.kr@gmail.com"
    exit 1
fi

echo "✅ Found moon nest: $MOON_NEST_ID"
echo ""

# Get current timestamp
TIMESTAMP=$(date +%s000)

# Build service list JSON from scheduler
echo "Building service list from scheduler..."
SERVICE_LIST="["
FIRST=true

# Get all services from scheduler
SERVICE_IDS=$(docker compose exec -T redis redis-cli hkeys "scheduler:services")

for SERVICE_ID in $SERVICE_IDS; do
    # Get service data
    SERVICE_DATA=$(docker compose exec -T redis redis-cli hget "scheduler:services" "$SERVICE_ID")
    
    # Extract nestId
    NEST_ID=$(echo "$SERVICE_DATA" | grep -o '"nestId":"[^"]*"' | sed 's/"nestId":"\([^"]*\)"/\1/')
    
    if [ "$NEST_ID" = "$MOON_NEST_ID" ]; then
        # Extract service details
        SERVICE_NAME=$(echo "$SERVICE_DATA" | grep -o '"name":"[^"]*"' | sed 's/"name":"\([^"]*\)"/\1/')
        SERVICE_TYPE=$(echo "$SERVICE_DATA" | grep -o '"type":"[^"]*"' | sed 's/"type":"\([^"]*\)"/\1/')
        SERVICE_TARGET=$(echo "$SERVICE_DATA" | grep -o '"target":"[^"]*"' | sed 's/"target":"\([^"]*\)"/\1/')
        SERVICE_INTERVAL=$(echo "$SERVICE_DATA" | grep -o '"interval":[0-9]*' | sed 's/"interval":\([0-9]*\)/\1/')
        SERVICE_ENABLED=$(echo "$SERVICE_DATA" | grep -o '"enabled":[^,}]*' | sed 's/"enabled":\([^,}]*\)/\1/')
        
        # Default values
        if [ -z "$SERVICE_INTERVAL" ]; then SERVICE_INTERVAL="60"; fi
        if [ "$SERVICE_ENABLED" = "false" ]; then IS_ACTIVE="false"; else IS_ACTIVE="true"; fi
        
        # Add comma if not first service
        if [ "$FIRST" = true ]; then
            FIRST=false
        else
            SERVICE_LIST="$SERVICE_LIST,"
        fi
        
        # Build service JSON
        SERVICE_JSON=$(cat <<EOF
{
  "id": "$SERVICE_ID",
  "nestId": "$MOON_NEST_ID",
  "name": "$SERVICE_NAME",
  "type": "$SERVICE_TYPE",
  "target": "$SERVICE_TARGET",
  "interval": $SERVICE_INTERVAL,
  "isActive": $IS_ACTIVE,
  "createdAt": $TIMESTAMP,
  "updatedAt": $TIMESTAMP,
  "lastCheck": null,
  "monitoring": {
    "regions": ["eu-central-1", "eu-west-1", "us-east-1"],
    "strategy": "round-robin",
    "minRegions": 1,
    "maxRegions": 3
  }
}
EOF
)
        
        SERVICE_LIST="$SERVICE_LIST$SERVICE_JSON"
        echo "✅ Added: $SERVICE_NAME ($SERVICE_TYPE)"
    fi
done

SERVICE_LIST="$SERVICE_LIST]"

# Save to Redis
echo ""
echo "Saving service list to Redis..."
echo "$SERVICE_LIST" | docker compose exec -T redis redis-cli -x set "nest:$MOON_NEST_ID:services"

echo ""
echo "✅ Done! Services should now appear in the admin panel."
echo "   Run ./scripts/check-services-status.sh to verify."