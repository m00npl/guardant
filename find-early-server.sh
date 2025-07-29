#!/bin/bash

echo "🔍 Szukanie przedwczesnego startu serwera"

# 1. Sprawdź wszystkie importy w index.ts
echo -e "\n1. Importy w index.ts:"
head -50 services/api-admin/src/index.ts | grep -E "import|from"

# 2. Szukaj Bun.serve w innych plikach
echo -e "\n2. Szukanie Bun.serve w całym projekcie:"
grep -r "Bun.serve\|Started server" services/api-admin/src/ --include="*.ts" --include="*.js" | grep -v node_modules | head -20

# 3. Sprawdź shared modules
echo -e "\n3. Sprawdzanie shared modules:"
grep -r "Bun.serve\|Started server\|listen" shared/ --include="*.ts" --include="*.js" 2>/dev/null | head -20

# 4. Sprawdź czy jakiś plik ma top-level server start
echo -e "\n4. Szukanie top-level server starts:"
find services/api-admin/src -name "*.ts" -o -name "*.js" | xargs grep -l "serve\|listen" | head -10

# 5. Sprawdź platform-routes
echo -e "\n5. Sprawdzanie platform-routes:"
grep -n "serve\|listen\|Started" services/api-admin/src/platform-routes*.ts 2>/dev/null | head -20