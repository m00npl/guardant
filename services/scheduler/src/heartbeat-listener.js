"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startHeartbeatListener = startHeartbeatListener;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../../../shared/logger");
const logger = (0, logger_1.createLogger)('heartbeat-listener');
// Redis connection
const redis = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
});
async function startHeartbeatListener(channel) {
    try {
        // Create exchange for heartbeats
        await channel.assertExchange('worker_heartbeat', 'fanout');
        // Create temporary queue
        const q = await channel.assertQueue('', { exclusive: true });
        await channel.bindQueue(q.queue, 'worker_heartbeat', '');
        // Listen for heartbeats
        await channel.consume(q.queue, async (msg) => {
            if (!msg)
                return;
            try {
                const heartbeat = JSON.parse(msg.content.toString());
                const { workerId, region, version, checksCompleted } = heartbeat;
                // Store in Redis with TTL
                await redis.hset('workers:heartbeat', workerId, JSON.stringify({
                    region,
                    version,
                    lastSeen: Date.now(),
                    checksCompleted
                }));
                logger.debug('💓 Received heartbeat', { workerId, version, region });
                channel.ack(msg);
            }
            catch (error) {
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
            }
            catch (error) {
                logger.error('Failed to clean up old heartbeats', error);
            }
        }, 60000);
    }
    catch (error) {
        logger.error('Failed to start heartbeat listener', error);
        throw error;
    }
}
//# sourceMappingURL=heartbeat-listener.js.map