#!/bin/bash

echo "🔧 Przebudowywanie kontenerów z narzędziami diagnostycznymi"

# 1. Zatrzymaj kontenery
echo -e "\n1. Zatrzymywanie kontenerów..."
docker compose down

# 2. Usuń stare obrazy
echo -e "\n2. Usuwanie starych obrazów..."
docker rmi guardant-admin-api guardant-nginx-proxy 2>/dev/null || true

# 3. Przebuduj z narzędziami
echo -e "\n3. Budowanie z narzędziami diagnostycznymi..."
docker compose build --no-cache admin-api nginx-proxy

# 4. Uruchom
echo -e "\n4. Uruchamianie kontenerów..."
docker compose up -d

# 5. Czekaj na start
echo -e "\n5. Czekanie na start (20 sekund)..."
sleep 20

# 6. Sprawdź czy ps działa
echo -e "\n6. Test narzędzi diagnostycznych w admin-api:"
docker exec guardant-admin-api ps aux | head -5 || echo "ps nie działa"
docker exec guardant-admin-api netstat -tlnp | grep LISTEN || echo "netstat nie działa"

echo -e "\n7. Test narzędzi diagnostycznych w nginx:"
docker exec guardant-nginx-proxy ps aux | head -5 || echo "ps nie działa"
docker exec guardant-nginx-proxy netstat -tlnp | grep LISTEN || echo "netstat nie działa"

# 8. Sprawdź porty
echo -e "\n8. Sprawdzanie portów w admin-api:"
docker exec guardant-admin-api lsof -i :3002 || echo "Port 3002 wolny"
docker exec guardant-admin-api ps aux | grep bun

# 9. Logi
echo -e "\n9. Ostatnie logi admin-api:"
docker logs guardant-admin-api --tail 30 2>&1 | grep -E "(Server started|port|Port|Error)"