#!/bin/bash

echo "Test logowania z różnymi metodami"

# Test 1: Bezpośrednio do localhost
echo -e "\n1. Test localhost:3002 (bezpośrednio):"
curl -X POST http://localhost:3002/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"moon.pl.kr@gmail.com","password":"Tola2025!"}' \
  | jq .

# Test 2: Przez nginx z echo
echo -e "\n2. Test przez nginx z echo:"
echo '{"email":"moon.pl.kr@gmail.com","password":"Tola2025!"}' | curl -X POST https://guardant.me/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d @- \
  | jq .

# Test 3: Z plikiem
echo -e "\n3. Test z plikiem:"
cat > /tmp/login.json << EOF
{
  "email": "moon.pl.kr@gmail.com",
  "password": "Tola2025!"
}
EOF

curl -X POST https://guardant.me/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d @/tmp/login.json \
  | jq .

# Test 4: Raw request
echo -e "\n4. Test raw request:"
curl -X POST https://guardant.me/api/admin/auth/login \
  -H "Content-Type: application/json" \
  --data-raw '{"email":"moon.pl.kr@gmail.com","password":"Tola2025!"}' \
  | jq .