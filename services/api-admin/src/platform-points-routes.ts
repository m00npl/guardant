import { Hono } from 'hono';
import type { Variables } from './types';

type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

interface PointsConfig {
  checkPoints: {
    http: number;
    ping: number;
    port: number;
    dns: number;
  };
  multipliers: {
    uptime: number;
    volume: number;
    reliability: number;
  };
  bonuses: {
    fastResponse: {
      threshold: number;
      multiplier: number;
    };
    highVolume: {
      threshold: number;
      multiplier: number;
    };
    mediumVolume: {
      threshold: number;
      multiplier: number;
    };
    longUptime: {
      hours: number;
      multiplier: number;
    };
  };
  penalties: {
    failedCheck: number;
  };
  currency: {
    pointValue: number;
    cryptoRate: number;
  };
  reputation?: {
    levels: Array<{
      name: string;
      minPoints: number;
      maxPoints: number;
      icon: string;
      multiplier?: number;
    }>;
  };
}

const platformPointsRoutes = new Hono<{ Variables: Variables }>();

// Default configuration
const defaultConfig: PointsConfig = {
  checkPoints: {
    http: 1,
    ping: 1,
    port: 2,
    dns: 2
  },
  multipliers: {
    uptime: 1.1,
    volume: 1.2,
    reliability: 1.15
  },
  bonuses: {
    fastResponse: { threshold: 100, multiplier: 1.1 },
    highVolume: { threshold: 10000, multiplier: 1.2 },
    mediumVolume: { threshold: 5000, multiplier: 1.1 },
    longUptime: { hours: 24, multiplier: 1.1 }
  },
  penalties: {
    failedCheck: 0.5
  },
  currency: {
    pointValue: 0.00001,
    cryptoRate: 0.000000001
  },
  reputation: {
    levels: [
      { name: 'Bronze', minPoints: 0, maxPoints: 1000, icon: '🥉' },
      { name: 'Silver', minPoints: 1001, maxPoints: 10000, icon: '🥈' },
      { name: 'Gold', minPoints: 10001, maxPoints: 50000, icon: '🥇' },
      { name: 'Diamond', minPoints: 50001, maxPoints: 100000, icon: '💎' },
      { name: 'Elite', minPoints: 100001, maxPoints: Infinity, icon: '🌟', multiplier: 1.5 }
    ]
  }
};

// Get points configuration
platformPointsRoutes.get('/points/config', async (c) => {
  try {
    const redis = c.get('redis');
    
    // Get stored config or use default
    const storedConfig = await redis.get('platform:points:config');
    const config = storedConfig ? JSON.parse(storedConfig) : defaultConfig;
    
    return c.json<ApiResponse>({
      success: true,
      data: config
    });
  } catch (error: any) {
    console.error('Failed to get points config:', error);
    return c.json<ApiResponse>({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Update points configuration
platformPointsRoutes.post('/points/config', async (c) => {
  try {
    const redis = c.get('redis');
    const config = await c.req.json<PointsConfig>();
    
    // Validate configuration
    if (!config.checkPoints || !config.multipliers || !config.currency) {
      return c.json<ApiResponse>({ 
        success: false, 
        error: 'Invalid configuration structure' 
      }, 400);
    }
    
    // Store configuration
    await redis.set('platform:points:config', JSON.stringify(config));
    
    // Publish configuration update to workers
    try {
      const amqp = await import('amqplib');
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
      const connection = await amqp.connect(rabbitmqUrl);
      const channel = await connection.createChannel();
      
      // Send update command to all workers
      await channel.assertExchange('worker_commands', 'direct');
      
      const command = {
        command: 'update_points_config',
        data: config,
        timestamp: Date.now()
      };
      
      await channel.publish(
        'worker_commands',
        'update_points_config',
        Buffer.from(JSON.stringify(command)),
        { persistent: true }
      );
      
      await channel.close();
      await connection.close();
    } catch (error) {
      console.error('Failed to notify workers of config update:', error);
      // Don't fail the request if notification fails
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        message: 'Points configuration updated successfully',
        config
      }
    });
  } catch (error: any) {
    console.error('Failed to update points config:', error);
    return c.json<ApiResponse>({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Get worker reputation
platformPointsRoutes.get('/points/reputation/:workerId', async (c) => {
  try {
    const redis = c.get('redis');
    const workerId = c.req.param('workerId');
    
    // Get worker heartbeat data
    const heartbeatData = await redis.hget('workers:heartbeat', workerId);
    if (!heartbeatData) {
      return c.json<ApiResponse>({ 
        success: false, 
        error: 'Worker not found' 
      }, 404);
    }
    
    const heartbeat = JSON.parse(heartbeatData);
    const totalPoints = heartbeat.totalPoints || 0;
    
    // Get points config
    const configData = await redis.get('platform:points:config');
    const config = configData ? JSON.parse(configData) : defaultConfig;
    
    // Determine reputation level
    const reputationLevel = config.reputation.levels.find(
      level => totalPoints >= level.minPoints && totalPoints <= level.maxPoints
    ) || config.reputation.levels[0];
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        workerId,
        totalPoints,
        reputation: {
          level: reputationLevel.name,
          icon: reputationLevel.icon,
          multiplier: reputationLevel.multiplier || 1,
          nextLevel: config.reputation.levels.find(
            level => level.minPoints > totalPoints
          ),
          progress: calculateProgress(totalPoints, reputationLevel, config.reputation.levels)
        }
      }
    });
  } catch (error: any) {
    console.error('Failed to get worker reputation:', error);
    return c.json<ApiResponse>({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Helper function to calculate progress to next level
function calculateProgress(points: number, currentLevel: any, levels: any[]): number {
  const nextLevel = levels.find(level => level.minPoints > points);
  if (!nextLevel) return 100; // Max level
  
  const currentLevelMin = currentLevel.minPoints;
  const nextLevelMin = nextLevel.minPoints;
  const pointsInLevel = points - currentLevelMin;
  const pointsNeeded = nextLevelMin - currentLevelMin;
  
  return Math.floor((pointsInLevel / pointsNeeded) * 100);
}

export { platformPointsRoutes };