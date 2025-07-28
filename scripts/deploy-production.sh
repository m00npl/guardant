#!/bin/bash

# GuardAnt Production Deployment Script
# Secure production deployment with blue-green strategy and comprehensive validation

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PRODUCTION_ENV="production"
NAMESPACE="guardant-production"
REGISTRY="${REGISTRY:-ghcr.io/guardant/guardant}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DEPLOYMENT_STRATEGY="${DEPLOYMENT_STRATEGY:-blue-green}"

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

# Critical safety checks for production
production_safety_checks() {
    log_info "Performing production safety checks..."
    
    # Verify kubectl context is production
    CURRENT_CONTEXT=$(kubectl config current-context)
    if [[ "$CURRENT_CONTEXT" != *"production"* ]]; then
        log_error "kubectl context '$CURRENT_CONTEXT' is not a production context"
        log_error "Production deployment aborted for safety"
        exit 1
    fi
    
    # Verify we're deploying a tagged release, not latest
    if [[ "$IMAGE_TAG" == "latest" ]]; then
        log_error "Cannot deploy 'latest' tag to production"
        log_error "Please specify a specific version tag"
        exit 1
    fi
    
    # Verify staging deployment is healthy
    log_info "Checking staging environment health..."
    if ! curl -f -s "https://staging.guardant.me/health" > /dev/null; then
        log_error "Staging environment is not healthy"
        log_error "Production deployment aborted"
        exit 1
    fi
    
    # Check for any ongoing incidents
    log_info "Checking for ongoing incidents..."
    # This would typically check your incident management system
    # For now, we'll check if all services are up
    local unhealthy_services=0
    local services=("admin-api" "public-api" "workers" "admin-frontend" "public-frontend")
    
    for service in "${services[@]}"; do
        if ! kubectl get deployment "$service" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' | grep -q "2"; then
            log_warning "Service $service is not fully healthy"
            ((unhealthy_services++))
        fi
    done
    
    if [[ $unhealthy_services -gt 0 ]]; then
        log_error "$unhealthy_services services are not healthy"
        log_error "Production deployment aborted"
        exit 1
    fi
    
    log_success "Production safety checks passed"
}

# Check prerequisites with additional production requirements
check_prerequisites() {
    log_info "Checking production prerequisites..."
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if helm is available
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed or not in PATH"
        exit 1
    fi
    
    # Check if we have required secrets
    local required_secrets=(
        "REDIS_PASSWORD"
        "RABBITMQ_PASSWORD"
        "POSTGRES_PASSWORD"
        "JWT_SECRET"
        "GOLEM_API_KEY"
        "SSL_CERT"
        "SSL_KEY"
    )
    
    for secret in "${required_secrets[@]}"; do
        if [[ -z "${!secret:-}" ]]; then
            log_error "Required secret $secret is not set"
            exit 1
        fi
    done
    
    # Verify image exists in registry
    log_info "Verifying images exist in registry..."
    local services=("admin-api" "public-api" "workers" "admin-frontend" "public-frontend")
    
    for service in "${services[@]}"; do
        local image="$REGISTRY/guardant-$service:$IMAGE_TAG"
        if ! docker manifest inspect "$image" > /dev/null 2>&1; then
            log_error "Image $image does not exist in registry"
            exit 1
        fi
    done
    
    log_success "Production prerequisites validated"
}

# Backup current state
backup_current_state() {
    log_info "Creating backup of current production state..."
    
    local backup_dir="$PROJECT_ROOT/backups/$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup Kubernetes manifests
    kubectl get all -n "$NAMESPACE" -o yaml > "$backup_dir/k8s-state.yaml"
    
    # Backup database
    log_info "Creating database backup..."
    kubectl exec -n "$NAMESPACE" deployment/postgresql -- pg_dump -U postgres guardant_production | gzip > "$backup_dir/database-backup.sql.gz"
    
    # Store current image tags
    kubectl get deployments -n "$NAMESPACE" -o jsonpath='{range .items[*]}{.metadata.name}{": "}{.spec.template.spec.containers[0].image}{"\n"}{end}' > "$backup_dir/current-images.txt"
    
    echo "$backup_dir" > "$PROJECT_ROOT/.last-backup"
    
    log_success "Backup created at $backup_dir"
}

# Blue-Green deployment strategy
blue_green_deployment() {
    local current_color=$(kubectl get configmap -n "$NAMESPACE" deployment-color -o jsonpath='{.data.color}' 2>/dev/null || echo "blue")
    local new_color
    
    if [[ "$current_color" == "blue" ]]; then
        new_color="green"
    else
        new_color="blue"
    fi
    
    log_info "Current deployment: $current_color, New deployment: $new_color"
    
    # Deploy to new color environment
    deploy_services_with_color "$new_color"
    
    # Run comprehensive tests on new environment
    test_new_deployment "$new_color"
    
    # Switch traffic to new environment
    switch_traffic "$new_color")
    
    # Verify everything is working
    verify_production_health
    
    # Update color marker
    kubectl create configmap deployment-color --from-literal=color="$new_color" -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Cleanup old deployment
    cleanup_old_deployment "$current_color"
    
    log_success "Blue-green deployment completed: $current_color -> $new_color"
}

# Deploy services with color suffix
deploy_services_with_color() {
    local color="$1"
    log_info "Deploying services with color: $color"
    
    local manifests_dir="$PROJECT_ROOT/k8s/production"
    mkdir -p "$manifests_dir"
    
    # Generate manifests with color suffix
    for service in admin-api public-api workers admin-frontend public-frontend; do
        generate_production_service_manifest "$service" "$color" "$manifests_dir"
    done
    
    # Apply manifests
    for service in admin-api public-api workers admin-frontend public-frontend; do
        kubectl apply -f "$manifests_dir/$service-$color.yaml"
    done
    
    # Wait for rollout
    log_info "Waiting for $color deployment rollout..."
    for service in admin-api public-api workers admin-frontend public-frontend; do
        kubectl rollout status deployment/$service-$color -n $NAMESPACE --timeout=600s
    done
    
    log_success "$color deployment completed"
}

# Generate production service manifest with enhanced security and monitoring
generate_production_service_manifest() {
    local service_name="$1"
    local color="$2"
    local output_dir="$3"
    local image="$REGISTRY/guardant-$service_name:$IMAGE_TAG"
    local port="3000"
    local replicas="3"
    
    # Set specific configuration per service
    case $service_name in
        "admin-api") port="4000"; replicas="3" ;;
        "public-api") port="4001"; replicas="5" ;;
        "workers") port="4002"; replicas="10" ;;
        "admin-frontend") port="3000"; replicas="3" ;;
        "public-frontend") port="3001"; replicas="5" ;;
    esac
    
    cat > "$output_dir/$service_name-$color.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $service_name-$color
  namespace: $NAMESPACE
  labels:
    app: guardant
    service: $service_name
    color: $color
    environment: production
spec:
  replicas: $replicas
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: guardant
      service: $service_name
      color: $color
  template:
    metadata:
      labels:
        app: guardant
        service: $service_name
        color: $color
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "$port"
        prometheus.io/path: "/metrics"
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
      - name: $service_name
        image: $image
        imagePullPolicy: Always
        ports:
        - containerPort: $port
          name: http
        env:
        - name: PORT
          value: "$port"
        - name: NODE_ENV
          value: "production"
        - name: COLOR
          value: "$color"
        envFrom:
        - configMapRef:
            name: guardant-config
        - secretRef:
            name: guardant-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 60
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: http
          initialDelaySeconds: 30
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
              - ALL
        volumeMounts:
        - name: cache
          mountPath: /tmp
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: cache
        emptyDir:
          sizeLimit: 1Gi
      - name: logs
        emptyDir:
          sizeLimit: 5Gi
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: service
                  operator: In
                  values: [$service_name]
              topologyKey: kubernetes.io/hostname
      imagePullSecrets:
      - name: ghcr-secret
---
apiVersion: v1
kind: Service
metadata:
  name: $service_name-$color
  namespace: $NAMESPACE
  labels:
    app: guardant
    service: $service_name
    color: $color
spec:
  selector:
    app: guardant
    service: $service_name
    color: $color
  ports:
  - port: 80
    targetPort: http
    name: http
  type: ClusterIP
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: $service_name-$color-pdb
  namespace: $NAMESPACE
spec:
  minAvailable: 50%
  selector:
    matchLabels:
      app: guardant
      service: $service_name
      color: $color
EOF
}

# Test new deployment
test_new_deployment() {
    local color="$1"
    log_info "Testing $color deployment..."
    
    # Health checks
    for service in admin-api public-api workers admin-frontend public-frontend; do
        local service_url="http://$service-$color.$NAMESPACE.svc.cluster.local"
        
        log_info "Testing $service..."
        if ! kubectl run test-pod-$color --rm -i --restart=Never --image=curlimages/curl -- curl -f -s "$service_url/health"; then
            log_error "$service health check failed"
            return 1
        fi
    done
    
    # Load test on new deployment
    log_info "Running load test on $color deployment..."
    kubectl run load-test-$color --rm -i --restart=Never --image=loadimpact/k6 -- run - <<EOF
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 20 },
    { duration: '5m', target: 20 },
    { duration: '2m', target: 0 },
  ],
};

export default function() {
  let response = http.get('http://public-api-$color.$NAMESPACE.svc.cluster.local/health');
  check(response, {
    'status was 200': (r) => r.status == 200,
    'transaction time OK': (r) => r.timings.duration < 200,
  });
}
EOF

    log_success "$color deployment tests passed"
}

# Switch traffic to new deployment
switch_traffic() {
    local new_color="$1"
    log_info "Switching traffic to $new_color deployment..."
    
    # Update ingress to point to new color
    cat > "$PROJECT_ROOT/k8s/production/ingress.yaml" << EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: guardant-ingress
  namespace: $NAMESPACE
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://guardant.me,https://admin.guardant.me"
spec:
  tls:
  - hosts:
    - guardant.me
    - admin.guardant.me
    - api.guardant.me
    - public.guardant.me
    secretName: guardant-production-tls
  rules:
  - host: guardant.me
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: public-frontend-$new_color
            port:
              number: 80
  - host: admin.guardant.me
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: admin-frontend-$new_color
            port:
              number: 80
  - host: api.guardant.me
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: admin-api-$new_color
            port:
              number: 80
  - host: public.guardant.me
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: public-api-$new_color
            port:
              number: 80
EOF

    kubectl apply -f "$PROJECT_ROOT/k8s/production/ingress.yaml"
    
    # Wait for ingress to update
    sleep 30
    
    log_success "Traffic switched to $new_color"
}

# Verify production health after switch
verify_production_health() {
    log_info "Verifying production health after deployment..."
    
    local max_attempts=20
    local attempt=1
    
    local endpoints=(
        "https://guardant.me/health"
        "https://admin.guardant.me/health"
        "https://api.guardant.me/health"
        "https://public.guardant.me/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        log_info "Verifying $endpoint..."
        attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if curl -f -s "$endpoint" > /dev/null; then
                log_success "$endpoint is healthy"
                break
            fi
            
            if [ $attempt -eq $max_attempts ]; then
                log_error "$endpoint failed health check after $max_attempts attempts"
                log_error "Initiating rollback..."
                rollback_deployment
                exit 1
            fi
            
            log_info "Attempt $attempt/$max_attempts failed, retrying in 15 seconds..."
            sleep 15
            ((attempt++))
        done
    done
    
    # Additional comprehensive checks
    log_info "Running comprehensive production verification..."
    
    # Test user registration flow
    if ! curl -f -s -X POST "https://api.guardant.me/api/nests/register" \
        -H "Content-Type: application/json" \
        -d '{"subdomain":"test-prod","email":"test@example.com","password":"TestPass123!"}' > /dev/null; then
        log_warning "User registration test failed (non-critical)"
    fi
    
    # Test public status page access
    if ! curl -f -s "https://guardant.me/" > /dev/null; then
        log_error "Public status page access failed"
        rollback_deployment
        exit 1
    fi
    
    log_success "Production health verification completed"
}

# Cleanup old deployment
cleanup_old_deployment() {
    local old_color="$1"
    log_info "Cleaning up old $old_color deployment..."
    
    # Wait 10 minutes before cleanup to ensure everything is stable
    log_info "Waiting 10 minutes before cleanup..."
    sleep 600
    
    # Delete old deployments
    for service in admin-api public-api workers admin-frontend public-frontend; do
        kubectl delete deployment "$service-$old_color" -n "$NAMESPACE" --ignore-not-found=true
        kubectl delete service "$service-$old_color" -n "$NAMESPACE" --ignore-not-found=true
        kubectl delete pdb "$service-$old_color-pdb" -n "$NAMESPACE" --ignore-not-found=true
    done
    
    log_success "Old $old_color deployment cleaned up"
}

# Rollback function
rollback_deployment() {
    log_error "Production deployment failed, initiating rollback..."
    
    if [[ ! -f "$PROJECT_ROOT/.last-backup" ]]; then
        log_error "No backup found for rollback"
        exit 1
    fi
    
    local backup_dir=$(cat "$PROJECT_ROOT/.last-backup")
    
    if [[ ! -d "$backup_dir" ]]; then
        log_error "Backup directory $backup_dir not found"
        exit 1
    fi
    
    log_info "Rolling back from backup: $backup_dir"
    
    # Restore from backup
    kubectl apply -f "$backup_dir/k8s-state.yaml"
    
    # Wait for rollback
    kubectl rollout status deployment/admin-api -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/public-api -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/workers -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/admin-frontend -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/public-frontend -n "$NAMESPACE" --timeout=300s
    
    log_success "Rollback completed"
}

# Main production deployment function
main() {
    log_info "Starting GuardAnt production deployment..."
    log_info "Registry: $REGISTRY"
    log_info "Image Tag: $IMAGE_TAG"
    log_info "Deployment Strategy: $DEPLOYMENT_STRATEGY"
    
    # Critical production checks
    production_safety_checks
    check_prerequisites
    
    # Create backup before deployment
    backup_current_state
    
    # Set up error handling for rollback
    trap rollback_deployment ERR
    
    # Execute deployment strategy
    if [[ "$DEPLOYMENT_STRATEGY" == "blue-green" ]]; then
        blue_green_deployment
    else
        log_error "Unsupported deployment strategy: $DEPLOYMENT_STRATEGY"
        exit 1
    fi
    
    log_success "GuardAnt production deployment completed successfully!"
    log_info "Production URLs:"
    log_info "  Public Site: https://guardant.me"
    log_info "  Admin Panel: https://admin.guardant.me"
    log_info "  Admin API: https://api.guardant.me"
    log_info "  Public API: https://public.guardant.me"
    
    # Send deployment notification
    send_deployment_notification "success"
}

# Send deployment notification
send_deployment_notification() {
    local status="$1"
    local webhook_url="${SLACK_WEBHOOK_URL:-}"
    
    if [[ -n "$webhook_url" ]]; then
        local message
        if [[ "$status" == "success" ]]; then
            message="🚀 GuardAnt production deployment successful! Version: $IMAGE_TAG"
        else
            message="🚨 GuardAnt production deployment failed! Version: $IMAGE_TAG"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$webhook_url" || true
    fi
}

# Run main function
main "$@"