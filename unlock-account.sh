#!/bin/bash

echo "🔓 Odblokowywanie konta i sprawdzanie użytkowników"

# 1. Sprawdź użytkowników w bazie
echo -e "\n1. Sprawdzanie użytkowników w bazie danych:"
docker exec guardant-postgres psql -U guardant -d guardant -c "SELECT id, email, role, is_active, created_at FROM users;" || echo "Query failed"

# 2. Sprawdź nest_users
echo -e "\n2. Sprawdzanie nest_users:"
docker exec guardant-postgres psql -U guardant -d guardant -c "SELECT id, email, name, role, is_active FROM nest_users;" || echo "Query failed"

# 3. Odblokuj konto w Redis
echo -e "\n3. Czyszczenie blokad w Redis:"
docker exec guardant-redis redis-cli --scan --pattern "auth:lockout:*" | xargs -I {} docker exec guardant-redis redis-cli DEL {} 2>/dev/null || echo "No lockouts found"
docker exec guardant-redis redis-cli --scan --pattern "auth:attempts:*" | xargs -I {} docker exec guardant-redis redis-cli DEL {} 2>/dev/null || echo "No attempts found"

# 4. Sprawdź czy istnieje użytkownik admin
echo -e "\n4. Tworzenie użytkownika admin jeśli nie istnieje:"
docker exec guardant-postgres psql -U guardant -d guardant -c "
INSERT INTO nest_users (id, email, password_hash, name, role, nest_id, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@guardant.me',
  '\$2a\$10\$8K1p/kUpGyKxOjQ3zR5Xc.0JdKkGqvjLGrJ6MhXMjKt3JO6C4VWm2', -- Tola2025!
  'Admin User',
  'admin',
  gen_random_uuid(),
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = true,
  updated_at = NOW()
RETURNING id, email, role;
" || echo "User creation/update failed"

# 5. Test direct health endpoint
echo -e "\n5. Test direct health endpoint (raw):"
curl -v http://localhost:4040/health 2>&1 | grep -E "(HTTP|Content-Type|{)" || echo "Direct test failed"

# 6. Test przez nginx
echo -e "\n6. Test health przez nginx (bez auth):"
curl -s http://localhost:8080/health || echo "No public health endpoint"

# 7. Sprawdź logi dla błędów
echo -e "\n7. Ostatnie błędy w logach:"
docker logs guardant-admin-api --tail 20 2>&1 | grep -E "(Error|error|failed)" || echo "No recent errors"