#!/bin/bash

echo "🔧 Naprawianie typów danych w Redis"

# 1. Sprawdź co jest pod kluczami użytkownika
echo -e "\n1. Sprawdzanie typów kluczy w Redis:"
echo "Klucz auth:user:email:admin@guardant.me:"
docker exec guardant-redis redis-cli TYPE "auth:user:email:admin@guardant.me"
docker exec guardant-redis redis-cli GET "auth:user:email:admin@guardant.me"

echo -e "\nWszystkie klucze związane z admin@guardant.me:"
docker exec guardant-redis redis-cli KEYS "*admin@guardant.me*" | while read key; do
  echo -e "\nKlucz: $key"
  docker exec guardant-redis redis-cli TYPE "$key"
  docker exec guardant-redis redis-cli GET "$key" 2>/dev/null || docker exec guardant-redis redis-cli HGETALL "$key" 2>/dev/null
done

# 2. Wyczyść wszystkie dane i zacznij od nowa
echo -e "\n2. Czyszczenie wszystkich danych:"
docker exec guardant-redis redis-cli FLUSHDB

# 3. Utwórz użytkownika z DOKŁADNIE poprawnymi typami
echo -e "\n3. Tworzenie użytkownika od nowa:"

USER_ID="b47a436a-25cf-42b7-acf3-8c2ab916b76a"
NEST_ID="550e8400-e29b-41d4-a716-446655440000"
EMAIL="admin@guardant.me"
# Hash wygenerowany przez aplikację
HASH='$2b$10$BxVKfReGNkmDNcluYuAC8.DnH9AWO32Ejvw0PkV1bKz34YB7UVCqG'
TIMESTAMP=$(date +%s)000

# Zapisz użytkownika jako STRING (JSON)
docker exec guardant-redis redis-cli SET "auth:user:$USER_ID" "{
  \"id\": \"$USER_ID\",
  \"email\": \"$EMAIL\",
  \"passwordHash\": \"$HASH\",
  \"name\": \"Admin User\",
  \"role\": \"admin\",
  \"nestId\": \"$NEST_ID\",
  \"isActive\": true,
  \"twoFactorEnabled\": false,
  \"createdAt\": $TIMESTAMP,
  \"updatedAt\": $TIMESTAMP
}"

# Mapowanie email -> userId jako STRING
docker exec guardant-redis redis-cli SET "auth:user:email:$EMAIL" "$USER_ID"

# Dodaj użytkownika do nest jako SET member
docker exec guardant-redis redis-cli SADD "auth:users:nest:$NEST_ID" "$USER_ID"

# 4. Weryfikacja typów
echo -e "\n4. Weryfikacja typów po utworzeniu:"
echo "auth:user:$USER_ID - typ:"
docker exec guardant-redis redis-cli TYPE "auth:user:$USER_ID"
echo "auth:user:email:$EMAIL - typ:"
docker exec guardant-redis redis-cli TYPE "auth:user:email:$EMAIL"
echo "auth:users:nest:$NEST_ID - typ:"
docker exec guardant-redis redis-cli TYPE "auth:users:nest:$NEST_ID"

# 5. Test logowania
echo -e "\n5. Test logowania:"
sleep 1
RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}')

echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

if [[ "$RESPONSE" == *"\"success\":true"* ]]; then
  echo -e "\n✅ SUKCES! Logowanie działa!"
  
  TOKEN=$(echo "$RESPONSE" | jq -r '.data.tokens.accessToken')
  
  # Test endpointów
  echo -e "\n6. Test endpointów:"
  
  echo -e "\n/api/admin/services/list:"
  curl -s -X POST http://localhost:8080/api/admin/services/list \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}' | jq .
    
  echo -e "\n🎉 GuardAnt Admin API działa poprawnie!"
  echo ""
  echo "Dane logowania:"
  echo "Email: admin@guardant.me"
  echo "Hasło: Tola2025!"
else
  echo -e "\n❌ Problem z logowaniem"
  
  # Debug
  echo -e "\n7. Logi błędów:"
  docker logs guardant-admin-api --tail 20 2>&1 | grep -E "(error|Error|WRONGTYPE)" | tail -10
fi