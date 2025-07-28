#!/bin/bash

# GuardAnt Development Startup Script
# Uruchamia wszystkie serwisy lokalnie bez Dockera

echo "🐜 Starting GuardAnt Development Environment"
echo "============================================="

# Sprawdź czy Bun jest zainstalowany
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install it first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Sprawdź czy Redis jest uruchomiony
if ! pgrep -f "redis-server" > /dev/null; then
    echo "⚠️  Redis is not running. Please start Redis:"
    echo "   brew services start redis  # macOS"
    echo "   sudo systemctl start redis # Linux"
    echo ""
    echo "Continuing anyway (services will use fallback)..."
fi

# Funkcja do uruchamiania serwisu w tle
start_service() {
    local name=$1
    local path=$2
    local port=$3
    local env_vars=$4
    
    echo "🚀 Starting $name on port $port..."
    cd "$path"
    
    # Zainstaluj zależności jeśli nie ma node_modules
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies for $name..."
        bun install
    fi
    
    # Uruchom serwis w tle
    eval "$env_vars bun --hot src/index.ts" > "../../logs/${name}.log" 2>&1 &
    local pid=$!
    echo $pid > "../../logs/${name}.pid"
    echo "✅ $name started (PID: $pid)"
    cd - > /dev/null
}

# Funkcja do uruchamiania frontendu
start_frontend() {
    local name=$1
    local path=$2
    local port=$3
    local env_vars=$4
    
    echo "🚀 Starting $name on port $port..."
    cd "$path"
    
    # Zainstaluj zależności jeśli nie ma node_modules
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies for $name..."
        bun install
    fi
    
    # Uruchom frontend w tle
    eval "$env_vars bun run dev" > "../../logs/${name}.log" 2>&1 &
    local pid=$!
    echo $pid > "../../logs/${name}.pid"
    echo "✅ $name started (PID: $pid)"
    cd - > /dev/null
}

# Stwórz folder na logi
mkdir -p logs

# Wyczyść stare pliki PID
rm -f logs/*.pid

echo ""
echo "📚 Installing shared packages..."
cd packages/shared-types && bun install && cd ../..
cd packages/golem-storage && bun install && cd ../..
cd packages/ui-components && bun install && cd ../..

echo ""
echo "🔧 Starting backend services..."

# Admin API (port 3001)
start_service "Admin API" "services/api-admin" "3001" "NODE_ENV=development REDIS_HOST=localhost REDIS_PORT=6379 JWT_SECRET=dev-secret-key PORT=3001"

# Public API (port 3002)  
start_service "Public API" "services/api-public" "3002" "NODE_ENV=development REDIS_HOST=localhost REDIS_PORT=6379 PORT=3002"

# Workers
start_service "Workers" "services/workers" "3099" "NODE_ENV=development REDIS_HOST=localhost REDIS_PORT=6379 WORKER_ANT_ID=ant-local-dev WORKER_CONCURRENCY=5 WORKER_ANT_PRESET=advanced HEALTH_PORT=3099"

echo ""
echo "🎨 Starting frontend services..."

# Admin Frontend (port 5173)
start_frontend "Admin Frontend" "apps/frontend-admin" "5173" "VITE_API_URL=http://localhost:3001"

# Status Frontend (port 5174)
start_frontend "Status Frontend" "apps/frontend-status" "5174" "VITE_PUBLIC_API_URL=http://localhost:3002"

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

echo ""
echo "🎉 GuardAnt Development Environment Started!"
echo "============================================="
echo ""
echo "📱 Admin Panel:    http://localhost:5173"
echo "📊 Status Page:    http://localhost:5174?nest=demo"
echo "🔧 Admin API:      http://localhost:3001"
echo "📡 Public API:     http://localhost:3002"
echo "👷 Workers Health: http://localhost:3099/health"
echo ""
echo "📝 Logs are available in ./logs/"
echo "🛑 To stop all services, run: ./dev-stop.sh"
echo ""
echo "🐜 Happy coding with GuardAnt!"