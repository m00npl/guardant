#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 GuardAnt Container Update Script${NC}"
echo -e "${GREEN}=====================================>${NC}"

# Store the current commit hash
CURRENT_COMMIT=$(git rev-parse HEAD)

# Pull latest changes
echo -e "\n${YELLOW}📥 Pulling latest changes from git...${NC}"
git pull

# Get the new commit hash
NEW_COMMIT=$(git rev-parse HEAD)

# Check if there were any changes
if [ "$CURRENT_COMMIT" = "$NEW_COMMIT" ]; then
    echo -e "${GREEN}✅ No changes detected. Everything is up to date!${NC}"
    exit 0
fi

# Get list of changed files
echo -e "\n${YELLOW}🔍 Detecting changed files...${NC}"
CHANGED_FILES=$(git diff --name-only $CURRENT_COMMIT $NEW_COMMIT)

# Initialize arrays to track which services need rebuilding
declare -A SERVICES_TO_REBUILD

# Function to add service to rebuild list
add_service() {
    local service=$1
    if [ -z "${SERVICES_TO_REBUILD[$service]}" ]; then
        SERVICES_TO_REBUILD[$service]=1
        echo -e "${GREEN}  ✓ Will rebuild: $service${NC}"
    fi
}

# Analyze changed files and determine which containers to rebuild
echo -e "\n${YELLOW}📋 Analyzing changes...${NC}"
while IFS= read -r file; do
    echo -e "  • $file"
    
    # Frontend Admin
    if [[ $file == apps/frontend-admin/* ]] || [[ $file == frontends/admin/* ]]; then
        add_service "admin-frontend"
    fi
    
    # Admin API
    if [[ $file == services/api-admin/* ]] || [[ $file == packages/auth-system/* ]]; then
        add_service "admin-api"
    fi
    
    # Status API
    if [[ $file == services/api-status/* ]]; then
        add_service "public-api"
    fi
    
    # Scheduler
    if [[ $file == services/scheduler/* ]]; then
        add_service "monitoring-scheduler"
    fi
    
    # Redis config
    if [[ $file == redis.conf ]]; then
        add_service "redis"
    fi
    
    # Nginx config
    if [[ $file == nginx/* ]] || [[ $file == nginx.conf ]]; then
        add_service "nginx-proxy"
    fi
    
    # Docker compose changes
    if [[ $file == docker-compose.yml ]] || [[ $file == docker-compose*.yml ]]; then
        echo -e "${YELLOW}  ⚠️  Docker Compose file changed - may need to rebuild all services${NC}"
    fi
    
    # Shared packages that affect multiple services
    if [[ $file == packages/* ]] && [[ $file != packages/auth-system/* ]]; then
        echo -e "${YELLOW}  ⚠️  Shared package changed - multiple services may be affected${NC}"
    fi
done <<< "$CHANGED_FILES"

# Check if any services need rebuilding
if [ ${#SERVICES_TO_REBUILD[@]} -eq 0 ]; then
    echo -e "\n${YELLOW}ℹ️  No container-specific changes detected.${NC}"
    echo -e "${YELLOW}   Changed files don't affect any containers directly.${NC}"
    exit 0
fi

# Show summary
echo -e "\n${YELLOW}📦 Containers to rebuild:${NC}"
for service in "${!SERVICES_TO_REBUILD[@]}"; do
    echo -e "  • $service"
done

# Confirm before proceeding
echo -e "\n${YELLOW}❓ Proceed with rebuild? (y/n)${NC}"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Operation cancelled.${NC}"
    exit 0
fi

# Rebuild each affected service
echo -e "\n${GREEN}🔨 Starting rebuild process...${NC}"
for service in "${!SERVICES_TO_REBUILD[@]}"; do
    echo -e "\n${YELLOW}🔧 Processing $service...${NC}"
    
    # Stop the container
    echo -e "  ${YELLOW}↓ Stopping $service...${NC}"
    docker compose stop $service
    
    # Remove the container
    echo -e "  ${YELLOW}🗑️  Removing $service container...${NC}"
    docker compose rm -f $service
    
    # Rebuild with no cache
    echo -e "  ${YELLOW}🏗️  Building $service (no cache)...${NC}"
    docker compose build --no-cache $service
    
    # Start the container
    echo -e "  ${YELLOW}↑ Starting $service...${NC}"
    docker compose up -d $service
    
    echo -e "  ${GREEN}✅ $service updated successfully!${NC}"
done

# Show final status
echo -e "\n${GREEN}🎉 All updates completed!${NC}"
echo -e "${GREEN}=====================================>${NC}"

# Show running containers
echo -e "\n${YELLOW}📊 Current container status:${NC}"
docker compose ps