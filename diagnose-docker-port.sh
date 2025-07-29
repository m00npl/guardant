#!/bin/bash

echo "🔍 Diagnozowanie problemu z portem w Docker"

# 1. Sprawdź port na hoście
echo -e "\n1. Port 3002 na hoście:"
sudo lsof -i :3002 || echo "Port 3002 wolny na hoście"

# 2. Sprawdź sieć Docker
echo -e "\n2. Sieci Docker:"
docker network ls | grep guardant

# 3. Sprawdź czy są zawieszające się kontenery
echo -e "\n3. Wszystkie kontenery (włącznie z zatrzymanymi):"
docker ps -a | grep guardant

# 4. Wyczyść zawieszające się kontenery
echo -e "\n4. Czyszczenie zawieszeń Docker..."
docker container prune -f

# 5. Restart Docker (jeśli potrzebny)
echo -e "\n5. Czy zrestartować Docker daemon? (y/n)"
read -r response
if [[ "$response" == "y" ]]; then
    echo "Restartowanie Docker..."
    sudo systemctl restart docker || sudo service docker restart
    sleep 10
    echo "Docker zrestartowany"
fi

# 6. Usuń i odtwórz sieć
echo -e "\n6. Odtwarzanie sieci Docker..."
docker network rm guardant_guardant-network 2>/dev/null || true
docker network create guardant_guardant-network

# 7. Spróbuj uruchomić tylko admin-api
echo -e "\n7. Uruchamianie tylko admin-api..."
docker compose up -d admin-api

# 8. Sprawdź logi
echo -e "\n8. Czekanie 10 sekund..."
sleep 10

echo -e "\n9. Status kontenera:"
docker ps -a | grep admin-api

echo -e "\n10. Ostatnie logi:"
docker logs guardant-admin-api --tail 50 2>&1