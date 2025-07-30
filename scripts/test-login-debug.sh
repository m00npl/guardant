#!/bin/bash

echo "🔧 Testing login flow..."

# Test 1: Check user exists
echo -e "\n1️⃣ Checking if user exists..."
USER_DATA=$(docker compose exec redis redis-cli GET auth:user:YWRtaW5AZ3VhcmRhbnQubWU)
echo "User data: $USER_DATA" | jq '.' 2>/dev/null || echo "$USER_DATA"

# Test 2: Check email mapping
echo -e "\n2️⃣ Checking email mapping..."
USER_ID=$(docker compose exec redis redis-cli GET auth:email:admin@guardant.me)
echo "User ID from email: $USER_ID"

# Test 3: Check Vault password
echo -e "\n3️⃣ Checking Vault password..."
docker compose exec admin-api sh -c "curl -s -H 'X-Vault-Token: $VAULT_TOKEN' $VAULT_ADDR/v1/secret/data/users/passwords/YWRtaW5AZ3VhcmRhbnQubWU | jq '.data.data.password_hash' || echo 'Failed to get password'"

# Test 4: Direct password test
echo -e "\n4️⃣ Testing password hash..."
docker compose exec admin-api node -e "
const bcrypt = require('bcrypt');
const hash = '\$2b\$10\$NS//fMBfNmjMGnjZIXK0B.FX7u4tYuiNSyWFCsCvkbTdIELz0Gtce';
const password = 'Admin123!@#';
bcrypt.compare(password, hash).then(r => console.log('Password matches:', r));
"

echo -e "\n✅ All tests completed"