#!/bin/bash

echo "🔍 Sprawdzanie konfliktów portów"

# Sprawdź co używa portu 3001
echo -e "\n1. Co używa portu 3001:"
sudo lsof -i :3001 || echo "Port 3001 wydaje się być wolny"

# Sprawdź procesy docker
echo -e "\n2. Kontenery docker:"
docker ps | grep -E "(admin-api|3001|4040)"

# Zatrzymaj i usuń stary kontener
echo -e "\n3. Zatrzymywanie starego kontenera:"
docker stop guardant-admin-api
docker rm guardant-admin-api

# Sprawdź ponownie
echo -e "\n4. Sprawdzanie po zatrzymaniu:"
sudo lsof -i :3001 || echo "Port 3001 teraz wolny"

# Uruchom ponownie
echo -e "\n5. Uruchamianie na nowo:"
docker compose up -d admin-api

# Poczekaj
sleep 5

# Sprawdź logi
echo -e "\n6. Nowe logi:"
docker logs guardant-admin-api --tail 20