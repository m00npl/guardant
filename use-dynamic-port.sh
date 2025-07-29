#!/bin/bash

echo "🔄 Używanie dynamicznego portu dla admin-api"

# 1. Zatrzymaj wszystko
echo -e "\n1. Zatrzymywanie kontenerów..."
docker compose down

# 2. Zmień konfigurację na dynamiczny port
echo -e "\n2. Modyfikowanie docker-compose.yml dla dynamicznego portu..."

# Backup
cp docker-compose.yml docker-compose.yml.backup-dynamic

# Usuń stały port i dodaj USE_DYNAMIC_PORT
cat > docker-compose-patch.yml << 'EOF'
  admin-api:
    container_name: guardant-admin-api
    build:
      context: .
      dockerfile: services/api-admin/Dockerfile
    ports:
      - "4040:0"  # Dynamic port
    environment:
      - NODE_ENV=production
      - PORT=0  # Let Bun choose
      - USE_DYNAMIC_PORT=true
      - HOSTNAME=0.0.0.0
      - BUN_CONFIG_NO_CLEAR_TERMINAL=1
      - DATABASE_URL=postgresql://guardant:guardant123@postgres:5432/guardant
      - REDIS_URL=redis://redis:6379
      - RABBITMQ_URL=amqp://guardant:guardant123@rabbitmq:5672
      - VAULT_ENABLED=true
      - VAULT_ADDR=http://vault:8200
      - VAULT_TOKEN=${VAULT_TOKEN:-}
      - JWT_SECRET=${JWT_SECRET:-your-super-secret-jwt-key-change-this-in-production}
      - REFRESH_SECRET=${REFRESH_SECRET:-your-super-secret-refresh-key-change-this-in-production}
      - GOLEM_PRIVATE_KEY_PATH=/config/golembase/private.key
EOF

# 3. Uruchom z dynamicznym portem
echo -e "\n3. Budowanie i uruchamianie..."
docker compose build admin-api
docker compose up -d admin-api

# 4. Czekaj aż się uruchomi
echo -e "\n4. Czekanie na start (15 sekund)..."
sleep 15

# 5. Znajdź faktyczny port
echo -e "\n5. Szukanie faktycznego portu..."
ACTUAL_PORT=$(docker logs guardant-admin-api 2>&1 | grep -oP "Server is running on DYNAMIC PORT \K\d+" | tail -1)

if [ -z "$ACTUAL_PORT" ]; then
    echo "❌ Nie mogę znaleźć portu dynamicznego"
    docker logs guardant-admin-api --tail 30
else
    echo "✅ Admin API działa na porcie: $ACTUAL_PORT"
    
    # 6. Zaktualizuj nginx
    echo -e "\n6. Aktualizacja nginx dla portu $ACTUAL_PORT..."
    docker exec guardant-nginx-proxy sed -i "s/admin-api:[0-9]*/admin-api:$ACTUAL_PORT/g" /etc/nginx/conf.d/default.conf
    docker exec guardant-nginx-proxy nginx -s reload
    
    # 7. Test
    echo -e "\n7. Test endpointu:"
    curl -s http://localhost:8080/api/admin/health || echo "Health check failed"
fi