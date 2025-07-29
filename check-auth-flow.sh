#!/bin/bash

echo "🔍 Sprawdzanie przepływu autentykacji"

# Test bezpośrednio w kontenerze z debugowaniem
echo "1. Test z debugowaniem middleware:"
docker exec guardant-admin-api sh -c "cat > /tmp/test-auth.js << 'EOF'
const http = require('http');

const token = '$1';

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/admin/services/create',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

const body = JSON.stringify({
  name: 'Test Service',
  type: 'web',
  target: 'https://example.com',
  interval: 60,
  monitoring: { regions: ['eu-west-1'], strategy: 'closest' },
  notifications: { webhooks: [], emails: [] }
});

req.write(body);
req.end();
EOF
node /tmp/test-auth.js"

# Sprawdź logi kontenera
echo -e "\n2. Ostatnie logi admin-api:"
docker logs guardant-admin-api --tail 30 | grep -E "(Auth|auth|nest|Nest|error|Error)" || echo "No relevant logs"

# Test przez curl z verbose
echo -e "\n3. Test z verbose:"
TOKEN=$(curl -s -X POST https://guardant.me/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"moon.pl.kr@gmail.com","password":"changeThisPassword123!"}' | jq -r '.data.tokens.accessToken')

curl -v -X POST https://guardant.me/api/admin/services/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Service",
    "type": "web", 
    "target": "https://example.com",
    "interval": 60,
    "monitoring": {"regions": ["eu-west-1"], "strategy": "closest"},
    "notifications": {"webhooks": [], "emails": []}
  }' 2>&1 | grep -E "(< HTTP|< |> |{)"