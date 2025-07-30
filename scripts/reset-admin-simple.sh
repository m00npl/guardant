#!/bin/bash

# Simple admin password reset script

EMAIL="admin@guardant.me"
PASSWORD="Admin123!@#"
VAULT_TOKEN="${VAULT_TOKEN}"

if [ -z "$VAULT_TOKEN" ]; then
    echo "❌ VAULT_TOKEN not set!"
    echo "export VAULT_TOKEN=<your-token>"
    exit 1
fi

echo "🔧 Resetting admin password..."
echo "📧 Email: $EMAIL"
echo "🔑 Password: $PASSWORD"
echo ""

# Generate user ID (base64 encode email)
USER_ID=$(echo -n "$EMAIL" | base64 | tr '+/' '-_' | tr -d '=')
echo "🆔 User ID: $USER_ID"

# Hash password using Docker container
echo "🔐 Hashing password..."
# Copy the hash script to container and run it
docker compose cp ./scripts/hash-password.js admin-api:/tmp/hash-password.js
HASH=$(docker compose exec -T admin-api bun /tmp/hash-password.js "$PASSWORD" | tail -1 | tr -d '\r\n')

echo "📝 Hash: $HASH"

# Check if hash was generated
if [ -z "$HASH" ]; then
    echo "❌ Failed to generate password hash"
    exit 1
fi

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

# Create user in Redis if not exists
echo "👤 Checking user in Redis..."
EXISTS=$(docker compose exec redis redis-cli EXISTS auth:user:$USER_ID)

if [[ "$EXISTS" == *"0"* ]]; then
    echo "📝 Creating admin user in Redis..."
    
    # Create user JSON
    USER_JSON="{\"id\":\"$USER_ID\",\"email\":\"$EMAIL\",\"role\":\"admin\",\"nestId\":\"platform\",\"isActive\":true,\"permissions\":{\"manageNests\":true,\"manageUsers\":true,\"manageWorkers\":true,\"viewAnalytics\":true,\"managePayments\":true,\"managePlatform\":true},\"createdAt\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",\"updatedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"}"
    
    # Store in Redis
    docker compose exec redis redis-cli SET "auth:user:$USER_ID" "$USER_JSON" > /dev/null
    docker compose exec redis redis-cli SET "auth:user:email:$EMAIL" "$USER_ID" > /dev/null
    
    echo "✅ Admin user created"
else
    echo "✅ Admin user already exists"
fi

echo ""
echo "🎉 Admin password reset successfully!"
echo ""
echo "You can now login with:"
echo "📧 Email: $EMAIL"
echo "🔑 Password: $PASSWORD"