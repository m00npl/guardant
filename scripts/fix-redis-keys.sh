#!/bin/bash

# Fix Redis key format for admin email mapping

EMAIL="admin@guardant.me"

echo "🔧 Fixing Redis key format for admin email mapping..."
echo "📧 Email: $EMAIL"
echo ""

# Check if the old key exists
OLD_KEY="auth:email:$EMAIL"
NEW_KEY="auth:user:email:$EMAIL"

echo "🔍 Checking for old key: $OLD_KEY"
EXISTS=$(docker compose exec redis redis-cli EXISTS "$OLD_KEY")

if [[ "$EXISTS" == *"1"* ]]; then
    echo "✅ Found old key"
    
    # Rename the key
    echo "🔄 Renaming key to: $NEW_KEY"
    docker compose exec redis redis-cli RENAME "$OLD_KEY" "$NEW_KEY"
    
    if [ $? -eq 0 ]; then
        echo "✅ Key renamed successfully!"
    else
        echo "❌ Failed to rename key"
        exit 1
    fi
else
    echo "❓ Old key not found, checking if new key already exists..."
    NEW_EXISTS=$(docker compose exec redis redis-cli EXISTS "$NEW_KEY")
    
    if [[ "$NEW_EXISTS" == *"1"* ]]; then
        echo "✅ New key already exists - no action needed"
    else
        echo "❌ Neither old nor new key found - you may need to run reset-admin-simple.sh"
    fi
fi

echo ""
echo "🔍 Verifying final state..."
docker compose exec redis redis-cli KEYS "auth:*email*"

echo ""
echo "🎉 Done! You should now be able to login with:"
echo "📧 Email: admin@guardant.me"
echo "🔑 Password: Admin123!@#"