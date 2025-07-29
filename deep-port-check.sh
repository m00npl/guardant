#!/bin/bash

echo "🔍 Głęboka diagnostyka portu 3002"

# 1. Sprawdź wszystkie procesy na hoście
echo -e "\n1. Procesy na hoście używające portu 3002:"
sudo lsof -i :3002 -P -n | grep LISTEN || echo "Brak procesów na hoście"
sudo ss -tlnp | grep :3002 || echo "ss: brak procesów"

# 2. Sprawdź wszystkie kontenery Docker
echo -e "\n2. Wszystkie kontenery Docker:"
docker ps -a --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}"

# 3. Sprawdź sieć Docker
echo -e "\n3. Inspekcja sieci Docker dla port 3002:"
docker network inspect bridge | grep -B5 -A5 3002 || echo "Brak w sieci bridge"
docker network inspect guardant_guardant-network | grep -B5 -A5 3002 || echo "Brak w sieci guardant"

# 4. Sprawdź iptables/netfilter
echo -e "\n4. Reguły iptables dla portu 3002:"
sudo iptables -L -n | grep 3002 || echo "Brak reguł iptables"

# 5. Spróbuj uruchomić prosty serwer na porcie 3002 bezpośrednio
echo -e "\n5. Test bezpośredniego bindowania na porcie 3002:"
timeout 2 python3 -m http.server 3002 2>&1 | head -5 || echo "Python server test zakończony"

# 6. Sprawdź czy port jest zajęty w namespace Docker
echo -e "\n6. Sprawdzanie namespace Docker:"
docker run --rm --network host alpine sh -c "apk add --no-cache lsof && lsof -i :3002" 2>&1 || echo "Namespace test failed"

# 7. Spróbuj z innym runtime
echo -e "\n7. Test z Node.js zamiast Bun:"
cat > /tmp/test-node-server.js << 'EOF'
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('OK');
});
server.listen(3002, '0.0.0.0', () => {
  console.log('Node server listening on 3002');
});
server.on('error', (err) => {
  console.error('Node server error:', err);
});
EOF

docker run --rm -v /tmp/test-node-server.js:/test.js --network guardant_guardant-network node:alpine node /test.js 2>&1 &
NODE_PID=$!
sleep 3
kill $NODE_PID 2>/dev/null || true

# 8. Sprawdź czy to problem z Bun
echo -e "\n8. Test Bun z różnymi konfiguracjami:"
docker exec guardant-admin-api bun --version || echo "Bun nie dostępny"

# 9. Sprawdź uprawnienia
echo -e "\n9. Uprawnienia w kontenerze:"
docker run --rm --network guardant_guardant-network guardant-admin-api sh -c "id && ls -la /app/services/api-admin/src/" | head -10