#!/bin/bash

echo "🔍 Test przepływu monitoringu z RabbitMQ"

# 1. Login
echo -e "\n1. Logowanie do guardant.me..."
RESPONSE=$(curl -s -X POST https://guardant.me/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"moon.pl.kr@gmail.com","password":"Tola2025!"}')

TOKEN=$(echo "$RESPONSE" | jq -r '.data.tokens.accessToken')
echo "Token: ${TOKEN:0:50}..."

# 2. Check existing services
echo -e "\n2. Istniejące serwisy:"
SERVICES=$(curl -s -X POST https://guardant.me/api/admin/services/list \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "$SERVICES" | jq '.data[] | {id: .id, name: .name, type: .type, interval: .interval}'

# 3. Check worker logs for received commands
echo -e "\n3. Sprawdzenie logów workerów (ostatnie komendy):"
docker logs guardant-monitoring-worker-1 --tail 20 2>&1 | grep -E "(Received command|Starting monitoring|Check completed)"

# 4. Check if status is being stored in Redis
SERVICE_ID=$(echo "$SERVICES" | jq -r '.data[0].id')
NEST_ID=$(echo "$SERVICES" | jq -r '.data[0].nestId')

echo -e "\n4. Status w Redis dla serwisu $SERVICE_ID:"
docker exec guardant-redis redis-cli GET "status:$NEST_ID:$SERVICE_ID"

# 5. Check RabbitMQ for messages
echo -e "\n5. Kolejki RabbitMQ:"
docker exec guardant-rabbitmq rabbitmqctl list_queues name messages consumers | grep -E "(worker_|monitoring)"