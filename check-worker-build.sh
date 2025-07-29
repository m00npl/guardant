#!/bin/bash

echo "🔍 Sprawdzenie budowania i startu workerów"

# 1. Check if containers are running
echo -e "\n1. Status kontenerów:"
docker ps -a | grep monitoring-worker

# 2. Check build logs
echo -e "\n2. Budowanie workerów z verbose:"
docker compose build --no-cache monitoring-worker

# 3. Try to run one worker interactively
echo -e "\n3. Uruchomienie workera interaktywnie:"
docker compose run --rm monitoring-worker bun run src/index.ts