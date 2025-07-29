#!/bin/bash

echo "🔍 Śledzenie przepływu logowania"

# 1. Restart dla czystych logów
echo -e "\n1. Restart admin-api dla świeżych logów:"
docker compose restart admin-api
sleep 10

# 2. Sprawdź czy hash jest poprawny
echo -e "\n2. Test hash lokalnie:"
cat > /tmp/verify-hash.js << 'EOF'
const bcrypt = require('bcryptjs');
const password = 'Tola2025!';
const hash = '$2b$10$YQtPbV/CEOpMlDQBr0Lw5eNfPFz1eSgNjJlAQQxXRhPPdrizfKCni';

console.log('Password:', password);
console.log('Hash:', hash);

bcrypt.compare(password, hash, (err, result) => {
  if (err) {
    console.log('Error:', err);
  } else {
    console.log('Match:', result);
  }
});

// Also test with sync
const syncResult = bcrypt.compareSync(password, hash);
console.log('Sync match:', syncResult);
EOF

docker run --rm -v /tmp/verify-hash.js:/verify.js node:alpine sh -c "npm install bcryptjs >/dev/null 2>&1 && node /verify.js"

# 3. Dodaj więcej logowania do kodu
echo -e "\n3. Sprawdzanie implementacji login w auth-manager:"
grep -A20 "const isValidPassword" packages/auth-system/src/auth-manager.ts

# 4. Test z curl i śledź logi
echo -e "\n4. Test logowania ze śledzeniem logów:"
(docker logs -f guardant-admin-api 2>&1 | grep -E "(login|auth|password|user|credentials)" &) 

sleep 2

curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}' | jq .

sleep 3
pkill -f "docker logs -f"

# 5. Sprawdź ostatni auth attempt
echo -e "\n5. Ostatni auth attempt w Redis:"
ATTEMPT_ID=$(docker exec guardant-redis redis-cli ZRANGE "auth:attempts:email:admin@guardant.me" -1 -1)
if [ -n "$ATTEMPT_ID" ]; then
  echo "Attempt ID: $ATTEMPT_ID"
  docker exec guardant-redis redis-cli GET "auth:attempt:$ATTEMPT_ID" | jq .
fi

# 6. Test bezpośrednio w kontenerze
echo -e "\n6. Test hash w kontenerze admin-api:"
docker exec guardant-admin-api sh -c 'cat > /tmp/test-bcrypt.js << "EOF"
const bcrypt = require("bcrypt");
const password = "Tola2025!";
const hash = "$2b$10$YQtPbV/CEOpMlDQBr0Lw5eNfPFz1eSgNjJlAQQxXRhPPdrizfKCni";

console.log("Testing in container:");
console.log("Password:", password);
console.log("Hash:", hash);

bcrypt.compare(password, hash).then(result => {
  console.log("Result:", result);
}).catch(err => {
  console.log("Error:", err);
});
EOF
node /tmp/test-bcrypt.js'

# 7. Sprawdź wersje bcrypt
echo -e "\n7. Wersje bcrypt:"
echo "W node_modules:"
docker exec guardant-admin-api ls -la node_modules | grep bcrypt
echo -e "\nPackage.json:"
grep bcrypt packages/auth-system/package.json services/api-admin/package.json 2>/dev/null || echo "No bcrypt in package.json"