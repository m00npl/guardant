import { Hono } from 'hono';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../../../shared/logger';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const execAsync = promisify(exec);
const logger = createLogger('deployment-api');

export const deploymentApi = new Hono();

// Generate secure deployment token
const DEPLOYMENT_SECRET = process.env.DEPLOYMENT_SECRET || crypto.randomBytes(32).toString('hex');

// IP whitelist
const ALLOWED_IPS = (process.env.DEPLOYMENT_ALLOWED_IPS || '').split(',').filter(ip => ip.trim());

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Middleware to check if request is from authorized source
deploymentApi.use('/*', async (c, next) => {
  // Skip auth for token endpoint
  if (c.req.path === '/token') {
    return await next();
  }
  
  try {
    // Check IP whitelist if configured
    if (ALLOWED_IPS.length > 0) {
      const clientIp = c.req.header('X-Real-IP') || c.req.header('X-Forwarded-For') || 'unknown';
      if (!ALLOWED_IPS.includes(clientIp)) {
        logger.warn('Deployment API access from unauthorized IP', { ip: clientIp });
        return c.json({ error: 'Access denied' }, 403);
      }
    }
    
    // Check for JWT token
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing authorization header' }, 401);
    }
    
    const token = authHeader.substring(7);
    
    // Verify JWT token
    const decoded = jwt.verify(token, DEPLOYMENT_SECRET) as any;
    
    // Check if token has deployment permissions
    if (!decoded.permissions || !decoded.permissions.includes('deployment')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    
    // Check if token is not expired
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return c.json({ error: 'Token expired' }, 401);
    }
    
    // Store user info in context
    c.set('deploymentUser', decoded);
    
    // Rate limiting
    const userId = decoded.userId;
    const now = Date.now();
    const userRate = requestCounts.get(userId) || { count: 0, resetTime: now + 60000 };
    
    // Reset if time window passed
    if (now > userRate.resetTime) {
      userRate.count = 0;
      userRate.resetTime = now + 60000; // 1 minute window
    }
    
    // Check rate limit (30 requests per minute)
    if (userRate.count >= 30) {
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }
    
    userRate.count++;
    requestCounts.set(userId, userRate);
    
    await next();
  } catch (error) {
    logger.error('Deployment auth failed', error);
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// Endpoint to generate deployment token (requires admin auth)
deploymentApi.post('/token', async (c) => {
  // This endpoint should be protected by regular admin auth middleware
  // For now, check if request comes from admin user
  const adminUser = c.get('user');
  if (!adminUser || adminUser.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }
  
  // Generate deployment token
  const token = jwt.sign(
    {
      userId: adminUser.id,
      email: adminUser.email,
      permissions: ['deployment'],
      issuedAt: Date.now(),
    },
    DEPLOYMENT_SECRET,
    { expiresIn: '24h' }
  );
  
  return c.json({
    success: true,
    token,
    expiresIn: '24h',
  });
});

// Get logs from a specific service
deploymentApi.get('/logs/:service', async (c) => {
  const service = c.req.param('service');
  const tail = c.req.query('tail') || '50';
  const grep = c.req.query('grep') || '';
  const user = c.get('deploymentUser');
  
  // Log access
  logger.info('Deployment API: logs access', {
    user: user.email,
    service,
    tail,
    grep,
  });
  
  try {
    let command = `docker logs guardant-${service} --tail ${tail}`;
    if (grep) {
      command += ` 2>&1 | grep -E "${grep}"`;
    }
    
    const { stdout, stderr } = await execAsync(command);
    
    return c.json({
      success: true,
      service,
      logs: stdout || stderr || 'No logs found',
    });
  } catch (error) {
    logger.error('Failed to get logs', error);
    return c.json({ 
      success: false, 
      error: error.message,
      logs: error.stderr || error.stdout 
    }, 500);
  }
});

// Restart a service
deploymentApi.post('/restart/:service', async (c) => {
  const service = c.req.param('service');
  
  try {
    logger.info(`Restarting service: ${service}`);
    
    const { stdout } = await execAsync(`docker-compose restart ${service}`);
    
    return c.json({
      success: true,
      message: `Service ${service} restarted`,
      output: stdout,
    });
  } catch (error) {
    logger.error('Failed to restart service', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Build and deploy a service
deploymentApi.post('/build/:service', async (c) => {
  const service = c.req.param('service');
  
  try {
    logger.info(`Building service: ${service}`);
    
    // Build the service
    const buildResult = await execAsync(`docker-compose build ${service}`);
    
    // Deploy (recreate) the service
    const deployResult = await execAsync(`docker-compose up -d ${service}`);
    
    return c.json({
      success: true,
      message: `Service ${service} built and deployed`,
      buildOutput: buildResult.stdout,
      deployOutput: deployResult.stdout,
    });
  } catch (error) {
    logger.error('Failed to build/deploy service', error);
    return c.json({ 
      success: false, 
      error: error.message,
      output: error.stderr || error.stdout
    }, 500);
  }
});

// Pull latest code and deploy
deploymentApi.post('/deploy', async (c) => {
  try {
    logger.info('Starting deployment process');
    
    const steps = [];
    
    // Change to deployment directory
    const workDir = '/app/deployment';
    
    // Pull latest code
    steps.push({ step: 'git_pull', status: 'starting' });
    const pullResult = await execAsync(`cd ${workDir} && git pull origin main`);
    steps.push({ 
      step: 'git_pull', 
      status: 'completed', 
      output: pullResult.stdout 
    });
    
    // Build all services
    steps.push({ step: 'build', status: 'starting' });
    const buildResult = await execAsync(`cd ${workDir} && docker-compose build`);
    steps.push({ 
      step: 'build', 
      status: 'completed', 
      output: buildResult.stdout 
    });
    
    // Deploy services
    steps.push({ step: 'deploy', status: 'starting' });
    const deployResult = await execAsync(`cd ${workDir} && docker-compose up -d`);
    steps.push({ 
      step: 'deploy', 
      status: 'completed', 
      output: deployResult.stdout 
    });
    
    return c.json({
      success: true,
      message: 'Deployment completed successfully',
      steps,
    });
  } catch (error) {
    logger.error('Deployment failed', error);
    return c.json({ 
      success: false, 
      error: error.message,
      output: error.stderr || error.stdout
    }, 500);
  }
});

// Get service status
deploymentApi.get('/status', async (c) => {
  try {
    const { stdout } = await execAsync('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"');
    
    const lines = stdout.split('\n').filter(line => line.includes('guardant-'));
    const services = lines.map(line => {
      const [name, status, ports] = line.split('\t').map(s => s.trim());
      return { name, status, ports };
    });
    
    return c.json({
      success: true,
      services,
    });
  } catch (error) {
    logger.error('Failed to get status', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Execute custom command (restricted)
deploymentApi.post('/exec', async (c) => {
  const { command } = await c.req.json();
  
  // Whitelist of allowed commands
  const allowedCommands = [
    /^docker logs/,
    /^docker ps/,
    /^docker-compose ps/,
    /^docker-compose logs/,
    /^docker exec .* redis-cli/,
    /^docker exec .* rabbitmqctl/,
  ];
  
  const isAllowed = allowedCommands.some(regex => regex.test(command));
  
  if (!isAllowed) {
    return c.json({ 
      error: 'Command not allowed',
      message: 'Only docker logs, ps, and specific exec commands are allowed'
    }, 403);
  }
  
  try {
    const { stdout, stderr } = await execAsync(command);
    
    return c.json({
      success: true,
      command,
      output: stdout || stderr,
    });
  } catch (error) {
    logger.error('Command execution failed', error);
    return c.json({ 
      success: false, 
      error: error.message,
      output: error.stderr || error.stdout
    }, 500);
  }
});