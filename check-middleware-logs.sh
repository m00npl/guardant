#!/bin/bash

echo "🔍 Sprawdzanie logów middleware"

# Pobierz token
TOKEN=$(curl -s -X POST https://guardant.me/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"moon.pl.kr@gmail.com","password":"changeThisPassword123!"}' | jq -r '.data.tokens.accessToken')

echo "Token: ${TOKEN:0:50}..."

# Test z tokenem i sprawdź logi
echo -e "\n1. Test endpoint z tokenem:"
curl -X POST https://guardant.me/api/admin/services/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test","type":"web","target":"https://example.com","interval":60,"monitoring":{"regions":["eu-west-1"],"strategy":"closest"}}' \
  -w "\nStatus: %{http_code}\n" -s

echo -e "\n2. Logi z middleware (ostatnie 20 linii):"
docker logs guardant-admin-api 2>&1 | tail -20 | grep -E "(🔐|🔒|🔓|🔍|Auth middleware|Applying auth)"

echo -e "\n3. Wszystkie logi z extractNestId:"
docker logs guardant-admin-api 2>&1 | grep "extractNestId" | tail -10

echo -e "\n4. Test bezpośrednio w kontenerze:"
docker exec guardant-admin-api sh -c "
TOKEN='$TOKEN'
curl -X POST http://localhost:3002/api/admin/services/create \
  -H 'Content-Type: application/json' \
  -H \"Authorization: Bearer \$TOKEN\" \
  -d '{\"name\":\"Test\",\"type\":\"web\",\"target\":\"https://example.com\",\"interval\":60,\"monitoring\":{\"regions\":[\"eu-west-1\"],\"strategy\":\"closest\"}}' \
  -w '\nStatus: %{http_code}\n' -s
"