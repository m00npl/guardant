#!/bin/bash

echo "🔨 Wymuszanie utworzenia tabel"

# 1. Połącz się bezpośrednio i utwórz tabele
echo -e "\n1. Bezpośrednie tworzenie tabel:"
docker exec -i guardant-postgres psql -U guardant -d guardant << 'EOSQL'
-- Pokaż obecny stan
\dt

-- Usuń stare tabele jeśli istnieją
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS nest_users CASCADE;
DROP TABLE IF EXISTS nests CASCADE;

-- Utwórz extension dla UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Utwórz tabele
CREATE TABLE nests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

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

-- Pokaż utworzone tabele
\dt

-- Wstaw testowe dane
INSERT INTO nests (id, name, slug) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Default Nest', 'default');

-- Hash dla "Tola2025!" wygenerowany przez bcrypt
INSERT INTO nest_users (email, password_hash, name, role, nest_id) VALUES
  ('admin@guardant.me', '$2b$10$YQtPbV/CEOpMlDQBr0Lw5eNfPFz1eSgNjJlAQQxXRhPPdrizfKCni', 'Admin User', 'admin', '550e8400-e29b-41d4-a716-446655440000');

-- Sprawdź dane
SELECT * FROM nest_users;
EOSQL

# 2. Sprawdź czy tabele zostały utworzone
echo -e "\n2. Weryfikacja tabel:"
docker exec guardant-postgres psql -U guardant -d guardant -c "\dt" 2>&1

# 3. Sprawdź użytkowników
echo -e "\n3. Sprawdzanie użytkowników:"
docker exec guardant-postgres psql -U guardant -d guardant -c "SELECT email, role, substring(password_hash, 1, 20) as hash_start FROM nest_users;" 2>&1

# 4. Jeśli to nie działa, sprawdź połączenie
if ! docker exec guardant-postgres psql -U guardant -d guardant -c "\dt" 2>&1 | grep -q "nest"; then
  echo -e "\n4. Problem z bazą danych - sprawdzanie:"
  
  # Sprawdź czy kontener działa
  echo "Status kontenera postgres:"
  docker ps | grep postgres
  
  # Sprawdź logi
  echo -e "\nOstatnie logi postgres:"
  docker logs guardant-postgres --tail 20
  
  # Sprawdź volume
  echo -e "\nVolume postgres:"
  docker volume ls | grep postgres
fi

# 5. Wyczyść Redis i test logowania
echo -e "\n5. Czyszczenie Redis i test logowania:"
docker exec guardant-redis redis-cli FLUSHDB

sleep 2

curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guardant.me","password":"Tola2025!"}' | jq .