#!/bin/bash

# Simple admin password reset with easier password

EMAIL="admin@guardant.me"
PASSWORD="Admin123"  # Simpler password without special chars
VAULT_TOKEN="${VAULT_TOKEN}"

if [ -z "$VAULT_TOKEN" ]; then
    echo "❌ VAULT_TOKEN not set!"
    exit 1
fi

echo "🔧 Resetting admin password to simpler one..."
echo "📧 Email: $EMAIL"
echo "🔑 Password: $PASSWORD"
echo ""

# Generate user ID (base64 encode email)
USER_ID=$(echo -n "$EMAIL" | base64 | tr '+/' '-_' | tr -d '=')
echo "🆔 User ID: $USER_ID"

# Hash password using Docker container
echo "🔐 Hashing password..."
HASH=$(docker compose exec -T admin-api node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('$PASSWORD', 10).then(h => console.log(h));
" | tail -1)

echo "📝 Hash: $HASH"

# Store in Vault
echo "💾 Storing in Vault..."
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"data\": {\"password_hash\": \"$HASH\", \"created_at\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\", \"last_updated\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"}}" \
  http://localhost:8200/v1/secret/data/users/passwords/$USER_ID > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ Password stored in Vault"
else
    echo "❌ Failed to store in Vault"
    exit 1
fi

echo ""
echo "🎉 Admin password reset successfully!"
echo ""
echo "You can now login with:"
echo "📧 Email: $EMAIL"
echo "🔑 Password: $PASSWORD"