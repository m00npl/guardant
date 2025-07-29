#!/bin/bash

echo "🔍 Sprawdzanie startu admin-api"

# 1. Status kontenera
echo "1. Status kontenera:"
docker ps -a | grep admin-api

# 2. Pełne logi
echo -e "\n2. Ostatnie 50 linii logów:"
docker logs guardant-admin-api --tail 50 2>&1

# 3. Sprawdź czy serwer nasłuchuje
echo -e "\n3. Sprawdzanie portów w kontenerze:"
docker exec guardant-admin-api sh -c "netstat -tlnp 2>/dev/null || ss -tlnp 2>/dev/null || echo 'No netstat/ss available'"

# 4. Test lokalny
echo -e "\n4. Test lokalny w kontenerze:"
docker exec guardant-admin-api sh -c "echo 'GET /health HTTP/1.1\nHost: localhost\n\n' | nc localhost 3002 2>&1 | head -10 || echo 'nc failed'"

# 5. Sprawdź zmienne środowiskowe
echo -e "\n5. Kluczowe zmienne środowiskowe:"
docker exec guardant-admin-api sh -c "env | grep -E '(JWT|SECRET|PORT)' | sort"

# 6. Test z zewnątrz
echo -e "\n6. Test przez Docker network:"
docker run --rm --network guardant-network alpine sh -c "wget -qO- http://admin-api:3002/health 2>&1 || echo 'Connection failed'"