#!/bin/bash
# Script to add a test worker for approval

WORKER_ID="test-worker-$(date +%s)"
TIMESTAMP=$(date +%s)000

echo "🐜 Adding test worker: $WORKER_ID"

docker exec guardant-redis redis-cli << EOF
# Add worker registration
HSET workers:registrations "$WORKER_ID" "$(cat <<JSON
{
  "workerId": "$WORKER_ID",
  "ownerEmail": "test@example.com",
  "ip": "192.168.1.100",
  "hostname": "test-worker-host",
  "registeredAt": "$TIMESTAMP",
  "approved": false,
  "region": "us-east-1",
  "version": "1.0.0"
}
JSON
)"

# Add to pending queue
ZADD workers:pending $TIMESTAMP "$WORKER_ID"

# Show result
HGET workers:registrations "$WORKER_ID"
EOF

echo "✅ Test worker added to pending queue!"
echo "📋 Worker ID: $WORKER_ID"
echo "🔄 Refresh the Worker Colony page to see it"