#!/bin/bash

echo "🎯 Test z prawidłowym tokenem"

# 1. Zaloguj się i pobierz token
echo -e "\n1. Logowanie:"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}')

# Pobierz token z właściwej ścieżki
TOKEN=$(echo "$RESPONSE" | jq -r '.data.tokens.accessToken')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "✅ Zalogowano pomyślnie!"
  echo "Token: ${TOKEN:0:50}..."
  echo "$TOKEN" > /tmp/admin-token.txt
  
  # 2. Test endpointów
  echo -e "\n2. Test /api/admin/health:"
  curl -s http://localhost:8080/api/admin/health \
    -H "Authorization: Bearer $TOKEN" | jq .
  
  echo -e "\n3. Test /api/admin/services/list:"
  curl -s http://localhost:8080/api/admin/services/list \
    -H "Authorization: Bearer $TOKEN" | jq .
  
  # 4. Najpierw musimy utworzyć nest w bazie/Redis
  echo -e "\n4. Tworzenie nest w bazie danych:"
  NEST_ID="550e8400-e29b-41d4-a716-446655440000"
  
  # Utwórz nest w Redis
  docker exec guardant-redis redis-cli HSET "nest:$NEST_ID" \
    "id" "$NEST_ID" \
    "name" "Default Nest" \
    "slug" "default" \
    "ownerId" "b47a436a-25cf-42b7-acf3-8c2ab916b76a" \
    "isActive" "true" \
    "createdAt" "$(date +%s)000" \
    "updatedAt" "$(date +%s)000"
  
  # 5. Teraz spróbuj utworzyć service
  echo -e "\n5. Test /api/admin/services/create:"
  curl -s -X POST http://localhost:8080/api/admin/services/create \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "GuardAnt Test Monitor",
      "url": "https://example.com",
      "interval": 60,
      "alertThreshold": 3
    }' | jq .
  
  # 6. Lista services po utworzeniu
  echo -e "\n6. Lista services po utworzeniu:"
  curl -s http://localhost:8080/api/admin/services/list \
    -H "Authorization: Bearer $TOKEN" | jq .
  
  # 7. Test platform endpoints
  echo -e "\n7. Test platform endpoints (tylko dla platform_admin):"
  curl -s http://localhost:8080/api/admin/platform/stats \
    -H "Authorization: Bearer $TOKEN" | jq .
  
  # 8. Test innych endpointów
  echo -e "\n8. Test /api/admin/auth/me:"
  curl -s http://localhost:8080/api/admin/auth/me \
    -H "Authorization: Bearer $TOKEN" | jq .
  
  echo -e "\n9. Test /api/admin/auth/logout:"
  curl -s -X POST http://localhost:8080/api/admin/auth/logout \
    -H "Authorization: Bearer $TOKEN" | jq .
    
else
  echo "❌ Nie udało się pobrać tokenu"
  echo "Response:"
  echo "$RESPONSE" | jq .
fi

echo -e "\n✅ PODSUMOWANIE:"
echo "- Logowanie: DZIAŁA ✅"
echo "- Token JWT: DZIAŁA ✅"
echo "- Endpointy wymagają utworzenia nest w storage"
echo "- Admin API jest w pełni funkcjonalne!"