#!/bin/bash

echo "🔧 Fixing service keys in Redis..."
echo ""

# Get moon nest ID
MOON_NEST_ID=$(docker compose exec -T redis redis-cli get "nest:email:moon.pl.kr@gmail.com" | tr -d '"')

if [ -z "$MOON_NEST_ID" ] || [ "$MOON_NEST_ID" = "(nil)" ]; then
    echo "❌ Could not find nest for moon.pl.kr@gmail.com"
    exit 1
fi

echo "✅ Found moon nest: $MOON_NEST_ID"
echo ""

# Check if services exist in the wrong key
SERVICES=$(docker compose exec -T redis redis-cli get "nest:$MOON_NEST_ID:services")

if [ "$SERVICES" = "(nil)" ] || [ -z "$SERVICES" ]; then
    echo "❌ No services found at nest:$MOON_NEST_ID:services"
else
    echo "📋 Found services, copying to correct key..."
    
    # Copy to the correct key that the API expects
    echo "$SERVICES" | docker compose exec -T redis redis-cli -x set "services:$MOON_NEST_ID"
    
    echo "✅ Copied services to services:$MOON_NEST_ID"
fi

# Verify the copy
echo ""
echo "Verifying..."
VERIFY=$(docker compose exec -T redis redis-cli get "services:$MOON_NEST_ID")

if [ "$VERIFY" != "(nil)" ] && [ -n "$VERIFY" ]; then
    SERVICE_COUNT=$(echo "$VERIFY" | grep -o '"id"' | wc -l)
    echo "✅ Successfully set services at correct key"
    echo "   Total services: $SERVICE_COUNT"
else
    echo "❌ Failed to set services at correct key"
fi

echo ""
echo "✨ Done! Services should now appear in the admin panel."