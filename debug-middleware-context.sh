#!/bin/bash

echo "🔍 Debugowanie kontekstu middleware"

# 1. Zaloguj się i pobierz token
echo -e "\n1. Logowanie:"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}')

TOKEN=$(echo "$RESPONSE" | jq -r '.data.tokens.accessToken')
echo "Token: ${TOKEN:0:50}..."

# 2. Test z dodatkowym debugowaniem
echo -e "\n2. Test /api/admin/services/list z verbose:"
curl -v -X POST http://localhost:8080/api/admin/services/list \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' 2>&1 | grep -E "(Authorization:|< HTTP|{)"

# 3. Sprawdź logi z pełnym kontekstem
echo -e "\n3. Logi z admin-api (pełny kontekst):"
docker logs guardant-admin-api --tail 50 2>&1 | grep -E "(Auth middleware|extractNestId|user:|context keys:|applying auth)"

# 4. Test bezpośredniego wywołania create
echo -e "\n4. Test /api/admin/services/create:"
CREATE_RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/services/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Debug Service",
    "url": "https://debug.example.com",
    "interval": 60,
    "type": "http",
    "method": "GET",
    "expectedStatusCode": 200,
    "timeout": 30000,
    "isActive": true,
    "monitoring": {
      "regions": ["eu-west-1"]
    }
  }')

echo "Create response:"
echo "$CREATE_RESPONSE" | jq .

# 5. Sprawdź ostatnie logi
echo -e "\n5. Ostatnie logi z middleware:"
docker logs guardant-admin-api --tail 30 2>&1 | grep -A 2 -B 2 "extractNestId"