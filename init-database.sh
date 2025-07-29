#!/bin/bash

echo "🗄️ Inicjalizacja bazy danych GuardAnt"

# 1. Sprawdź czy istnieją pliki migracji
echo -e "\n1. Szukanie plików migracji:"
find . -name "*.sql" -o -name "migrations" -o -name "schema.sql" | grep -v node_modules | head -20

# 2. Sprawdź strukturę projektu dla bazy danych
echo -e "\n2. Szukanie definicji schematu:"
find . -name "*schema*" -o -name "*migration*" -o -name "*database*" | grep -E "\.(sql|ts|js)$" | grep -v node_modules | head -20

# 3. Sprawdź czy jest Prisma
echo -e "\n3. Sprawdzanie Prisma:"
find . -name "schema.prisma" | grep -v node_modules

# 4. Tymczasowo utwórz podstawowe tabele
echo -e "\n4. Tworzenie podstawowych tabel:"
docker exec guardant-postgres psql -U guardant -d guardant << 'EOF'
-- Create nests table
CREATE TABLE IF NOT EXISTS nests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create nest_users table
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

-- Create services table
CREATE TABLE IF NOT EXISTS services (
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

-- Create default nest
INSERT INTO nests (name, slug) 
VALUES ('Default Nest', 'default')
ON CONFLICT (slug) DO NOTHING;

-- Show created tables
\dt
EOF

echo -e "\n5. Sprawdzanie plików w shared/database:"
ls -la shared/database* 2>/dev/null || echo "Brak shared/database"

echo -e "\n6. Sprawdzanie packages dla database:"
ls -la packages/*/database* 2>/dev/null || echo "Brak packages z database"