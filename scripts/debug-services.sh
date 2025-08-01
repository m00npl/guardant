#!/bin/bash

echo "🔍 Debugging services in scheduler..."
echo ""

# Get all service IDs
SERVICE_IDS=$(docker compose exec -T redis redis-cli hkeys "scheduler:services")

echo "Service IDs found:"
echo "$SERVICE_IDS"
echo ""

echo "Raw service data:"
echo "================="

for SERVICE_ID in $SERVICE_IDS; do
    echo "Service ID: $SERVICE_ID"
    SERVICE_DATA=$(docker compose exec -T redis redis-cli hget "scheduler:services" "$SERVICE_ID")
    echo "Data: $SERVICE_DATA"
    echo "---"
done