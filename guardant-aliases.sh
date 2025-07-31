#!/bin/bash

# GuardAnt aliases for container management

# Basic update - pulls git and rebuilds changed containers
alias gupdate='cd /Users/moon/guardant-new && ./update-containers.sh'

# Smart rebuild with options
alias grebuild='cd /Users/moon/guardant-new && ./smart-rebuild.sh'

# Quick commands
alias grebuild-all='cd /Users/moon/guardant-new && ./smart-rebuild.sh --all --yes'
alias grebuild-force='cd /Users/moon/guardant-new && ./smart-rebuild.sh --force --yes'

# Docker compose shortcuts with proper spacing
alias dc='docker compose'
alias dcup='docker compose up -d'
alias dcdown='docker compose down'
alias dcps='docker compose ps'
alias dclogs='docker compose logs -f'
alias dcbuild='docker compose build'

# GuardAnt specific
alias guardant-status='docker compose ps'
alias guardant-logs='docker compose logs -f'
alias guardant-restart='docker compose restart'
alias guardant-rebuild='cd /Users/moon/guardant-new && ./smart-rebuild.sh'

# Quick access to specific service logs
alias logs-admin='docker compose logs -f guardant-admin-api'
alias logs-frontend='docker compose logs -f guardant-admin-frontend'
alias logs-scheduler='docker compose logs -f guardant-scheduler'
alias logs-redis='docker compose logs -f guardant-redis'
alias logs-nginx='docker compose logs -f guardant-nginx'

# Helpful info
alias guardant-help='echo "
🐜 GuardAnt Docker Commands:

Update & Rebuild:
  gupdate          - Pull git changes and rebuild affected containers
  grebuild         - Smart rebuild with options (interactive)
  grebuild-all     - Rebuild all containers (no confirmation)
  grebuild-force   - Force rebuild even without changes

Docker Compose:
  dc              - docker compose
  dcup            - docker compose up -d
  dcdown          - docker compose down
  dcps            - docker compose ps
  dclogs          - docker compose logs -f

GuardAnt Specific:
  guardant-status  - Show all container status
  guardant-logs    - Follow all logs
  guardant-restart - Restart all containers
  
Service Logs:
  logs-admin      - Admin API logs
  logs-frontend   - Frontend logs
  logs-scheduler  - Scheduler logs
  logs-redis      - Redis logs
  logs-nginx      - Nginx logs
"'