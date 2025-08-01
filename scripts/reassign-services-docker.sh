#!/bin/bash

echo "🔍 Reassigning all orphaned services to moon.pl.kr@gmail.com..."
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

REASSIGNED_COUNT=0
EXISTING_SERVICES="[]"

# Check if there are existing services for the nest
EXISTING=$(docker compose exec -T redis redis-cli get "nest:$MOON_NEST_ID:services")
if [ -n "$EXISTING" ] && [ "$EXISTING" != "(nil)" ]; then
    EXISTING_SERVICES="$EXISTING"
fi

# Process each service
for SERVICE_ID in $SERVICE_IDS; do
    # Get service data
    SERVICE_DATA=$(docker compose exec -T redis redis-cli hget "scheduler:services" "$SERVICE_ID")
    
    # Extract nestId
    OLD_NEST_ID=$(echo "$SERVICE_DATA" | grep -o '"nestId":"[^"]*"' | sed 's/"nestId":"\([^"]*\)"/\1/')
    
    # Check if nest exists
    NEST_EXISTS=$(docker compose exec -T redis redis-cli exists "nest:$OLD_NEST_ID")
    
    if [ "$NEST_EXISTS" = "0" ] && [ "$OLD_NEST_ID" != "$MOON_NEST_ID" ]; then
        # This is an orphaned service
        SERVICE_NAME=$(echo "$SERVICE_DATA" | grep -o '"name":"[^"]*"' | sed 's/"name":"\([^"]*\)"/\1/')
        SERVICE_TYPE=$(echo "$SERVICE_DATA" | grep -o '"type":"[^"]*"' | sed 's/"type":"\([^"]*\)"/\1/')
        SERVICE_TARGET=$(echo "$SERVICE_DATA" | grep -o '"target":"[^"]*"' | sed 's/"target":"\([^"]*\)"/\1/')
        
        echo "📋 Reassigning orphaned service: $SERVICE_NAME ($SERVICE_TYPE)"
        
        # Update the service data with new nest ID
        UPDATED_SERVICE_DATA=$(echo "$SERVICE_DATA" | sed "s/\"nestId\":\"$OLD_NEST_ID\"/\"nestId\":\"$MOON_NEST_ID\"/g")
        
        # Update in scheduler
        docker compose exec -T redis redis-cli hset "scheduler:services" "$SERVICE_ID" "$UPDATED_SERVICE_DATA" > /dev/null
        
        ((REASSIGNED_COUNT++))
    fi
done

echo ""
echo "✅ Reassigned $REASSIGNED_COUNT orphaned service(s) to moon nest"
echo ""
echo "Now updating the nest's service list..."

# Build the service list from scheduler
docker compose exec -T redis redis-cli eval "
local services = {}
local scheduler_services = redis.call('hgetall', 'scheduler:services')
for i = 1, #scheduler_services, 2 do
    local service_data = cjson.decode(scheduler_services[i+1])
    if service_data.nestId == '$MOON_NEST_ID' then
        table.insert(services, {
            id = scheduler_services[i],
            nestId = '$MOON_NEST_ID',
            name = service_data.name,
            type = service_data.type,
            target = service_data.target,
            interval = service_data.interval or 60,
            isActive = service_data.enabled ~= false,
            createdAt = service_data.createdAt or os.time() * 1000,
            updatedAt = os.time() * 1000,
            lastCheck = service_data.lastCheck,
            monitoring = service_data.monitoring or {
                regions = {'eu-central-1', 'eu-west-1', 'us-east-1'},
                strategy = 'round-robin',
                minRegions = 1,
                maxRegions = 3
            }
        })
    end
end
redis.call('set', 'nest:' .. '$MOON_NEST_ID' .. ':services', cjson.encode(services))
return #services
" 0

echo ""
echo "✅ Services have been reassigned and nest service list updated!"
echo "   Refresh the admin panel to see the changes."