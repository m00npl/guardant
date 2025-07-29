#!/bin/bash

echo "🔐 Test endpointów z autentykacją"

# Test login
echo -e "\n1. Logowanie:"
LOGIN_RESPONSE=$(curl -s -X POST https://guardant.me/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"changeThisPassword123!"}')

echo "$LOGIN_RESPONSE" | jq '.' || echo "$LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.tokens.accessToken' 2>/dev/null)

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Nie udało się zalogować. Sprawdź czy użytkownik istnieje."
  echo "Możesz utworzyć platform admin używając:"
  echo "docker exec guardant-admin-api bun /app/scripts/create-platform-admin.ts"
  exit 1
fi

echo "✅ Token otrzymany"

# Test services/create z tokenem
echo -e "\n2. Test /api/admin/services/create z tokenem:"
curl -X POST https://guardant.me/api/admin/services/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Service",
    "type": "web",
    "target": "https://example.com",
    "interval": 60,
    "monitoring": {
      "regions": ["eu-west-1"],
      "strategy": "closest"
    },
    "notifications": {
      "webhooks": [],
      "emails": []
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' || echo "Failed to parse JSON"

# Test services/list z tokenem
echo -e "\n3. Test /api/admin/services/list z tokenem:"
curl -X POST https://guardant.me/api/admin/services/list \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' || echo "Failed to parse JSON"