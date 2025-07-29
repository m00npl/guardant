#!/bin/bash

echo "🔍 Debugowanie problemu z serwerem Bun"

# 1. Sprawdź logi dokładnie
echo -e "\n1. Pełne logi z ostatnich 100 linii:"
docker logs guardant-admin-api --tail 100 2>&1

# 2. Sprawdź zmienne środowiskowe
echo -e "\n2. Zmienne środowiskowe w kontenerze:"
docker exec guardant-admin-api env | grep -E "(PORT|HOST|BUN)" | sort

# 3. Sprawdź czy port jest wolny WEWNĄTRZ kontenera
echo -e "\n3. Sprawdzanie portów wewnątrz kontenera:"
docker exec guardant-admin-api sh -c "netstat -tlnp 2>/dev/null || ss -tlnp 2>/dev/null || echo 'No netstat/ss'"
docker exec guardant-admin-api sh -c "lsof -i :3002 2>/dev/null || echo 'Port 3002 wolny'"

# 4. Spróbuj uruchomić prosty serwer testowy
echo -e "\n4. Test prostego serwera Bun:"
docker exec guardant-admin-api sh -c 'cat > /tmp/test-server.js << EOF
const server = Bun.serve({
  port: 3002,
  hostname: "0.0.0.0",
  fetch(req) {
    return new Response("Test OK");
  },
});
console.log("Test server running on", server.port);
EOF'

docker exec guardant-admin-api timeout 5 bun run /tmp/test-server.js 2>&1 || echo "Test zakończony"

# 5. Sprawdź wersję Bun
echo -e "\n5. Wersja Bun:"
docker exec guardant-admin-api bun --version

# 6. Sprawdź uprawnienia
echo -e "\n6. Uprawnienia i użytkownik:"
docker exec guardant-admin-api sh -c "whoami && id"

# 7. Sprawdź konfigurację sieci Docker
echo -e "\n7. Konfiguracja sieci:"
docker network inspect guardant_guardant-network | grep -A10 "admin-api" | head -20

# 8. Test bezpośredniego połączenia
echo -e "\n8. Test połączenia między kontenerami:"
docker exec guardant-nginx-proxy sh -c "nc -zv admin-api 3002 2>&1 || echo 'Connection failed'"