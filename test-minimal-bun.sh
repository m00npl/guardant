#!/bin/bash

echo "🧪 Test minimalnego serwera Bun"

# 1. Zatrzymaj admin-api
echo -e "\n1. Zatrzymywanie admin-api..."
docker compose stop admin-api

# 2. Uruchom kontener interaktywnie z minimalnym serwerem
echo -e "\n2. Tworzenie minimalnego serwera..."
cat > /tmp/minimal-bun-server.js << 'EOF'
console.log("Starting minimal Bun server test...");
console.log("Process info:", { pid: process.pid, platform: process.platform });

// Test 1: Random port
try {
  const server1 = Bun.serve({
    port: 0,
    fetch: () => new Response("Test OK")
  });
  console.log("✅ Random port test successful:", server1.port);
  server1.stop();
} catch (e) {
  console.error("❌ Random port test failed:", e);
}

// Wait a bit
await new Promise(r => setTimeout(r, 1000));

// Test 2: Port 3002
console.log("\nTrying port 3002...");
try {
  const server2 = Bun.serve({
    port: 3002,
    hostname: "0.0.0.0",
    fetch: () => new Response("Test OK on 3002")
  });
  console.log("✅ Port 3002 test successful!");
  console.log("Server details:", {
    port: server2.port,
    hostname: server2.hostname,
    url: server2.url
  });
  
  // Keep running
  console.log("Server is running. Press Ctrl+C to stop.");
} catch (e) {
  console.error("❌ Port 3002 test failed:", e);
  console.error("Error details:", {
    name: e.name,
    message: e.message,
    code: e.code,
    errno: e.errno,
    syscall: e.syscall
  });
}
EOF

# 3. Uruchom w kontenerze z volume
echo -e "\n3. Uruchamianie testu w kontenerze admin-api..."
docker run --rm -it \
  --name test-bun-server \
  --network guardant_guardant-network \
  -v /tmp/minimal-bun-server.js:/test.js \
  -p 4040:3002 \
  guardant-admin-api \
  bun run /test.js