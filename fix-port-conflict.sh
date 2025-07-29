#!/bin/bash

echo "🔧 Naprawianie konfliktu portów"

# 1. Sprawdź co używa portu 3002 na hoście
echo -e "\n1. Sprawdzanie portu 3002 na hoście:"
sudo lsof -i :3002 2>/dev/null || echo "Port 3002 wolny na hoście"
sudo netstat -tlnp | grep :3002 2>/dev/null || echo "Netstat: port 3002 wolny"

# 2. Sprawdź wszystkie kontenery
echo -e "\n2. Sprawdzanie kontenerów Docker:"
docker ps -a | grep -E "3002|admin-api" || echo "Brak kontenerów"

# 3. Zatrzymaj wszystko
echo -e "\n3. Zatrzymywanie wszystkich kontenerów guardant..."
docker compose down

# 4. Zmień port na 3005 (mniej popularny)
echo -e "\n4. Zmieniamy konfigurację na port 3005..."

# Backup docker-compose.yml
cp docker-compose.yml docker-compose.yml.backup

# Zmień port w docker-compose.yml
sed -i 's/4040:3002/4040:3005/g' docker-compose.yml
sed -i 's/PORT=3002/PORT=3005/g' docker-compose.yml

# Zmień port w nginx config
sed -i 's/admin-api:3002/admin-api:3005/g' nginx/default.conf

echo -e "\n5. Sprawdzanie zmian:"
echo "docker-compose.yml:"
grep -A2 -B2 "PORT=" docker-compose.yml | grep -E "(PORT=|4040:)"
echo -e "\nnginx/default.conf:"
grep "admin-api:" nginx/default.conf

# 6. Przebuduj i uruchom
echo -e "\n6. Przebudowywanie kontenerów..."
docker compose build admin-api nginx-proxy

echo -e "\n7. Uruchamianie z nowym portem..."
docker compose up -d

# 8. Czekaj i sprawdź
echo -e "\n8. Czekanie na start (20 sekund)..."
sleep 20

echo -e "\n9. Sprawdzanie statusu:"
docker ps | grep -E "admin-api|nginx"
echo -e "\n10. Logi admin-api:"
docker logs guardant-admin-api --tail 30 2>&1 | grep -E "(Server started|port|Port|Error|error)"

echo -e "\n11. Test endpointu:"
curl -s http://localhost:8080/api/admin/health || echo "Health check failed"