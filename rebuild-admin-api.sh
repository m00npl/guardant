#!/bin/bash

echo "🔄 Rebuilding Admin API service..."

# Check if docker-compose or docker compose should be used
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

echo "📦 Using: $DOCKER_COMPOSE"

# Stop the service
$DOCKER_COMPOSE stop admin-api

# Remove the container
$DOCKER_COMPOSE rm -f admin-api

# Rebuild with no cache
$DOCKER_COMPOSE build --no-cache admin-api

# Start the service
$DOCKER_COMPOSE up -d admin-api

echo "✅ Admin API rebuilt and restarted"
echo "📋 Checking logs..."
docker logs guardant-admin-api --tail 50