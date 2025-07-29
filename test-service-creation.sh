#!/bin/bash

echo "🔍 Test tworzenia serwisu i sprawdzenia monitoringu"

# 1. Login
echo -e "\n1. Logowanie..."
LOGIN_RESPONSE=$(curl -s -X POST https://guardant.me/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"moon.pl.kr@gmail.com","password":"Tola2025!"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.tokens.accessToken')
echo "Token: ${TOKEN:0:50}..."

# 2. Sprawdź istniejące serwisy
echo -e "\n2. Istniejące serwisy:"
SERVICES=$(curl -s -X POST https://guardant.me/api/admin/services/list \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "$SERVICES" | jq '.data[] | {id: .id, name: .name, type: .type}'

# 3. Utwórz nowy serwis testowy
echo -e "\n3. Tworzenie nowego serwisu testowego..."
CREATE_RESPONSE=$(curl -s -X POST https://guardant.me/api/admin/services/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test RabbitMQ Monitor",
    "type": "web",
    "target": "https://httpbin.org/status/200",
    "interval": 60,
    "config": {
      "method": "GET",
      "timeout": 5000
    },
    "monitoring": {
      "regions": ["us-east-1", "eu-west-1"]
    }
  }')

echo "$CREATE_RESPONSE" | jq '.'

SERVICE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id')
echo "Service ID: $SERVICE_ID"

# 4. Czekaj chwilę na monitoring
echo -e "\n4. Czekam 5 sekund na rozpoczęcie monitoringu..."
sleep 5

# 5. Sprawdź status serwisu
echo -e "\n5. Sprawdzanie statusu serwisu..."
STATUS=$(curl -s -X GET "https://guardant.me/api/public/status/$SERVICE_ID" \
  -H "X-Nest-Subdomain: moon")

echo "$STATUS" | jq '.'