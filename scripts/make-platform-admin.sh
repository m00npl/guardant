#!/bin/bash
# Script to make existing user a platform admin

if [ -z "$1" ]; then
  echo "Usage: $0 <user-email>"
  echo "Example: $0 admin@guardant.me"
  exit 1
fi

EMAIL="$1"

echo "🔧 Making $EMAIL a platform admin..."

# Get user ID by email
USER_ID=$(docker exec guardant-redis redis-cli HGET "users:by-email" "$EMAIL" | tr -d '\r')

if [ -z "$USER_ID" ] || [ "$USER_ID" = "(nil)" ]; then
  echo "❌ User $EMAIL not found!"
  echo "Please register the user first at https://guardant.me/admin/register"
  exit 1
fi

echo "📋 Found user ID: $USER_ID"

# Update user role to platform_admin
docker exec guardant-redis redis-cli << EOF
# Update user role
HSET users:$USER_ID role "platform_admin"

# Add to platform admins set
SADD users:platform_admins "$USER_ID"

# Show updated user
HGETALL users:$USER_ID
EOF

echo "✅ User $EMAIL is now a platform admin!"