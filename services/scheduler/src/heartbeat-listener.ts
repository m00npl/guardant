import amqp from 'amqplib';
import Redis from 'ioredis';
import { createLogger } from '../../../shared/logger';

const logger = createLogger('heartbeat-listener');

// Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

export async function startHeartbeatListener(channel: amqp.Channel) {
  try {
    // Create exchange for heartbeats
    await channel.assertExchange('worker_heartbeat', 'fanout');
    
    // Create temporary queue
    const q = await channel.assertQueue('', { exclusive: true });
    await channel.bindQueue(q.queue, 'worker_heartbeat', '');
    
    // Listen for heartbeats
    await channel.consume(q.queue, async (msg) => {
      if (!msg) return;
      
      try {
        const heartbeat = JSON.parse(msg.content.toString());
        const { workerId, region, version, checksCompleted } = heartbeat;
        
        // Store in Redis with TTL
        await redis.hset(
          'workers:heartbeat',
          workerId,
          JSON.stringify({
            region,
            version,
            lastSeen: Date.now(),
            checksCompleted
          })
        );
        
        logger.debug('💓 Received heartbeat', { workerId, version, region });
        
        channel.ack(msg);
      } catch (error) {
        logger.error('Failed to process heartbeat', error);
        channel.nack(msg, false, false);
      }
    });
    
    logger.info('💓 Heartbeat listener started');
    
    // Clean up old heartbeats every minute
    setInterval(async () => {
      try {
        const workers = await redis.hgetall('workers:heartbeat');
        const now = Date.now();
        
        for (const [workerId, data] of Object.entries(workers)) {
          const worker = JSON.parse(data);
          if (now - worker.lastSeen > 120000) { // 2 minutes
            await redis.hdel('workers:heartbeat', workerId);
            logger.info('🔴 Worker timeout', { workerId });
          }
        }
      } catch (error) {
        logger.error('Failed to clean up old heartbeats', error);
      }
    }, 60000);
    
  } catch (error) {
    logger.error('Failed to start heartbeat listener', error);
    throw error;
  }
}