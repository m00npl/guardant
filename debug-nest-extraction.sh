#!/bin/bash

echo "🔍 Debug ekstrakcji nestId"

# Zaloguj się
echo -e "\n1. Logowanie..."
LOGIN_RESPONSE=$(curl -s -X POST https://guardant.me/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"moon.pl.kr@gmail.com","password":"changeThisPassword123!"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.tokens.accessToken' 2>/dev/null)
NEST_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.nest.id' 2>/dev/null)
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.id' 2>/dev/null)

echo "NestId z logowania: $NEST_ID"
echo "UserId z logowania: $USER_ID"

# Sprawdź co jest w tokenie
echo -e "\n2. Dekodowanie tokena (payload):"
echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq '.' || echo "Failed to decode"

# Test z debugowaniem
echo -e "\n3. Test endpoint z dodatkowym debugowaniem:"
docker exec guardant-admin-api sh -c "cat > /tmp/debug-service.js << 'EOF'
const axios = require('axios');

async function test() {
  try {
    const response = await axios.post('http://localhost:3001/api/admin/services/create', 
      {
        name: 'Test Service',
        type: 'web',
        target: 'https://example.com',
        interval: 60,
        monitoring: { regions: ['eu-west-1'], strategy: 'closest' },
        notifications: { webhooks: [], emails: [] }
      },
      {
        headers: {
          'Authorization': 'Bearer $TOKEN',
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Success:', response.data);
  } catch (error) {
    console.log('Error:', error.response?.data || error.message);
    console.log('Status:', error.response?.status);
  }
}

test();
EOF
node /tmp/debug-service.js 2>&1 || echo 'Node not available'"

# Sprawdź bezpośrednio w kodzie
echo -e "\n4. Sprawdzanie kodu extractNestId:"
docker exec guardant-admin-api grep -A 5 "extractNestId" /app/services/api-admin/src/index.ts

# Sprawdź getAuthUser
echo -e "\n5. Sprawdzanie importu getAuthUser:"
docker exec guardant-admin-api grep "getAuthUser" /app/services/api-admin/src/index.ts | head -5

# Test nest/profile endpoint
echo -e "\n6. Test /api/admin/nest/profile (powinien zwrócić dane nest):"
curl -X POST https://guardant.me/api/admin/nest/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '.' || echo "Failed"

# Sprawdź czy nest istnieje w Redis
echo -e "\n7. Sprawdzanie czy nest istnieje w Redis:"
docker exec guardant-admin-api sh -c "redis-cli -h redis get 'nest:$NEST_ID' | head -c 200"