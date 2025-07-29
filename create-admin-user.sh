#!/bin/bash

echo "👤 Tworzenie użytkownika admin"

# 1. Sprawdź tabele
echo -e "\n1. Sprawdzanie tabel w bazie:"
docker exec guardant-postgres psql -U guardant -d guardant -c "\dt" | grep -E "(nest|user|service)" || echo "Brak tabel"

# 2. Sprawdź czy tabele zostały utworzone
echo -e "\n2. Sprawdzanie struktury nest_users:"
docker exec guardant-postgres psql -U guardant -d guardant -c "\d nest_users" 2>&1 | head -20 || echo "Tabela nie istnieje"

# 3. Jeśli nie ma tabel, utwórz je ponownie
echo -e "\n3. Upewnianie się że tabele istnieją:"
docker exec guardant-postgres psql -U guardant -d guardant << 'EOF'
-- Ensure tables exist
CREATE TABLE IF NOT EXISTS nests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nest_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  nest_id UUID REFERENCES nests(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_nest_users_email ON nest_users(email);
CREATE INDEX IF NOT EXISTS idx_nest_users_nest_id ON nest_users(nest_id);

-- Show tables
\dt
EOF

# 4. Utwórz default nest
echo -e "\n4. Tworzenie default nest:"
NEST_ID=$(docker exec guardant-postgres psql -U guardant -d guardant -t -c "
INSERT INTO nests (name, slug) 
VALUES ('Default Nest', 'default')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
RETURNING id;
" | xargs)

echo "Nest ID: $NEST_ID"

# 5. Generuj hash hasła używając Bun
echo -e "\n5. Generowanie hash hasła:"
docker exec guardant-admin-api bun eval "console.log(await Bun.password.hash('Tola2025!'))" > /tmp/password_hash.txt 2>&1
HASH=$(cat /tmp/password_hash.txt | tail -1)
echo "Generated hash: ${HASH:0:20}..."

# 6. Utwórz użytkownika
echo -e "\n6. Tworzenie użytkownika admin:"
docker exec guardant-postgres psql -U guardant -d guardant << EOF
INSERT INTO nest_users (email, password_hash, name, role, nest_id, is_active)
VALUES (
  'admin@guardant.me',
  '$HASH',
  'Admin User',
  'admin',
  '$NEST_ID'::uuid,
  true
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'admin',
  is_active = true,
  updated_at = NOW();

-- Verify user
SELECT id, email, name, role, is_active FROM nest_users WHERE email = 'admin@guardant.me';
EOF

# 7. Test logowania
echo -e "\n7. Test logowania:"
curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}' | jq .

# 8. Jeśli to nie działa, sprawdź auth system
echo -e "\n8. Sprawdzanie systemu autoryzacji:"
docker logs guardant-admin-api --tail 50 2>&1 | grep -E "(auth|Auth|password|login)" | tail -20