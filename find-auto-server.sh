#!/bin/bash

echo "🔍 Szukanie automatycznego startu serwera"

# 1. Sprawdź czy jest export default w index.ts
echo -e "\n1. Szukanie export default w index.ts:"
grep -n "export default\|export {" services/api-admin/src/index.ts | tail -20

# 2. Sprawdź końcówkę pliku
echo -e "\n2. Ostatnie 50 linii index.ts:"
tail -50 services/api-admin/src/index.ts | grep -n "export\|serve\|listen"

# 3. Sprawdź czy Bun wykrywa plik jako serwer
echo -e "\n3. Test z --print flag:"
docker run --rm -v $(pwd):/app -w /app/services/api-admin oven/bun:1 bun --print "import.meta" src/index.ts 2>&1 | head -20 || echo "Print test failed"

# 4. Sprawdź z --dry-run
echo -e "\n4. Test z --dry-run:"
docker run --rm -v $(pwd):/app -w /app/services/api-admin oven/bun:1 bun --bun run --dry-run src/index.ts 2>&1 | head -20 || echo "Dry run failed"

# 5. Stwórz wrapper który nie eksportuje serwera
echo -e "\n5. Tworzenie wrapper script:"
cat > services/api-admin/start-wrapper.ts << 'EOF'
#!/usr/bin/env bun
console.log("🚀 Starting through wrapper...");
// Import but don't export
await import("./src/index.ts");
EOF

chmod +x services/api-admin/start-wrapper.ts