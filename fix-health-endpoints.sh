#!/bin/bash

echo "🔧 Naprawianie health endpoints"

# 1. Najpierw utwórz tabele
echo -e "\n1. Inicjalizacja bazy danych:"
./init-database.sh

# 2. Odblokuj konta
echo -e "\n2. Odblokowywanie kont:"
docker exec guardant-redis redis-cli FLUSHDB

# 3. Restart admin-api
echo -e "\n3. Restart admin-api:"
docker compose restart admin-api

# 4. Czekaj
echo -e "\n4. Czekanie na restart (15 sekund)..."
sleep 15

# 5. Sprawdź logi
echo -e "\n5. Sprawdzanie logów po restarcie:"
docker logs guardant-admin-api --tail 30 2>&1 | grep -E "(Started|started|Error|error|health)"

# 6. Test endpoints
echo -e "\n6. Test health endpoints:"
echo "Direct health (4040):"
curl -s http://localhost:4040/health
echo -e "\n\nProxied health (8080):"
curl -s http://localhost:8080/health
echo -e "\n\nAdmin health (8080):"
curl -s http://localhost:8080/api/admin/health