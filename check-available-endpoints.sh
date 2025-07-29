#!/bin/bash

echo "🔍 Sprawdzanie dostępnych endpointów"

# 1. Sprawdź jakie endpointy są zdefiniowane w kodzie
echo -e "\n1. Endpointy zdefiniowane w index.ts:"
grep -E "app\.(get|post|put|delete|patch).*'/api/admin" services/api-admin/src/index.ts | grep -v "^//" | sed 's/.*app\.//' | sed 's/(.*$//' | sort | uniq

# 2. Zaloguj się
echo -e "\n2. Logowanie:"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}')

TOKEN=$(echo "$RESPONSE" | jq -r '.data.tokens.accessToken')
echo "Token obtained: ${TOKEN:0:50}..."

# 3. Test różnych wariantów endpointów
echo -e "\n3. Test endpointów które powinny istnieć:"

# Health bez /api/admin prefix
echo -e "\n/health (public):"
curl -s http://localhost:8080/health

# Me endpoint
echo -e "\n\n/api/admin/me:"
curl -s http://localhost:8080/api/admin/me \
  -H "Authorization: Bearer $TOKEN" | jq . 2>/dev/null || echo "404"

# Auth me
echo -e "\n/api/admin/auth/me:"
curl -s http://localhost:8080/api/admin/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq . 2>/dev/null || echo "404"

# Services
echo -e "\n/api/admin/services (bez /list):"
curl -s http://localhost:8080/api/admin/services \
  -H "Authorization: Bearer $TOKEN" | jq . 2>/dev/null || echo "404"

# Logout
echo -e "\n/api/admin/logout:"
curl -s -X POST http://localhost:8080/api/admin/logout \
  -H "Authorization: Bearer $TOKEN" | jq . 2>/dev/null || echo "404"

# Auth logout  
echo -e "\n/api/admin/auth/logout:"
curl -s -X POST http://localhost:8080/api/admin/auth/logout \
  -H "Authorization: Bearer $TOKEN" | jq . 2>/dev/null || echo "404"

# 4. Sprawdź logi dla więcej informacji
echo -e "\n4. Ostatnie requesty w logach:"
docker logs guardant-admin-api --tail 30 2>&1 | grep -E "(GET|POST|PUT|DELETE)" | tail -10

# 5. Test tworzenia service z debug
echo -e "\n5. Debug tworzenia service:"

# Najpierw sprawdź czy nest istnieje
echo "Sprawdzanie nest w Redis:"
docker exec guardant-redis redis-cli KEYS "*nest*" | head -10

# Spróbuj utworzyć service
echo -e "\nTworzenie service:"
curl -v -X POST http://localhost:8080/api/admin/services/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Service",
    "url": "https://example.com",
    "interval": 60,
    "alertThreshold": 3
  }' 2>&1 | grep -E "(HTTP|{|error)"