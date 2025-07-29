#!/bin/bash

echo "🔍 Szukanie konfliktu na porcie 3002"

# 1. Sprawdź wszystkie kontenery Docker
echo "1. Kontenery Docker używające portu 3002:"
docker ps -a | grep -E "3002|admin" || echo "Brak kontenerów z portem 3002"

# 2. Sprawdź mapowania portów
echo -e "\n2. Mapowania portów Docker:"
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -E "3002|PORTS" || echo "Brak mapowań"

# 3. Sprawdź procesy systemowe
echo -e "\n3. Procesy systemowe na porcie 3002:"
sudo lsof -i :3002 2>/dev/null || echo "lsof nie znalazł procesów"
sudo netstat -tlnp | grep :3002 2>/dev/null || echo "netstat nie znalazł procesów"
sudo ss -tlnp | grep :3002 2>/dev/null || echo "ss nie znalazł procesów"

# 4. Zatrzymaj wszystkie kontenery guardant
echo -e "\n4. Zatrzymywanie wszystkich kontenerów guardant..."
docker compose down

# 5. Sprawdź ponownie
echo -e "\n5. Sprawdzanie po zatrzymaniu:"
sudo lsof -i :3002 2>/dev/null || echo "Port 3002 teraz wolny"

# 6. Sprawdź docker-compose port mapping
echo -e "\n6. Sprawdzanie mapowania portów w docker-compose.yml:"
grep -A5 "admin-api:" docker-compose.yml | grep -E "ports:|4040:3002"

# 7. Problem: admin-api jest zmapowany na 4040:3002
echo -e "\n7. ⚠️  Znaleziono problem: admin-api jest zmapowany na port 4040, nie 3002!"
echo "   docker-compose.yml ma: 4040:3002"
echo "   nginx próbuje połączyć się z admin-api:3002"

# 8. Rozwiązanie: zaktualizuj nginx aby używał właściwego portu wewnętrznego
echo -e "\n8. Naprawianie konfiguracji nginx..."
docker exec guardant-nginx-proxy cat /etc/nginx/conf.d/default.conf | grep "proxy_pass.*admin-api"

# 9. Port 3002 jest portem WEWNĘTRZNYM kontenera, nginx powinien go używać
echo -e "\n9. ✅ Nginx powinien używać admin-api:3002 (port wewnętrzny)"
echo "   Problem może być z uruchomieniem serwera wewnątrz kontenera"

# 10. Sprawdź czy serwer faktycznie startuje
echo -e "\n10. Sprawdzanie czy serwer startuje w kontenerze:"
docker logs guardant-admin-api --tail 50 2>&1

# 11. Restart wszystkich serwisów
echo -e "\n11. Restartowanie wszystkich serwisów..."
docker compose down
docker compose up -d

# 12. Czekaj i sprawdź ponownie
echo -e "\n12. Czekanie na start (15 sekund)..."
sleep 15

echo -e "\n13. Status końcowy:"
docker ps | grep -E "admin-api|nginx-proxy"
docker logs guardant-admin-api --tail 20 2>&1 | grep -E "(started|listening|error|Error)"