#!/bin/bash

# GuardAnt Development Stop Script
# Zatrzymuje wszystkie serwisy uruchomione przez dev-start.sh

echo "🛑 Stopping GuardAnt Development Environment"
echo "============================================"

# Funkcja do zatrzymywania serwisu
stop_service() {
    local name=$1
    local pid_file="logs/${name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "🔸 Stopping $name (PID: $pid)..."
            kill $pid
            rm -f "$pid_file"
            echo "✅ $name stopped"
        else
            echo "⚠️  $name was not running"
            rm -f "$pid_file"
        fi
    else
        echo "⚠️  No PID file found for $name"
    fi
}

# Zatrzymaj wszystkie serwisy
stop_service "Admin API"
stop_service "Public API" 
stop_service "Workers"
stop_service "Admin Frontend"
stop_service "Status Frontend"

# Wyczyść pozostałe procesy Node/Bun na portach deweloperskich
echo ""
echo "🧹 Cleaning up any remaining processes..."

# Znajdź i zabij procesy na naszych portach
for port in 3001 3002 3099 5173 5174; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "🔸 Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null
    fi
done

echo ""
echo "✅ All GuardAnt services stopped!"
echo "🐜 Thanks for using GuardAnt!"