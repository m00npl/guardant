#!/bin/bash

# Vault Unseal Helper Script
# This script helps unseal Vault securely without storing keys

echo "🔓 Vault Unseal Helper"
echo "====================="

# Interactive mode - prompt for keys securely
if [ $# -eq 0 ]; then
    echo "This script will prompt you for 3 unseal keys."
    echo "Keys will not be displayed or stored."
    echo ""
    
    # Use read -s for silent input
    read -s -p "Enter unseal key 1: " KEY1
    echo
    read -s -p "Enter unseal key 2: " KEY2
    echo
    read -s -p "Enter unseal key 3: " KEY3
    echo
else
    # Allow command line args for automation (use with caution)
    KEY1=$1
    KEY2=$2
    KEY3=$3
    
    if [ -z "$KEY1" ] || [ -z "$KEY2" ] || [ -z "$KEY3" ]; then
        echo "❌ Please provide 3 unseal keys"
        echo ""
        echo "Usage:"
        echo "  ./unseal-vault.sh                    # Interactive mode (recommended)"
        echo "  ./unseal-vault.sh KEY1 KEY2 KEY3     # Direct mode (use with caution)"
        exit 1
    fi
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