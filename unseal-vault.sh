#!/bin/bash

# Vault Unseal Helper Script
# Usage: ./unseal-vault.sh [KEY1] [KEY2] [KEY3]
# Or set environment variables: VAULT_UNSEAL_KEY_1, VAULT_UNSEAL_KEY_2, VAULT_UNSEAL_KEY_3

echo "🔓 Vault Unseal Helper"
echo "====================="

# Get keys from arguments or environment
KEY1=${1:-$VAULT_UNSEAL_KEY_1}
KEY2=${2:-$VAULT_UNSEAL_KEY_2}
KEY3=${3:-$VAULT_UNSEAL_KEY_3}

# Check if we have keys
if [ -z "$KEY1" ] || [ -z "$KEY2" ] || [ -z "$KEY3" ]; then
    echo "❌ Please provide 3 unseal keys"
    echo ""
    echo "Usage:"
    echo "  ./unseal-vault.sh KEY1 KEY2 KEY3"
    echo ""
    echo "Or set environment variables:"
    echo "  export VAULT_UNSEAL_KEY_1=your-key-1"
    echo "  export VAULT_UNSEAL_KEY_2=your-key-2"
    echo "  export VAULT_UNSEAL_KEY_3=your-key-3"
    echo "  ./unseal-vault.sh"
    exit 1
fi

# Check Vault status
echo "Checking Vault status..."
STATUS=$(docker-compose exec -T vault vault status 2>/dev/null)

if echo "$STATUS" | grep -q "Sealed.*false"; then
    echo "✅ Vault is already unsealed"
    exit 0
fi

# Unseal Vault
echo "Unsealing Vault..."
echo -n "Key 1: "
docker-compose exec -T vault vault operator unseal "$KEY1" > /dev/null 2>&1 && echo "✅" || echo "❌"

echo -n "Key 2: "
docker-compose exec -T vault vault operator unseal "$KEY2" > /dev/null 2>&1 && echo "✅" || echo "❌"

echo -n "Key 3: "
docker-compose exec -T vault vault operator unseal "$KEY3" > /dev/null 2>&1 && echo "✅" || echo "❌"

# Check final status
echo ""
echo "Final status:"
docker-compose exec vault vault status

# Check if successfully unsealed
if docker-compose exec -T vault vault status 2>/dev/null | grep -q "Sealed.*false"; then
    echo ""
    echo "✅ Vault successfully unsealed!"
else
    echo ""
    echo "❌ Failed to unseal Vault. Please check your keys."
    exit 1
fi