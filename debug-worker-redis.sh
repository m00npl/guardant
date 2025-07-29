#!/bin/bash

echo "🔍 Debug worker Redis connection"

# 1. Check if workers are using new code
echo -e "\n1. Sprawdzenie ostatniego builda workerów:"
docker images guardant-monitoring-worker --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}"

# 2. Check worker environment
echo -e "\n2. Zmienne środowiskowe workera:"
docker compose exec monitoring-worker-1 env | grep -E "(REDIS|RABBIT)" || echo "Cannot exec into worker"

# 3. Check logs with more context
echo -e "\n3. Logi startowe workera:"
docker logs guardant-monitoring-worker-1 --tail 50 2>&1 | head -30

# 4. Rebuild workers
echo -e "\n4. Przebudowa workerów..."
docker compose build monitoring-worker

# 5. Restart workers
echo -e "\n5. Restart workerów..."
docker compose up -d monitoring-worker

# 6. Wait and check new logs
echo -e "\n6. Czekanie 10 sekund..."
sleep 10

echo -e "\n7. Nowe logi:"
docker logs guardant-monitoring-worker-1 --tail 20 2>&1