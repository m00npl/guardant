#!/bin/bash

# Script to send update commands to workers via admin API

API_URL=${1:-http://localhost:4040}
TOKEN=${2:-$DEPLOYMENT_TOKEN}
COMMAND=${3:-update}
REPO_URL=${4:-https://github.com/guardant-me/worker.git}
BRANCH=${5:-main}
VERSION=${6:-$(date +%Y%m%d-%H%M%S)}

if [ -z "$TOKEN" ]; then
    echo "Usage: $0 [api-url] [token] [command] [repo-url] [branch] [version]"
    echo "Commands: update, rebuild, status"
    exit 1
fi

echo "🚀 Sending $COMMAND command to all workers..."

case $COMMAND in
    update)
        echo "📦 Updating workers to version: $VERSION"
        curl -X POST "$API_URL/api/admin/workers/update" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"repoUrl\": \"$REPO_URL\",
                \"branch\": \"$BRANCH\",
                \"version\": \"$VERSION\",
                \"delay\": 5000
            }"
        ;;
    rebuild)
        curl -X POST "$API_URL/api/admin/workers/rebuild" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"delay\": 5000
            }"
        ;;
    status)
        curl -X GET "$API_URL/api/admin/workers/status" \
            -H "Authorization: Bearer $TOKEN" | jq .
        exit 0
        ;;
    *)
        echo "Unknown command: $COMMAND"
        exit 1
        ;;
esac

echo ""
echo "✅ Command sent to workers"