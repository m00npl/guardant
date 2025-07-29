#!/bin/bash

echo "🔍 Szczegółowe testowanie przepływu autoryzacji"

# 1. Restart admin-api z nowymi logami
echo -e "\n1. Restart admin-api..."
docker compose restart admin-api
sleep 10

# 2. Clear logs and start monitoring
echo -e "\n2. Monitorowanie logów..."
docker logs guardant-admin-api --tail 0 -f > /tmp/auth-flow.log 2>&1 &
LOG_PID=$!
sleep 2

# 3. Login
echo -e "\n3. Logowanie..."
RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}')

TOKEN=$(echo "$RESPONSE" | jq -r '.data.tokens.accessToken')
echo "Token otrzymany: ${TOKEN:0:50}..."

# 4. Test simple endpoint first
echo -e "\n4. Test /api/admin/services/list..."
LIST_RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/services/list \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "List response:"
echo "$LIST_RESPONSE" | jq .

# 5. Wait and stop logging
sleep 3
kill $LOG_PID 2>/dev/null

# 6. Analyze logs
echo -e "\n5. Analiza logów - cały przepływ middleware:"
echo "=== LOGIN REQUEST ==="
grep -A 5 -B 5 "/auth/login" /tmp/auth-flow.log | tail -20

echo -e "\n=== SERVICES/LIST REQUEST ==="
grep -A 10 -B 5 "/services/list" /tmp/auth-flow.log | tail -30

echo -e "\n=== ALL MIDDLEWARE LOGS ==="
grep -E "(🔐|🔒|🔓|✅|❌)" /tmp/auth-flow.log

# Clean up
rm -f /tmp/auth-flow.log