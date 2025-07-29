#!/bin/bash

echo "🔍 Test ścieżek middleware"

# 1. Restart dla czystych logów
echo -e "\n1. Restart admin-api..."
docker compose restart admin-api
sleep 10

# 2. Test różnych ścieżek
echo -e "\n2. Test różnych ścieżek API..."

# Login first
RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}')
TOKEN=$(echo "$RESPONSE" | jq -r '.data.tokens.accessToken')

echo "Token: ${TOKEN:0:50}..."

# Test z różnymi ścieżkami
echo -e "\n3. Test POST /api/admin/services/list:"
curl -v -X POST http://localhost:8080/api/admin/services/list \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' 2>&1 | grep -E "(< HTTP|< Location|{)"

# Sprawdź logi middleware
echo -e "\n4. Logi middleware (ostatnie 50 linii):"
docker logs guardant-admin-api --tail 50 2>&1 | grep -E "(🔐|🔒|🔓|applying auth|middleware)"

# Sprawdź czy middleware jest w ogóle rejestrowane
echo -e "\n5. Sprawdzenie rejestracji middleware:"
docker logs guardant-admin-api 2>&1 | grep -E "(middleware|Middleware)" | tail -20