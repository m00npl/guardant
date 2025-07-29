#!/bin/sh

# Wait for admin API to write its port
echo "Waiting for admin API port file..."
while [ ! -f /tmp/admin-api-port.txt ]; do
  sleep 1
done

# Read the port
ADMIN_API_PORT=$(cat /tmp/admin-api-port.txt)
echo "Admin API is running on port: $ADMIN_API_PORT"

# Update nginx config with the actual port
sed -i "s/admin-api:45678/admin-api:$ADMIN_API_PORT/g" /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'