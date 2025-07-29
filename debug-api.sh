#!/bin/bash

echo "=== Debugging Admin API ==="

echo "1. Check if admin-api container is running:"
docker compose ps admin-api

echo -e "\n2. Check admin-api logs:"
docker compose logs admin-api --tail=20

echo -e "\n3. Test direct connection to admin-api:"
docker exec guardant-nginx-proxy curl -v http://admin-api:45678/health

echo -e "\n4. Test API endpoint through nginx:"
docker exec guardant-nginx-proxy curl -v http://localhost/api/admin/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test"}'

echo -e "\n5. Check nginx logs:"
docker compose logs nginx-proxy --tail=10