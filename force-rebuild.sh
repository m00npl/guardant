#!/bin/bash

echo "🔄 Wymuszanie pełnej przebudowy admin-api"

# 1. Zatrzymaj kontener
echo "1. Zatrzymywanie kontenera..."
docker compose stop admin-api

# 2. Usuń kontener
echo -e "\n2. Usuwanie kontenera..."
docker compose rm -f admin-api

# 3. Usuń obraz
echo -e "\n3. Usuwanie obrazu..."
docker rmi guardant-admin-api 2>/dev/null || true
docker rmi $(docker images | grep "guardant.*admin-api" | awk '{print $3}') 2>/dev/null || true

# 4. Wyczyść cache buildera
echo -e "\n4. Czyszczenie cache Docker..."
docker builder prune -f

# 5. Buduj od zera
echo -e "\n5. Budowanie od zera..."
docker compose build --no-cache --pull admin-api

# 6. Uruchom
echo -e "\n6. Uruchamianie..."
docker compose up -d admin-api

# 7. Czekaj i sprawdź
echo -e "\n7. Czekanie na start..."
sleep 10

# 8. Sprawdź logi
echo -e "\n8. Sprawdzanie logów:"
docker logs guardant-admin-api --tail 30

# 9. Sprawdź czy linia z setupRoutes istnieje
echo -e "\n9. Sprawdzanie kodu w kontenerze:"
docker exec guardant-admin-api grep -n "setupRoutes" /app/services/api-admin/src/index.ts || echo "setupRoutes not found - good!"