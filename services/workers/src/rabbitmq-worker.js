"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const amqplib_1 = __importDefault(require("amqplib"));
const logger_1 = require("../../../shared/logger");
const monitoring_1 = require("./services/monitoring");
const local_cache_1 = require("./local-cache");
const worker_ant_location_1 = require("./worker-ant-location");
const metrics_1 = require("../../../shared/metrics");
const ioredis_1 = __importDefault(require("ioredis"));
// Configuration
const config = {
    rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    workerId: process.env.WORKER_ID || `worker-${Date.now()}`,
    region: process.env.WORKER_REGION || 'unknown',
};
// Services
const logger = (0, logger_1.createLogger)('worker-rabbitmq');
const metricsCollector = (0, metrics_1.getMetricsCollector)('guardant_workers');
// Redis for status storage
function getRedisConfig() {
    if (process.env.REDIS_URL) {
        const url = new URL(process.env.REDIS_URL);
        return {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            password: url.password || undefined,
            maxRetriesPerRequest: null,
        };
    }
    return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: null,
    };
}
const redis = new ioredis_1.default(getRedisConfig());
// Initialize monitoring service
let monitoringService;
// Active monitoring intervals
const activeMonitoring = new Map();
// Restore monitoring state from Redis
async function restoreMonitoringState() {
    try {
        logger.info('🔄 Checking for services to monitor...');
        // This worker will only pick up a subset of services based on worker ID hash
        const workerIndex = parseInt(config.workerId.replace(/\D/g, '')) || 0;
        const totalWorkers = parseInt(process.env.WORKER_REPLICAS || '3');
        const serviceKeys = await redis.keys('services:*');
        let restoredCount = 0;
        for (const key of serviceKeys) {
            const servicesData = await redis.get(key);
            if (servicesData) {
                const services = JSON.parse(servicesData);
                for (const service of services) {
                    if (service.isActive) {
                        // Simple distribution based on service ID hash
                        const serviceHash = service.id.split('').reduce((a, b) => {
                            a = ((a << 5) - a) + b.charCodeAt(0);
                            return a & a;
                        }, 0);
                        if (Math.abs(serviceHash) % totalWorkers === workerIndex % totalWorkers) {
                            logger.info('📌 Restoring monitoring for service', {
                                serviceId: service.id,
                                name: service.name
                            });
                            await handleMonitorService(service);
                            restoredCount++;
                        }
                    }
                }
            }
        }
        logger.info('✅ Restored monitoring', { count: restoredCount });
    }
    catch (error) {
        logger.error('Failed to restore monitoring state', error);
    }
}
async function startWorker() {
    try {
        logger.info('🚀 RabbitMQ Worker starting...', { workerId: config.workerId });
        // Detect location
        const location = await worker_ant_location_1.locationDetector.detectLocation();
        const region = location.region || config.region;
        logger.info('📍 Worker location detected', { region, city: location.city });
        // Initialize monitoring service
        monitoringService = new monitoring_1.MonitoringService(region);
        // Check if we should restore monitoring state
        const shouldRestore = process.env.RESTORE_MONITORING !== 'false';
        if (shouldRestore) {
            await restoreMonitoringState();
        }
        // Connect to RabbitMQ
        const connection = await amqplib_1.default.connect(config.rabbitmqUrl);
        const channel = await connection.createChannel();
        // Declare exchange and shared queue
        await channel.assertExchange('worker_commands', 'direct');
        // Use a shared queue for all workers (not exclusive)
        const queueName = 'monitoring_workers';
        const q = await channel.assertQueue(queueName, {
            durable: true,
            exclusive: false // Shared between workers
        });
        // Set prefetch to 1 to ensure fair distribution
        await channel.prefetch(1);
        // Bind queue to commands
        await channel.bindQueue(q.queue, 'worker_commands', 'monitor_service');
        await channel.bindQueue(q.queue, 'worker_commands', 'stop_monitoring');
        await channel.bindQueue(q.queue, 'worker_commands', 'check_service_once');
        logger.info('✅ Connected to RabbitMQ and ready to receive commands');
        // Consume messages
        await channel.consume(q.queue, async (msg) => {
            if (!msg)
                return;
            try {
                const command = JSON.parse(msg.content.toString());
                logger.info('📨 Received command', {
                    command: command.command,
                    timestamp: command.timestamp
                });
                switch (command.command) {
                    case 'monitor_service':
                        await handleMonitorService(command.data);
                        break;
                    case 'stop_monitoring':
                        await handleStopMonitoring(command.data);
                        break;
                    case 'check_service_once':
                        await handleSingleCheck(command.data);
                        break;
                    default:
                        logger.warn('Unknown command', { command: command.command });
                }
                channel.ack(msg);
            }
            catch (error) {
                logger.error('Failed to process command', error);
                channel.nack(msg, false, false);
            }
        });
        // Handle connection events
        connection.on('error', (error) => {
            logger.error('RabbitMQ connection error', error);
        });
        connection.on('close', () => {
            logger.warn('RabbitMQ connection closed, exiting...');
            process.exit(1);
        });
    }
    catch (error) {
        logger.error('Failed to start worker', error);
        process.exit(1);
    }
}
async function handleMonitorService(data) {
    const { serviceId, nestId, type, target, config, regions, interval } = data;
    logger.info('🔍 Starting monitoring for service', {
        serviceId,
        type,
        target,
        interval
    });
    // Create service object
    const service = {
        id: serviceId,
        nestId,
        name: target,
        type,
        target,
        interval,
        config: config || {},
        monitoring: {
            regions: regions || [],
        },
    };
    // Stop existing monitoring if any
    const existingInterval = activeMonitoring.get(serviceId);
    if (existingInterval) {
        clearInterval(existingInterval);
    }
    // Start monitoring
    const checkService = async () => {
        try {
            const result = await monitoringService.checkService(service);
            // Store result in Redis
            await redis.setex(`status:${nestId}:${serviceId}`, 300, // 5 minutes TTL
            JSON.stringify(result));
            // Send result to local cache (which will forward to RabbitMQ)
            await local_cache_1.localCache.storeCheckResult({
                id: `${serviceId}-${Date.now()}`,
                serviceId,
                nestId,
                timestamp: Date.now(),
                result,
            });
            logger.info('✅ Check completed', {
                serviceId,
                status: result.status
            });
            // Record metrics
            metricsCollector.recordMonitoringCheck(nestId, serviceId, result.status, config.region || 'unknown', result.responseTime || 0, type);
        }
        catch (error) {
            logger.error('Check failed', error, { serviceId });
        }
    };
    // Run first check immediately
    await checkService();
    // Schedule periodic checks
    const intervalId = setInterval(checkService, interval * 1000);
    activeMonitoring.set(serviceId, intervalId);
}
async function handleStopMonitoring(data) {
    const { serviceId } = data;
    logger.info('🛑 Stopping monitoring for service', { serviceId });
    const interval = activeMonitoring.get(serviceId);
    if (interval) {
        clearInterval(interval);
        activeMonitoring.delete(serviceId);
        logger.info('✅ Monitoring stopped', { serviceId });
    }
    else {
        logger.warn('No active monitoring found', { serviceId });
    }
}
// Handle single check (from scheduler)
async function handleSingleCheck(data) {
    const { serviceId, nestId, type, target, config, regions, cacheKey } = data;
    logger.info('🔍 Performing single check', { serviceId, type, target });
    const service = {
        id: serviceId,
        nestId,
        name: target,
        type,
        target,
        interval: 0, // Not used for single check
        config: config || {},
        monitoring: {
            regions: regions || [],
        },
    };
    try {
        const result = await monitoringService.checkService(service);
        // Store result in Redis
        await redis.setex(`status:${nestId}:${serviceId}`, 300, // 5 minutes TTL
        JSON.stringify(result));
        // Send result back to scheduler
        if (rabbitmqChannel) {
            await rabbitmqChannel.assertExchange('monitoring_results', 'direct');
            const resultMessage = JSON.stringify({
                serviceId,
                nestId,
                status: result.status,
                responseTime: result.responseTime,
                timestamp: Date.now(),
                workerId: config.workerId,
                region: config.region,
                cacheKey, // Include cache key for deduplication
            });
            await rabbitmqChannel.publish('monitoring_results', 'check_completed', Buffer.from(resultMessage), { persistent: true });
        }
        logger.info('✅ Single check completed', {
            serviceId,
            status: result.status,
            responseTime: result.responseTime
        });
        // Record metrics
        metricsCollector.recordMonitoringCheck(nestId, serviceId, result.status, config.region || 'unknown', result.responseTime || 0, type);
    }
    catch (error) {
        logger.error('Single check failed', error, { serviceId });
        // Send failure result to scheduler
        if (rabbitmqChannel) {
            const failureMessage = JSON.stringify({
                serviceId,
                nestId,
                status: 'error',
                error: error.message,
                timestamp: Date.now(),
                workerId: config.workerId,
            });
            await rabbitmqChannel.publish('monitoring_results', 'check_completed', Buffer.from(failureMessage), { persistent: true });
        }
    }
}
// Start the worker
startWorker().catch((error) => {
    logger.error('Worker startup failed', error);
    process.exit(1);
});
//# sourceMappingURL=rabbitmq-worker.js.map