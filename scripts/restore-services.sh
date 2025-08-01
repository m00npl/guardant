#!/bin/bash

echo "🔧 Restoring services to scheduler..."
echo ""

# Get moon nest ID
MOON_NEST_ID=$(docker compose exec -T redis redis-cli get "nest:email:moon.pl.kr@gmail.com" | tr -d '"')

if [ -z "$MOON_NEST_ID" ] || [ "$MOON_NEST_ID" = "(nil)" ]; then
    echo "❌ Could not find nest for moon.pl.kr@gmail.com"
    exit 1
fi

echo "✅ Found moon nest: $MOON_NEST_ID"
echo ""

# Service definitions based on what we saw earlier
declare -A SERVICES=(
    ["f23b2b3b-0550-461a-9468-7f9beca12e23"]='{"id":"f23b2b3b-0550-461a-9468-7f9beca12e23","nestId":"NEST_ID","name":"golem.network","type":"ping","target":"golem.network","config":{},"interval":120,"monitoring":{"regions":["eu-central-1","eu-west-1","us-east-1"],"strategy":"round-robin","minRegions":1,"maxRegions":3},"nextCheck":1754038021081,"stats":{"checksScheduled":522,"checksCompleted":409,"checksFailed":0,"lastSuccess":1754037901093,"uptime":100,"averageResponseTime":0.18628823978205028},"enabled":true,"priority":"normal","lastCheck":1754037901081}'
    ["0b8fa2cd-efce-48d4-961b-ccf265c9a123"]='{"id":"0b8fa2cd-efce-48d4-961b-ccf265c9a123","nestId":"NEST_ID","name":"m00n","type":"web","target":"https://m00n.pl/","config":{},"interval":60,"monitoring":{"regions":["eu-west-1","eu-central-1"],"strategy":"closest","minRegions":1,"maxRegions":2},"nextCheck":1754037961081,"stats":{"checksScheduled":1042,"checksCompleted":816,"checksFailed":816,"lastFailure":1754037901240,"uptime":0},"enabled":true,"priority":"normal","lastCheck":1754037901081}'
    ["27773d50-7746-442f-b961-eb212b932eb5"]='{"id":"27773d50-7746-442f-b961-eb212b932eb5","nestId":"NEST_ID","name":"Kaolin","type":"uptime-api","target":"https://kaolin-status.gobas.me/api/uptime","config":{},"interval":180,"monitoring":{"regions":["eu-west-1","eu-central-1"],"strategy":"round-robin","minRegions":1,"maxRegions":2},"nextCheck":1754037971045,"stats":{"checksScheduled":348,"checksCompleted":271,"checksFailed":0,"lastSuccess":1754037791267,"uptime":100,"averageResponseTime":0.5339733876595256},"enabled":true,"priority":"normal","lastCheck":1754037791045}'
    ["69afc6c0-76ea-4fed-8c15-c9884a6b8e6e"]='{"id":"69afc6c0-76ea-4fed-8c15-c9884a6b8e6e","nestId":"NEST_ID","name":"GuardAnt","type":"github","target":"m00npl/guardant","config":{},"interval":600,"monitoring":{"regions":["eu-central-1","eu-west-1"],"strategy":"closest","minRegions":1,"maxRegions":2},"nextCheck":1754038351035,"stats":{"checksScheduled":105,"checksCompleted":79,"checksFailed":1,"lastSuccess":1754037151043,"averageResponseTime":200.71518987341773,"uptime":98.73417721518987,"lastFailure":1753990937047},"enabled":true,"priority":"normal","lastCheck":1754037751035}'
)

echo "Restoring services..."
echo ""

# First, clear any corrupted entries
docker compose exec -T redis redis-cli del "scheduler:services" > /dev/null

for SERVICE_ID in "${!SERVICES[@]}"; do
    SERVICE_DATA="${SERVICES[$SERVICE_ID]}"
    # Replace NEST_ID with actual moon nest ID
    SERVICE_DATA="${SERVICE_DATA//NEST_ID/$MOON_NEST_ID}"
    
    # Extract service name for display
    SERVICE_NAME=$(echo "$SERVICE_DATA" | grep -o '"name":"[^"]*"' | sed 's/"name":"\([^"]*\)"/\1/')
    SERVICE_TYPE=$(echo "$SERVICE_DATA" | grep -o '"type":"[^"]*"' | sed 's/"type":"\([^"]*\)"/\1/')
    
    echo "Restoring: $SERVICE_NAME ($SERVICE_TYPE)"
    
    # Add to scheduler
    echo "$SERVICE_DATA" | docker compose exec -T redis redis-cli -x hset "scheduler:services" "$SERVICE_ID" > /dev/null
    
    echo "✅ Restored"
done

echo ""
echo "✅ All services restored to scheduler with moon nest ID"
echo ""
echo "Now run ./scripts/fix-nest-services.sh to update the nest's service list"