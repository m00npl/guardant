#!/bin/bash

echo "🔍 Test monitoringu z bezpośrednim dostępem do API"

# 1. Login bezpośrednio do localhost:3002
echo -e "\n1. Logowanie do localhost:3002..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3002/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"moon.pl.kr@gmail.com","password":"Tola2025!"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.tokens.accessToken')
echo "Token: ${TOKEN:0:50}..."

# 2. Sprawdź logi admin API w czasie rzeczywistym
echo -e "\n2. Monitorowanie logów admin API..."
docker logs -f guardant-admin-api --tail 0 &
LOG_PID=$!

# 3. Utwórz serwis
echo -e "\n3. Tworzenie serwisu testowego..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3002/api/admin/services/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "RabbitMQ Test Service",
    "type": "web",
    "target": "https://httpbin.org/status/200",
    "interval": 30,
    "config": {
      "method": "GET",
      "timeout": 5000
    },
    "monitoring": {
      "regions": ["us-east-1"]
    }
  }')

echo "$CREATE_RESPONSE" | jq '.'

# 4. Zatrzymaj monitorowanie logów
sleep 3
kill $LOG_PID 2>/dev/null

# 5. Sprawdź logi workera
echo -e "\n5. Logi workera (ostatnie 20 linii):"
docker logs guardant-monitoring-worker-1 --tail 20