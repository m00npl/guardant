#!/bin/bash

echo "🔍 Pełny test monitoringu z RabbitMQ"

# 1. Login
echo -e "\n1. Logowanie..."
LOGIN_JSON=$(cat <<EOF
{
  "email": "moon.pl.kr@gmail.com",
  "password": "Tola2025!"
}
EOF
)

LOGIN_RESPONSE=$(echo "$LOGIN_JSON" | curl -s -X POST https://guardant.me/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d @-)

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.tokens.accessToken')
echo "Token: ${TOKEN:0:50}..."

# 2. Sprawdź istniejące serwisy
echo -e "\n2. Sprawdzanie istniejących serwisów..."
SERVICES=$(curl -s -X POST https://guardant.me/api/admin/services/list \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "$SERVICES" | jq '.data[] | {id: .id, name: .name, type: .type, interval: .interval}'

# 3. Monitoruj logi workerów w tle
echo -e "\n3. Monitorowanie logów workerów..."
docker logs -f guardant-monitoring-worker-1 --tail 0 2>&1 | grep -E "(Received command|Starting monitoring|Check completed)" &
WORKER_LOG_PID=$!

# 4. Utwórz nowy serwis
echo -e "\n4. Tworzenie nowego serwisu testowego..."
SERVICE_JSON=$(cat <<EOF
{
  "name": "RabbitMQ Test $(date +%s)",
  "type": "web",
  "target": "https://httpbin.org/status/200",
  "interval": 30,
  "config": {
    "method": "GET",
    "timeout": 5000,
    "headers": {}
  },
  "monitoring": {
    "regions": ["us-east-1"]
  }
}
EOF
)

CREATE_RESPONSE=$(echo "$SERVICE_JSON" | curl -s -X POST https://guardant.me/api/admin/services/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @-)

echo "$CREATE_RESPONSE" | jq '.'
SERVICE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id')

if [ "$SERVICE_ID" != "null" ]; then
  echo "✅ Serwis utworzony: $SERVICE_ID"
  
  # 5. Czekaj na monitoring
  echo -e "\n5. Czekam 10 sekund na monitoring..."
  sleep 10
  
  # 6. Sprawdź status
  echo -e "\n6. Sprawdzanie statusu serwisu..."
  STATUS=$(curl -s -X GET "https://guardant.me/api/public/status/$SERVICE_ID" \
    -H "X-Nest-Subdomain: moon")
  
  echo "$STATUS" | jq '.'
  
  # 7. Sprawdź Redis
  echo -e "\n7. Status w Redis:"
  docker exec guardant-redis redis-cli GET "status:821ebd00-8b5c-46d7-afbd-ee3e751b56a0:$SERVICE_ID" | jq '.' 2>/dev/null || echo "Brak danych w Redis"
else
  echo "❌ Nie udało się utworzyć serwisu"
fi

# 8. Zatrzymaj monitorowanie logów
kill $WORKER_LOG_PID 2>/dev/null

# 9. Pokaż ostatnie logi admin API
echo -e "\n9. Ostatnie logi admin API (sendWorkerCommand):"
docker logs guardant-admin-api --tail 50 | grep -E "(sendWorkerCommand|Worker command|RabbitMQ)"