import amqp from 'amqplib';
import { createLogger } from '../../../shared/logger';
import { MonitoringService } from './services/monitoring';
import { localCache } from './local-cache';
import { locationDetector } from './worker-ant-location';
import { getMetricsCollector } from '../../../shared/metrics';
import Redis from 'ioredis';

// Types
interface Service {
  id: string;
  nestId: string;
  name: string;
  type: string;
  target: string;
  interval: number;
  config: Record<string, any>;
  monitoring: {
    regions: string[];
  };
}

interface WorkerCommand {
  command: string;
  data: any;
  timestamp: number;
}

// Configuration
const config = {
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  workerId: process.env.WORKER_ID || `worker-${Date.now()}`,
  region: process.env.WORKER_REGION || 'unknown',
};

// Services
const logger = createLogger('worker-rabbitmq');
const metricsCollector = getMetricsCollector('guardant_workers');

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

const redis = new Redis(getRedisConfig());

// Initialize monitoring service
let monitoringService: MonitoringService;

// Active monitoring intervals
const activeMonitoring = new Map<string, NodeJS.Timeout>();

async function startWorker() {
  try {
    logger.info('🚀 RabbitMQ Worker starting...', { workerId: config.workerId });

    // Detect location
    const location = await locationDetector.detectLocation();
    const region = location.region || config.region;
    logger.info('📍 Worker location detected', { region, city: location.city });

    // Initialize monitoring service
    monitoringService = new MonitoringService(region);

    // Connect to RabbitMQ
    const connection = await amqp.connect(config.rabbitmqUrl);
    const channel = await connection.createChannel();

    // Declare exchange and queue
    await channel.assertExchange('worker_commands', 'direct');
    const q = await channel.assertQueue('', { exclusive: true });
    
    // Bind queue to commands
    await channel.bindQueue(q.queue, 'worker_commands', 'monitor_service');
    await channel.bindQueue(q.queue, 'worker_commands', 'stop_monitoring');

    logger.info('✅ Connected to RabbitMQ and ready to receive commands');

    // Consume messages
    await channel.consume(q.queue, async (msg) => {
      if (!msg) return;

      try {
        const command: WorkerCommand = JSON.parse(msg.content.toString());
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
          
          default:
            logger.warn('Unknown command', { command: command.command });
        }

        channel.ack(msg);
      } catch (error) {
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

  } catch (error) {
    logger.error('Failed to start worker', error);
    process.exit(1);
  }
}

async function handleMonitorService(data: any) {
  const { serviceId, nestId, type, target, config, regions, interval } = data;
  
  logger.info('🔍 Starting monitoring for service', { 
    serviceId, 
    type, 
    target, 
    interval 
  });

  // Create service object
  const service: Service = {
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
      await redis.setex(
        `status:${nestId}:${serviceId}`,
        300, // 5 minutes TTL
        JSON.stringify(result)
      );

      // Send result to local cache (which will forward to RabbitMQ)
      await localCache.storeCheckResult({
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
      metricsCollector.recordMonitoringCheck(
        nestId,
        serviceId,
        result.status,
        config.region || 'unknown',
        result.responseTime || 0,
        type
      );

    } catch (error) {
      logger.error('Check failed', error, { serviceId });
    }
  };

  // Run first check immediately
  await checkService();

  // Schedule periodic checks
  const intervalId = setInterval(checkService, interval * 1000);
  activeMonitoring.set(serviceId, intervalId);
}

async function handleStopMonitoring(data: any) {
  const { serviceId } = data;
  
  logger.info('🛑 Stopping monitoring for service', { serviceId });

  const interval = activeMonitoring.get(serviceId);
  if (interval) {
    clearInterval(interval);
    activeMonitoring.delete(serviceId);
    logger.info('✅ Monitoring stopped', { serviceId });
  } else {
    logger.warn('No active monitoring found', { serviceId });
  }
}

// Start the worker
startWorker().catch((error) => {
  logger.error('Worker startup failed', error);
  process.exit(1);
});