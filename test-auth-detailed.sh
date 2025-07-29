#!/bin/bash

echo "🔍 Szczegółowe testowanie autoryzacji"

# 1. Restart admin-api dla świeżych logów
echo -e "\n1. Restart admin-api:"
docker compose restart admin-api
sleep 10

# 2. Test z pełnym logowaniem
echo -e "\n2. Test logowania z pełnym debugowaniem:"
curl -v -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}' 2>&1

# 3. Sprawdź logi po teście
echo -e "\n3. Logi po teście:"
docker logs guardant-admin-api --tail 50 2>&1 | grep -A10 -B10 "login"

# 4. Test czy dane są w Redis
echo -e "\n4. Dane w Redis:"
docker exec guardant-redis redis-cli GET "user:email:admin@guardant.me"

# 5. Test hash bezpośrednio
echo -e "\n5. Test weryfikacji hasła w kontenerze:"
cat > /tmp/test-hash.ts << 'EOF'
const testPassword = "Tola2025!";
const storedHash = "$2b$10$YQtPbV/CEOpMlDQBr0Lw5eNfPFz1eSgNjJlAQQxXRhPPdrizfKCni";

console.log("Testing password:", testPassword);
console.log("Against hash:", storedHash);

// Test z Bun
try {
  const bunResult = await Bun.password.verify(testPassword, storedHash);
  console.log("Bun verify result:", bunResult);
} catch (e) {
  console.log("Bun error:", e);
}

// Test z bcrypt
try {
  const bcrypt = require('bcrypt');
  const bcryptResult = await bcrypt.compare(testPassword, storedHash);
  console.log("Bcrypt verify result:", bcryptResult);
} catch (e) {
  console.log("Bcrypt error:", e);
}
EOF

docker cp /tmp/test-hash.ts guardant-admin-api:/tmp/test-hash.ts
docker exec guardant-admin-api bun run /tmp/test-hash.ts 2>&1

# 6. Sprawdź jak endpoint parsuje body
echo -e "\n6. Test z różnymi formatami body:"

# Test 1: Standard JSON
echo "Test 1: Standard JSON"
curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}' | jq .

# Test 2: URL encoded
echo -e "\nTest 2: URL encoded"
curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@guardant.me&password=Tola2025!" | jq .

# 7. Sprawdź middleware
echo -e "\n7. Sprawdzanie middleware w kodzie:"
grep -n "app.use.*json\|bodyParser" services/api-admin/src/index.ts || echo "No body parser found"