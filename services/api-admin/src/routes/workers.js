"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workersApi = void 0;
const hono_1 = require("hono");
const amqplib_1 = __importDefault(require("amqplib"));
const logger_1 = require("../../../../shared/logger");
const ioredis_1 = __importDefault(require("ioredis"));
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const logger = (0, logger_1.createLogger)('workers-api');
const workersApi = new hono_1.Hono();
exports.workersApi = workersApi;
// Redis instance
const redis = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
});
// Update all workers
workersApi.post('/update', async (c) => {
    try {
        const body = await c.req.json();
        const { repoUrl, branch = 'main', version, delay = 5000 } = body;
        if (!repoUrl) {
            return c.json({ success: false, error: 'repoUrl is required' }, 400);
        }
        logger.info('Sending update command to workers', { repoUrl, branch, version });
        // Connect to RabbitMQ
        const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        const connection = await amqplib_1.default.connect(rabbitmqUrl);
        const channel = await connection.createChannel();
        // Send update command to all workers
        await channel.assertExchange('worker_commands', 'direct');
        const command = {
            command: 'update_worker',
            data: {
                repoUrl,
                branch,
                version,
                delay
            },
            timestamp: Date.now()
        };
        await channel.publish('worker_commands', 'update_worker', Buffer.from(JSON.stringify(command)), { persistent: true });
        await channel.close();
        await connection.close();
        return c.json({
            success: true,
            message: 'Update command sent to all workers',
            version,
            workersWillUpdateIn: `${delay}ms`
        });
    }
    catch (error) {
        logger.error('Failed to send update command', error);
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
});
// Get worker status
workersApi.get('/status', async (c) => {
    try {
        // Get worker heartbeats from Redis
        const workers = await redis.hgetall('workers:heartbeat');
        const workerList = Object.entries(workers).map(([id, data]) => {
            const worker = JSON.parse(data);
            const isAlive = (Date.now() - worker.lastSeen) < 60000; // 1 minute timeout
            return {
                id,
                version: worker.version || 'unknown',
                region: worker.region,
                isAlive,
                lastSeen: new Date(worker.lastSeen).toISOString(),
                checksCompleted: worker.checksCompleted || 0,
                totalPoints: worker.totalPoints || 0,
                currentPeriodPoints: worker.currentPeriodPoints || 0,
                earnings: worker.earnings || { points: 0, estimatedUSD: 0, estimatedCrypto: 0 },
            };
        });
        // Sort by version and region
        workerList.sort((a, b) => {
            if (a.version !== b.version)
                return a.version.localeCompare(b.version);
            return a.region.localeCompare(b.region);
        });
        // Group by version
        const versionGroups = workerList.reduce((acc, worker) => {
            if (!acc[worker.version])
                acc[worker.version] = [];
            acc[worker.version].push(worker);
            return acc;
        }, {});
        return c.json({
            success: true,
            workers: workerList,
            totalWorkers: workerList.length,
            aliveWorkers: workerList.filter(w => w.isAlive).length,
            versionGroups,
        });
    }
    catch (error) {
        logger.error('Failed to get worker status', error);
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
});
// Rebuild all workers
workersApi.post('/rebuild', async (c) => {
    try {
        const body = await c.req.json();
        const { delay = 5000 } = body;
        logger.info('Sending rebuild command to workers');
        // Connect to RabbitMQ
        const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        const connection = await amqplib_1.default.connect(rabbitmqUrl);
        const channel = await connection.createChannel();
        // Send rebuild command
        await channel.assertExchange('worker_commands', 'direct');
        const command = {
            command: 'rebuild_worker',
            data: { delay },
            timestamp: Date.now()
        };
        await channel.publish('worker_commands', 'rebuild_worker', Buffer.from(JSON.stringify(command)), { persistent: true });
        await channel.close();
        await connection.close();
        return c.json({
            success: true,
            message: 'Rebuild command sent to all workers',
            workersWillRebuildIn: `${delay}ms`
        });
    }
    catch (error) {
        logger.error('Failed to send rebuild command', error);
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
});
// Get workers by owner email
workersApi.get('/by-owner/:email', async (c) => {
    const ownerEmail = c.req.param('email');
    try {
        // Get worker IDs for this owner
        const workerIds = await redis.smembers(`workers:by-owner:${ownerEmail}`);
        // Get details for each worker
        const workers = [];
        for (const workerId of workerIds) {
            // Get registration info
            const registration = await redis.hget('workers:registrations', workerId);
            if (registration) {
                const regData = JSON.parse(registration);
                // Get current status
                const heartbeat = await redis.hget('workers:heartbeat', workerId);
                const status = heartbeat ? JSON.parse(heartbeat) : null;
                workers.push({
                    ...regData,
                    currentStatus: status ? {
                        isAlive: (Date.now() - status.lastSeen) < 60000,
                        lastSeen: new Date(status.lastSeen).toISOString(),
                        version: status.version,
                        totalPoints: status.totalPoints || 0,
                        region: status.region,
                    } : null,
                });
            }
        }
        return c.json({
            success: true,
            ownerEmail,
            workers,
            totalWorkers: workers.length,
            activeWorkers: workers.filter(w => w.currentStatus?.isAlive).length,
            totalPoints: workers.reduce((sum, w) => sum + (w.currentStatus?.totalPoints || 0), 0),
        });
    }
    catch (error) {
        logger.error('Failed to get workers by owner', error);
        return c.json({ error: 'Failed to get workers' }, 500);
    }
});
// Get pending worker registrations
workersApi.get('/registrations/pending', async (c) => {
    try {
        // Get pending workers
        const pendingIds = await redis.zrange('workers:pending', 0, -1, 'WITHSCORES');
        const pending = [];
        for (let i = 0; i < pendingIds.length; i += 2) {
            const workerId = pendingIds[i];
            const timestamp = parseInt(pendingIds[i + 1]);
            const registration = await redis.hget('workers:registrations', workerId);
            if (registration) {
                const data = JSON.parse(registration);
                pending.push({
                    ...data,
                    pendingSince: new Date(timestamp).toISOString(),
                    ownerEmail: data.ownerEmail || 'unknown',
                });
            }
        }
        return c.json({
            success: true,
            pending,
            count: pending.length,
        });
    }
    catch (error) {
        logger.error('Failed to get pending registrations', error);
        return c.json({ error: 'Failed to get pending registrations' }, 500);
    }
});
// Approve worker registration
workersApi.post('/registrations/:workerId/approve', async (c) => {
    const workerId = c.req.param('workerId');
    const { region = 'auto' } = await c.req.json();
    const user = c.get('user');
    try {
        // Get registration
        const registration = await redis.hget('workers:registrations', workerId);
        if (!registration) {
            return c.json({ error: 'Worker not found' }, 404);
        }
        const config = JSON.parse(registration);
        if (config.approved) {
            return c.json({ error: 'Worker already approved' }, 400);
        }
        // Generate worker credentials
        const workerUsername = `worker-${config.workerId}`;
        const workerPassword = crypto_1.default.randomBytes(32).toString('base64').replace(/[+/=]/g, '');
        // Create RabbitMQ user for this worker
        try {
            const rabbitmqMgmtUrl = process.env.RABBITMQ_MANAGEMENT_URL || 'http://rabbitmq:15672';
            const rabbitmqAuth = {
                username: process.env.RABBITMQ_ADMIN_USER || 'guardant',
                password: process.env.RABBITMQ_ADMIN_PASS || 'guardant123',
            };
            // Create user
            await axios_1.default.put(`${rabbitmqMgmtUrl}/api/users/${workerUsername}`, {
                password: workerPassword,
                tags: 'worker',
            }, { auth: rabbitmqAuth });
            // Set permissions (can only access worker queues)
            await axios_1.default.put(`${rabbitmqMgmtUrl}/api/permissions/%2F/${workerUsername}`, {
                configure: '^$', // Cannot configure
                write: '^(worker_commands|worker_heartbeat|monitoring_results)$', // Can write to specific exchanges
                read: '^(monitoring_workers.*|worker\\..*|monitoring_results)$', // Can read from worker queues
            }, { auth: rabbitmqAuth });
            logger.info('Created RabbitMQ user for worker', { workerUsername });
        }
        catch (error) {
            logger.error('Failed to create RabbitMQ user', error);
            return c.json({ error: 'Failed to create worker credentials' }, 500);
        }
        // Update registration with approval
        config.approved = true;
        config.approvedAt = Date.now();
        config.approvedBy = user.email;
        config.workerUsername = workerUsername;
        config.workerPassword = workerPassword;
        config.region = region;
        // Save updated config
        await redis.hset('workers:registrations', workerId, JSON.stringify(config));
        // Remove from pending
        await redis.zrem('workers:pending', workerId);
        logger.info('Worker approved', {
            workerId,
            approvedBy: user.email,
        });
        return c.json({
            success: true,
            message: 'Worker approved',
            workerId,
            config: {
                workerId: config.workerId,
                rabbitmqUrl: config.rabbitmqUrl,
                region: config.region,
            },
        });
    }
    catch (error) {
        logger.error('Failed to approve worker', error);
        return c.json({ error: 'Approval failed' }, 500);
    }
});
// Reject worker registration
workersApi.post('/registrations/:workerId/reject', async (c) => {
    const workerId = c.req.param('workerId');
    const user = c.get('user');
    try {
        // Get registration to check if user was created
        const registration = await redis.hget('workers:registrations', workerId);
        if (registration) {
            const config = JSON.parse(registration);
            // If worker was previously approved, revoke RabbitMQ access
            if (config.approved && config.workerUsername) {
                try {
                    const rabbitmqMgmtUrl = process.env.RABBITMQ_MANAGEMENT_URL || 'http://rabbitmq:15672';
                    const rabbitmqAuth = {
                        username: process.env.RABBITMQ_ADMIN_USER || 'guardant',
                        password: process.env.RABBITMQ_ADMIN_PASS || 'guardant123',
                    };
                    // Delete RabbitMQ user
                    await axios_1.default.delete(`${rabbitmqMgmtUrl}/api/users/${config.workerUsername}`, { auth: rabbitmqAuth });
                    logger.info('Deleted RabbitMQ user', { username: config.workerUsername });
                }
                catch (error) {
                    logger.error('Failed to delete RabbitMQ user', error);
                }
            }
        }
        // Remove from registrations
        await redis.hdel('workers:registrations', workerId);
        // Remove from pending
        await redis.zrem('workers:pending', workerId);
        // Remove from owner's list
        if (registration) {
            const config = JSON.parse(registration);
            if (config.ownerEmail) {
                await redis.srem(`workers:by-owner:${config.ownerEmail}`, workerId);
            }
        }
        logger.info('Worker rejected', {
            workerId,
            rejectedBy: user.email,
        });
        return c.json({
            success: true,
            message: 'Worker rejected and credentials revoked',
            workerId,
        });
    }
    catch (error) {
        logger.error('Failed to reject worker', error);
        return c.json({ error: 'Rejection failed' }, 500);
    }
});
// Get worker points leaderboard
workersApi.get('/leaderboard', async (c) => {
    try {
        const workers = await redis.hgetall('workers:heartbeat');
        const leaderboard = Object.entries(workers)
            .map(([id, data]) => {
            const worker = JSON.parse(data);
            return {
                workerId: id,
                region: worker.region,
                totalPoints: worker.totalPoints || 0,
                currentPeriodPoints: worker.currentPeriodPoints || 0,
                checksCompleted: worker.checksCompleted || 0,
                earnings: worker.earnings,
            };
        })
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .slice(0, 100); // Top 100
        // Calculate global stats
        const globalStats = leaderboard.reduce((acc, worker) => {
            acc.totalPoints += worker.totalPoints;
            acc.totalChecks += worker.checksCompleted;
            acc.totalWorkers++;
            return acc;
        }, { totalPoints: 0, totalChecks: 0, totalWorkers: 0 });
        return c.json({
            success: true,
            leaderboard,
            globalStats,
        });
    }
    catch (error) {
        logger.error('Failed to get leaderboard', error);
        return c.json({ error: 'Failed to get leaderboard' }, 500);
    }
});
// Reset worker points period (admin only)
workersApi.post('/points/reset-period', async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin') {
        return c.json({ error: 'Admin access required' }, 403);
    }
    try {
        // Send reset command to all workers
        const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        const connection = await amqplib_1.default.connect(rabbitmqUrl);
        const channel = await connection.createChannel();
        await channel.assertExchange('worker_commands', 'direct');
        const command = {
            command: 'reset_points_period',
            data: {
                resetTime: Date.now(),
                reason: 'monthly_reset',
            },
            timestamp: Date.now()
        };
        await channel.publish('worker_commands', 'reset_points_period', Buffer.from(JSON.stringify(command)), { persistent: true });
        await channel.close();
        await connection.close();
        logger.info('Points period reset initiated', { by: user.email });
        return c.json({
            success: true,
            message: 'Points period reset command sent to all workers',
        });
    }
    catch (error) {
        logger.error('Failed to reset points period', error);
        return c.json({ error: 'Failed to reset period' }, 500);
    }
});
// Change worker region (requires admin approval)
workersApi.post('/:workerId/change-region', async (c) => {
    const workerId = c.req.param('workerId');
    const { newRegion } = await c.req.json();
    const user = c.get('user');
    if (!newRegion) {
        return c.json({ error: 'New region is required' }, 400);
    }
    try {
        // Get current worker info
        const workerData = await redis.hget('workers:heartbeat', workerId);
        if (!workerData) {
            return c.json({ error: 'Worker not found' }, 404);
        }
        const worker = JSON.parse(workerData);
        const oldRegion = worker.region;
        // Store region change request
        const changeRequest = {
            workerId,
            oldRegion,
            newRegion,
            requestedAt: Date.now(),
            requestedBy: user.email,
            approved: false,
            approvedBy: null,
            approvedAt: null,
        };
        const requestId = `region-change-${Date.now()}-${workerId}`;
        await redis.hset('workers:region-changes', requestId, JSON.stringify(changeRequest));
        await redis.zadd('workers:pending-region-changes', Date.now(), requestId);
        logger.info('Region change requested', {
            workerId,
            oldRegion,
            newRegion,
            requestedBy: user.email,
        });
        return c.json({
            success: true,
            message: 'Region change request submitted for approval',
            requestId,
            oldRegion,
            newRegion,
        });
    }
    catch (error) {
        logger.error('Failed to request region change', error);
        return c.json({ error: 'Failed to request region change' }, 500);
    }
});
// Approve region change
workersApi.post('/region-changes/:requestId/approve', async (c) => {
    const requestId = c.req.param('requestId');
    const user = c.get('user');
    if (user.role !== 'admin') {
        return c.json({ error: 'Admin access required' }, 403);
    }
    try {
        // Get request
        const requestData = await redis.hget('workers:region-changes', requestId);
        if (!requestData) {
            return c.json({ error: 'Request not found' }, 404);
        }
        const request = JSON.parse(requestData);
        if (request.approved) {
            return c.json({ error: 'Request already approved' }, 400);
        }
        // Update request
        request.approved = true;
        request.approvedBy = user.email;
        request.approvedAt = Date.now();
        // Send command to worker to change region
        const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        const connection = await amqplib_1.default.connect(rabbitmqUrl);
        const channel = await connection.createChannel();
        await channel.assertExchange('worker_commands', 'direct');
        const command = {
            command: 'change_region',
            data: {
                workerId: request.workerId,
                newRegion: request.newRegion,
                approvalId: requestId,
            },
            timestamp: Date.now(),
        };
        // Send to specific worker
        await channel.publish('worker_commands', `worker.${request.workerId}`, Buffer.from(JSON.stringify(command)), { persistent: true });
        await channel.close();
        await connection.close();
        // Update request status
        await redis.hset('workers:region-changes', requestId, JSON.stringify(request));
        await redis.zrem('workers:pending-region-changes', requestId);
        logger.info('Region change approved', {
            requestId,
            workerId: request.workerId,
            newRegion: request.newRegion,
            approvedBy: user.email,
        });
        return c.json({
            success: true,
            message: 'Region change approved and command sent to worker',
            request,
        });
    }
    catch (error) {
        logger.error('Failed to approve region change', error);
        return c.json({ error: 'Failed to approve region change' }, 500);
    }
});
// Get worker owners summary
workersApi.get('/owners/summary', async (c) => {
    try {
        // Get all worker registrations
        const registrations = await redis.hgetall('workers:registrations');
        // Group by owner
        const ownerStats = new Map();
        for (const [workerId, data] of Object.entries(registrations)) {
            const worker = JSON.parse(data);
            const email = worker.ownerEmail || 'unknown';
            if (!ownerStats.has(email)) {
                ownerStats.set(email, {
                    email,
                    totalWorkers: 0,
                    activeWorkers: 0,
                    totalPoints: 0,
                    regions: new Set(),
                });
            }
            const stats = ownerStats.get(email);
            stats.totalWorkers++;
            // Get current status
            const heartbeat = await redis.hget('workers:heartbeat', workerId);
            if (heartbeat) {
                const status = JSON.parse(heartbeat);
                if ((Date.now() - status.lastSeen) < 60000) {
                    stats.activeWorkers++;
                }
                stats.totalPoints += status.totalPoints || 0;
                stats.regions.add(status.region || worker.region);
            }
        }
        // Convert to array and sort by points
        const owners = Array.from(ownerStats.values())
            .map(owner => ({
            ...owner,
            regions: Array.from(owner.regions),
        }))
            .sort((a, b) => b.totalPoints - a.totalPoints);
        return c.json({
            success: true,
            owners,
            totalOwners: owners.length,
            totalWorkers: owners.reduce((sum, o) => sum + o.totalWorkers, 0),
            totalActiveWorkers: owners.reduce((sum, o) => sum + o.activeWorkers, 0),
            totalPoints: owners.reduce((sum, o) => sum + o.totalPoints, 0),
        });
    }
    catch (error) {
        logger.error('Failed to get owners summary', error);
        return c.json({ error: 'Failed to get summary' }, 500);
    }
});
//# sourceMappingURL=workers.js.map