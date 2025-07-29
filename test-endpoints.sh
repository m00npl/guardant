#!/bin/bash

echo "🧪 Testowanie endpointów admin-api"

# 1. Test health endpoint
echo -e "\n1. Test /api/admin/health:"
curl -s http://localhost:8080/api/admin/health | jq . || echo "Health check failed"

# 2. Test login endpoint
echo -e "\n2. Test /api/admin/auth/login:"
curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}' | jq . || echo "Login failed"

# 3. Zapisz token jeśli login się udał
echo -e "\n3. Logowanie i zapisanie tokenu..."
RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}')

TOKEN=$(echo $RESPONSE | jq -r '.token' 2>/dev/null)

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "✅ Zalogowano pomyślnie, token: ${TOKEN:0:20}..."
  
  # 4. Test services endpoint z tokenem
  echo -e "\n4. Test /api/admin/services/list:"
  curl -s http://localhost:8080/api/admin/services/list \
    -H "Authorization: Bearer $TOKEN" | jq . || echo "Services list failed"
  
  # 5. Test create service
  echo -e "\n5. Test /api/admin/services/create:"
  curl -s -X POST http://localhost:8080/api/admin/services/create \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test Service",
      "url": "https://example.com",
      "interval": 60,
      "alertThreshold": 3
    }' | jq . || echo "Create service failed"
    
  # 6. Test platform endpoints (jeśli user jest platform_admin)
  echo -e "\n6. Test /api/admin/platform/stats:"
  curl -s http://localhost:8080/api/admin/platform/stats \
    -H "Authorization: Bearer $TOKEN" | jq . || echo "Platform stats failed (możliwe że user nie jest platform_admin)"
else
  echo "❌ Nie udało się zalogować"
  echo "Response: $RESPONSE"
fi

# 7. Test nginx proxy
echo -e "\n7. Test bezpośrednio do admin-api (port 4040):"
curl -s http://localhost:4040/health | jq . || echo "Direct health check failed"