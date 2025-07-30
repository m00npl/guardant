"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrationApi = void 0;
const hono_1 = require("hono");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../../../../shared/logger");
const crypto_1 = __importDefault(require("crypto"));
const logger = (0, logger_1.createLogger)('worker-registration');
const registrationApi = new hono_1.Hono();
exports.registrationApi = registrationApi;
// Redis connection
const redis = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
});
// Registration token (optional)
const REGISTRATION_TOKEN = process.env.WORKER_REGISTRATION_TOKEN;
// Generate secure password for worker
function generateSecurePassword() {
    return crypto_1.default.randomBytes(32).toString('base64').replace(/[+/=]/g, '');
}
// Register new worker
registrationApi.post('/register', async (c) => {
    try {
        // Check registration token if configured
        if (REGISTRATION_TOKEN) {
            const token = c.req.header('X-Registration-Token');
            if (token !== REGISTRATION_TOKEN) {
                return c.json({ error: 'Invalid registration token' }, 401);
            }
        }
        const registration = await c.req.json();
        // Validate required fields
        if (!registration.workerId || !registration.hostname || !registration.publicKey || !registration.ownerEmail) {
            return c.json({ error: 'Missing required fields' }, 400);
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(registration.ownerEmail)) {
            return c.json({ error: 'Invalid email format' }, 400);
        }
        logger.info('New worker registration', {
            workerId: registration.workerId,
            hostname: registration.hostname,
            platform: registration.platform,
            ip: registration.ip,
            ownerEmail: registration.ownerEmail,
        });
        // Check if worker already exists
        const existing = await redis.hget('workers:registrations', registration.workerId);
        if (existing) {
            const config = JSON.parse(existing);
            return c.json(config);
        }
        // Store registration pending approval
        const pendingRegistration = {
            ...registration,
            registeredAt: Date.now(),
            approved: false,
            approvedAt: null,
            approvedBy: null,
            rabbitmqUrl: null,
            region: 'auto', // Will be auto-detected
        };
        await redis.hset('workers:registrations', registration.workerId, JSON.stringify(pendingRegistration));
        // Store in pending list for admin
        await redis.zadd('workers:pending', Date.now(), registration.workerId);
        // Send notification to admin (if configured)
        logger.info('Worker registration pending approval', {
            workerId: registration.workerId,
            ownerEmail: registration.ownerEmail,
        });
        // Track owner's workers
        await redis.sadd(`workers:by-owner:${registration.ownerEmail}`, registration.workerId);
        return c.json({
            workerId: registration.workerId,
            approved: false,
            message: 'Registration pending approval',
        });
    }
    catch (error) {
        logger.error('Worker registration failed', error);
        return c.json({ error: 'Registration failed' }, 500);
    }
});
// Check registration status
registrationApi.get('/register/:workerId/status', async (c) => {
    const workerId = c.req.param('workerId');
    try {
        const registration = await redis.hget('workers:registrations', workerId);
        if (!registration) {
            return c.json({ error: 'Worker not found' }, 404);
        }
        const config = JSON.parse(registration);
        if (config.approved) {
            // Generate worker-specific credentials
            const workerUsername = `worker-${config.workerId}`;
            const workerPassword = config.workerPassword || generateSecurePassword();
            // Return connection details with credentials
            return c.json({
                workerId: config.workerId,
                approved: true,
                rabbitmqUrl: `amqp://${workerUsername}:${workerPassword}@${process.env.RABBITMQ_HOST || 'rabbitmq'}:5672`,
                region: config.region,
            });
        }
        else {
            // Still pending
            return c.json({
                workerId: config.workerId,
                approved: false,
                message: 'Waiting for approval',
            });
        }
    }
    catch (error) {
        logger.error('Failed to check worker status', error);
        return c.json({ error: 'Status check failed' }, 500);
    }
});
//# sourceMappingURL=worker-registration.js.map