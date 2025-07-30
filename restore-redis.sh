#!/bin/bash

# Redis restore script for GuardAnt

BACKUP_DIR="./backups/redis"

if [ -z "$1" ]; then
  echo "❌ Usage: $0 <backup_file>"
  echo ""
  echo "Available backups:"
  ls -lh "$BACKUP_DIR"/*.gz 2>/dev/null
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "⚠️  WARNING: This will replace all current Redis data!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Restore cancelled"
  exit 1
fi

echo "🛑 Stopping Redis container..."
docker stop guardant-redis

# Extract backup if gzipped
RESTORE_FILE="$BACKUP_FILE"
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo "📦 Extracting backup..."
  RESTORE_FILE="${BACKUP_FILE%.gz}"
  gunzip -c "$BACKUP_FILE" > "$RESTORE_FILE"
fi

echo "📥 Copying backup to container..."
docker cp "$RESTORE_FILE" guardant-redis:/data/dump.rdb

# Clean up extracted file if we created it
if [[ "$BACKUP_FILE" == *.gz ]]; then
  rm "$RESTORE_FILE"
fi

echo "🚀 Starting Redis container..."
docker start guardant-redis

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
until docker exec guardant-redis redis-cli ping > /dev/null 2>&1; do
  sleep 1
done

echo "✅ Restore completed successfully!"
echo "📊 Redis info:"
docker exec guardant-redis redis-cli INFO keyspace