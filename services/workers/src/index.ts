import { Worker, Queue, QueueEvents } from "bullmq";
import Redis from "ioredis";
import { createLogger, PerformanceTimer } from "../../../shared/logger";
import {
  HealthChecker,
  commonHealthChecks,
  createHealthEndpoints,
} from "../../../shared/health";
import { getMetricsCollector } from "../../../shared/metrics";

// Temporary - inline types until workspace is fixed
interface Service {
  id: string;
  nestId: string;
  name: string;
  type:
    | "web"
    | "tcp"
    | "ping"
    | "github"
    | "uptime-api"
    | "keyword"
    | "heartbeat"
    | "port";
  target: string;
  interval: number;
  config: Record<string, any>;
  notifications: {
    webhooks: string[];
    emails: string[];
  };
  tags: string[];
  isActive: boolean;
  monitoring: {
    regions: string[];
    strategy: "closest" | "all-selected" | "round-robin" | "failover";
    minRegions?: number;
    maxRegions?: number;
  };
  createdAt: number;
  updatedAt: number;
}

interface Incident {
  id: string;
  serviceId: string;
  nestId: string;
  type: "outage" | "degraded" | "maintenance";
  title: string;
  description: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  priority: "low" | "medium" | "high" | "critical";
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
  affectedServices: string[];
  updates: {
    id: string;
    timestamp: number;
    status: string;
    message: string;
  }[];
}

interface AggregatedMetrics {
  serviceId: string;
  nestId: string;
  timestamp: number;
  region: string;
  status: "up" | "down" | "degraded";
  responseTime?: number;
  statusCode?: number;
  errorMessage?: string;
  metrics: Record<string, any>;
}

// Mock storage for development
const mockStorage = {
  services: new Map<string, Service[]>(),

  async getActiveServices(): Promise<Service[]> {
    const allServices: Service[] = [];
    for (const services of this.services.values()) {
      allServices.push(...services.filter((s) => s.isActive));
    }
    return allServices;
  },

  async initialize() {
    // Mock initialization
  },
};
import { MonitoringService } from "./services/monitoring";
import { MetricsAggregator } from "./services/metrics-aggregator";
import { NotificationService } from "./services/notifications";
import { localCache } from "./local-cache";
import type { WorkerAntConfig } from "./worker-config";
import { WORKER_ANT_PRESETS } from "./worker-config";
import { locationDetector } from "./worker-ant-location";

// Configuration from environment
const config = {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  },
  workerAntId:
    process.env.WORKER_ANT_ID ||
    `ant-${process.env.HOSTNAME || "local"}-${Date.now()}`,
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || "10"),
  environment: process.env.NODE_ENV || "development",
  preset:
    (process.env.WORKER_ANT_PRESET as keyof typeof WORKER_ANT_PRESETS) ||
    "basic",
};

// Redis connections
const redis = new Redis(config.redis);
const redisSubscriber = new Redis(config.redis);

// Services
// Initialize location and get region
const regionInfo = await locationDetector.detectLocation();
const workerRegion =
  regionInfo.region || process.env.WORKER_REGION || "unknown";

const monitoringService = new MonitoringService(workerRegion);
const metricsAggregator = new MetricsAggregator();
const notificationService = new NotificationService();

// Queues
const monitoringQueue = new Queue("monitoring", { connection: redis });
const metricsQueue = new Queue("metrics", { connection: redis });
const notificationQueue = new Queue("notifications", { connection: redis });

// Queue events for monitoring
const monitoringEvents = new QueueEvents("monitoring", {
  connection: redisSubscriber,
});

// Initialize logger
const logger = createLogger("workers");

// Initialize health checker
const healthChecker = new HealthChecker("workers", "1.0.0");

// Initialize metrics collector
const metricsCollector = getMetricsCollector("guardant_workers");

// Initialize WorkerAnt configuration
async function initializeWorkerAnt(): Promise<WorkerAntConfig> {
  logger.info("Initializing Worker Ant", { component: "initialization" });

  // Auto-detect location
  const location = await locationDetector.detectLocation();
  logger.info("Location detected", {
    component: "location",
    city: location.city,
    country: location.country,
    continent: location.continent,
    coordinates: location.coordinates,
  });

  // Get preset configuration
  const preset = WORKER_ANT_PRESETS[config.preset];
  if (!preset) {
    throw new Error(`Unknown worker ant preset: ${config.preset}`);
  }

  // Create worker ant configuration
  const workerAntConfig: WorkerAntConfig = {
    id: config.workerAntId,
    name: `GuardAnt ${location.city}`,
    version: "1.0.0",
    location,
    capabilities: {
      ...preset.capabilities,
      limits: {
        ...preset.capabilities.limits,
        maxConcurrency: config.concurrency,
      },
    },
    network: location.network,
    status: {
      startedAt: Date.now(),
      lastHeartbeat: Date.now(),
      checksCompleted: 0,
      checksFailed: 0,
      averageResponseTime: 0,
    },
    tags: [
      config.environment,
      location.continent.toLowerCase().replace(" ", "-"),
      location.country.toLowerCase().replace(" ", "-"),
      config.preset,
    ],
  };

  logger.info("Worker Ant configured", {
    component: "worker-ant",
    id: workerAntConfig.id,
    location: workerAntConfig.location,
    tags: workerAntConfig.tags,
    capabilities: workerAntConfig.capabilities.serviceTypes,
  });

  // Register in Redis for coordinator discovery
  await redis.setex(
    `worker-ant:${workerAntConfig.id}`,
    300, // 5 minutes TTL
    JSON.stringify(workerAntConfig)
  );

  return workerAntConfig;
}

// Initialize Golem storage
async function initializeStorage() {
  try {
    await mockStorage.initialize();
    console.log("✅ Golem Base L3 storage initialized");
  } catch (error) {
    console.error("❌ Failed to initialize Golem storage:", error);
    // Continue anyway - storage will use fallback
  }
}

// Monitoring worker
const monitoringWorker = new Worker(
  "monitoring",
  async (job) => {
    const { service, nestId } = job.data as {
      service: Service;
      nestId: string;
    };

    logger.info("Starting monitoring check", {
      component: "monitoring",
      serviceName: service.name,
      serviceType: service.type,
      nestId,
    });

    const startTime = performance.now();

    try {
      // Perform the check
      const result = await monitoringService.checkService(service);
      const duration = (performance.now() - startTime) / 1000;

      // Record metrics
      metricsCollector.recordMonitoringCheck(
        nestId,
        service.id,
        result.status,
        "local", // We'll need to get actual region from config
        duration,
        service.type
      );

      // Store raw result in Redis for real-time access
      await redis.setex(
        `status:${nestId}:${service.id}`,
        300, // 5 minutes TTL
        JSON.stringify(result)
      );

      // Check for incidents
      if (result.status === "down") {
        await handleIncident(service, nestId, result);
      } else {
        await resolveIncident(service, nestId);
      }

      // Queue metrics aggregation
      await metricsQueue.add("aggregate", {
        nestId,
        serviceId: service.id,
        result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error(`❌ Error monitoring ${service.name}:`, error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: config.concurrency,
  }
);

// Metrics aggregation worker
const metricsWorker = new Worker(
  "metrics",
  async (job) => {
    const { nestId, serviceId, result, timestamp } = job.data;

    try {
      // Aggregate metrics
      await metricsAggregator.aggregate(nestId, serviceId, result, timestamp);

      // Store in Golem Base L3
      const hourlyMetrics = await metricsAggregator.getHourlyMetrics(
        nestId,
        serviceId
      );
      // TODO: Store metrics in mockStorage\n      console.log('📊 Aggregated metrics:', hourlyMetrics.length);

      return { success: true };
    } catch (error) {
      console.error("❌ Error aggregating metrics:", error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

// Notification worker
const notificationWorker = new Worker(
  "notifications",
  async (job) => {
    const { type, nestId, service, incident } = job.data;

    try {
      await notificationService.send(type, {
        nestId,
        service,
        incident,
      });

      return { success: true };
    } catch (error) {
      console.error("❌ Error sending notification:", error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 20,
  }
);

// Incident handling
async function handleIncident(service: Service, nestId: string, result: any) {
  const existingIncident = await redis.get(`incident:${nestId}:${service.id}`);

  if (!existingIncident) {
    // Create new incident
    const incident: Incident = {
      id: `inc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nestId,
      serviceId: service.id,
      startedAt: Date.now(),
      type: "down",
      reason: result.message || "Service is down",
      affectedChecks: 1,
    };

    await redis.set(
      `incident:${nestId}:${service.id}`,
      JSON.stringify(incident)
    );
    // TODO: Store incident in mockStorage\n    console.log('🚨 Created incident:', incident.id);

    // Queue notification
    await notificationQueue.add("incident-started", {
      type: "incident-started",
      nestId,
      service,
      incident,
    });
  }
}

async function resolveIncident(service: Service, nestId: string) {
  const incidentData = await redis.get(`incident:${nestId}:${service.id}`);

  if (incidentData) {
    const incident: Incident = JSON.parse(incidentData);
    incident.resolvedAt = Date.now();
    incident.duration = incident.resolvedAt - incident.startedAt;

    // TODO: Update incident in mockStorage\n    console.log('✅ Resolved incident:', incident.id);
    await redis.del(`incident:${nestId}:${service.id}`);

    // Queue notification
    await notificationQueue.add("incident-resolved", {
      type: "incident-resolved",
      nestId,
      service,
      incident,
    });
  }
}

// Scheduler - runs monitoring checks based on service intervals
async function scheduler() {
  console.log("📅 Scheduler started");

  // Get all active services from Golem storage
  // In production, this would be optimized with proper indexing
  setInterval(async () => {
    try {
      // For now, get scheduled services from Redis
      const scheduledServices = await redis.keys("schedule:*");

      for (const key of scheduledServices) {
        const data = await redis.get(key);
        if (!data) continue;

        const { service, nestId, lastCheck, interval } = JSON.parse(data);
        const now = Date.now();

        if (!lastCheck || now - lastCheck >= interval * 1000) {
          // Queue monitoring job
          await monitoringQueue.add(
            `check-${service.id}`,
            { service, nestId },
            {
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 2000,
              },
            }
          );

          // Update last check time
          await redis.set(
            key,
            JSON.stringify({
              service,
              nestId,
              lastCheck: now,
              interval,
            })
          );
        }
      }
    } catch (error) {
      console.error("❌ Scheduler error:", error);
    }
  }, 10000); // Check every 10 seconds
}

// Health check endpoint
Bun.serve({
  port: process.env.HEALTH_PORT || 3099,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          workerId: config.workerAntId,
          region: workerRegion,
          queues: {
            monitoring: monitoringWorker.isRunning(),
            metrics: metricsWorker.isRunning(),
            notifications: notificationWorker.isRunning(),
          },
          timestamp: Date.now(),
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (url.pathname === "/status") {
      const cacheStats = localCache.getCacheStats();

      return new Response(
        JSON.stringify({
          worker: {
            id: config.workerAntId,
            region: workerRegion,
            environment: config.environment,
            concurrency: config.concurrency,
            preset: config.preset,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
          },
          queues: {
            monitoring: {
              isRunning: monitoringWorker.isRunning(),
              // Note: BullMQ doesn't expose job counts easily without Redis queries
            },
            metrics: {
              isRunning: metricsWorker.isRunning(),
            },
            notifications: {
              isRunning: notificationWorker.isRunning(),
            },
          },
          cache: {
            rabbitmqConnected: cacheStats.isConnected,
            totalEntries: cacheStats.totalEntries,
            pendingRetries: cacheStats.pendingRetries,
            failedEntries: cacheStats.failedEntries,
            oldestEntry: cacheStats.oldestEntry
              ? new Date(cacheStats.oldestEntry).toISOString()
              : null,
            newestEntry: cacheStats.newestEntry
              ? new Date(cacheStats.newestEntry).toISOString()
              : null,
          },
          timestamp: Date.now(),
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (url.pathname === "/cache/flush") {
      if (req.method === "POST") {
        localCache
          .forceFlush()
          .then(() => {
            console.log("📤 Manual cache flush triggered via API");
          })
          .catch((error) => {
            console.error("❌ Manual cache flush failed:", error);
          });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Cache flush initiated",
            timestamp: Date.now(),
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Health endpoints
    if (url.pathname === "/health") {
      const health = healthChecker.getBasicHealth();
      return new Response(JSON.stringify(health), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/health/detailed") {
      try {
        const health = await healthChecker.runHealthChecks();
        const statusCode =
          health.status === "healthy"
            ? 200
            : health.status === "degraded"
              ? 200
              : 503;

        return new Response(JSON.stringify(health), {
          status: statusCode,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({
            service: "workers",
            status: "unhealthy",
            timestamp: Date.now(),
            error: error instanceof Error ? error.message : String(error),
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Metrics endpoints
    if (url.pathname === "/metrics") {
      const metrics = metricsCollector.generatePrometheusMetrics();
      return new Response(metrics, {
        headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
      });
    }

    if (url.pathname === "/metrics/json") {
      const metrics = metricsCollector.getMetricsJSON();
      return new Response(JSON.stringify(metrics), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/cache/clear") {
      if (req.method === "POST") {
        localCache
          .clearCache()
          .then(() => {
            logger.info("Manual cache clear triggered via API", {
              component: "cache",
            });
          })
          .catch((error) => {
            logger.error("Manual cache clear failed", error, {
              component: "cache",
            });
          });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Cache cleared",
            timestamp: Date.now(),
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("📛 SIGTERM received, shutting down gracefully...");

  await monitoringWorker.close();
  await metricsWorker.close();
  await notificationWorker.close();

  // Shutdown local cache (flush remaining data)
  await localCache.shutdown();

  await redis.disconnect();
  await redisSubscriber.disconnect();

  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("📛 SIGINT received, shutting down gracefully...");

  await monitoringWorker.close();
  await metricsWorker.close();
  await notificationWorker.close();

  // Shutdown local cache (flush remaining data)
  await localCache.shutdown();

  await redis.disconnect();
  await redisSubscriber.disconnect();

  process.exit(0);
});

// Start the worker ant
async function start() {
  console.log(`🚀 Worker Ant starting...`);
  console.log(`📍 Environment: ${config.environment}`);
  console.log(`🔧 Concurrency: ${config.concurrency}`);
  console.log(`🎛️  Preset: ${config.preset}`);

  // Initialize worker ant with auto-location detection
  const workerAntConfig = await initializeWorkerAnt();

  await initializeStorage();

  // Setup health checks after initialization
  healthChecker.addCheck("redis", commonHealthChecks.redis(redis));
  healthChecker.addCheck(
    "redis-subscriber",
    commonHealthChecks.redis(redisSubscriber)
  );

  healthChecker.addCheck(
    "storage",
    commonHealthChecks.storage(async () => {
      // Test Golem storage with a simple operation
      await mockStorage.get("health-check-test");
    }, "golem-l3")
  );

  // Test BullMQ queues
  healthChecker.addCheck(
    "monitoring-queue",
    commonHealthChecks.storage(async () => {
      await monitoringQueue.getWaiting(0, 0); // Check if queue is accessible
    }, "monitoring-queue")
  );

  logger.info("Health checks configured", {
    component: "health",
    checks: ["redis", "redis-subscriber", "storage", "monitoring-queue"],
  });

  // Start heartbeat to keep worker ant registered
  const heartbeatInterval = setInterval(async () => {
    workerAntConfig.status.lastHeartbeat = Date.now();
    await redis.setex(
      `worker-ant:${workerAntConfig.id}`,
      300, // 5 minutes TTL
      JSON.stringify(workerAntConfig)
    );
  }, 30000); // Every 30 seconds

  // Start workers
  monitoringWorker.on("completed", (job) => {
    workerAntConfig.status.checksCompleted++;

    // Record metrics
    const duration = (Date.now() - job.timestamp) / 1000; // Convert to seconds
    metricsCollector.recordWorkerJob("monitoring", duration, "completed");

    logger.info("Monitoring job completed", {
      component: "worker",
      jobId: job.id,
      duration,
    });
  });

  monitoringWorker.on("failed", (job, err) => {
    workerAntConfig.status.checksFailed++;

    // Record metrics
    const duration = job ? (Date.now() - job.timestamp) / 1000 : 0;
    metricsCollector.recordWorkerJob("monitoring", duration, "failed");

    logger.error("Monitoring job failed", err, {
      component: "worker",
      jobId: job?.id,
      duration,
    });
  });

  // Start scheduler
  await scheduler();

  console.log(`✅ Worker Ant ${workerAntConfig.id} started successfully`);

  // Cleanup on shutdown
  process.on("SIGTERM", () => {
    clearInterval(heartbeatInterval);
  });
}

// Start the worker
start().catch((error) => {
  console.error("❌ Failed to start worker:", error);
  process.exit(1);
});
