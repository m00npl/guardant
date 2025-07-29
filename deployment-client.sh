#!/bin/bash

# Deployment API client for guardant.me
API_BASE="https://guardant.me/api/admin"
DEPLOYMENT_TOKEN_FILE="$HOME/.guardant-deployment-token"

# Function to get deployment token
function get_deployment_token() {
    # Check if we have a saved token
    if [ -f "$DEPLOYMENT_TOKEN_FILE" ]; then
        DEPLOYMENT_TOKEN=$(cat "$DEPLOYMENT_TOKEN_FILE")
        return
    fi
    
    # Otherwise, login and get a deployment token
    echo "🔐 Please login to get deployment token..."
    read -p "Email: " email
    read -s -p "Password: " password
    echo
    
    # Login
    LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}")
    
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.tokens.accessToken')
    
    if [ "$ACCESS_TOKEN" == "null" ]; then
        echo "❌ Login failed"
        exit 1
    fi
    
    # Get deployment token
    TOKEN_RESPONSE=$(curl -s -X POST "$API_BASE/deployment/token" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json")
    
    DEPLOYMENT_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.token')
    
    if [ "$DEPLOYMENT_TOKEN" == "null" ]; then
        echo "❌ Failed to get deployment token"
        exit 1
    fi
    
    # Save token
    echo "$DEPLOYMENT_TOKEN" > "$DEPLOYMENT_TOKEN_FILE"
    chmod 600 "$DEPLOYMENT_TOKEN_FILE"
    echo "✅ Deployment token saved"
}

function deploy_api() {
    local endpoint=$1
    local method=${2:-GET}
    local data=${3:-}
    
    # Ensure we have a token
    if [ -z "$DEPLOYMENT_TOKEN" ]; then
        get_deployment_token
    fi
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE/deployment/$endpoint" \
            -H "Authorization: Bearer $DEPLOYMENT_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE/deployment/$endpoint" \
            -H "Authorization: Bearer $DEPLOYMENT_TOKEN")
    fi
    
    # Extract body and status code
    body=$(echo "$response" | sed '$d')
    status_code=$(echo "$response" | tail -1)
    
    # Check if token expired
    if [ "$status_code" == "401" ]; then
        echo "🔄 Token expired, getting new one..."
        rm -f "$DEPLOYMENT_TOKEN_FILE"
        DEPLOYMENT_TOKEN=""
        get_deployment_token
        # Retry the request
        deploy_api "$@"
        return
    fi
    
    echo "$body" | jq .
}

case "$1" in
    logs)
        service=${2:-admin-api}
        tail=${3:-50}
        grep=${4:-}
        echo "📋 Getting logs for $service (last $tail lines)..."
        if [ -n "$grep" ]; then
            deploy_api "logs/$service?tail=$tail&grep=$grep"
        else
            deploy_api "logs/$service?tail=$tail"
        fi
        ;;
    
    restart)
        service=$2
        if [ -z "$service" ]; then
            echo "Usage: $0 restart <service>"
            exit 1
        fi
        echo "🔄 Restarting $service..."
        deploy_api "restart/$service" POST
        ;;
    
    build)
        service=$2
        if [ -z "$service" ]; then
            echo "Usage: $0 build <service>"
            exit 1
        fi
        echo "🔨 Building and deploying $service..."
        deploy_api "build/$service" POST
        ;;
    
    deploy)
        echo "🚀 Starting full deployment..."
        deploy_api "deploy" POST
        ;;
    
    status)
        echo "📊 Service status:"
        deploy_api "status"
        ;;
    
    exec)
        command=$2
        if [ -z "$command" ]; then
            echo "Usage: $0 exec '<command>'"
            exit 1
        fi
        echo "🖥️  Executing: $command"
        deploy_api "exec" POST "{\"command\":\"$command\"}"
        ;;
    
    rabbitmq-logs)
        echo "📋 RabbitMQ connection logs from admin-api:"
        deploy_api "logs/admin-api?tail=100&grep=RabbitMQ|rabbitmq"
        ;;
    
    worker-logs)
        echo "📋 Worker logs:"
        deploy_api "logs/monitoring-worker-1?tail=50"
        ;;
    
    logout)
        echo "🔐 Removing saved deployment token..."
        rm -f "$DEPLOYMENT_TOKEN_FILE"
        echo "✅ Logged out"
        ;;
    
    *)
        echo "GuardAnt Deployment API Client"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  logs <service> [tail] [grep]  - Get logs from a service"
        echo "  restart <service>              - Restart a service"
        echo "  build <service>                - Build and deploy a service"
        echo "  deploy                         - Full deployment (pull, build, deploy)"
        echo "  status                         - Show service status"
        echo "  exec '<command>'               - Execute allowed command"
        echo "  rabbitmq-logs                  - Show RabbitMQ connection logs"
        echo "  worker-logs                    - Show worker logs"
        echo "  logout                         - Remove saved deployment token"
        echo ""
        echo "Examples:"
        echo "  $0 logs admin-api 100"
        echo "  $0 logs admin-api 50 'error|warn'"
        echo "  $0 restart admin-api"
        echo "  $0 build admin-api"
        echo "  $0 exec 'docker ps'"
        echo ""
        echo "First use will prompt for login credentials."
        ;;
esac