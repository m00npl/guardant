#!/bin/bash

echo "🔍 Test ścieżki middleware"

# Pobierz token
TOKEN=$(curl -s -X POST https://guardant.me/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"moon.pl.kr@gmail.com","password":"Tola2025!"}' | jq -r '.data.tokens.accessToken')

echo "Token otrzymany: ${TOKEN:0:50}..."

# Test różnych endpointów żeby zobaczyć logi middleware
echo -e "\n1. Test /api/admin/services/list:"
curl -X POST https://guardant.me/api/admin/services/list \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '.'

echo -e "\n2. Sprawdź logi dla Auth middleware check:"
docker logs guardant-admin-api 2>&1 | grep -E "(Auth middleware check|Applying auth|Skipping auth)" | tail -10

echo -e "\n3. Test /api/admin/nest/profile:"
curl -X POST https://guardant.me/api/admin/nest/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '.'

echo -e "\n4. Sprawdź wszystkie logi z ostatnich 30 sekund:"
docker logs guardant-admin-api --since 30s 2>&1 | grep -E "(🔐|🔒|🔓|Auth|auth)" | head -20

echo -e "\n5. Test prosty endpoint /health:"
curl https://guardant.me/health -s

echo -e "\n6. Test główny endpoint API:"
curl https://guardant.me/api/admin/ -s | jq '.'