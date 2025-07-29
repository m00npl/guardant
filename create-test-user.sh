#!/bin/bash

echo "🔐 Tworzenie użytkownika testowego w Redis"

# Generuj ID
NEST_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
echo "Nest ID: $NEST_ID"

# Hash hasła
PASSWORD_HASH='$2b$10$YourHashedPasswordHere'

# Użyj bcrypt do wygenerowania prawdziwego hasha
echo "Generowanie hasha hasła..."
docker exec guardant-admin-api sh -c "
cat > /tmp/hash-password.js << 'EOF'
const bcrypt = require('bcryptjs');
const password = 'Tola2025!';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
EOF
bun /tmp/hash-password.js
" > /tmp/password-hash.txt

PASSWORD_HASH=$(cat /tmp/password-hash.txt)
echo "Password hash: $PASSWORD_HASH"

# Tworzenie użytkownika w Redis
echo "Tworzenie użytkownika w Redis..."
docker exec guardant-redis redis-cli HSET "nest:$NEST_ID" \
  id "$NEST_ID" \
  email "moon.pl.kr@gmail.com" \
  subdomain "moon" \
  name "Moon Test" \
  plan "free" \
  createdAt "$(date +%s)000" \
  isActive "true"

# Mapowanie email -> nestId
docker exec guardant-redis redis-cli SET "nest:email:moon.pl.kr@gmail.com" "$NEST_ID"

# Mapowanie subdomain -> nestId
docker exec guardant-redis redis-cli SET "nest:subdomain:moon" "$NEST_ID"

# Zapisz hasło
docker exec guardant-redis redis-cli SET "nest:password:$NEST_ID" "$PASSWORD_HASH"

echo "✅ Użytkownik utworzony!"
echo "Email: moon.pl.kr@gmail.com"
echo "Hasło: Tola2025!"
echo "Subdomain: moon"

# Cleanup
rm -f /tmp/password-hash.txt