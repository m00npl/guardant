#!/bin/bash

echo "🔍 Test dashboard stats"

# Login
RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}')

TOKEN=$(echo "$RESPONSE" | jq -r '.data.tokens.accessToken')
echo "Token: ${TOKEN:0:50}..."

# Get dashboard stats
echo -e "\n1. Dashboard stats:"
curl -s -X POST http://localhost:8080/api/admin/dashboard/stats \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .

# Get services list
echo -e "\n2. Services list:"
curl -s -X POST http://localhost:8080/api/admin/services/list \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .