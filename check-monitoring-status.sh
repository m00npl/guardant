#!/bin/bash

echo "🔍 Sprawdzenie statusu monitoringu"

# 1. Check worker logs for monitoring activity
echo -e "\n1. Logi workerów (monitoring activity):"
docker logs guardant-monitoring-worker-1 --tail 50 2>&1 | grep -E "(monitoring|check|service|moon)"

# 2. Check Redis for monitoring data
echo -e "\n2. Dane monitoringu w Redis:"
docker exec guardant-redis redis-cli KEYS "*monitoring*" | head -10
docker exec guardant-redis redis-cli KEYS "*metrics*" | head -10
docker exec guardant-redis redis-cli KEYS "*status*" | head -10

# 3. Check RabbitMQ queues
echo -e "\n3. Kolejki RabbitMQ:"
docker exec guardant-rabbitmq rabbitmqctl list_queues name messages consumers

# 4. Check if admin-api is publishing monitoring tasks
echo -e "\n4. Logi admin-api (publishing tasks):"
docker logs guardant-admin-api --tail 30 2>&1 | grep -E "(monitoring|publish|rabbit|queue)"