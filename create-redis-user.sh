#!/bin/bash

echo "🔐 Tworzenie użytkownika w Redis"

# 1. Wyczyść stare dane
echo -e "\n1. Czyszczenie starych danych:"
docker exec guardant-redis redis-cli DEL "user:email:admin@guardant.me"
docker exec guardant-redis redis-cli DEL "nest:default"

# 2. Utwórz nest w Redis
echo -e "\n2. Tworzenie nest w Redis:"
docker exec guardant-redis redis-cli SET "nest:default" '{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Default Nest",
  "slug": "default",
  "created_at": "2025-01-29T12:00:00Z",
  "updated_at": "2025-01-29T12:00:00Z"
}'

# 3. Utwórz użytkownika w Redis z prawidłowym hashem
echo -e "\n3. Tworzenie użytkownika w Redis:"
# Ten hash to bcrypt dla "Tola2025!"
docker exec guardant-redis redis-cli SET "user:email:admin@guardant.me" '{
  "id": "b47a436a-25cf-42b7-acf3-8c2ab916b76a",
  "email": "admin@guardant.me",
  "password_hash": "$2b$10$YQtPbV/CEOpMlDQBr0Lw5eNfPFz1eSgNjJlAQQxXRhPPdrizfKCni",
  "name": "Admin User",
  "role": "admin",
  "nestId": "550e8400-e29b-41d4-a716-446655440000",
  "isActive": true,
  "createdAt": "2025-01-29T12:00:00Z",
  "updatedAt": "2025-01-29T12:00:00Z"
}'

# 4. Sprawdź czy zapisano
echo -e "\n4. Weryfikacja danych w Redis:"
echo "User data:"
docker exec guardant-redis redis-cli GET "user:email:admin@guardant.me" | jq .

# 5. Wyczyść blokady
echo -e "\n5. Czyszczenie blokad:"
docker exec guardant-redis redis-cli --scan --pattern "auth:lockout:*" | xargs -I {} docker exec guardant-redis redis-cli DEL {} 2>/dev/null
docker exec guardant-redis redis-cli --scan --pattern "auth:attempts:*" | xargs -I {} docker exec guardant-redis redis-cli DEL {} 2>/dev/null
echo "Blokady wyczyszczone"

# 6. Test logowania
echo -e "\n6. Test logowania:"
sleep 1
RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}')

echo "Response: $RESPONSE"

# 7. Jeśli sukces, pokaż token
if [[ "$RESPONSE" == *"token"* ]] && [[ "$RESPONSE" != *"error"* ]]; then
  echo -e "\n✅ SUKCES! Zalogowano pomyślnie!"
  echo "$RESPONSE" | jq .
  
  # Zapisz token do pliku
  TOKEN=$(echo "$RESPONSE" | jq -r '.token')
  echo "$TOKEN" > /tmp/admin-token.txt
  echo -e "\nToken zapisany w /tmp/admin-token.txt"
  
  # Test innych endpointów
  echo -e "\n8. Test /api/admin/services/list:"
  curl -s http://localhost:8080/api/admin/services/list \
    -H "Authorization: Bearer $TOKEN" | jq .
else
  echo -e "\n❌ Logowanie nadal nie działa"
  
  # Debug
  echo -e "\n7. Debugging:"
  docker logs guardant-admin-api --tail 30 2>&1 | grep -E "(login|auth|password)" | tail -10
fi