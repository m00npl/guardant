#!/bin/bash

# GuardAnt Worker Interactive Configuration Script

set -e

# Colors for better UX
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
INSTALL_DIR=${INSTALL_DIR:-/opt/guardant-worker}
REGISTRATION_URL="https://guardant.me/api/public/workers/register"

# ASCII Art
echo -e "${BLUE}"
echo "   _____                     _    _              _   "
echo "  / ____|                   | |  | |   /\       | |  "
echo " | |  __ _   _  __ _ _ __  __| |  | |  /  \   _ __| |_ "
echo " | | |_ | | | |/ _\` | '__/ _\` |  | | / /\ \ | '_ \ __|"
echo " | |__| | |_| | (_| | | | (_| |  | |/ ____ \| | | | |_ "
echo "  \_____|\__,_|\__,_|_|  \__,_|  |_/_/    \_\_| |_|\__|"
echo ""
echo "        🐜 Worker Ant Configuration 🐜"
echo -e "${NC}"
echo ""

# Function to validate email
validate_email() {
    if [[ "$1" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function to validate worker name
validate_worker_name() {
    if [[ "$1" =~ ^[a-zA-Z0-9-]+$ ]] && [ ${#1} -le 30 ]; then
        return 0
    else
        return 1
    fi
}

# Function to validate number
validate_number() {
    if [[ "$1" =~ ^[0-9]+$ ]] && [ "$1" -ge 1 ] && [ "$1" -le 10 ]; then
        return 0
    else
        return 1
    fi
}

# Get email
while true; do
    echo -e "${GREEN}📧 Please enter your email address:${NC}"
    read -p "> " OWNER_EMAIL < /dev/tty
    
    if validate_email "$OWNER_EMAIL"; then
        echo -e "${BLUE}✓ Email address confirmed${NC}"
        break
    else
        echo -e "${RED}✗ Invalid email format. Please try again.${NC}"
    fi
done

echo ""

# Get worker name prefix
while true; do
    echo -e "${GREEN}🐜 Choose a name for your Worker Ants (optional):${NC}"
    echo -e "${YELLOW}   Leave blank for auto-generated names${NC}"
    echo -e "${YELLOW}   Use only letters, numbers, and hyphens (max 30 characters)${NC}"
    read -p "> " WORKER_NAME < /dev/tty
    
    if [ -z "$WORKER_NAME" ]; then
        WORKER_NAME="worker-$(hostname)-$(date +%s)"
        echo -e "${BLUE}✓ Auto-generated name will be used${NC}"
        break
    elif validate_worker_name "$WORKER_NAME"; then
        echo -e "${BLUE}✓ Worker name accepted${NC}"
        break
    else
        echo -e "${RED}✗ Invalid name format. Please use only letters, numbers, and hyphens.${NC}"
    fi
done

echo ""

# Get number of workers
while true; do
    echo -e "${GREEN}🔢 How many Worker Ants would you like to deploy? (1-10):${NC}"
    read -p "> " WORKER_COUNT < /dev/tty
    
    if validate_number "$WORKER_COUNT"; then
        if [ "$WORKER_COUNT" -eq 1 ]; then
            echo -e "${BLUE}✓ 1 worker will be deployed${NC}"
        else
            echo -e "${BLUE}✓ $WORKER_COUNT workers will be deployed${NC}"
        fi
        break
    else
        echo -e "${RED}✗ Please enter a number between 1 and 10${NC}"
    fi
done

echo ""

# Show configuration summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📋 Configuration Summary:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Email:        ${YELLOW}$OWNER_EMAIL${NC}"
echo -e "  Worker Name:  ${YELLOW}$WORKER_NAME${NC}"
echo -e "  Worker Count: ${YELLOW}$WORKER_COUNT${NC}"
echo -e "  Install Dir:  ${YELLOW}$INSTALL_DIR${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Confirm installation
echo -e "${GREEN}Would you like to proceed with the installation? (y/N):${NC}"
read -p "> " CONFIRM < /dev/tty

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${RED}❌ Installation cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}🚀 Starting installation...${NC}"
echo ""

# Export variables for install script
export OWNER_EMAIL
export WORKER_COUNT
export WORKER_NAME
export INSTALL_DIR

# Download and run install script
if command -v curl &> /dev/null; then
    curl -sSL https://raw.githubusercontent.com/m00npl/guardant-worker/main/install.sh | bash
elif command -v wget &> /dev/null; then
    wget -qO- https://raw.githubusercontent.com/m00npl/guardant-worker/main/install.sh | bash
else
    echo -e "${RED}❌ Neither curl nor wget found. Please install one of them.${NC}"
    exit 1
fi

# Show completion message with next steps
echo ""
echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "1. ${YELLOW}Admin will receive notification for: $OWNER_EMAIL${NC}"
echo -e "2. ${YELLOW}Check your email or GuardAnt dashboard for approval${NC}"
echo -e "3. ${YELLOW}Workers will start automatically once approved${NC}"
echo ""
echo -e "${BLUE}📊 Useful commands:${NC}"
echo -e "  Check status:  ${GREEN}cd $INSTALL_DIR && docker compose ps${NC}"
echo -e "  View logs:     ${GREEN}cd $INSTALL_DIR && docker compose logs -f${NC}"
echo -e "  Stop workers:  ${GREEN}cd $INSTALL_DIR && docker compose down${NC}"
echo -e "  Start workers: ${GREEN}cd $INSTALL_DIR && docker compose up -d${NC}"
echo ""
echo -e "${BLUE}📍 Worker location:${NC} ${YELLOW}$INSTALL_DIR${NC}"
echo ""
echo -e "${GREEN}Thank you for joining the GuardAnt Worker Network! 🐜${NC}"