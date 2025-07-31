#!/bin/bash

# Smart rebuild script for GuardAnt
# Rebuilds only affected containers based on git changes

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
REBUILD_ALL=false
FORCE_REBUILD=false
SKIP_CONFIRM=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --all|-a)
            REBUILD_ALL=true
            shift
            ;;
        --force|-f)
            FORCE_REBUILD=true
            shift
            ;;
        --yes|-y)
            SKIP_CONFIRM=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --all, -a     Rebuild all containers"
            echo "  --force, -f   Force rebuild even if no git changes"
            echo "  --yes, -y     Skip confirmation prompts"
            echo "  --help, -h    Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Header
echo -e "${PURPLE}╔════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║     🐜 GuardAnt Smart Rebuild 🐜       ║${NC}"
echo -e "${PURPLE}╚════════════════════════════════════════╝${NC}"

# Function to check if docker compose is running
check_docker() {
    if ! docker compose version &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not running or not installed!${NC}"
        exit 1
    fi
}

# Check Docker
check_docker

# Store current branch and commit
CURRENT_BRANCH=$(git branch --show-current)
CURRENT_COMMIT=$(git rev-parse HEAD)

# Stash any local changes
echo -e "\n${YELLOW}💾 Checking for local changes...${NC}"
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}📦 Stashing local changes...${NC}"
    git stash push -m "Auto-stash before update $(date +%Y%m%d_%H%M%S)"
    STASHED=true
else
    STASHED=false
fi

# Pull latest changes
echo -e "\n${YELLOW}📥 Pulling latest changes from ${CURRENT_BRANCH}...${NC}"
git pull origin $CURRENT_BRANCH

# Get new commit
NEW_COMMIT=$(git rev-parse HEAD)

# Check if we need to rebuild
if [ "$CURRENT_COMMIT" = "$NEW_COMMIT" ] && [ "$FORCE_REBUILD" = false ] && [ "$REBUILD_ALL" = false ]; then
    echo -e "${GREEN}✅ No changes detected. Everything is up to date!${NC}"
    
    # Restore stashed changes if any
    if [ "$STASHED" = true ]; then
        echo -e "\n${YELLOW}📦 Restoring stashed changes...${NC}"
        git stash pop
    fi
    
    exit 0
fi

# Service mapping
declare -A SERVICE_MAP=(
    ["admin-frontend"]="apps/frontend-admin"
    ["admin-api"]="services/api-admin"
    ["public-api"]="services/api-status"
    ["monitoring-scheduler"]="services/scheduler"
    ["redis"]="redis"
    ["nginx-proxy"]="nginx"
    ["rabbitmq"]="rabbitmq"
    ["vault"]="vault"
)

# Services to rebuild
declare -A SERVICES_TO_REBUILD

# Function to add service with reason
add_service_with_reason() {
    local service=$1
    local reason=$2
    SERVICES_TO_REBUILD[$service]="$reason"
}

# If rebuild all, add all services
if [ "$REBUILD_ALL" = true ]; then
    echo -e "\n${YELLOW}🔄 Rebuild all mode - adding all services...${NC}"
    for service in "${!SERVICE_MAP[@]}"; do
        add_service_with_reason "$service" "Full rebuild requested"
    done
else
    # Analyze changes
    echo -e "\n${YELLOW}🔍 Analyzing changes between commits...${NC}"
    echo -e "${BLUE}  Old: ${CURRENT_COMMIT:0:8}${NC}"
    echo -e "${BLUE}  New: ${NEW_COMMIT:0:8}${NC}"
    
    CHANGED_FILES=$(git diff --name-only $CURRENT_COMMIT $NEW_COMMIT)
    
    while IFS= read -r file; do
        [ -z "$file" ] && continue
        
        # Frontend Admin
        if [[ $file =~ ^apps/frontend-admin/ ]]; then
            add_service_with_reason "admin-frontend" "$file"
        fi
        
        # Admin API
        if [[ $file =~ ^services/api-admin/ ]] || [[ $file =~ ^packages/auth-system/ ]]; then
            add_service_with_reason "admin-api" "$file"
        fi
        
        # Status API
        if [[ $file =~ ^services/api-status/ ]]; then
            add_service_with_reason "public-api" "$file"
        fi
        
        # Scheduler
        if [[ $file =~ ^services/scheduler/ ]]; then
            add_service_with_reason "monitoring-scheduler" "$file"
        fi
        
        # Redis
        if [[ $file == "redis.conf" ]] || [[ $file =~ ^redis/ ]]; then
            add_service_with_reason "redis" "$file"
        fi
        
        # Nginx
        if [[ $file =~ ^nginx/ ]] || [[ $file == "nginx.conf" ]]; then
            add_service_with_reason "nginx-proxy" "$file"
        fi
        
        # Docker Compose
        if [[ $file == "docker-compose.yml" ]] || [[ $file =~ ^docker-compose.*\.yml$ ]]; then
            echo -e "${YELLOW}  ⚠️  Docker Compose changed: $file${NC}"
        fi
        
        # Shared packages
        if [[ $file =~ ^packages/ ]] && [[ ! $file =~ ^packages/auth-system/ ]]; then
            echo -e "${YELLOW}  📦 Shared package changed: $file${NC}"
            # Add services that depend on shared packages
            add_service_with_reason "guardant-admin-api" "$file (shared package)"
            add_service_with_reason "guardant-scheduler" "$file (shared package)"
        fi
    done <<< "$CHANGED_FILES"
fi

# Check if any services need rebuilding
if [ ${#SERVICES_TO_REBUILD[@]} -eq 0 ] && [ "$FORCE_REBUILD" = false ]; then
    echo -e "\n${GREEN}✅ No containers need rebuilding.${NC}"
    
    # Restore stashed changes
    if [ "$STASHED" = true ]; then
        echo -e "\n${YELLOW}📦 Restoring stashed changes...${NC}"
        git stash pop
    fi
    
    exit 0
fi

# Display rebuild plan
echo -e "\n${PURPLE}📋 Rebuild Plan:${NC}"
echo -e "${PURPLE}─────────────────────────────────${NC}"
for service in "${!SERVICES_TO_REBUILD[@]}"; do
    reason="${SERVICES_TO_REBUILD[$service]}"
    echo -e "${GREEN}  ✓ ${service}${NC}"
    if [ "$reason" != "Full rebuild requested" ] && [ "$reason" != "Forced rebuild" ]; then
        echo -e "${BLUE}    └─ ${reason}${NC}"
    fi
done

# Confirm
if [ "$SKIP_CONFIRM" = false ]; then
    echo -e "\n${YELLOW}❓ Proceed with rebuild? (y/n)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Operation cancelled.${NC}"
        
        # Restore stashed changes
        if [ "$STASHED" = true ]; then
            echo -e "\n${YELLOW}📦 Restoring stashed changes...${NC}"
            git stash pop
        fi
        
        exit 0
    fi
fi

# Rebuild process
echo -e "\n${GREEN}🔨 Starting rebuild process...${NC}"
echo -e "${GREEN}═══════════════════════════════════${NC}"

FAILED_SERVICES=()

for service in "${!SERVICES_TO_REBUILD[@]}"; do
    echo -e "\n${PURPLE}🔧 Processing ${service}...${NC}"
    
    # Stop
    echo -e "  ${YELLOW}↓ Stopping...${NC}"
    if ! docker compose stop $service 2>/dev/null; then
        echo -e "  ${YELLOW}⚠️  Service not running${NC}"
    fi
    
    # Remove
    echo -e "  ${YELLOW}🗑️  Removing container...${NC}"
    docker compose rm -f $service 2>/dev/null
    
    # Build with no cache
    echo -e "  ${YELLOW}🏗️  Building (no cache)...${NC}"
    if docker compose build --no-cache $service; then
        # Start
        echo -e "  ${YELLOW}↑ Starting...${NC}"
        if docker compose up -d $service; then
            echo -e "  ${GREEN}✅ Successfully updated!${NC}"
        else
            echo -e "  ${RED}❌ Failed to start!${NC}"
            FAILED_SERVICES+=($service)
        fi
    else
        echo -e "  ${RED}❌ Build failed!${NC}"
        FAILED_SERVICES+=($service)
    fi
done

# Summary
echo -e "\n${PURPLE}═══════════════════════════════════${NC}"
if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
    echo -e "${GREEN}🎉 All services updated successfully!${NC}"
else
    echo -e "${RED}⚠️  Some services failed:${NC}"
    for service in "${FAILED_SERVICES[@]}"; do
        echo -e "${RED}  ✗ $service${NC}"
    done
fi

# Show status
echo -e "\n${YELLOW}📊 Container Status:${NC}"
docker compose ps

# Restore stashed changes
if [ "$STASHED" = true ]; then
    echo -e "\n${YELLOW}📦 Restoring stashed changes...${NC}"
    git stash pop
fi

echo -e "\n${PURPLE}✨ Done!${NC}"