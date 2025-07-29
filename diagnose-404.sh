#!/bin/bash

echo "🔍 Diagnozowanie problemu 404 dla /api/admin/services/create"

# 1. Sprawdź czy admin-api działa
echo -e "\n1. Sprawdzanie czy admin-api działa:"
docker ps | grep admin-api

# 2. Sprawdź logi nginx dla tego endpointu
echo -e "\n2. Ostatnie requesty do services/create w nginx:"
docker logs guardant-nginx-proxy 2>&1 | grep "services/create" | tail -5

# 3. Sprawdź co dokładnie jest w kontenerze admin-api
echo -e "\n3. Sprawdzanie endpointów w kontenerze admin-api:"
docker exec guardant-admin-api sh -c 'grep -n "services/create" /app/services/api-admin/src/index.ts'

# 4. Test bezpośrednio do kontenera admin-api (omijając nginx)
echo -e "\n4. Test bezpośrednio do admin-api (port 3001):"
docker exec guardant-admin-api sh -c 'curl -X POST http://localhost:3001/api/admin/services/create -H "Content-Type: application/json" -d "{}" -w "\nStatus: %{http_code}\n" -s'

# 5. Sprawdź konfigurację nginx
echo -e "\n5. Konfiguracja nginx dla /api/admin:"
docker exec guardant-nginx-proxy cat /etc/nginx/conf.d/default.conf | grep -A 5 "location /api/admin"

# 6. Test przez nginx
echo -e "\n6. Test przez nginx wewnątrz sieci docker:"
docker exec guardant-nginx-proxy sh -c 'curl -X POST http://admin-api:3001/api/admin/services/create -H "Content-Type: application/json" -d "{}" -w "\nStatus: %{http_code}\n" -s'

# 7. Sprawdź wszystkie endpointy POST w admin-api
echo -e "\n7. Wszystkie endpointy POST w admin-api:"
docker exec guardant-admin-api sh -c 'grep "app.post" /app/services/api-admin/src/index.ts | grep -E "(auth|services)" | head -10'

# 8. Sprawdź datę modyfikacji pliku
echo -e "\n8. Data modyfikacji index.ts w kontenerze:"
docker exec guardant-admin-api stat /app/services/api-admin/src/index.ts | grep "Modify"