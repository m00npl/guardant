#!/bin/bash

echo "🔍 Debugowanie problemu z autoryzacją przy tworzeniu service"

# 1. Zaloguj się i pobierz token
echo -e "\n1. Logowanie:"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}')

TOKEN=$(echo "$RESPONSE" | jq -r '.data.tokens.accessToken')
echo "Token: ${TOKEN:0:50}..."

# 2. Test /api/admin/services/list z tokenem
echo -e "\n2. Test /api/admin/services/list z tokenem:"
curl -s -X POST http://localhost:8080/api/admin/services/list \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .

# 3. Test /api/admin/services/create z tokenem
echo -e "\n3. Test /api/admin/services/create z tokenem:"
RESPONSE=$(curl -v -X POST http://localhost:8080/api/admin/services/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Service",
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
  }' 2>&1)

echo "$RESPONSE" | tail -30

# 4. Sprawdź logi
echo -e "\n4. Logi z admin-api:"
docker logs guardant-admin-api --tail 20 2>&1 | grep -E "(Auth|auth|extractNestId|services/create)"