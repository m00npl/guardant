#!/bin/bash

echo "=== Debugging Nginx Proxy Manager Connection ==="
echo

echo "1. Testing direct connection to GuardAnt nginx proxy:"
curl -v -H "Host: guardant.me" http://localhost:8080/health
echo

echo "2. Testing connection with timeout settings:"
curl -v --connect-timeout 10 --max-time 30 -H "Host: guardant.me" http://localhost:8080/
echo

echo "3. Checking if nginx proxy manager can reach the application:"
echo "Run this from nginx proxy manager container:"
echo "docker exec [npm-container-name] curl -v http://138.201.141.229:8080/health"
echo

echo "4. Testing network connectivity between containers:"
echo "docker network ls"
docker network ls
echo

echo "5. Checking GuardAnt network details:"
echo "docker network inspect guardant_guardant-network"
docker network inspect guardant_guardant-network 2>/dev/null || docker network inspect guardant-network 2>/dev/null
echo

echo "6. Current nginx proxy logs:"
echo "docker compose logs nginx-proxy --tail=20"
docker compose logs nginx-proxy --tail=20
echo

echo "=== Recommendations ==="
echo "1. In Nginx Proxy Manager, use the configuration from nginx-proxy-manager-config.txt"
echo "2. Enable 'Websockets Support' in the proxy host settings"
echo "3. Try using the docker network IP instead of the host IP"
echo "4. Check if NPM container is on the same network as GuardAnt"