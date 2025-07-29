#!/bin/bash

echo "🔍 Debugowanie podwójnego startu"

# 1. Sprawdź CMD w Dockerfile
echo -e "\n1. CMD w Dockerfile:"
grep -n "CMD\|ENTRYPOINT" services/api-admin/Dockerfile

# 2. Sprawdź procesy w kontenerze
echo -e "\n2. Procesy w kontenerze admin-api:"
docker exec guardant-admin-api ps aux | grep -E "(bun|node)" || echo "Kontener nie działa"

# 3. Sprawdź pełne logi od początku
echo -e "\n3. Pełne logi admin-api:"
docker logs guardant-admin-api 2>&1 | head -100

# 4. Sprawdź czy nie ma podwójnego importu
echo -e "\n4. Sprawdzanie podwójnego importu w index.ts:"
docker exec guardant-admin-api grep -n "startServer\|serve\|listen" src/index.ts | tail -20

# 5. Sprawdź docker-compose command
echo -e "\n5. Command w docker-compose:"
grep -A5 -B5 "admin-api:" docker-compose.yml | grep -E "(command:|CMD)"