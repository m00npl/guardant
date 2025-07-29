#!/bin/bash

echo "🔄 Zmiana portu admin-api na 3050"

# 1. Zatrzymaj wszystko
echo -e "\n1. Zatrzymywanie kontenerów..."
docker compose down

# 2. Backup
echo -e "\n2. Tworzenie kopii zapasowych..."
cp docker-compose.yml docker-compose.yml.backup-3050
cp nginx/default.conf nginx/default.conf.backup-3050

# 3. Zmień port w docker-compose.yml
echo -e "\n3. Zmiana portu na 3050 w docker-compose.yml..."
sed -i 's/PORT=3002/PORT=3050/g' docker-compose.yml
sed -i 's/4040:3002/4040:3050/g' docker-compose.yml
sed -i 's/EXPOSE 3002/EXPOSE 3050/g' services/api-admin/Dockerfile

# 4. Zmień w nginx
echo -e "\n4. Zmiana portu w nginx..."
sed -i 's/admin-api:3002/admin-api:3050/g' nginx/default.conf

# 5. Pokaż zmiany
echo -e "\n5. Zmiany w docker-compose.yml:"
grep -n "3050" docker-compose.yml || echo "Brak zmian?"
echo -e "\nZmiany w nginx/default.conf:"
grep -n "3050" nginx/default.conf || echo "Brak zmian?"

# 6. Przebuduj
echo -e "\n6. Przebudowa kontenerów..."
docker compose build admin-api nginx-proxy

# 7. Uruchom
echo -e "\n7. Uruchamianie..."
docker compose up -d

# 8. Czekaj
echo -e "\n8. Czekanie 20 sekund..."
sleep 20

# 9. Sprawdź
echo -e "\n9. Status:"
docker ps | grep -E "(admin-api|nginx)" || echo "Kontenery nie działają"

echo -e "\n10. Logi admin-api:"
docker logs guardant-admin-api --tail 40 2>&1 | grep -E "(Server started|port|Port|3050|Error)"

echo -e "\n11. Test połączenia:"
curl -s http://localhost:8080/api/admin/health -v 2>&1 | grep -E "(HTTP|health)" || echo "Test failed"