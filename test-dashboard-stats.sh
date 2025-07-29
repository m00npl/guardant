#!/bin/bash

echo "🔍 Test dashboard stats na guardant.me"

# Login
RESPONSE=$(curl -s -X POST https://guardant.me/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"moon.pl.kr@gmail.com","password":"Tola2025!"}')

TOKEN=$(echo "$RESPONSE" | jq -r '.data.tokens.accessToken')
USER_ID=$(echo "$RESPONSE" | jq -r '.data.user.id')
NEST_ID=$(echo "$RESPONSE" | jq -r '.data.user.nestId')

echo "Token: ${TOKEN:0:50}..."
echo "User ID: $USER_ID"
echo "Nest ID: $NEST_ID"

# Get dashboard stats
echo -e "\n1. Dashboard stats:"
curl -s -X POST https://guardant.me/api/admin/dashboard/stats \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .

# Get services list
echo -e "\n2. Services list:"
curl -s -X POST https://guardant.me/api/admin/services/list \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .