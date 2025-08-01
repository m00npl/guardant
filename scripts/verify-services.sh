#!/bin/bash

echo "🔍 Verifying services configuration..."
echo ""

# Get moon nest ID
MOON_NEST_ID=$(docker compose exec -T redis redis-cli get "nest:email:moon.pl.kr@gmail.com" | tr -d '"')
echo "Moon nest ID: $MOON_NEST_ID"
echo ""

# Check what subdomain this nest has
MOON_NEST_DATA=$(docker compose exec -T redis redis-cli get "nest:$MOON_NEST_ID")
SUBDOMAIN=$(echo "$MOON_NEST_DATA" | grep -o '"subdomain":"[^"]*"' | sed 's/"subdomain":"\([^"]*\)"/\1/')
echo "Subdomain: $SUBDOMAIN"
echo ""

# Check services in nest's service list
echo "📋 Services in nest's service list:"
echo "==================================="
SERVICES=$(docker compose exec -T redis redis-cli get "nest:$MOON_NEST_ID:services")
if [ "$SERVICES" != "(nil)" ] && [ -n "$SERVICES" ]; then
    echo "$SERVICES" | python3 -m json.tool 2>/dev/null | grep -E '"name"|"type"|"id"' || echo "$SERVICES"
else
    echo "No services found"
fi
echo ""

# Check if admin API can see the services
echo "📋 Testing admin API access..."
echo "=============================="

# You might need to get auth token first
# This is a simplified check - in reality you'd need proper auth
echo "To properly test, you need to:"
echo "1. Login to https://moon.guardant.me/admin/login"
echo "2. Open browser developer tools (F12)"
echo "3. Go to Network tab"
echo "4. Navigate to services page"
echo "5. Look for the /api/admin/services/list request"
echo "6. Check the response"