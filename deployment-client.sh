#!/bin/bash

# Deployment API client for guardant.me
API_BASE="https://guardant.me/api/admin/deployment"
TOKEN="${DEPLOYMENT_TOKEN:-your-deployment-token-123}"

function deploy_api() {
    local endpoint=$1
    local method=${2:-GET}
    local data=${3:-}
    
    if [ -n "$data" ]; then
        curl -s -X $method "$API_BASE/$endpoint" \
            -H "X-Deployment-Token: $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" | jq .
    else
        curl -s -X $method "$API_BASE/$endpoint" \
            -H "X-Deployment-Token: $TOKEN" | jq .
    fi
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
        echo ""
        echo "Examples:"
        echo "  $0 logs admin-api 100"
        echo "  $0 logs admin-api 50 'error|warn'"
        echo "  $0 restart admin-api"
        echo "  $0 build admin-api"
        echo "  $0 exec 'docker ps'"
        ;;
esac