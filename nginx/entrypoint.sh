#!/bin/sh

# Wait for admin API to write its port
echo "Waiting for admin API port file..."
max_wait=30
waited=0
while [ ! -f /tmp/admin-api-port.txt ] && [ $waited -lt $max_wait ]; do
  sleep 1
  waited=$((waited + 1))
done

if [ ! -f /tmp/admin-api-port.txt ]; then
  echo "ERROR: Admin API port file not found after ${max_wait} seconds!"
  exit 1
fi

# Read the port
ADMIN_API_PORT=$(cat /tmp/admin-api-port.txt)
echo "Admin API is running on port: $ADMIN_API_PORT"

# Copy original config if backup doesn't exist
if [ ! -f /etc/nginx/conf.d/default.conf.orig ]; then
  cp /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.orig
fi

# Always start from original config
cp /etc/nginx/conf.d/default.conf.orig /etc/nginx/conf.d/default.conf

# Update nginx config with the actual port
sed -i "s/admin-api:45678/admin-api:$ADMIN_API_PORT/g" /etc/nginx/conf.d/default.conf

echo "Updated nginx config - admin-api proxy_pass set to: http://admin-api:$ADMIN_API_PORT/api"

# Start nginx
exec nginx -g 'daemon off;'