#!/bin/bash

# GuardAnt Vault Initialization Script
# This script initializes and configures HashiCorp Vault for GuardAnt

set -e

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_INIT_FILE="/vault/file/.vault-init"
VAULT_KEYS_FILE="/vault/file/.vault-keys"

echo "🔐 GuardAnt Vault Initialization"
echo "================================"
echo "Vault Address: $VAULT_ADDR"

# Wait for Vault to be ready
echo "⏳ Waiting for Vault to be ready..."
while ! vault status 2>/dev/null; do
    sleep 2
done

# Check if Vault is already initialized
if vault status 2>/dev/null | grep -q "Initialized.*true"; then
    echo "✅ Vault is already initialized"
    
    # Check if we have keys stored
    if [ -f "$VAULT_KEYS_FILE" ]; then
        echo "🔓 Unsealing Vault..."
        source "$VAULT_KEYS_FILE"
        
        # Unseal with first 3 keys
        vault operator unseal "$UNSEAL_KEY_1" >/dev/null 2>&1 || true
        vault operator unseal "$UNSEAL_KEY_2" >/dev/null 2>&1 || true
        vault operator unseal "$UNSEAL_KEY_3" >/dev/null 2>&1 || true
        
        echo "✅ Vault unsealed"
    else
        echo "⚠️  Vault is initialized but no keys found. Manual unsealing required."
        exit 1
    fi
else
    echo "🚀 Initializing Vault..."
    
    # Initialize Vault
    INIT_OUTPUT=$(vault operator init -key-shares=5 -key-threshold=3 -format=json)
    
    # Extract keys and token
    ROOT_TOKEN=$(echo "$INIT_OUTPUT" | jq -r '.root_token')
    UNSEAL_KEY_1=$(echo "$INIT_OUTPUT" | jq -r '.unseal_keys_b64[0]')
    UNSEAL_KEY_2=$(echo "$INIT_OUTPUT" | jq -r '.unseal_keys_b64[1]')
    UNSEAL_KEY_3=$(echo "$INIT_OUTPUT" | jq -r '.unseal_keys_b64[2]')
    UNSEAL_KEY_4=$(echo "$INIT_OUTPUT" | jq -r '.unseal_keys_b64[3]')
    UNSEAL_KEY_5=$(echo "$INIT_OUTPUT" | jq -r '.unseal_keys_b64[4]')
    
    # Save keys securely
    cat > "$VAULT_KEYS_FILE" <<EOF
export ROOT_TOKEN="$ROOT_TOKEN"
export UNSEAL_KEY_1="$UNSEAL_KEY_1"
export UNSEAL_KEY_2="$UNSEAL_KEY_2"
export UNSEAL_KEY_3="$UNSEAL_KEY_3"
export UNSEAL_KEY_4="$UNSEAL_KEY_4"
export UNSEAL_KEY_5="$UNSEAL_KEY_5"
EOF
    chmod 600 "$VAULT_KEYS_FILE"
    
    # Mark as initialized
    touch "$VAULT_INIT_FILE"
    
    echo "✅ Vault initialized successfully"
    echo ""
    echo "⚠️  IMPORTANT: Save these keys securely!"
    echo "Root Token: $ROOT_TOKEN"
    echo "Unseal Key 1: $UNSEAL_KEY_1"
    echo "Unseal Key 2: $UNSEAL_KEY_2"
    echo "Unseal Key 3: $UNSEAL_KEY_3"
    echo "Unseal Key 4: $UNSEAL_KEY_4"
    echo "Unseal Key 5: $UNSEAL_KEY_5"
    echo ""
    
    # Unseal Vault
    echo "🔓 Unsealing Vault..."
    vault operator unseal "$UNSEAL_KEY_1"
    vault operator unseal "$UNSEAL_KEY_2"
    vault operator unseal "$UNSEAL_KEY_3"
    
    echo "✅ Vault unsealed"
fi

# Login with root token
if [ -f "$VAULT_KEYS_FILE" ]; then
    source "$VAULT_KEYS_FILE"
    export VAULT_TOKEN="$ROOT_TOKEN"
    vault login "$ROOT_TOKEN" >/dev/null 2>&1
    echo "✅ Logged in to Vault"
fi

# Enable KV v2 secret engine
echo "🔧 Configuring secret engines..."
vault secrets enable -path=guardant kv-v2 2>/dev/null || echo "✅ KV v2 engine already enabled at guardant/"

# Create GuardAnt namespace structure
echo "📁 Creating GuardAnt secret structure..."

# Application secrets
vault kv put guardant/app/jwt \
    secret="$(openssl rand -base64 32)" \
    refresh_secret="$(openssl rand -base64 32)" \
    session_secret="$(openssl rand -base64 32)" \
    2>/dev/null || true

# Database credentials
vault kv put guardant/database/postgres \
    host="postgres" \
    port="5432" \
    database="guardant" \
    username="guardant" \
    password="guardant123" \
    2>/dev/null || true

vault kv put guardant/database/redis \
    host="redis" \
    port="6379" \
    password="" \
    2>/dev/null || true

# RabbitMQ credentials
vault kv put guardant/messaging/rabbitmq \
    host="rabbitmq" \
    port="5672" \
    username="guardant" \
    password="guardant123" \
    vhost="/" \
    2>/dev/null || true

# Golem Network secrets
vault kv put guardant/blockchain/golem \
    chain_id="600606" \
    http_url="https://kaolin.holesky.golem-base.io/rpc" \
    ws_url="wss://kaolin.holesky.golem-base.io/rpc/ws" \
    private_key="" \
    wallet_address="" \
    2>/dev/null || true

# Email configuration
vault kv put guardant/email/sendgrid \
    api_key="" \
    from_email="moon.pl.kr@gmail.com" \
    2>/dev/null || true

# Monitoring secrets
vault kv put guardant/monitoring/sentry \
    dsn="" \
    2>/dev/null || true

vault kv put guardant/monitoring/jaeger \
    endpoint="http://jaeger:14268/api/traces" \
    2>/dev/null || true

echo "✅ GuardAnt secrets configured"

# Create policies
echo "📋 Creating access policies..."

# Application read policy
vault policy write guardant-app-read - <<EOF
path "guardant/*" {
  capabilities = ["read", "list"]
}
EOF

# Application write policy
vault policy write guardant-app-write - <<EOF
path "guardant/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
EOF

echo "✅ Policies created"

# Create service tokens
echo "🎫 Creating service tokens..."

# Admin API token
ADMIN_TOKEN=$(vault token create \
    -policy=guardant-admin \
    -ttl=8760h \
    -format=json | jq -r '.auth.client_token' 2>/dev/null || echo "")

# Public API token
PUBLIC_TOKEN=$(vault token create \
    -policy=guardant-public-api \
    -ttl=8760h \
    -format=json | jq -r '.auth.client_token' 2>/dev/null || echo "")

# Worker token
WORKER_TOKEN=$(vault token create \
    -policy=guardant-worker \
    -ttl=8760h \
    -format=json | jq -r '.auth.client_token' 2>/dev/null || echo "")

# Fallback to basic token if policies don't exist
if [ -z "$ADMIN_TOKEN" ]; then
  ADMIN_TOKEN=$(vault token create \
      -policy=guardant-write \
      -ttl=8760h \
      -format=json | jq -r '.auth.client_token')
fi

if [ -z "$PUBLIC_TOKEN" ]; then
  PUBLIC_TOKEN=$(vault token create \
      -policy=guardant-read \
      -ttl=8760h \
      -format=json | jq -r '.auth.client_token')
fi

if [ -z "$WORKER_TOKEN" ]; then
  WORKER_TOKEN=$(vault token create \
      -policy=guardant-read \
      -ttl=8760h \
      -format=json | jq -r '.auth.client_token')
fi

echo ""
echo "✅ Vault configuration complete!"
echo ""
echo "📝 Add these to your .env files:"
echo ""
echo "# Admin API (.env or docker-compose.yml)"
echo "VAULT_TOKEN=$ADMIN_TOKEN"
echo ""
echo "# Public API"
echo "VAULT_TOKEN=$PUBLIC_TOKEN"
echo ""
echo "# Workers"
echo "VAULT_TOKEN=$WORKER_TOKEN"
echo ""
echo "🔐 Root token (save securely): $ROOT_TOKEN"
echo ""
echo "📄 Service tokens have been saved to: $VAULT_KEYS_FILE"

# Save service tokens
cat >> "$VAULT_KEYS_FILE" <<EOF

# Service Tokens
export ADMIN_TOKEN="$ADMIN_TOKEN"
export PUBLIC_TOKEN="$PUBLIC_TOKEN"
export WORKER_TOKEN="$WORKER_TOKEN"
EOF