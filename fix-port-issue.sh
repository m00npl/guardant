#!/bin/bash

echo "🔧 Naprawianie problemu z portem"

# 1. Zatrzymaj wszystko
echo "1. Zatrzymywanie kontenerów..."
docker compose down

# 2. Sprawdź co używa portu 3002
echo -e "\n2. Sprawdzanie portu 3002:"
sudo lsof -i :3002 || echo "Port 3002 wolny"
sudo netstat -tulpn | grep 3002 || echo "Brak procesów na porcie 3002"

# 3. Usuń stare obrazy
echo -e "\n3. Usuwanie starych obrazów..."
docker rmi guardant-admin-api:latest 2>/dev/null || true
docker rmi $(docker images -f "dangling=true" -q) 2>/dev/null || true

# 4. Buduj od nowa
echo -e "\n4. Budowanie od nowa..."
docker compose build --no-cache admin-api

# 5. Uruchom z czystym środowiskiem
echo -e "\n5. Uruchamianie..."
docker compose up -d admin-api nginx-proxy

# 6. Czekaj i sprawdź
sleep 10

echo -e "\n6. Sprawdzanie statusu:"
docker ps | grep -E "(admin-api|nginx)" 

echo -e "\n7. Sprawdzanie logów:"
docker logs guardant-admin-api --tail 20 | grep -E "(port|Port|Server started)"

echo -e "\n8. Test połączenia:"
curl -s https://guardant.me/api/admin/ | jq '.' || echo "Connection failed"