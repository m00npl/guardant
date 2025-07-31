import amqp from 'amqplib';
import Redis from 'ioredis';
import { createLogger } from '../../../shared/logger';
import { HeartbeatVerifier } from './heartbeat-verifier';

const logger = createLogger('heartbeat-listener');

// Redis connection with explicit configuration
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const parsedUrl = new URL(redisUrl);

const redis = new Redis({
  host: parsedUrl.hostname,
  port: parseInt(parsedUrl.port) || 6379,
  password: parsedUrl.password || undefined,
  // Explicitly set as master to avoid any auto-detection issues
  role: 'master',
  // Disable read-only mode
  readOnly: false,
  // Enable auto-reconnect
  retryStrategy: (times) => {
    if (times > 10) {
      logger.error('Redis connection failed after 10 retries');
      return null;
    }
    return Math.min(times * 100, 3000);
  }
});

export async function startHeartbeatListener(channel: amqp.Channel) {
  try {
    // Create verifier instance
    const verifier = new HeartbeatVerifier(redis);
    
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
        // Get worker's public key from registration
        const registrationData = await redis.hget('workers:registrations', heartbeat.workerId);
        let publicKey = null;
        if (registrationData) {
          const registration = JSON.parse(registrationData);
          publicKey = registration.publicKey;
        }
        
        // Verify heartbeat
        const verificationResult = await verifier.verifyHeartbeat(heartbeat, publicKey);
        
        if (!verificationResult.isValid) {
          logger.warn('❌ Invalid heartbeat rejected', {
            workerId: heartbeat.workerId,
            reason: verificationResult.reason
          });
          
          // Track suspicious activity
          await redis.hincrby('workers:suspicious', heartbeat.workerId, 1);
          
          channel.nack(msg, false, false);
          return;
        }
        
        // Use sanitized data
        const sanitizedData = verificationResult.sanitizedData!;
        
        // Store in Redis with verified data
        await redis.hset(
          'workers:heartbeat',
          sanitizedData.workerId,
          JSON.stringify({
            region: sanitizedData.region,
            version: sanitizedData.version,
            lastSeen: sanitizedData.lastSeen,
            checksCompleted: sanitizedData.checksCompleted,
            totalPoints: sanitizedData.totalPoints,
            currentPeriodPoints: sanitizedData.currentPeriodPoints,
            earnings: sanitizedData.earnings,
            location: sanitizedData.location,
            signature: sanitizedData.signature,
            verified: true,
            verifiedAt: Date.now()
          })
        );
        
        logger.info('💓 Verified heartbeat', { 
          workerId: sanitizedData.workerId, 
          version: sanitizedData.version, 
          region: sanitizedData.region, 
          checksCompleted: sanitizedData.checksCompleted,
          totalPoints: sanitizedData.totalPoints
        });
        
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
    
    // Detect anomalies every 5 minutes
    setInterval(async () => {
      try {
        const anomalies = await verifier.detectAnomalies();
        if (anomalies.length > 0) {
          logger.warn('🚨 Detected anomalies', { 
            count: anomalies.length,
            anomalies 
          });
          
          // Store anomalies for admin review
          await redis.setex(
            'workers:anomalies:latest',
            3600, // 1 hour TTL
            JSON.stringify({
              timestamp: Date.now(),
              anomalies
            })
          );
        }
      } catch (error) {
        logger.error('Failed to detect anomalies', error);
      }
    }, 300000); // 5 minutes
    
  } catch (error) {
    logger.error('Failed to start heartbeat listener', error);
    throw error;
  }
}