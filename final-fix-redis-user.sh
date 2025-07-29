#!/bin/bash

echo "🎯 Ostateczna naprawa użytkownika w Redis"

# 1. Wyczyść Redis
echo -e "\n1. Czyszczenie Redis:"
docker exec guardant-redis redis-cli FLUSHDB

# 2. Utwórz użytkownika z DOKŁADNIE takimi polami jak w TypeScript
echo -e "\n2. Tworzenie użytkownika z poprawnymi typami:"

USER_ID="b47a436a-25cf-42b7-acf3-8c2ab916b76a"
NEST_ID="550e8400-e29b-41d4-a716-446655440000"
EMAIL="admin@guardant.me"
# Hash dla "Tola2025!"
HASH='$2b$10$YQtPbV/CEOpMlDQBr0Lw5eNfPFz1eSgNjJlAQQxXRhPPdrizfKCni'
TIMESTAMP=$(date +%s)000  # Timestamp w milisekundach

# Utwórz użytkownika z poprawnymi typami
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

# Mapowanie email -> userId
docker exec guardant-redis redis-cli SET "auth:user:email:$EMAIL" "$USER_ID"

# Dodaj użytkownika do nest
docker exec guardant-redis redis-cli SADD "auth:users:nest:$NEST_ID" "$USER_ID"

# 3. Weryfikacja
echo -e "\n3. Weryfikacja struktury danych:"
docker exec guardant-redis redis-cli GET "auth:user:$USER_ID" | jq .

# 4. Test logowania
echo -e "\n4. Test logowania:"
sleep 1
RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}')

if [[ "$RESPONSE" == *"token"* ]] && [[ "$RESPONSE" != *"error"* ]]; then
  echo -e "\n✅ SUKCES! Zalogowano pomyślnie!"
  echo "$RESPONSE" | jq .
  
  TOKEN=$(echo "$RESPONSE" | jq -r '.token')
  echo "$TOKEN" > /tmp/admin-token.txt
  
  echo -e "\n5. Test endpointów z tokenem:"
  
  # Health
  echo "Health endpoint:"
  curl -s http://localhost:8080/api/admin/health \
    -H "Authorization: Bearer $TOKEN"
  
  # Services list
  echo -e "\n\nServices list:"
  curl -s http://localhost:8080/api/admin/services/list \
    -H "Authorization: Bearer $TOKEN" | jq .
  
  # Create service
  echo -e "\nCreate service test:"
  curl -s -X POST http://localhost:8080/api/admin/services/create \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test Monitor",
      "url": "https://example.com",
      "interval": 60,
      "alertThreshold": 3
    }' | jq .
    
else
  echo -e "\n❌ Logowanie nadal nie działa"
  echo "Response: $RESPONSE"
  
  # Ostatnia próba - może bcrypt?
  echo -e "\n5. Generowanie nowego hasha z bcrypt:"
  docker exec guardant-admin-api node -e "
    const bcrypt = require('bcrypt');
    const password = 'Tola2025!';
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) console.error('Error:', err);
      else console.log('New hash:', hash);
    });
  "
fi