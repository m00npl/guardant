#!/bin/bash

echo "🔍 Test publicznego API statusu"

# Get public status
echo -e "\n1. Public status dla moon.guardant.me:"
curl -s https://guardant.me/api/status/moon | jq .

echo -e "\n2. Public services dla moon:"
curl -s https://guardant.me/api/status/moon/services | jq .