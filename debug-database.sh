#!/bin/bash

echo "🔍 Debugowanie problemów z bazą danych"

# 1. Sprawdź połączenie do bazy
echo -e "\n1. Test połączenia do bazy:"
docker exec guardant-postgres psql -U guardant -d guardant -c "SELECT version();"

# 2. Sprawdź bazę danych
echo -e "\n2. Lista baz danych:"
docker exec guardant-postgres psql -U guardant -l

# 3. Sprawdź czy baza guardant istnieje
echo -e "\n3. Sprawdzanie bazy guardant:"
docker exec guardant-postgres psql -U guardant -c "\l" | grep guardant

# 4. Spróbuj utworzyć tabele bezpośrednio
echo -e "\n4. Tworzenie tabel (verbose):"
docker exec guardant-postgres psql -U guardant -d guardant -v ON_ERROR_STOP=1 << 'EOF'
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if exist (for clean start)
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS nest_users CASCADE;
DROP TABLE IF EXISTS nests CASCADE;

-- Create nests table
CREATE TABLE nests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create nest_users table
CREATE TABLE nest_users (
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

-- Create services table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nest_id UUID REFERENCES nests(id),
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  interval INTEGER DEFAULT 60,
  alert_threshold INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Show created tables
\dt
EOF

# 5. Sprawdź logi postgres
echo -e "\n5. Ostatnie logi postgres:"
docker logs guardant-postgres --tail 20 2>&1 | grep -E "(ERROR|FATAL|error)"

# 6. Sprawdź zmienne środowiskowe
echo -e "\n6. Zmienne środowiskowe postgres:"
docker exec guardant-postgres env | grep -E "(POSTGRES|DATABASE)"

# 7. Test z innym użytkownikiem
echo -e "\n7. Test jako postgres user:"
docker exec guardant-postgres psql -U postgres -c "\l" | grep guardant