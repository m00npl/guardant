#!/bin/bash

echo "🔧 Naprawianie użytkownika w Redis z poprawnymi kluczami"

# 1. Wyczyść stare dane
echo -e "\n1. Czyszczenie starych danych:"
docker exec guardant-redis redis-cli FLUSHDB

# 2. Sprawdź jak są generowane klucze
echo -e "\n2. Sprawdzanie kluczy w RedisAuthStorage:"
grep -A15 "private keys" packages/auth-system/src/redis-storage.ts | grep -E "user:|userByEmail:"

# 3. Utwórz użytkownika z poprawnymi kluczami
echo -e "\n3. Tworzenie użytkownika z poprawnymi kluczami:"

USER_ID="b47a436a-25cf-42b7-acf3-8c2ab916b76a"
NEST_ID="550e8400-e29b-41d4-a716-446655440000"
EMAIL="admin@guardant.me"
# Hash dla "Tola2025!"
HASH='$2b$10$YQtPbV/CEOpMlDQBr0Lw5eNfPFz1eSgNjJlAQQxXRhPPdrizfKCni'

# Utwórz nest
docker exec guardant-redis redis-cli SET "auth:nest:$NEST_ID" '{
  "id": "'$NEST_ID'",
  "name": "Default Nest",
  "slug": "default",
  "created_at": "2025-01-29T12:00:00Z",
  "updated_at": "2025-01-29T12:00:00Z"
}'

# Utwórz użytkownika
docker exec guardant-redis redis-cli SET "auth:user:$USER_ID" '{
  "id": "'$USER_ID'",
  "email": "'$EMAIL'",
  "passwordHash": "'$HASH'",
  "name": "Admin User",
  "role": "admin",
  "nestId": "'$NEST_ID'",
  "isActive": true,
  "createdAt": "2025-01-29T12:00:00Z",
  "updatedAt": "2025-01-29T12:00:00Z"
}'

# Mapowanie email -> userId
docker exec guardant-redis redis-cli SET "auth:user:email:$EMAIL" "$USER_ID"

# Dodaj użytkownika do nest
docker exec guardant-redis redis-cli SADD "auth:users:nest:$NEST_ID" "$USER_ID"

# 4. Weryfikacja
echo -e "\n4. Weryfikacja danych:"
echo "User data:"
docker exec guardant-redis redis-cli GET "auth:user:$USER_ID" | jq .
echo -e "\nEmail mapping:"
docker exec guardant-redis redis-cli GET "auth:user:email:$EMAIL"
echo -e "\nUsers in nest:"
docker exec guardant-redis redis-cli SMEMBERS "auth:users:nest:$NEST_ID"

# 5. Wyczyść blokady
echo -e "\n5. Czyszczenie blokad:"
docker exec guardant-redis redis-cli --scan --pattern "auth:lockout:*" | xargs -I {} docker exec guardant-redis redis-cli DEL {} 2>/dev/null
docker exec guardant-redis redis-cli --scan --pattern "auth:attempts:*" | xargs -I {} docker exec guardant-redis redis-cli DEL {} 2>/dev/null

# 6. Test logowania
echo -e "\n6. Test logowania:"
sleep 1
RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}')

if [[ "$RESPONSE" == *"token"* ]] && [[ "$RESPONSE" != *"error"* ]]; then
  echo -e "\n✅ SUKCES! Zalogowano pomyślnie!"
  echo "$RESPONSE" | jq .
  
  TOKEN=$(echo "$RESPONSE" | jq -r '.token')
  echo -e "\n7. Test innych endpointów:"
  
  # Test services list
  echo "Services list:"
  curl -s http://localhost:8080/api/admin/services/list \
    -H "Authorization: Bearer $TOKEN" | jq .
  
  # Test health z auth
  echo -e "\nHealth z auth:"
  curl -s http://localhost:8080/api/admin/health \
    -H "Authorization: Bearer $TOKEN" | jq .
else
  echo -e "\n❌ Logowanie nadal nie działa"
  echo "Response: $RESPONSE"
  
  # Debug
  echo -e "\n7. Debug - sprawdzanie kluczy Redis:"
  docker exec guardant-redis redis-cli KEYS "auth:*" | head -20
fi