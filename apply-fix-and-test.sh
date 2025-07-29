#!/bin/bash

echo "🔧 Aplikowanie poprawki i test"

# 1. Przebuduj admin-api
echo -e "\n1. Przebudowywanie admin-api z poprawką:"
docker compose build admin-api

# 2. Restart
echo -e "\n2. Restart admin-api:"
docker compose up -d admin-api

# 3. Czekaj
echo -e "\n3. Czekanie na start (15 sekund)..."
sleep 15

# 4. Test logowania
echo -e "\n4. Test logowania:"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}')

echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

# 5. Jeśli sukces, test endpointów
if [[ "$RESPONSE" == *"\"success\":true"* ]]; then
  echo -e "\n✅ Logowanie działa!"
  
  TOKEN=$(echo "$RESPONSE" | jq -r '.data.tokens.accessToken')
  echo "Token: ${TOKEN:0:50}..."
  
  # Test endpointów
  echo -e "\n5. Test endpointów:"
  
  echo -e "\n/api/admin/services/list:"
  curl -s -X POST http://localhost:8080/api/admin/services/list \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}' | jq .
  
  echo -e "\n/api/admin/dashboard/stats:"
  curl -s -X POST http://localhost:8080/api/admin/dashboard/stats \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}' | jq .
    
  echo -e "\n🎉 SUKCES! GuardAnt Admin API działa poprawnie!"
else
  echo -e "\n❌ Logowanie nadal nie działa"
  
  # Debug
  echo -e "\n6. Logi błędów:"
  docker logs guardant-admin-api --tail 30 2>&1 | grep -E "(error|Error|failed)" | tail -10
fi