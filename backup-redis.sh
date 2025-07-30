#!/bin/bash

# Redis backup script for GuardAnt

BACKUP_DIR="./backups/redis"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="redis_backup_${TIMESTAMP}.rdb"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔄 Creating Redis backup..."

# Trigger Redis BGSAVE
docker exec guardant-redis redis-cli BGSAVE

# Wait for background save to complete
echo "⏳ Waiting for background save to complete..."
while [ $(docker exec guardant-redis redis-cli LASTSAVE) -eq $(docker exec guardant-redis redis-cli LASTSAVE) ]; do
  sleep 1
done

# Copy the dump file from container
docker cp guardant-redis:/data/dump.rdb "$BACKUP_DIR/$BACKUP_FILE"

# Compress the backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

echo "✅ Backup completed: $BACKUP_DIR/${BACKUP_FILE}.gz"

# Keep only last 7 backups
echo "🧹 Cleaning old backups..."
find "$BACKUP_DIR" -name "redis_backup_*.rdb.gz" -mtime +7 -delete

echo "📊 Current backups:"
ls -lh "$BACKUP_DIR"/*.gz 2>/dev/null | tail -5