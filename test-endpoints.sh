#!/bin/bash

echo "🧪 Testing Admin API endpoints..."

# Base URL
BASE_URL="https://guardant.me"

echo -e "\n1. Testing root endpoint:"
curl -s "$BASE_URL/api/admin/" | jq . || echo "Failed"

echo -e "\n2. Testing auth endpoints:"
echo "Login endpoint:"
curl -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | head -n 5

echo -e "\n3. Testing services endpoints:"
echo "Services list (should require auth):"
curl -X POST "$BASE_URL/api/admin/services/list" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | head -n 5

echo "Services create (should require auth):"
curl -X POST "$BASE_URL/api/admin/services/create" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | head -n 5

echo -e "\n4. Checking what's actually running in container:"
echo "Container ID:"
docker ps | grep admin-api | awk '{print $1}'

CONTAINER_ID=$(docker ps | grep admin-api | awk '{print $1}')
if [ ! -z "$CONTAINER_ID" ]; then
    echo -e "\n5. Checking endpoints in running container:"
    docker exec $CONTAINER_ID sh -c 'grep -n "app.post" /app/services/api-admin/src/index.ts | grep "/api" | head -10'
    
    echo -e "\n6. Testing directly inside container:"
    docker exec $CONTAINER_ID sh -c 'curl -X POST http://localhost:3001/api/admin/services/create -H "Content-Type: application/json" -d "{}" -s -w "\nHTTP Status: %{http_code}\n"'
fi

echo -e "\n7. Checking nginx logs for the request:"
docker logs guardant-nginx-proxy --tail 10 | grep "services/create"