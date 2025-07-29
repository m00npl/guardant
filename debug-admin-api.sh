#!/bin/bash

echo "🔍 Debugging Admin API..."

# Check if docker-compose or docker compose should be used
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

echo "1. Checking if container is running:"
docker ps | grep admin-api

echo -e "\n2. Checking actual code in container:"
echo "Looking for /api/admin/services/create endpoint:"
docker exec guardant-admin-api grep -n "services/create" /app/services/api-admin/src/index.ts || echo "Not found in index.ts"

echo -e "\n3. Checking all POST endpoints in the file:"
docker exec guardant-admin-api grep -n "app.post('/api" /app/services/api-admin/src/index.ts | head -20

echo -e "\n4. Testing endpoint directly inside container:"
docker exec guardant-admin-api curl -X POST http://localhost:3001/api/admin/services/create \
  -H "Content-Type: application/json" \
  -d '{}' -v 2>&1 | grep -E "(< HTTP|404|500|200)"

echo -e "\n5. Checking if file was updated:"
docker exec guardant-admin-api ls -la /app/services/api-admin/src/index.ts

echo -e "\n6. Checking container's last restart time:"
docker inspect guardant-admin-api | grep -A 2 "StartedAt"

echo -e "\n7. Force rebuilding the image:"
echo "Stopping container..."
$DOCKER_COMPOSE stop admin-api

echo "Removing old image..."
docker images | grep guardant | grep admin-api | awk '{print $3}' | xargs -r docker rmi -f

echo "Rebuilding..."
$DOCKER_COMPOSE build --no-cache admin-api

echo "Starting..."
$DOCKER_COMPOSE up -d admin-api

echo -e "\n8. Waiting for service to start..."
sleep 5

echo -e "\n9. Final check - looking for the endpoint again:"
docker exec guardant-admin-api grep -n "/api/admin/services/create" /app/services/api-admin/src/index.ts || echo "Still not found!"

echo -e "\n10. Last 50 lines of logs:"
docker logs guardant-admin-api --tail 50