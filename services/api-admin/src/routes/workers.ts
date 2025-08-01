import { Hono } from 'hono';
import amqp from 'amqplib';
import { createLogger } from '../../../../shared/logger';
import Redis from 'ioredis';
import axios from 'axios';
import crypto from 'crypto';

const logger = createLogger('workers-api');
const workersApi = new Hono();

// Redis instance
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

// Update specific workers
workersApi.post('/update/selective', async (c) => {
  try {
    const body = await c.req.json();
    const { workerIds, repoUrl, branch = 'main', version, delay = 5000 } = body;
    
    if (!workerIds || !Array.isArray(workerIds) || workerIds.length === 0) {
      return c.json({ success: false, error: 'workerIds array is required' }, 400);
    }
    
    if (!repoUrl) {
      return c.json({ success: false, error: 'repoUrl is required' }, 400);
    }
    
    logger.info('Sending update command to specific workers', { 
      workerIds, 
      repoUrl, 
      branch, 
      version 
    });
    
    // Connect to RabbitMQ
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();
    
    // Send update command to specific workers
    await channel.assertExchange('worker_commands', 'direct');
    
    for (const workerId of workerIds) {
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
      
      // Send to specific worker queue
      const workerQueue = `worker.${workerId}`;
      await channel.assertQueue(workerQueue, { durable: true });
      await channel.sendToQueue(
        workerQueue,
        Buffer.from(JSON.stringify(command)),
        { persistent: true }
      );
      
      logger.info('Update command sent to worker', { workerId });
    }
    
    await channel.close();
    await connection.close();
    
    return c.json({
      success: true,
      message: `Update command sent to ${workerIds.length} workers`,
      workerIds,
      version,
      workersWillUpdateIn: `${delay}ms`
    });
  } catch (error) {
    logger.error('Failed to send selective update command', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
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
    const connection = await amqp.connect(rabbitmqUrl);
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
    
    await channel.publish(
      'worker_commands',
      'update_worker',
      Buffer.from(JSON.stringify(command)),
      { persistent: true }
    );
    
    await channel.close();
    await connection.close();
    
    return c.json({
      success: true,
      message: 'Update command sent to all workers',
      version,
      workersWillUpdateIn: `${delay}ms`
    });
  } catch (error) {
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
      if (a.version !== b.version) return a.version.localeCompare(b.version);
      return a.region.localeCompare(b.region);
    });
    
    // Group by version
    const versionGroups = workerList.reduce((acc, worker) => {
      if (!acc[worker.version]) acc[worker.version] = [];
      acc[worker.version].push(worker);
      return acc;
    }, {} as Record<string, typeof workerList>);
    
    return c.json({
      success: true,
      workers: workerList,
      totalWorkers: workerList.length,
      aliveWorkers: workerList.filter(w => w.isAlive).length,
      versionGroups,
    });
  } catch (error) {
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
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();
    
    // Send rebuild command
    await channel.assertExchange('worker_commands', 'direct');
    
    const command = {
      command: 'rebuild_worker',
      data: { delay },
      timestamp: Date.now()
    };
    
    await channel.publish(
      'worker_commands',
      'rebuild_worker',
      Buffer.from(JSON.stringify(command)),
      { persistent: true }
    );
    
    await channel.close();
    await connection.close();
    
    return c.json({
      success: true,
      message: 'Rebuild command sent to all workers',
      workersWillRebuildIn: `${delay}ms`
    });
  } catch (error) {
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
          isSuspended: regData.suspended || false,
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
  } catch (error) {
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
  } catch (error) {
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
    const workerPassword = crypto.randomBytes(32).toString('base64').replace(/[+/=]/g, '');
    
    // Create RabbitMQ user for this worker
    try {
      const rabbitmqMgmtUrl = process.env.RABBITMQ_MANAGEMENT_URL || 'http://rabbitmq:15672';
      const rabbitmqAuth = {
        username: process.env.RABBITMQ_ADMIN_USER || 'guardant',
        password: process.env.RABBITMQ_ADMIN_PASS || 'guardant123',
      };
      
      // Create user
      await axios.put(
        `${rabbitmqMgmtUrl}/api/users/${workerUsername}`,
        {
          password: workerPassword,
          tags: 'worker',
        },
        { auth: rabbitmqAuth }
      );
      
      // Set permissions (can only access worker queues)
      await axios.put(
        `${rabbitmqMgmtUrl}/api/permissions/%2F/${workerUsername}`,
        {
          configure: '.*', // Full permissions - workers need complex queue/exchange operations
          write: '.*',     // Full permissions - workers need to write to various resources  
          read: '.*',      // Full permissions - workers need to read from exchanges and queues
        },
        { auth: rabbitmqAuth }
      );
      
      logger.info('Created RabbitMQ user for worker', { workerUsername });
    } catch (error) {
      logger.error('Failed to create RabbitMQ user', error);
      return c.json({ error: 'Failed to create worker credentials' }, 500);
    }
    
    // Update registration with approval
    config.approved = true;
    config.approvedAt = Date.now();
    config.approvedBy = user.email;
    config.workerUsername = workerUsername;
    config.workerPassword = workerPassword;
    config.rabbitmqUrl = `amqp://${workerUsername}:${workerPassword}@${process.env.RABBITMQ_HOST || 'rabbit.guardant.me'}:5672`;
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
  } catch (error) {
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
          await axios.delete(
            `${rabbitmqMgmtUrl}/api/users/${config.workerUsername}`,
            { auth: rabbitmqAuth }
          );
          
          logger.info('Deleted RabbitMQ user', { username: config.workerUsername });
        } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
    const connection = await amqp.connect(rabbitmqUrl);
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
    
    await channel.publish(
      'worker_commands',
      'reset_points_period',
      Buffer.from(JSON.stringify(command)),
      { persistent: true }
    );
    
    await channel.close();
    await connection.close();
    
    logger.info('Points period reset initiated', { by: user.email });
    
    return c.json({
      success: true,
      message: 'Points period reset command sent to all workers',
    });
  } catch (error) {
    logger.error('Failed to reset points period', error);
    return c.json({ error: 'Failed to reset period' }, 500);
  }
});

// Delete specific worker
workersApi.delete('/:workerId', async (c) => {
  const workerId = c.req.param('workerId');
  const user = c.get('user');
  
  try {
    // Get worker registration
    const registration = await redis.hget('workers:registrations', workerId);
    if (!registration) {
      return c.json({ error: 'Worker not found' }, 404);
    }
    
    const config = JSON.parse(registration);
    
    // Delete RabbitMQ user if exists
    if (config.workerUsername) {
      try {
        const rabbitmqMgmtUrl = process.env.RABBITMQ_MANAGEMENT_URL || 'http://rabbitmq:15672';
        const rabbitmqAuth = {
          username: process.env.RABBITMQ_ADMIN_USER || 'guardant',
          password: process.env.RABBITMQ_ADMIN_PASS || 'guardant123',
        };
        
        await axios.delete(
          `${rabbitmqMgmtUrl}/api/users/${config.workerUsername}`,
          { auth: rabbitmqAuth }
        );
        
        logger.info('Deleted RabbitMQ user', { username: config.workerUsername });
      } catch (error) {
        logger.error('Failed to delete RabbitMQ user', error);
      }
    }
    
    // Delete from Redis
    await redis.hdel('workers:registrations', workerId);
    await redis.hdel('workers:heartbeat', workerId);
    await redis.hdel('workers:heartbeats', workerId);
    await redis.zrem('workers:pending', workerId);
    
    // Remove from owner's list
    if (config.ownerEmail) {
      await redis.srem(`workers:by-owner:${config.ownerEmail}`, workerId);
    }
    
    // Delete worker-specific keys
    const workerKeys = await redis.keys(`worker:${workerId}:*`);
    if (workerKeys.length > 0) {
      await redis.del(...workerKeys);
    }
    
    logger.info('Worker deleted', {
      workerId,
      deletedBy: user.email,
    });
    
    return c.json({
      success: true,
      message: 'Worker deleted successfully',
      workerId,
    });
  } catch (error) {
    logger.error('Failed to delete worker', error);
    return c.json({ error: 'Failed to delete worker' }, 500);
  }
});

// Suspend/pause worker
workersApi.post('/:workerId/suspend', async (c) => {
  const workerId = c.req.param('workerId');
  const user = c.get('user');
  
  try {
    // Get worker registration
    const registration = await redis.hget('workers:registrations', workerId);
    if (!registration) {
      return c.json({ error: 'Worker not found' }, 404);
    }
    
    const config = JSON.parse(registration);
    config.suspended = true;
    config.suspendedAt = Date.now();
    config.suspendedBy = user.email;
    
    // Update registration
    await redis.hset('workers:registrations', workerId, JSON.stringify(config));
    
    // Send suspend command to worker
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();
    
    await channel.assertExchange('worker_commands', 'direct');
    
    const command = {
      command: 'suspend',
      data: {
        workerId,
        reason: 'Admin suspended',
        suspendedBy: user.email,
      },
      timestamp: Date.now(),
    };
    
    await channel.publish(
      'worker_commands',
      `worker.${workerId}`,
      Buffer.from(JSON.stringify(command)),
      { persistent: true }
    );
    
    await channel.close();
    await connection.close();
    
    logger.info('Worker suspended', {
      workerId,
      suspendedBy: user.email,
    });
    
    return c.json({
      success: true,
      message: 'Worker suspended',
      workerId,
    });
  } catch (error) {
    logger.error('Failed to suspend worker', error);
    return c.json({ error: 'Failed to suspend worker' }, 500);
  }
});

// Resume worker
workersApi.post('/:workerId/resume', async (c) => {
  const workerId = c.req.param('workerId');
  const user = c.get('user');
  
  try {
    // Get worker registration
    const registration = await redis.hget('workers:registrations', workerId);
    if (!registration) {
      return c.json({ error: 'Worker not found' }, 404);
    }
    
    const config = JSON.parse(registration);
    delete config.suspended;
    delete config.suspendedAt;
    delete config.suspendedBy;
    config.resumedAt = Date.now();
    config.resumedBy = user.email;
    
    // Update registration
    await redis.hset('workers:registrations', workerId, JSON.stringify(config));
    
    // Send resume command to worker
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();
    
    await channel.assertExchange('worker_commands', 'direct');
    
    const command = {
      command: 'resume',
      data: {
        workerId,
        resumedBy: user.email,
      },
      timestamp: Date.now(),
    };
    
    await channel.publish(
      'worker_commands',
      `worker.${workerId}`,
      Buffer.from(JSON.stringify(command)),
      { persistent: true }
    );
    
    await channel.close();
    await connection.close();
    
    logger.info('Worker resumed', {
      workerId,
      resumedBy: user.email,
    });
    
    return c.json({
      success: true,
      message: 'Worker resumed',
      workerId,
    });
  } catch (error) {
    logger.error('Failed to resume worker', error);
    return c.json({ error: 'Failed to resume worker' }, 500);
  }
});

// Bulk operations
workersApi.post('/bulk/delete', async (c) => {
  const { workerIds } = await c.req.json();
  const user = c.get('user');
  
  if (!Array.isArray(workerIds) || workerIds.length === 0) {
    return c.json({ error: 'Worker IDs required' }, 400);
  }
  
  const results = {
    successful: [] as string[],
    failed: [] as string[],
  };
  
  for (const workerId of workerIds) {
    try {
      // Get worker registration
      const registration = await redis.hget('workers:registrations', workerId);
      if (!registration) {
        results.failed.push(workerId);
        continue;
      }
      
      const config = JSON.parse(registration);
      
      // Delete RabbitMQ user
      if (config.workerUsername) {
        try {
          const rabbitmqMgmtUrl = process.env.RABBITMQ_MANAGEMENT_URL || 'http://rabbitmq:15672';
          const rabbitmqAuth = {
            username: process.env.RABBITMQ_ADMIN_USER || 'guardant',
            password: process.env.RABBITMQ_ADMIN_PASS || 'guardant123',
          };
          
          await axios.delete(
            `${rabbitmqMgmtUrl}/api/users/${config.workerUsername}`,
            { auth: rabbitmqAuth }
          );
        } catch (error) {
          logger.error('Failed to delete RabbitMQ user', error);
        }
      }
      
      // Delete from Redis
      await redis.hdel('workers:registrations', workerId);
      await redis.hdel('workers:heartbeat', workerId);
      await redis.hdel('workers:heartbeats', workerId);
      await redis.zrem('workers:pending', workerId);
      
      // Remove from owner's list
      if (config.ownerEmail) {
        await redis.srem(`workers:by-owner:${config.ownerEmail}`, workerId);
      }
      
      results.successful.push(workerId);
    } catch (error) {
      logger.error(`Failed to delete worker ${workerId}`, error);
      results.failed.push(workerId);
    }
  }
  
  logger.info('Bulk delete completed', {
    deletedBy: user.email,
    successful: results.successful.length,
    failed: results.failed.length,
  });
  
  return c.json({
    success: true,
    message: `Deleted ${results.successful.length} workers`,
    results,
  });
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
  } catch (error) {
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
    const connection = await amqp.connect(rabbitmqUrl);
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
    await channel.publish(
      'worker_commands',
      `worker.${request.workerId}`,
      Buffer.from(JSON.stringify(command)),
      { persistent: true }
    );
    
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
  } catch (error) {
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
    const ownerStats = new Map<string, {
      email: string;
      totalWorkers: number;
      activeWorkers: number;
      totalPoints: number;
      regions: Set<string>;
    }>();
    
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
      
      const stats = ownerStats.get(email)!;
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
  } catch (error) {
    logger.error('Failed to get owners summary', error);
    return c.json({ error: 'Failed to get summary' }, 500);
  }
});

// Get pending worker registrations
workersApi.get('/registrations/pending', async (c) => {
  try {
    const registrations = await redis.hgetall('workers:registrations');
    
    const pending = Object.entries(registrations)
      .map(([workerId, data]) => {
        const registration = JSON.parse(data);
        return registration.approved ? null : {
          workerId,
          ...registration
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.registeredAt - a.registeredAt);
    
    return c.json({ success: true, pending });
  } catch (error) {
    logger.error('Failed to get pending registrations', error);
    return c.json({ error: 'Failed to get registrations' }, 500);
  }
});

// Get approved workers with heartbeat data
workersApi.get('/registrations/approved', async (c) => {
  try {
    // Get all registrations
    const registrations = await redis.hgetall('workers:registrations');
    const heartbeats = await redis.hgetall('workers:heartbeat');
    
    const approved = Object.entries(registrations)
      .map(([workerId, data]) => {
        const registration = JSON.parse(data);
        if (!registration.approved) return null;
        
        // Merge with heartbeat data if available
        const heartbeat = heartbeats[workerId] ? JSON.parse(heartbeats[workerId]) : null;
        
        return {
          workerId,
          ...registration,
          lastHeartbeat: heartbeat?.lastSeen ? new Date(heartbeat.lastSeen).toISOString() : null,
          version: heartbeat?.version,
          points: heartbeat?.totalPoints || 0,
          region: heartbeat?.region || heartbeat?.location?.region || registration.location?.region || 'Unknown',
          city: heartbeat?.location?.city || registration.location?.city || 'Unknown',
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.approvedAt - a.approvedAt);
    
    return c.json({ success: true, approved });
  } catch (error) {
    logger.error('Failed to get approved workers', error);
    return c.json({ error: 'Failed to get workers' }, 500);
  }
});

// Get regions/colonies statistics
workersApi.get('/regions', async (c) => {
  try {
    // Get all worker heartbeats
    const heartbeats = await redis.hgetall('workers:heartbeat');
    const registrations = await redis.hgetall('workers:registrations');
    
    // Group workers by region
    const regionMap = new Map<string, {
      workerCount: number;
      activeWorkers: number;
      totalPoints: number;
      totalJobs: number;
      workers: any[];
      location?: any;
    }>();
    
    // Process all workers
    Object.entries(heartbeats).forEach(([workerId, data]) => {
      const heartbeat = JSON.parse(data);
      const registration = registrations[workerId] ? JSON.parse(registrations[workerId]) : null;
      
      if (!registration?.approved) return;
      
      // Use location data if available, otherwise fall back to region
      const locationKey = heartbeat.location ? 
        `${heartbeat.location.city || 'Unknown'}, ${heartbeat.location.country || 'Unknown'}` :
        (heartbeat.region || registration.region || 'unknown');
        
      const isActive = Date.now() - (heartbeat.lastSeen || heartbeat.timestamp || 0) < 60000; // Active if heartbeat within 1 minute
      
      if (!regionMap.has(locationKey)) {
        regionMap.set(locationKey, {
          workerCount: 0,
          activeWorkers: 0,
          totalPoints: 0,
          totalJobs: 0,
          workers: [],
          location: heartbeat.location || {}
        });
      }
      
      const regionData = regionMap.get(locationKey)!;
      regionData.workerCount++;
      if (isActive) regionData.activeWorkers++;
      regionData.totalPoints += heartbeat.totalPoints || 0;
      regionData.totalJobs += heartbeat.checksCompleted || 0;
      regionData.workers.push({
        workerId,
        isActive,
        lastSeen: heartbeat.lastSeen || heartbeat.timestamp || Date.now(),
        points: heartbeat.totalPoints || 0,
        jobs: heartbeat.checksCompleted || 0,
        owner: registration.ownerEmail
      });
    });
    
    // Convert to array and add region metadata
    const regions = Array.from(regionMap.entries()).map(([locationKey, data]) => {
      // Calculate average latency (mock for now, could be real data)
      const avgLatency = Math.floor(Math.random() * 50) + 20; // Random between 20-70ms
      
      // Calculate uptime (based on active workers ratio)
      const uptime = data.workerCount > 0 
        ? (data.activeWorkers / data.workerCount) * 100 
        : 0;
      
      // Extract city and country from locationKey or use location data
      let city = 'Unknown';
      let country = 'Unknown';
      let continent = 'Unknown';
      let flag = '🌍';
      let regionId = locationKey; // Default to locationKey
      
      if (data.location && data.location.city) {
        city = data.location.city;
        country = data.location.country || 'Unknown';
        
        // Convert country code to full name if needed
        if (country.length === 2 || country.length === 3) {
          const originalCountryCode = country;
          country = getCountryFullName(country);
          continent = data.location.continent || getContinent(originalCountryCode);
          flag = getFlag(originalCountryCode);
          regionId = generateRegionId(continent, originalCountryCode);
        } else {
          continent = data.location.continent || getContinent(country);
          flag = getFlag(country);
          regionId = generateRegionId(continent, country);
        }
      } else if (locationKey.includes(',')) {
        // Parse from "City, Country" format
        const parts = locationKey.split(',').map(s => s.trim());
        city = parts[0] || 'Unknown';
        country = parts[1] || 'Unknown';
        
        // Convert country code to full name if needed
        if (country.length === 2 || country.length === 3) {
          country = getCountryFullName(country);
        }
        
        continent = getContinent(parts[1] || ''); // Use original code for continent lookup
        flag = getFlag(parts[1] || ''); // Use original code for flag lookup
        
        // Generate a region ID based on continent and country
        regionId = generateRegionId(continent, parts[1] || country);
      } else if (locationKey.match(/^[a-z]{2}-[a-z]+-\d+$/)) {
        // This is already an AWS-style region ID
        regionId = locationKey;
        city = getCity(locationKey);
        country = getCountry(locationKey);
        continent = getContinent(locationKey);
        flag = getFlag(locationKey);
      } else {
        // Fallback to old region-based logic
        city = getCity(locationKey);
        country = getCountry(locationKey);
        continent = getContinent(locationKey);
        flag = getFlag(locationKey);
        regionId = generateRegionId(continent, country);
      }
      
      // Create a professional region name
      const regionDisplayName = getRegionDisplayName(continent, country, city);
      
      return {
        id: regionId,
        name: regionDisplayName,
        continent,
        country,
        city,
        flag,
        available: data.activeWorkers > 0,
        workerAnts: data.workerCount,
        activeWorkerAnts: data.activeWorkers,
        activeJobs: data.totalJobs,
        totalPoints: data.totalPoints,
        avgLatency,
        uptime: parseFloat(uptime.toFixed(1)),
        workers: data.workers.sort((a, b) => b.points - a.points) // Sort by points
      };
    });
    
    // Sort regions by worker count
    regions.sort((a, b) => b.workerAnts - a.workerAnts);
    
    return c.json({
      success: true,
      regions,
      summary: {
        totalRegions: regions.length,
        totalWorkers: regions.reduce((sum, r) => sum + r.workerAnts, 0),
        activeWorkers: regions.reduce((sum, r) => sum + r.activeWorkerAnts, 0),
        totalJobs: regions.reduce((sum, r) => sum + r.activeJobs, 0),
        totalPoints: regions.reduce((sum, r) => sum + r.totalPoints, 0),
      }
    });
  } catch (error) {
    logger.error('Failed to get regions data', error);
    return c.json({ error: 'Failed to get regions' }, 500);
  }
});

// Helper functions for region metadata
function getRegionDisplayName(continent: string, country: string, city: string): string {
  // Create professional AWS-style region names
  const continentNames: Record<string, string> = {
    'Europe': 'Europe',
    'North America': 'North America',
    'South America': 'South America',
    'Asia': 'Asia Pacific',
    'Africa': 'Africa',
    'Oceania': 'Asia Pacific',
    'Global': 'Global'
  };
  
  // Special cases for specific countries/cities
  if (continent === 'Europe') {
    if (country === 'Poland') return `Europe Central (${city})`;
    if (country === 'Germany') {
      if (city === 'Frankfurt') return 'Europe West (Frankfurt)';
      return `Europe West (${city})`;
    }
    if (country === 'United Kingdom') return `Europe North (${city})`;
    if (country === 'France') return `Europe West (${city})`;
    if (country === 'Netherlands') return `Europe North (${city})`;
    if (country === 'Spain') return `Europe South (${city})`;
    if (country === 'Italy') return `Europe South (${city})`;
    return `Europe (${city})`;
  }
  
  if (continent === 'North America') {
    if (country === 'United States') {
      if (city === 'Ashburn' || city === 'Virginia') return 'US East (Virginia)';
      if (city === 'San Francisco' || city === 'California') return 'US West (California)';
      return `US (${city})`;
    }
    if (country === 'Canada') return `Canada (${city})`;
    return `${continentNames[continent] || continent} (${city})`;
  }
  
  if (continent === 'Asia' || continent === 'Asia Pacific') {
    if (country === 'Singapore') return 'Asia Pacific (Singapore)';
    if (country === 'Japan') return 'Asia Pacific (Tokyo)';
    if (country === 'India') return 'Asia Pacific (Mumbai)';
    if (country === 'Australia') return 'Asia Pacific (Sydney)';
    return `Asia Pacific (${city})`;
  }
  
  // Default format
  return `${continentNames[continent] || continent} (${city})`;
}

function generateRegionId(continent: string, countryCode: string): string {
  // Generate AWS-style region IDs from continent and country
  const continentPrefix: Record<string, string> = {
    'Europe': 'eu',
    'North America': 'us',
    'South America': 'sa',
    'Asia': 'ap',
    'Africa': 'af',
    'Oceania': 'au',
    'Global': 'global'
  };
  
  const countryToRegion: Record<string, string> = {
    'PL': 'central-1',
    'DE': 'west-1',
    'FR': 'west-2',
    'UK': 'west-3',
    'GB': 'west-3',
    'ES': 'south-1',
    'IT': 'south-2',
    'NL': 'north-1',
    'US': 'east-1',
    'CA': 'north-1',
    'BR': 'east-1',
    'JP': 'northeast-1',
    'SG': 'southeast-1',
    'AU': 'southeast-2',
    'IN': 'south-1',
    'CN': 'north-1',
  };
  
  const prefix = continentPrefix[continent] || 'global';
  const suffix = countryToRegion[countryCode] || 'region-1';
  
  return `${prefix}-${suffix}`;
}

function getCountryFullName(code: string): string {
  const countryNames: Record<string, string> = {
    'PL': 'Poland',
    'DE': 'Germany',
    'FR': 'France',
    'GB': 'United Kingdom',
    'UK': 'United Kingdom',
    'ES': 'Spain',
    'IT': 'Italy',
    'NL': 'Netherlands',
    'BE': 'Belgium',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'US': 'United States',
    'USA': 'United States',
    'CA': 'Canada',
    'MX': 'Mexico',
    'BR': 'Brazil',
    'AR': 'Argentina',
    'CL': 'Chile',
    'JP': 'Japan',
    'CN': 'China',
    'IN': 'India',
    'SG': 'Singapore',
    'KR': 'South Korea',
    'AU': 'Australia',
    'NZ': 'New Zealand',
    'ZA': 'South Africa',
    'EG': 'Egypt',
    'NG': 'Nigeria',
  };
  return countryNames[code] || code;
}

function getRegionName(region: string): string {
  const names: Record<string, string> = {
    'auto': 'Auto-detected',
    'eu-west-1': 'Europe West (Frankfurt)',
    'eu-central-1': 'Europe Central (Warsaw)',
    'us-east-1': 'US East (Virginia)',
    'us-west-1': 'US West (California)',
    'ap-southeast-1': 'Asia Pacific (Singapore)',
  };
  return names[region] || region;
}

function getContinent(input: string): string {
  // Handle country names and codes
  const countryToContinent: Record<string, string> = {
    'Poland': 'Europe',
    'PL': 'Europe',
    'Germany': 'Europe',
    'DE': 'Europe',
    'France': 'Europe',
    'FR': 'Europe',
    'United Kingdom': 'Europe',
    'UK': 'Europe',
    'GB': 'Europe',
    'Spain': 'Europe',
    'ES': 'Europe',
    'Italy': 'Europe',
    'IT': 'Europe',
    'Netherlands': 'Europe',
    'NL': 'Europe',
    'Belgium': 'Europe',
    'BE': 'Europe',
    'Sweden': 'Europe',
    'SE': 'Europe',
    'Norway': 'Europe',
    'NO': 'Europe',
    'Denmark': 'Europe',
    'DK': 'Europe',
    'Finland': 'Europe',
    'FI': 'Europe',
    'United States': 'North America',
    'US': 'North America',
    'USA': 'North America',
    'Canada': 'North America',
    'CA': 'North America',
    'Mexico': 'North America',
    'MX': 'North America',
    'Brazil': 'South America',
    'BR': 'South America',
    'Argentina': 'South America',
    'AR': 'South America',
    'Chile': 'South America',
    'CL': 'South America',
    'Japan': 'Asia',
    'JP': 'Asia',
    'China': 'Asia',
    'CN': 'Asia',
    'India': 'Asia',
    'IN': 'Asia',
    'Singapore': 'Asia',
    'SG': 'Asia',
    'South Korea': 'Asia',
    'KR': 'Asia',
    'Australia': 'Oceania',
    'AU': 'Oceania',
    'New Zealand': 'Oceania',
    'NZ': 'Oceania',
    'South Africa': 'Africa',
    'ZA': 'Africa',
    'Egypt': 'Africa',
    'EG': 'Africa',
    'Nigeria': 'Africa',
    'NG': 'Africa',
  };
  
  // Check if input is a country name or code
  if (countryToContinent[input]) {
    return countryToContinent[input];
  }
  
  // Handle AWS-style regions
  if (input.startsWith('eu-')) return 'Europe';
  if (input.startsWith('us-')) return 'North America';
  if (input.startsWith('ap-')) return 'Asia';
  if (input.startsWith('sa-')) return 'South America';
  if (input.startsWith('af-')) return 'Africa';
  if (input.startsWith('au-')) return 'Oceania';
  
  return 'Global';
}

function getCountry(region: string): string {
  const countries: Record<string, string> = {
    'eu-west-1': 'Germany',
    'eu-central-1': 'Poland',
    'us-east-1': 'United States',
    'us-west-1': 'United States',
    'ap-southeast-1': 'Singapore',
  };
  return countries[region] || 'Unknown';
}

function getCity(region: string): string {
  const cities: Record<string, string> = {
    'eu-west-1': 'Frankfurt',
    'eu-central-1': 'Warsaw',
    'us-east-1': 'Ashburn',
    'us-west-1': 'San Francisco',
    'ap-southeast-1': 'Singapore',
  };
  return cities[region] || 'Unknown';
}

function getFlag(input: string): string {
  // Handle country names and codes
  const countryFlags: Record<string, string> = {
    'Poland': '🇵🇱',
    'PL': '🇵🇱',
    'Germany': '🇩🇪',
    'DE': '🇩🇪',
    'France': '🇫🇷',
    'FR': '🇫🇷',
    'United Kingdom': '🇬🇧',
    'UK': '🇬🇧',
    'GB': '🇬🇧',
    'Spain': '🇪🇸',
    'ES': '🇪🇸',
    'Italy': '🇮🇹',
    'IT': '🇮🇹',
    'Netherlands': '🇳🇱',
    'NL': '🇳🇱',
    'Belgium': '🇧🇪',
    'BE': '🇧🇪',
    'Sweden': '🇸🇪',
    'SE': '🇸🇪',
    'Norway': '🇳🇴',
    'NO': '🇳🇴',
    'Denmark': '🇩🇰',
    'DK': '🇩🇰',
    'Finland': '🇫🇮',
    'FI': '🇫🇮',
    'United States': '🇺🇸',
    'US': '🇺🇸',
    'USA': '🇺🇸',
    'Canada': '🇨🇦',
    'CA': '🇨🇦',
    'Mexico': '🇲🇽',
    'MX': '🇲🇽',
    'Brazil': '🇧🇷',
    'BR': '🇧🇷',
    'Argentina': '🇦🇷',
    'AR': '🇦🇷',
    'Chile': '🇨🇱',
    'CL': '🇨🇱',
    'Japan': '🇯🇵',
    'JP': '🇯🇵',
    'China': '🇨🇳',
    'CN': '🇨🇳',
    'India': '🇮🇳',
    'IN': '🇮🇳',
    'Singapore': '🇸🇬',
    'SG': '🇸🇬',
    'South Korea': '🇰🇷',
    'KR': '🇰🇷',
    'Australia': '🇦🇺',
    'AU': '🇦🇺',
    'New Zealand': '🇳🇿',
    'NZ': '🇳🇿',
    'South Africa': '🇿🇦',
    'ZA': '🇿🇦',
    'Egypt': '🇪🇬',
    'EG': '🇪🇬',
    'Nigeria': '🇳🇬',
    'NG': '🇳🇬',
  };
  
  // Check if input is a country name or code
  if (countryFlags[input]) {
    return countryFlags[input];
  }
  
  // Handle AWS-style regions
  const regionFlags: Record<string, string> = {
    'eu-west-1': '🇩🇪',
    'eu-central-1': '🇵🇱',
    'us-east-1': '🇺🇸',
    'us-west-1': '🇺🇸',
    'ap-southeast-1': '🇸🇬',
    'auto': '🌍',
  };
  
  if (regionFlags[input]) {
    return regionFlags[input];
  }
  
  return '🌍';
}

export { workersApi };