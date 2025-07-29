#!/bin/bash

echo "🔧 Naprawianie podwójnego startu serwera"

# 1. Dodaj globalną flagę do index.ts
echo -e "\n1. Dodawanie flagi zapobiegającej podwójnemu startowi..."

cat > /tmp/server-fix.patch << 'EOF'
// Add at the very top of the file, after imports
let serverStarted = false;
const startupId = Math.random().toString(36).substring(7);

// In startServer function, add check:
async function startServer(firstTime = false) {
  if (serverStarted) {
    console.log(`⚠️  [${startupId}] Server already started, skipping...`);
    return;
  }
  serverStarted = true;
  
  console.log(`🚀 [${startupId}] Starting server (firstTime: ${firstTime})...`);
  // ... rest of the function
}

// Also wrap the main startup:
if (import.meta.main && !serverStarted) {
  // existing startup code
}
EOF

echo -e "\n2. Alternatywne rozwiązanie - użyj --hot reload flag"
echo "Możemy spróbować uruchomić Bun z innymi flagami:"

# 3. Zmień CMD w Dockerfile
echo -e "\n3. Tymczasowa zmiana sposobu uruchomienia:"
cat > /tmp/dockerfile-fix.patch << 'EOF'
# Zmień CMD na:
CMD ["bun", "run", "--no-install", "src/index.ts"]

# Lub spróbuj:
CMD ["bun", "--bun", "src/index.ts"]
EOF

# 4. Utwórz wrapper script
echo -e "\n4. Tworzenie wrapper script:"
cat > services/api-admin/start.sh << 'EOF'
#!/bin/sh
echo "🚀 Starting admin-api with wrapper..."
echo "Current directory: $(pwd)"
echo "Files in src/:"
ls -la src/

# Ensure only one instance
exec bun run src/index.ts
EOF

chmod +x services/api-admin/start.sh

echo -e "\n5. Pokaż sugerowane zmiany:"
echo "Opcja 1: Dodaj flagę serverStarted na początku index.ts"
echo "Opcja 2: Zmień CMD w Dockerfile na: CMD [\"bun\", \"run\", \"--no-install\", \"src/index.ts\"]"
echo "Opcja 3: Użyj wrapper script: CMD [\"/app/services/api-admin/start.sh\"]"