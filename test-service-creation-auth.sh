#!/bin/bash

echo "🔍 Test tworzenia service z debugowaniem autoryzacji"

# 1. Clear logs
echo -e "\n1. Czyszczenie logów..."
docker logs guardant-admin-api --tail 0 -f > /tmp/admin-api-debug.log 2>&1 &
LOG_PID=$!
sleep 2

# 2. Login
echo -e "\n2. Logowanie..."
RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}')

TOKEN=$(echo "$RESPONSE" | jq -r '.data.tokens.accessToken')
echo "Token: ${TOKEN:0:50}..."

# 3. Try to create service
echo -e "\n3. Próba utworzenia service..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/services/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Service Auth",
    "url": "https://example.com",
    "interval": 60,
    "alertThreshold": 3,
    "type": "http",
    "method": "GET",
    "expectedStatusCode": 200,
    "timeout": 30000,
    "isActive": true,
    "monitoring": {
      "regions": ["eu-west-1"]
    }
  }')

echo "Response:"
echo "$CREATE_RESPONSE" | jq .

# 4. Stop log capture and show relevant logs
sleep 2
kill $LOG_PID 2>/dev/null

echo -e "\n4. Logi z middleware:"
cat /tmp/admin-api-debug.log | grep -E "(Auth middleware|extractNestId|User in context|Authorization header)"

# 5. Clean up
rm -f /tmp/admin-api-debug.log