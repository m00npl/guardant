#!/bin/bash

echo "🔄 Rebuilding Admin API service..."

# Stop the service
docker-compose stop admin-api

# Remove the container
docker-compose rm -f admin-api

# Rebuild with no cache
docker-compose build --no-cache admin-api

# Start the service
docker-compose up -d admin-api

echo "✅ Admin API rebuilt and restarted"
echo "📋 Checking logs..."
docker logs guardant-admin-api --tail 50