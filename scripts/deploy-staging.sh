#!/bin/bash

# GuardAnt Staging Deployment Script
# Deploys the application to staging environment using Docker Compose and Kubernetes

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
STAGING_ENV="staging"
NAMESPACE="guardant-staging"
REGISTRY="${REGISTRY:-ghcr.io/guardant/guardant}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if docker is available
    if ! command -v docker &> /dev/null; then
        log_error "docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check if helm is available
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed or not in PATH"
        exit 1
    fi
    
    # Verify kubectl context
    CURRENT_CONTEXT=$(kubectl config current-context)
    if [[ "$CURRENT_CONTEXT" != *"staging"* ]]; then
        log_warning "Current kubectl context is '$CURRENT_CONTEXT', not staging"
        log_info "Switching to staging context..."
        kubectl config use-context guardant-staging || {
            log_error "Failed to switch to staging context"
            exit 1
        }
    fi
    
    log_success "Prerequisites validated"
}

# Setup namespace and resources
setup_namespace() {
    log_info "Setting up Kubernetes namespace: $NAMESPACE"
    
    # Create namespace if it doesn't exist
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Label namespace
    kubectl label namespace $NAMESPACE environment=staging app=guardant --overwrite
    
    log_success "Namespace configured"
}

# Deploy infrastructure components
deploy_infrastructure() {
    log_info "Deploying infrastructure components..."
    
    # Deploy Redis
    helm upgrade --install redis oci://registry-1.docker.io/bitnamicharts/redis \
        --namespace $NAMESPACE \
        --set auth.enabled=true \
        --set auth.password="$REDIS_PASSWORD" \
        --set master.persistence.enabled=true \
        --set master.persistence.size=8Gi \
        --set replica.replicaCount=1 \
        --set replica.persistence.enabled=true \
        --set replica.persistence.size=8Gi \
        --wait --timeout=300s
    
    # Deploy RabbitMQ
    helm upgrade --install rabbitmq oci://registry-1.docker.io/bitnamicharts/rabbitmq \
        --namespace $NAMESPACE \
        --set auth.username=admin \
        --set auth.password="$RABBITMQ_PASSWORD" \
        --set persistence.enabled=true \
        --set persistence.size=8Gi \
        --set metrics.enabled=true \
        --wait --timeout=300s
    
    # Deploy PostgreSQL
    helm upgrade --install postgresql oci://registry-1.docker.io/bitnamicharts/postgresql \
        --namespace $NAMESPACE \
        --set auth.postgresPassword="$POSTGRES_PASSWORD" \
        --set auth.database=guardant_staging \
        --set persistence.enabled=true \
        --set persistence.size=20Gi \
        --set metrics.enabled=true \
        --wait --timeout=300s
    
    log_success "Infrastructure components deployed"
}

# Generate Kubernetes manifests
generate_manifests() {
    log_info "Generating Kubernetes manifests..."
    
    local manifests_dir="$PROJECT_ROOT/k8s/staging"
    mkdir -p "$manifests_dir"
    
    # ConfigMaps
    cat > "$manifests_dir/configmap.yaml" << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: guardant-config
  namespace: $NAMESPACE
data:
  NODE_ENV: "staging"
  REDIS_HOST: "redis-master.$NAMESPACE.svc.cluster.local"
  REDIS_PORT: "6379"
  RABBITMQ_HOST: "rabbitmq.$NAMESPACE.svc.cluster.local"
  RABBITMQ_PORT: "5672"
  POSTGRES_HOST: "postgresql.$NAMESPACE.svc.cluster.local"
  POSTGRES_PORT: "5432"
  POSTGRES_DB: "guardant_staging"
  API_BASE_URL: "https://staging-api.guardant.me"
  PUBLIC_API_URL: "https://staging-public.guardant.me"
  ADMIN_FRONTEND_URL: "https://staging-admin.guardant.me"
  PUBLIC_FRONTEND_URL: "https://staging.guardant.me"
EOF

    # Secrets
    cat > "$manifests_dir/secrets.yaml" << EOF
apiVersion: v1
kind: Secret
metadata:
  name: guardant-secrets
  namespace: $NAMESPACE
type: Opaque
data:
  redis-password: $(echo -n "$REDIS_PASSWORD" | base64)
  rabbitmq-password: $(echo -n "$RABBITMQ_PASSWORD" | base64)
  postgres-password: $(echo -n "$POSTGRES_PASSWORD" | base64)
  jwt-secret: $(echo -n "$JWT_SECRET" | base64)
  golem-api-key: $(echo -n "$GOLEM_API_KEY" | base64)
EOF

    # Generate service manifests
    for service in admin-api public-api workers admin-frontend public-frontend; do
        generate_service_manifest "$service" "$manifests_dir"
    done
    
    log_success "Kubernetes manifests generated"
}

# Generate individual service manifest
generate_service_manifest() {
    local service_name="$1"
    local output_dir="$2"
    local image="$REGISTRY/guardant-$service_name:$IMAGE_TAG"
    local port="3000"
    
    # Set specific ports for services
    case $service_name in
        "admin-api") port="4000" ;;
        "public-api") port="4001" ;;
        "workers") port="4002" ;;
        "admin-frontend") port="3000" ;;
        "public-frontend") port="3001" ;;
    esac
    
    cat > "$output_dir/$service_name.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $service_name
  namespace: $NAMESPACE
  labels:
    app: guardant
    service: $service_name
    environment: staging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: guardant
      service: $service_name
  template:
    metadata:
      labels:
        app: guardant
        service: $service_name
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "$port"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: $service_name
        image: $image
        ports:
        - containerPort: $port
          name: http
        env:
        - name: PORT
          value: "$port"
        envFrom:
        - configMapRef:
            name: guardant-config
        - secretRef:
            name: guardant-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: tmp
          mountPath: /tmp
      volumes:
      - name: tmp
        emptyDir: {}
      imagePullSecrets:
      - name: ghcr-secret
---
apiVersion: v1
kind: Service
metadata:
  name: $service_name
  namespace: $NAMESPACE
  labels:
    app: guardant
    service: $service_name
spec:
  selector:
    app: guardant
    service: $service_name
  ports:
  - port: 80
    targetPort: http
    name: http
  type: ClusterIP
EOF
}

# Deploy application services
deploy_services() {
    log_info "Deploying GuardAnt services..."
    
    local manifests_dir="$PROJECT_ROOT/k8s/staging"
    
    # Apply manifests
    kubectl apply -f "$manifests_dir/configmap.yaml"
    kubectl apply -f "$manifests_dir/secrets.yaml"
    
    # Deploy services
    for service in admin-api public-api workers admin-frontend public-frontend; do
        log_info "Deploying $service..."
        kubectl apply -f "$manifests_dir/$service.yaml"
    done
    
    # Wait for deployments to be ready
    log_info "Waiting for deployments to be ready..."
    for service in admin-api public-api workers admin-frontend public-frontend; do
        kubectl rollout status deployment/$service -n $NAMESPACE --timeout=300s
    done
    
    log_success "All services deployed successfully"
}

# Setup ingress and networking
setup_ingress() {
    log_info "Setting up ingress and networking..."
    
    cat > "$PROJECT_ROOT/k8s/staging/ingress.yaml" << EOF
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
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://staging.guardant.me,https://staging-admin.guardant.me"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, PUT, POST, DELETE, PATCH, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization,X-Nest-Subdomain"
spec:
  tls:
  - hosts:
    - staging.guardant.me
    - staging-admin.guardant.me
    - staging-api.guardant.me
    - staging-public.guardant.me
    secretName: guardant-staging-tls
  rules:
  - host: staging.guardant.me
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: public-frontend
            port:
              number: 80
  - host: staging-admin.guardant.me
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: admin-frontend
            port:
              number: 80
  - host: staging-api.guardant.me
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: admin-api
            port:
              number: 80
  - host: staging-public.guardant.me
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: public-api
            port:
              number: 80
EOF

    kubectl apply -f "$PROJECT_ROOT/k8s/staging/ingress.yaml"
    
    log_success "Ingress configured"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Create migration job
    cat > "$PROJECT_ROOT/k8s/staging/migration-job.yaml" << EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: guardant-migration-$(date +%s)
  namespace: $NAMESPACE
spec:
  template:
    spec:
      containers:
      - name: migration
        image: $REGISTRY/guardant-admin-api:$IMAGE_TAG
        command: ["bun", "run", "migrate"]
        envFrom:
        - configMapRef:
            name: guardant-config
        - secretRef:
            name: guardant-secrets
      restartPolicy: Never
  backoffLimit: 3
EOF

    kubectl apply -f "$PROJECT_ROOT/k8s/staging/migration-job.yaml"
    
    # Wait for migration to complete
    local job_name=$(kubectl get jobs -n $NAMESPACE -o jsonpath='{.items[-1].metadata.name}')
    kubectl wait --for=condition=complete job/$job_name -n $NAMESPACE --timeout=300s
    
    log_success "Database migrations completed"
}

# Health checks
perform_health_checks() {
    log_info "Performing health checks..."
    
    local max_attempts=30
    local attempt=1
    
    local endpoints=(
        "https://staging.guardant.me/health"
        "https://staging-admin.guardant.me/health"
        "https://staging-api.guardant.me/health"
        "https://staging-public.guardant.me/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        log_info "Checking $endpoint..."
        attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if curl -f -s "$endpoint" > /dev/null; then
                log_success "$endpoint is healthy"
                break
            fi
            
            if [ $attempt -eq $max_attempts ]; then
                log_error "$endpoint failed health check after $max_attempts attempts"
                return 1
            fi
            
            log_info "Attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
            sleep 10
            ((attempt++))
        done
    done
    
    log_success "All health checks passed"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -rf "$PROJECT_ROOT/k8s/staging"
}

# Main deployment function
main() {
    log_info "Starting GuardAnt staging deployment..."
    log_info "Registry: $REGISTRY"
    log_info "Image Tag: $IMAGE_TAG"
    log_info "Namespace: $NAMESPACE"
    
    # Set up error handling
    trap cleanup EXIT
    
    # Required environment variables
    if [[ -z "${REDIS_PASSWORD:-}" ]]; then
        export REDIS_PASSWORD=$(openssl rand -base64 32)
        log_info "Generated Redis password"
    fi
    
    if [[ -z "${RABBITMQ_PASSWORD:-}" ]]; then
        export RABBITMQ_PASSWORD=$(openssl rand -base64 32)
        log_info "Generated RabbitMQ password"
    fi
    
    if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
        export POSTGRES_PASSWORD=$(openssl rand -base64 32)
        log_info "Generated PostgreSQL password"
    fi
    
    if [[ -z "${JWT_SECRET:-}" ]]; then
        export JWT_SECRET=$(openssl rand -base64 64)
        log_info "Generated JWT secret"
    fi
    
    # Execute deployment steps
    check_prerequisites
    setup_namespace
    deploy_infrastructure
    generate_manifests
    deploy_services
    setup_ingress
    run_migrations
    perform_health_checks
    
    log_success "GuardAnt staging deployment completed successfully!"
    log_info "Access URLs:"
    log_info "  Public Site: https://staging.guardant.me"
    log_info "  Admin Panel: https://staging-admin.guardant.me"
    log_info "  Admin API: https://staging-api.guardant.me"
    log_info "  Public API: https://staging-public.guardant.me"
}

# Run main function
main "$@"