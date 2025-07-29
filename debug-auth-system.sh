#!/bin/bash

echo "🔍 Debugowanie systemu autoryzacji"

# 1. Sprawdź czy auth używa Redis
echo -e "\n1. Sprawdzanie Redis dla użytkowników:"
docker exec guardant-redis redis-cli --scan --pattern "*user*" | head -20
docker exec guardant-redis redis-cli --scan --pattern "*admin@guardant.me*" | head -20

# 2. Sprawdź jak auth-manager jest skonfigurowany
echo -e "\n2. Sprawdzanie konfiguracji auth w logach:"
docker logs guardant-admin-api 2>&1 | grep -E "(storage|Storage|redis|Redis)" | head -20

# 3. Sprawdź endpoint logowania
echo -e "\n3. Test z verbose output:"
curl -v -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}' 2>&1 | grep -E "(HTTP|{|error)"

# 4. Sprawdź implementację login endpoint
echo -e "\n4. Szukanie implementacji login:"
grep -n "auth/login" services/api-admin/src/index.ts | head -10

# 5. Utwórz użytkownika w Redis (jeśli to jest problem)
echo -e "\n5. Tworzenie użytkownika w Redis:"
docker exec guardant-admin-api bun eval "
const Redis = require('ioredis').default;
const redis = new Redis('redis://redis:6379');

// Użytkownik do zapisania
const user = {
  id: 'b47a436a-25cf-42b7-acf3-8c2ab916b76a',
  email: 'admin@guardant.me',
  password_hash: '\$2b\$10\$YQtPbV/CEOpMlDQBr0Lw5eNfPFz1eSgNjJlAQQxXRhPPdrizfKCni',
  name: 'Admin User',
  role: 'admin',
  nest_id: '550e8400-e29b-41d4-a716-446655440000',
  is_active: true
};

// Zapisz w Redis
await redis.set('user:email:admin@guardant.me', JSON.stringify(user));
await redis.set('user:' + user.id, JSON.stringify(user));

console.log('User saved to Redis');

// Sprawdź
const saved = await redis.get('user:email:admin@guardant.me');
console.log('Saved user:', JSON.parse(saved));

redis.quit();
" 2>&1 || echo "Redis user creation failed"

# 6. Test ponownie
echo -e "\n6. Test logowania po Redis update:"
sleep 1
curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}' | jq .

# 7. Jeśli dalej nie działa, sprawdź dokładnie co robi endpoint
echo -e "\n7. Ostatnie logi z szczegółami:"
docker logs guardant-admin-api --tail 50 2>&1 | grep -A5 -B5 "login"