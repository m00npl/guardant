#!/bin/bash

echo "🔍 Sprawdzenie startu workera"

# 1. Stop workers
echo -e "\n1. Zatrzymanie workerów..."
docker compose stop monitoring-worker

# 2. Start one worker with logs
echo -e "\n2. Start jednego workera z pełnymi logami..."
docker compose run --rm monitoring-worker 2>&1 | head -50