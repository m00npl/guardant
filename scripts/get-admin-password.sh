#!/bin/bash

# Script to retrieve admin password from Vault

set -e

echo "🔐 Retrieving admin password from Vault..."
echo ""

# Check if we're in docker or on host
if [ -f /.dockerenv ]; then
    # Inside docker
    VAULT_ADDR=${VAULT_ADDR:-http://vault:8200}
else
    # On host - use localhost
    VAULT_ADDR=${VAULT_ADDR:-http://localhost:8200}
fi

if [ -z "$VAULT_TOKEN" ]; then
    echo "❌ VAULT_TOKEN not set!"
    echo ""
    echo "Please export VAULT_TOKEN first:"
    echo "export VAULT_TOKEN=<your-root-token>"
    echo ""
    echo "To get root token from vault-init-output.json:"
    echo "cat vault-init-output.json | jq -r .root_token"
    exit 1
fi

# Get credentials from Vault
echo "📧 Email:"
curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
    $VAULT_ADDR/v1/secret/data/platform/admin | \
    jq -r '.data.data.email // "Not found"'

echo ""
echo "🔑 Password:"
curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
    $VAULT_ADDR/v1/secret/data/platform/admin | \
    jq -r '.data.data.password // "Not found"'

echo ""
echo "📅 Created at:"
curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
    $VAULT_ADDR/v1/secret/data/platform/admin | \
    jq -r '.data.data.created_at // "Not found"'

echo ""
echo "⚠️  Remember to change the password after first login!"