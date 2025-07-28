# Guardant Workers - Distributed Monitoring System

Niezależny, skalowalny system workerów do monitorowania serwisów.

## Architektura

Workers są zaprojektowane do działania w pełni rozproszonej architekturze:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Worker #1  │     │  Worker #2  │     │  Worker #N  │
│  (EU-West)  │     │  (US-East)  │     │  (AS-Pac)   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                    │                    │
       └────────────────────┴────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   Redis Queue   │
                    │   (BullMQ)      │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │  Golem Base L3  │
                    │  (Persistent)    │
                    └────────────────┘
```

## Skalowanie

### Horizontalne skalowanie
- Każdy worker ma unikalny ID
- Workery mogą być dodawane/usuwane dynamicznie
- Automatyczne rozdzielanie zadań przez BullMQ

### Deployment Options

1. **Kubernetes**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: guardant-workers
spec:
  replicas: 10  # Skaluj do 100+
  template:
    spec:
      containers:
      - name: worker
        image: guardant-workers:latest
        env:
        - name: WORKER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: REDIS_HOST
          value: redis-cluster.default.svc.cluster.local
```

2. **Docker Swarm**
```bash
docker service create \
  --name guardant-workers \
  --replicas 50 \
  --env REDIS_HOST=redis \
  guardant-workers:latest
```

3. **Standalone**
```bash
# Worker 1 (EU)
WORKER_ID=eu-west-1 REDIS_HOST=redis-eu.guardant.me bun start

# Worker 2 (US)  
WORKER_ID=us-east-1 REDIS_HOST=redis-us.guardant.me bun start

# Worker 3 (Asia)
WORKER_ID=ap-south-1 REDIS_HOST=redis-ap.guardant.me bun start
```

## Strategia przydzielania zadań

### Geographic Distribution
Workery mogą być rozmieszczone geograficznie dla optymalnej wydajności:

```typescript
// Worker configuration
const workerConfig = {
  workerId: 'eu-west-1',
  region: 'eu-west',
  capabilities: ['web', 'tcp', 'ping'],
  maxConcurrency: 20,
};
```

### Intelligent Routing
System może przydzielać zadania na podstawie:
- Lokalizacji workera (bliskość do monitorowanego serwisu)
- Obciążenia workera
- Specjalizacji workera (niektóre mogą mieć specjalne możliwości)

## Load Balancing

BullMQ automatycznie rozdziela zadania między workerami:

```typescript
// Każdy worker pobiera zadania z tej samej kolejki
const worker = new Worker('monitoring', processJob, {
  connection: redis,
  concurrency: 10, // Każdy worker może przetwarzać 10 zadań równocześnie
});
```

## Monitorowanie workerów

### Metryki
- Liczba przetworzonych zadań
- Średni czas przetwarzania
- Błędy i powtórzenia
- Wykorzystanie CPU/RAM

### Health Checks
Każdy worker udostępnia endpoint zdrowia:
```bash
curl http://worker-1:3099/health
```

## Przykład deploymentu 100+ workerów

```bash
# Deploy 100 workers across multiple regions
for i in {1..100}; do
  REGION=$((i % 3))
  case $REGION in
    0) REDIS_HOST="redis-eu.guardant.me" ZONE="eu-west" ;;
    1) REDIS_HOST="redis-us.guardant.me" ZONE="us-east" ;;
    2) REDIS_HOST="redis-ap.guardant.me" ZONE="ap-south" ;;
  esac
  
  docker run -d \
    --name worker-$i \
    -e WORKER_ID="worker-$ZONE-$i" \
    -e REDIS_HOST=$REDIS_HOST \
    -e WORKER_CONCURRENCY=20 \
    guardant-workers:latest
done
```

## Zarządzanie obciążeniem

### Queue Priority
```typescript
// Wysokie priorytety dla płatnych klientów
await monitoringQueue.add('check', data, {
  priority: nest.subscription.tier === 'unlimited' ? 1 : 10,
});
```

### Rate Limiting
```typescript
// Ograniczenia per nest
const rateLimiter = new RateLimiter({
  free: 60,      // 60 checks/minute
  pro: 600,      // 600 checks/minute  
  unlimited: -1, // No limit
});
```

## Failover & Redundancy

- Jeśli worker pada, jego zadania są automatycznie przydzielane innym
- BullMQ zapewnia "at-least-once" delivery
- Zadania są powtarzane w przypadku błędu

## Środowiskowe zmienne

```env
# Required
REDIS_HOST=localhost
REDIS_PORT=6379
WORKER_ID=worker-1

# Optional
REDIS_PASSWORD=secret
WORKER_CONCURRENCY=10
WORKER_REGION=eu-west
WORKER_CAPABILITIES=web,tcp,ping
HEALTH_PORT=3099
LOG_LEVEL=info
```