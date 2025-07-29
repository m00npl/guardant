#!/bin/bash

echo "🔍 Bezpośrednie testy"

# 1. Test bezpośrednio do kontenera (omijając nginx)
echo "1. Port admin-api:"
docker port guardant-admin-api

echo -e "\n2. Test bezpośrednio do kontenera na porcie 3002:"
docker exec guardant-admin-api wget -qO- http://localhost:3002/api/admin/ || echo "wget failed"

echo -e "\n3. Sprawdź na jakim porcie naprawdę działa:"
REAL_PORT=$(docker exec guardant-admin-api cat /tmp/admin-api-port.txt 2>/dev/null || echo "3002")
echo "Real port: $REAL_PORT"

echo -e "\n4. Test na rzeczywistym porcie:"
docker exec guardant-admin-api wget -qO- "http://localhost:$REAL_PORT/" | head -5

echo -e "\n5. Test endpointu API na rzeczywistym porcie:"
docker exec guardant-admin-api wget -qO- "http://localhost:$REAL_PORT/api/admin/" | head -5

echo -e "\n6. Sprawdź procesy w kontenerze:"
docker exec guardant-admin-api ps aux | grep -E "(bun|node)" | grep -v grep

echo -e "\n7. Sprawdź logi startowe:"
docker logs guardant-admin-api 2>&1 | grep -E "(Server started|port|Port)" | tail -10

echo -e "\n8. Test nginx -> admin-api:"
docker exec guardant-nginx-proxy wget -qO- http://admin-api:3002/api/admin/ 2>&1 || echo "Connection failed"

echo -e "\n9. Sprawdź konfigurację nginx:"
docker exec guardant-nginx-proxy cat /etc/nginx/conf.d/default.conf | grep -A3 "location /api/admin"