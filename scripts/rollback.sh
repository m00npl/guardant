#!/bin/bash

# GuardAnt Rollback Script
# Quick rollback to previous deployment for emergency situations

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-staging}"
NAMESPACE="guardant-$ENVIRONMENT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show usage
show_usage() {
    echo "Usage: $0 <environment> [options]"
    echo ""
    echo "Arguments:"
    echo "  environment    Target environment (staging|production)"
    echo ""
    echo "Options:"
    echo "  --list-backups    List available backups"
    echo "  --backup-id       Specific backup to restore (default: latest)"
    echo "  --force           Skip confirmation prompts"
    echo "  --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 staging"
    echo "  $0 production --backup-id 20240115-143022"
    echo "  $0 staging --list-backups"
}

# List available backups
list_backups() {
    log_info "Available backups for $ENVIRONMENT:"
    
    local backup_base="$PROJECT_ROOT/backups"
    if [[ ! -d "$backup_base" ]]; then
        log_warning "No backup directory found"
        return 1
    fi
    
    local backups=($(ls -t "$backup_base" | head -10))
    
    if [[ ${#backups[@]} -eq 0 ]]; then
        log_warning "No backups found"
        return 1
    fi
    
    echo "ID                 | Created           | Size    | Status"
    echo "-------------------|-------------------|---------|--------"
    
    for backup in "${backups[@]}"; do
        local backup_path="$backup_base/$backup"
        local created=$(date -r "$backup_path" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "Unknown")
        local size=$(du -sh "$backup_path" 2>/dev/null | cut -f1 || echo "Unknown")
        local status="Valid"
        
        # Check if backup has required files
        if [[ ! -f "$backup_path/k8s-state.yaml" ]] || [[ ! -f "$backup_path/database-backup.sql.gz" ]]; then
            status="Invalid"
        fi
        
        printf "%-18s | %-17s | %-7s | %s\n" "$backup" "$created" "$size" "$status"
    done
}

# Validate environment and prerequisites
validate_prerequisites() {
    log_info "Validating prerequisites for $ENVIRONMENT rollback..."
    
    # Validate environment
    if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
        log_error "Invalid environment: $ENVIRONMENT"
        log_error "Must be 'staging' or 'production'"
        exit 1
    fi
    
    # Extra safety for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        local context=$(kubectl config current-context)
        if [[ "$context" != *"production"* ]]; then
            log_error "kubectl context '$context' is not production"
            log_error "Cannot rollback production from non-production context"
            exit 1
        fi
        
        log_warning "PRODUCTION ROLLBACK INITIATED"
        log_warning "This will affect live users and services"
        
        if [[ "${FORCE:-false}" != "true" ]]; then
            read -p "Are you absolutely sure? Type 'ROLLBACK PRODUCTION' to continue: " confirmation
            if [[ "$confirmation" != "ROLLBACK PRODUCTION" ]]; then
                log_info "Rollback cancelled"
                exit 0
            fi
        fi
    fi
    
    # Check kubectl access
    if ! kubectl get ns "$NAMESPACE" > /dev/null 2>&1; then
        log_error "Cannot access namespace $NAMESPACE"
        exit 1
    fi
    
    log_success "Prerequisites validated"
}

# Get backup to restore
get_backup_to_restore() {
    local backup_base="$PROJECT_ROOT/backups"
    
    if [[ -n "${BACKUP_ID:-}" ]]; then
        BACKUP_PATH="$backup_base/$BACKUP_ID"
        if [[ ! -d "$BACKUP_PATH" ]]; then
            log_error "Backup $BACKUP_ID not found"
            exit 1
        fi
    else
        # Get latest backup
        local latest_backup=$(ls -t "$backup_base" | head -1 2>/dev/null || echo "")
        if [[ -z "$latest_backup" ]]; then
            log_error "No backups found"
            exit 1
        fi
        BACKUP_PATH="$backup_base/$latest_backup"
        BACKUP_ID="$latest_backup"
    fi
    
    # Validate backup
    if [[ ! -f "$BACKUP_PATH/k8s-state.yaml" ]]; then
        log_error "Invalid backup: missing k8s-state.yaml"
        exit 1
    fi
    
    if [[ ! -f "$BACKUP_PATH/database-backup.sql.gz" ]]; then
        log_error "Invalid backup: missing database-backup.sql.gz"
        exit 1
    fi
    
    log_info "Using backup: $BACKUP_ID"
    log_info "Backup path: $BACKUP_PATH"
}

# Create emergency backup before rollback
create_emergency_backup() {
    log_info "Creating emergency backup before rollback..."
    
    local emergency_backup="$PROJECT_ROOT/backups/emergency-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$emergency_backup"
    
    # Save current state
    kubectl get all -n "$NAMESPACE" -o yaml > "$emergency_backup/k8s-state.yaml"
    
    # Save current database
    local postgres_pod=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=postgresql -o jsonpath='{.items[0].metadata.name}')
    if [[ -n "$postgres_pod" ]]; then
        kubectl exec -n "$NAMESPACE" "$postgres_pod" -- pg_dump -U postgres "guardant_$ENVIRONMENT" | gzip > "$emergency_backup/database-backup.sql.gz"
    fi
    
    # Save current image versions
    kubectl get deployments -n "$NAMESPACE" -o jsonpath='{range .items[*]}{.metadata.name}{": "}{.spec.template.spec.containers[0].image}{"\n"}{end}' > "$emergency_backup/current-images.txt"
    
    log_success "Emergency backup created: $emergency_backup"
}

# Rollback Kubernetes resources
rollback_kubernetes() {
    log_info "Rolling back Kubernetes resources..."
    
    # Scale down current deployments
    log_info "Scaling down current deployments..."
    kubectl scale deployment --all --replicas=0 -n "$NAMESPACE"
    
    # Wait for pods to terminate
    log_info "Waiting for pods to terminate..."
    sleep 30
    
    # Apply backup state
    log_info "Applying backup state..."
    kubectl apply -f "$BACKUP_PATH/k8s-state.yaml"
    
    # Wait for deployments to be ready
    log_info "Waiting for rollback deployments to be ready..."
    local services=("admin-api" "public-api" "workers" "admin-frontend" "public-frontend")
    
    for service in "${services[@]}"; do
        log_info "Waiting for $service rollback..."
        kubectl rollout status deployment/$service -n "$NAMESPACE" --timeout=300s || {
            log_warning "$service rollback timed out, continuing..."
        }
    done
    
    log_success "Kubernetes resources rolled back"
}

# Rollback database
rollback_database() {
    log_info "Rolling back database..."
    
    local postgres_pod=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=postgresql -o jsonpath='{.items[0].metadata.name}')
    
    if [[ -z "$postgres_pod" ]]; then
        log_error "PostgreSQL pod not found"
        return 1
    fi
    
    # Drop and recreate database
    log_info "Dropping current database..."
    kubectl exec -n "$NAMESPACE" "$postgres_pod" -- psql -U postgres -c "DROP DATABASE IF EXISTS guardant_$ENVIRONMENT;"
    kubectl exec -n "$NAMESPACE" "$postgres_pod" -- psql -U postgres -c "CREATE DATABASE guardant_$ENVIRONMENT;"
    
    # Restore from backup
    log_info "Restoring database from backup..."
    gunzip -c "$BACKUP_PATH/database-backup.sql.gz" | kubectl exec -i -n "$NAMESPACE" "$postgres_pod" -- psql -U postgres "guardant_$ENVIRONMENT"
    
    log_success "Database rolled back"
}

# Verify rollback health
verify_rollback() {
    log_info "Verifying rollback health..."
    
    local max_attempts=20
    local attempt=1
    
    # Internal health checks first
    local services=("admin-api" "public-api" "workers" "admin-frontend" "public-frontend")
    
    for service in "${services[@]}"; do
        log_info "Checking $service health..."
        attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if kubectl exec -n "$NAMESPACE" deployment/$service -- curl -f -s http://localhost/health > /dev/null 2>&1; then
                log_success "$service is healthy"
                break
            fi
            
            if [ $attempt -eq $max_attempts ]; then
                log_error "$service health check failed after $max_attempts attempts"
                return 1
            fi
            
            log_info "Attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
            sleep 10
            ((attempt++))
        done
    done
    
    # External health checks
    if [[ "$ENVIRONMENT" == "production" ]]; then
        local endpoints=(
            "https://guardant.me/health"
            "https://admin.guardant.me/health"
            "https://api.guardant.me/health"
            "https://public.guardant.me/health"
        )
    else
        local endpoints=(
            "https://staging.guardant.me/health"
            "https://staging-admin.guardant.me/health"
            "https://staging-api.guardant.me/health"
            "https://staging-public.guardant.me/health"
        )
    fi
    
    for endpoint in "${endpoints[@]}"; do
        log_info "Checking external endpoint: $endpoint"
        attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if curl -f -s "$endpoint" > /dev/null; then
                log_success "$endpoint is accessible"
                break
            fi
            
            if [ $attempt -eq $max_attempts ]; then
                log_warning "$endpoint is not accessible (may be DNS propagation delay)"
            else
                sleep 15
                ((attempt++))
            fi
        done
    done
    
    log_success "Rollback verification completed"
}

# Send rollback notification
send_rollback_notification() {
    local status="$1"
    local webhook_url="${SLACK_WEBHOOK_URL:-}"
    
    if [[ -n "$webhook_url" ]]; then
        local message
        if [[ "$status" == "success" ]]; then
            message="⏪ GuardAnt $ENVIRONMENT rollback completed successfully! Backup: $BACKUP_ID"
        else
            message="🚨 GuardAnt $ENVIRONMENT rollback failed! Backup: $BACKUP_ID - Manual intervention required"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$webhook_url" || true
    fi
}

# Main rollback function
main() {
    # Parse command line arguments
    BACKUP_ID=""
    FORCE="false"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --list-backups)
                list_backups
                exit 0
                ;;
            --backup-id)
                BACKUP_ID="$2"
                shift 2
                ;;
            --force)
                FORCE="true"
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                shift
                ;;
        esac
    done
    
    log_info "Starting GuardAnt $ENVIRONMENT rollback..."
    
    # Validate and prepare
    validate_prerequisites
    get_backup_to_restore
    
    # Create emergency backup
    create_emergency_backup
    
    # Execute rollback
    log_info "Beginning rollback process..."
    
    rollback_kubernetes
    rollback_database
    verify_rollback
    
    log_success "GuardAnt $ENVIRONMENT rollback completed successfully!"
    log_info "Rolled back to: $BACKUP_ID"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_info "Production URLs:"
        log_info "  Public Site: https://guardant.me"
        log_info "  Admin Panel: https://admin.guardant.me"
    else
        log_info "Staging URLs:"
        log_info "  Public Site: https://staging.guardant.me"
        log_info "  Admin Panel: https://staging-admin.guardant.me"
    fi
    
    send_rollback_notification "success"
}

# Error handler
handle_error() {
    log_error "Rollback failed at line $1"
    send_rollback_notification "failed"
    exit 1
}

# Set up error handling
trap 'handle_error $LINENO' ERR

# Run main function
main "$@"