import amqp from 'amqplib';
import Redis from 'ioredis';
import { createLogger } from '../../../shared/logger';

const logger = createLogger('heartbeat-listener');

// Redis connection
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

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
        
        logger.info('💓 Received heartbeat', { workerId, version, region, checksCompleted });
        
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