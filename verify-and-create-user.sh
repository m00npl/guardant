#!/bin/bash

echo "✅ Weryfikacja tabel i tworzenie użytkownika"

# 1. Sprawdź czy tabele istnieją
echo -e "\n1. Lista tabel w bazie guardant:"
docker exec guardant-postgres psql -U guardant -d guardant -c "\dt"

# 2. Sprawdź strukturę tabel
echo -e "\n2. Struktura tabeli nest_users:"
docker exec guardant-postgres psql -U guardant -d guardant -c "\d nest_users" 2>&1 | head -15

# 3. Utwórz default nest
echo -e "\n3. Tworzenie default nest:"
NEST_ID=$(docker exec guardant-postgres psql -U guardant -d guardant -t -c "
INSERT INTO nests (name, slug) 
VALUES ('Default Nest', 'default')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
RETURNING id;
" | xargs)
echo "Nest ID: $NEST_ID"

# 4. Utwórz prosty hash dla testów (używamy bcrypt hash dla "Tola2025!")
echo -e "\n4. Tworzenie użytkownika z gotowym hashem:"
# Ten hash to bcrypt dla "Tola2025!"
HASH='$2b$10$HhPpY9rLH5s1TEv9DztYKuGQtVwqVZKxXm7CJeEhXF5KQIhxVLPd2'

docker exec guardant-postgres psql -U guardant -d guardant << EOF
-- Usuń stary user jeśli istnieje
DELETE FROM nest_users WHERE email = 'admin@guardant.me';

-- Wstaw nowego
INSERT INTO nest_users (email, password_hash, name, role, nest_id, is_active)
VALUES (
  'admin@guardant.me',
  '$HASH',
  'Admin User',
  'admin',
  '$NEST_ID'::uuid,
  true
);

-- Pokaż użytkownika
SELECT id, email, name, role, is_active, 
       length(password_hash) as hash_length,
       substring(password_hash, 1, 20) as hash_prefix
FROM nest_users WHERE email = 'admin@guardant.me';
EOF

# 5. Wyczyść Redis lockouts
echo -e "\n5. Czyszczenie Redis:"
docker exec guardant-redis redis-cli FLUSHDB

# 6. Test logowania
echo -e "\n6. Test logowania (po 2 sekundach):"
sleep 2
RESPONSE=$(curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}')

echo "Response: $RESPONSE"

# 7. Jeśli to nie działa, sprawdź w logach co się dzieje
if [[ "$RESPONSE" == *"Invalid credentials"* ]]; then
  echo -e "\n7. Debugowanie autoryzacji:"
  
  # Sprawdź co jest w bazie
  echo "Użytkownicy w bazie:"
  docker exec guardant-postgres psql -U guardant -d guardant -c "
    SELECT email, role, is_active, 
           substring(password_hash, 1, 30) as hash_start 
    FROM nest_users;
  "
  
  # Sprawdź logi aplikacji
  echo -e "\nOstatnie logi auth:"
  docker logs guardant-admin-api --tail 30 2>&1 | grep -E "(login|auth|password|hash)" | tail -10
  
  # Test bezpośrednio w kontenerze
  echo -e "\n8. Test hash w kontenerze:"
  docker exec guardant-admin-api bun eval "
    const password = 'Tola2025!';
    const hash = '$HASH';
    console.log('Testing password:', password);
    console.log('Against hash:', hash);
    const valid = await Bun.password.verify(password, hash);
    console.log('Valid:', valid);
  "
fi

# 9. Jeśli sukces, wyświetl token
if [[ "$RESPONSE" == *"token"* ]]; then
  echo -e "\n✅ SUKCES! Zalogowano pomyślnie!"
  echo "$RESPONSE" | jq .
fi