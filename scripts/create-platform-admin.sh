#!/bin/bash
# Script to create platform admin user

echo "🔧 Creating platform admin user..."

# Generate secure password
PASSWORD="PlatformAdmin123!"
HASHED_PASSWORD='$2b$10$YourHashedPasswordHere'  # This needs to be generated

# Create user directly in Redis
docker exec guardant-redis redis-cli << EOF
# Create user ID
SET user:next-id 1000

# Create platform admin user
HSET users:1000 \
  id "1000" \
  email "admin@guardant.me" \
  name "Platform Admin" \
  role "platform_admin" \
  isActive "true" \
  createdAt "$(date +%s)000" \
  updatedAt "$(date +%s)000"

# Map email to user ID
HSET users:by-email "admin@guardant.me" "1000"

# Add to platform admins set
SADD users:platform_admins "1000"

# Show result
HGETALL users:1000
EOF

echo "✅ Platform admin created!"
echo "📧 Email: admin@guardant.me"
echo "🔑 Password: $PASSWORD"
echo ""
echo "⚠️  IMPORTANT: You need to:"
echo "1. Generate bcrypt hash for the password"
echo "2. Update the password hash in the database"
echo "3. Or use the registration flow and then update the role"