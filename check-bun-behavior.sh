#!/bin/bash

echo "🔍 Sprawdzanie zachowania Bun"

# 1. Szukaj "Started server" w całym projekcie
echo -e "\n1. Szukanie 'Started server' w całym projekcie:"
grep -r "Started server" . --include="*.ts" --include="*.js" --include="*.json" | grep -v node_modules | grep -v ".git"

# 2. Sprawdź package.json dla skryptów
echo -e "\n2. Sprawdzanie package.json w api-admin:"
cat services/api-admin/package.json 2>/dev/null || echo "Brak package.json"

# 3. Sprawdź czy jest bun.config
echo -e "\n3. Szukanie bun.config:"
find . -name "bun.config*" -o -name "bunfig.toml" | grep -v node_modules

# 4. Sprawdź zmienne środowiskowe Bun
echo -e "\n4. Zmienne środowiskowe Bun w docker-compose:"
grep -E "BUN_|NODE_" docker-compose.yml | grep -v "#"

# 5. Test prostego pliku
echo -e "\n5. Test czystego Bun:"
cat > /tmp/test-bun-simple.ts << 'EOF'
console.log("Test start");
console.log("Import meta:", import.meta);
console.log("Process:", process.argv);
console.log("Test end");
EOF

docker run --rm -v /tmp/test-bun-simple.ts:/test.ts oven/bun:1 bun run /test.ts