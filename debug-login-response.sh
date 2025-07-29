#!/bin/bash

echo "🔍 Debugowanie odpowiedzi logowania"

# 1. Sprawdź surową odpowiedź
echo -e "\n1. Surowa odpowiedź logowania:"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}')

echo "Response:"
echo "$RESPONSE"
echo ""
echo "Response length: ${#RESPONSE}"

# 2. Sprawdź nagłówki
echo -e "\n2. Odpowiedź z nagłówkami:"
curl -i -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}' 2>&1 | head -20

# 3. Sprawdź czy może trzeba ponownie utworzyć użytkownika
echo -e "\n3. Sprawdzanie użytkownika w Redis:"
docker exec guardant-redis redis-cli GET "auth:user:email:admin@guardant.me"

# 4. Jeśli nie ma, utwórz ponownie
if [ -z "$(docker exec guardant-redis redis-cli GET "auth:user:email:admin@guardant.me")" ]; then
  echo -e "\n4. Tworzenie użytkownika na nowo:"
  ./use-new-hash.sh
else
  echo -e "\n4. Użytkownik istnieje w Redis"
fi

# 5. Spróbuj ponownie
echo -e "\n5. Ponowna próba logowania:"
RESPONSE2=$(curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}')

echo "Response:"
echo "$RESPONSE2" | head -100

# 6. Jeśli to JSON, parsuj
if [[ "$RESPONSE2" == "{"* ]]; then
  echo -e "\n6. Parsowanie JSON:"
  TOKEN=$(echo "$RESPONSE2" | jq -r '.data.tokens.accessToken' 2>/dev/null)
  if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo "✅ Token pobrany: ${TOKEN:0:50}..."
    
    # Test z tokenem
    echo -e "\n7. Test z tokenem:"
    curl -s -X POST http://localhost:8080/api/admin/services/list \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{}' | jq .
  else
    echo "❌ Nie można pobrać tokenu"
  fi
else
  echo -e "\n6. Odpowiedź nie jest JSON-em"
fi

# 7. Sprawdź logi
echo -e "\n8. Ostatnie logi:"
docker logs guardant-admin-api --tail 20 2>&1 | grep -E "(error|Error|login)" | tail -10