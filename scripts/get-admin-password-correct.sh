#!/bin/bash

# Script to retrieve admin password from Vault - corrected version

set -e

echo "🔐 Retrieving admin password from Vault..."
echo ""

# Check if we're in docker or on host
if [ -f /.dockerenv ]; then
    # Inside docker
    VAULT_ADDR=${VAULT_ADDR:-http://guardant-vault:8200}
else
    # On host - use localhost port
    VAULT_ADDR=${VAULT_ADDR:-http://localhost:8200}
fi

if [ -z "$VAULT_TOKEN" ]; then
    echo "❌ VAULT_TOKEN not set!"
    echo ""
    echo "Please export VAULT_TOKEN first:"
    echo "export VAULT_TOKEN=<your-root-token>"
    exit 1
fi

# Email to check
EMAIL="admin@guardant.me"
USER_ID=$(echo -n $EMAIL | base64 | tr '+/' '-_' | tr -d '=')

echo "📧 Checking password for: $EMAIL"
echo "🆔 User ID: $USER_ID"
echo ""

# Get password from correct Vault path
echo "🔑 Stored password hash:"
RESPONSE=$(curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
    $VAULT_ADDR/v1/secret/data/users/passwords/$USER_ID)

if [ $? -ne 0 ]; then
    echo "❌ Failed to connect to Vault"
    exit 1
fi

# Check if data exists
if echo "$RESPONSE" | jq -e '.data.data' > /dev/null 2>&1; then
    echo "$RESPONSE" | jq -r '.data.data'
    echo ""
    echo "✅ Password hash found in Vault"
    echo ""
    echo "Note: This is a hashed password, not the actual password."
    echo "If you need to reset it, use the create-admin script."
else
    echo "❌ No password found for admin@guardant.me"
    echo ""
    echo "Response from Vault:"
    echo "$RESPONSE" | jq '.'
    echo ""
    echo "You may need to create the admin user first."
fi