#!/bin/bash

echo "🔐 Używanie nowego hasha wygenerowanego przez aplikację"

# 1. Użyj nowego hasha
NEW_HASH='$2b$10$BxVKfReGNkmDNcluYuAC8.DnH9AWO32Ejvw0PkV1bKz34YB7UVCqG'
USER_ID="b47a436a-25cf-42b7-acf3-8c2ab916b76a"
EMAIL="admin@guardant.me"
TIMESTAMP=$(date +%s)000

echo -e "\n1. Aktualizacja użytkownika z nowym hashem:"
docker exec guardant-redis redis-cli SET "auth:user:$USER_ID" "{
  \"id\": \"$USER_ID\",
  \"email\": \"$EMAIL\",
  \"passwordHash\": \"$NEW_HASH\",
  \"name\": \"Admin User\",
  \"role\": \"admin\",
  \"nestId\": \"550e8400-e29b-41d4-a716-446655440000\",
  \"isActive\": true,
  \"twoFactorEnabled\": false,
  \"createdAt\": $TIMESTAMP,
  \"updatedAt\": $TIMESTAMP
}"

# 2. Wyczyść blokady
echo -e "\n2. Czyszczenie blokad:"
docker exec guardant-redis redis-cli --scan --pattern "auth:lockout:*" | xargs -I {} docker exec guardant-redis redis-cli DEL {} 2>/dev/null
docker exec guardant-redis redis-cli --scan --pattern "auth:attempts:*" | xargs -I {} docker exec guardant-redis redis-cli DEL {} 2>/dev/null

# 3. Test logowania
echo -e "\n3. Test logowania z nowym hashem:"
sleep 1
RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}')

if [[ "$RESPONSE" == *"token"* ]] && [[ "$RESPONSE" != *"error"* ]]; then
  echo -e "\n✅ SUKCES! Zalogowano pomyślnie!"
  echo "$RESPONSE" | jq .
  
  TOKEN=$(echo "$RESPONSE" | jq -r '.token')
  echo -e "\nToken: ${TOKEN:0:50}..."
  echo "$TOKEN" > /tmp/admin-token.txt
  
  # Test endpointów
  echo -e "\n4. Test endpointów:"
  
  echo -e "\n/api/admin/health:"
  curl -s http://localhost:8080/api/admin/health \
    -H "Authorization: Bearer $TOKEN" | jq .
  
  echo -e "\n/api/admin/services/list:"
  curl -s http://localhost:8080/api/admin/services/list \
    -H "Authorization: Bearer $TOKEN" | jq .
  
  echo -e "\n/api/admin/services/create:"
  curl -s -X POST http://localhost:8080/api/admin/services/create \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "GuardAnt Test Service",
      "url": "https://example.com",
      "interval": 60,
      "alertThreshold": 3
    }' | jq .
  
  # Test platform endpoints (jeśli user jest platform_admin)
  echo -e "\n/api/admin/platform/stats (może zwrócić błąd jeśli nie platform_admin):"
  curl -s http://localhost:8080/api/admin/platform/stats \
    -H "Authorization: Bearer $TOKEN" | jq .
    
else
  echo -e "\n❌ Logowanie z nowym hashem też nie działa"
  echo "Response: $RESPONSE"
  
  # Jeszcze jedna próba - sprawdź czy bcrypt w auth-manager działa
  echo -e "\n4. Debug bcrypt w auth-manager:"
  docker logs guardant-admin-api --tail 100 2>&1 | grep -A5 -B5 "password\|credentials" | tail -20
fi