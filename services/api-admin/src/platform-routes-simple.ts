import { Hono } from 'hono';
import { getAuthUser } from '/app/packages/auth-system/src/index';
import type { ApiResponse } from './index';
import * as crypto from 'crypto';

export const platformRoutes = new Hono();

// Middleware to check platform admin access
const requirePlatformAdmin = async (c: any, next: any) => {
  const user = getAuthUser(c);
  if (!user || user.role !== 'platform_admin') {
    return c.json<ApiResponse>({ 
      success: false, 
      error: 'Platform admin access required' 
    }, 403);
  }
  await next();
};

// Apply middleware to all routes
platformRoutes.use('/*', requirePlatformAdmin);

// Get platform statistics - simplified version
platformRoutes.post('/stats', async (c) => {
  try {
    const redis = c.get('redis');
    
    // Use SCAN instead of KEYS for better performance and compatibility
    const nestKeys = [];
    const userKeys = [];
    const serviceKeys = [];
    
    // Scan for nest keys
    let cursor = '0';
    do {
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'nest:*', 'COUNT', 100);
      cursor = newCursor;
      nestKeys.push(...keys);
    } while (cursor !== '0');
    
    // Scan for user keys
    cursor = '0';
    do {
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'auth:user:*', 'COUNT', 100);
      cursor = newCursor;
      userKeys.push(...keys);
    } while (cursor !== '0');
    
    // Scan for service keys
    cursor = '0';
    do {
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'service:*', 'COUNT', 100);
      cursor = newCursor;
      serviceKeys.push(...keys);
    } while (cursor !== '0');
    
    // Filter out email mappings
    const actualNestKeys = nestKeys.filter((k: string) => !k.includes(':email:'));
    const actualUserKeys = userKeys.filter((k: string) => !k.includes(':email:'));
    
    // Count active nests (created in last 30 days)
    let activeNests = 0;
    let totalNests = 0;
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    for (const key of actualNestKeys) {
      try {
        const nestData = await redis.get(key);
        if (nestData) {
          const nest = JSON.parse(nestData);
          totalNests++;
          if (nest.createdAt > thirtyDaysAgo || nest.updatedAt > thirtyDaysAgo) {
            activeNests++;
          }
        }
      } catch (e) {
        // Skip invalid entries
      }
    }
    
    // Count users
    let totalUsers = 0;
    let newUsers = 0;
    
    for (const key of actualUserKeys) {
      try {
        const userData = await redis.get(key);
        if (userData) {
          const user = JSON.parse(userData);
          totalUsers++;
          if (user.createdAt > thirtyDaysAgo) {
            newUsers++;
          }
        }
      } catch (e) {
        // Skip invalid entries
      }
    }
    
    // Count subscription types
    let free = 0, pro = 0, unlimited = 0;
    
    for (const key of actualNestKeys) {
      try {
        const nestData = await redis.get(key);
        if (nestData) {
          const nest = JSON.parse(nestData);
          switch (nest.subscription?.tier) {
            case 'pro': pro++; break;
            case 'unlimited': unlimited++; break;
            default: free++;
          }
        }
      } catch (e) {
        // Skip
      }
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        overview: {
          totalNests,
          totalUsers,
          totalServices: serviceKeys.length,
          activeNests,
          newUsers,
        },
        subscriptions: {
          free,
          pro,
          unlimited,
        },
        revenue: {
          monthly: pro * 29 + unlimited * 99, // Basic calculation
          annual: (pro * 29 + unlimited * 99) * 12,
          mrr: pro * 29 + unlimited * 99,
          arr: (pro * 29 + unlimited * 99) * 12,
        }
      }
    });
  } catch (error: any) {
    console.error('Platform stats error:', error);
    return c.json<ApiResponse>({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Get all nests - simplified version
platformRoutes.post('/nests/list', async (c) => {
  try {
    const redis = c.get('redis');
    const body = await c.req.json();
    const { page = 1, limit = 20 } = body;
    
    // Use SCAN instead of KEYS
    const nestKeys = [];
    let cursor = '0';
    do {
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'nest:*', 'COUNT', 100);
      cursor = newCursor;
      nestKeys.push(...keys);
    } while (cursor !== '0');
    
    const actualNestKeys = nestKeys.filter((k: string) => !k.includes(':email:'));
    
    const nests = [];
    for (const key of actualNestKeys) {
      try {
        const nestData = await redis.get(key);
        if (nestData) {
          const nest = JSON.parse(nestData);
          
          // Skip system/admin nests - check if the owner is a platform admin
          if (nest.ownerEmail) {
            // Check if this email belongs to a platform admin
            const userIdKey = await redis.get(`auth:user:email:${nest.ownerEmail}`);
            if (userIdKey) {
              const userData = await redis.get(`auth:user:${userIdKey}`);
              if (userData) {
                const user = JSON.parse(userData);
                if (user.role === 'platform_admin') {
                  continue; // Skip platform admin's nest
                }
              }
            }
          }
          
          // Get service count for this nest using SCAN
          const serviceKeys = [];
          let serviceCursor = '0';
          do {
            const [newCursor, keys] = await redis.scan(serviceCursor, 'MATCH', `service:${nest.id}:*`, 'COUNT', 100);
            serviceCursor = newCursor;
            serviceKeys.push(...keys);
          } while (serviceCursor !== '0');
          
          nests.push({
            ...nest,
            stats: {
              servicesCount: serviceKeys.length,
              usersCount: 1, // Simplified - would need to count actual users
            }
          });
        }
      } catch (e) {
        console.error('Error parsing nest:', e);
      }
    }
    
    // Sort by creation date
    nests.sort((a, b) => b.createdAt - a.createdAt);
    
    // Paginate
    const start = (page - 1) * limit;
    const paginatedNests = nests.slice(start, start + limit);
    
    return c.json<ApiResponse>({
      success: true,
      data: paginatedNests
    });
  } catch (error: any) {
    console.error('Nests list error:', error);
    return c.json<ApiResponse>({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Get all users - simplified version
platformRoutes.post('/users/list', async (c) => {
  try {
    const redis = c.get('redis');
    const body = await c.req.json();
    const { page = 1, limit = 20 } = body;
    
    // Use SCAN instead of KEYS
    const userKeys = [];
    let cursor = '0';
    do {
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'auth:user:*', 'COUNT', 100);
      cursor = newCursor;
      userKeys.push(...keys);
    } while (cursor !== '0');
    
    const actualUserKeys = userKeys.filter((k: string) => 
      !k.includes(':email:') && k.match(/^auth:user:[a-f0-9-]+$/)
    );
    
    const users = [];
    for (const key of actualUserKeys) {
      try {
        const userData = await redis.get(key);
        if (userData) {
          const user = JSON.parse(userData);
          // Don't send password hash to frontend
          delete user.passwordHash;
          users.push(user);
        }
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
    
    // Sort by last login
    users.sort((a, b) => (b.lastLoginAt || 0) - (a.lastLoginAt || 0));
    
    // Paginate
    const start = (page - 1) * limit;
    const paginatedUsers = users.slice(start, start + limit);
    
    return c.json<ApiResponse>({
      success: true,
      data: paginatedUsers
    });
  } catch (error: any) {
    console.error('Users list error:', error);
    return c.json<ApiResponse>({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Create new organization
platformRoutes.post('/nests/create', async (c) => {
  try {
    const redis = c.get('redis');
    const body = await c.req.json();
    const { name, subdomain, ownerEmail, tier = 'free' } = body;
    
    // Generate nest ID
    const nestId = crypto.randomUUID();
    const now = Date.now();
    
    // Create nest object
    const nest = {
      id: nestId,
      name,
      subdomain,
      ownerEmail,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      subscription: {
        tier,
        status: 'active',
        servicesLimit: tier === 'free' ? 3 : tier === 'pro' ? 10 : 999999,
        teamMembersLimit: tier === 'free' ? 1 : tier === 'pro' ? 5 : 999999,
      }
    };
    
    // Store in Redis
    await redis.set(`nest:${nestId}`, JSON.stringify(nest));
    await redis.set(`nest:subdomain:${subdomain}`, nestId);
    await redis.set(`nest:email:${ownerEmail}`, nestId);
    
    return c.json<ApiResponse>({
      success: true,
      data: nest
    });
  } catch (error: any) {
    console.error('Create nest error:', error);
    return c.json<ApiResponse>({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Update organization
platformRoutes.put('/nests/:nestId', async (c) => {
  try {
    const redis = c.get('redis');
    const nestId = c.req.param('nestId');
    const body = await c.req.json();
    
    const nestData = await redis.get(`nest:${nestId}`);
    if (!nestData) {
      return c.json<ApiResponse>({ 
        success: false, 
        error: 'Organization not found' 
      }, 404);
    }
    
    const nest = JSON.parse(nestData);
    const oldSubdomain = nest.subdomain;
    const oldEmail = nest.ownerEmail;
    
    // Update nest data
    // Handle subscription tier update specially
    if (body.tier) {
      nest.subscription = {
        ...nest.subscription,
        tier: body.tier,
        servicesLimit: body.tier === 'free' ? 3 : body.tier === 'pro' ? 10 : 999999,
        teamMembersLimit: body.tier === 'free' ? 1 : body.tier === 'pro' ? 5 : 999999,
      };
      delete body.tier; // Remove tier from body so it doesn't overwrite subscription
    }
    
    Object.assign(nest, {
      ...body,
      updatedAt: Date.now()
    });
    
    // Update Redis keys
    await redis.set(`nest:${nestId}`, JSON.stringify(nest));
    
    // Update subdomain mapping if changed
    if (body.subdomain && body.subdomain !== oldSubdomain) {
      await redis.del(`nest:subdomain:${oldSubdomain}`);
      await redis.set(`nest:subdomain:${body.subdomain}`, nestId);
    }
    
    // Update email mapping if changed
    if (body.ownerEmail && body.ownerEmail !== oldEmail) {
      await redis.del(`nest:email:${oldEmail}`);
      await redis.set(`nest:email:${body.ownerEmail}`, nestId);
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: nest
    });
  } catch (error: any) {
    console.error('Update nest error:', error);
    return c.json<ApiResponse>({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Delete organization
platformRoutes.delete('/nests/:nestId', async (c) => {
  try {
    const redis = c.get('redis');
    const nestId = c.req.param('nestId');
    
    const nestData = await redis.get(`nest:${nestId}`);
    if (!nestData) {
      return c.json<ApiResponse>({ 
        success: false, 
        error: 'Organization not found' 
      }, 404);
    }
    
    const nest = JSON.parse(nestData);
    
    // Delete all related data
    await redis.del(`nest:${nestId}`);
    await redis.del(`nest:subdomain:${nest.subdomain}`);
    await redis.del(`nest:email:${nest.ownerEmail}`);
    
    // Delete all services for this nest
    const serviceKeys = [];
    let cursor = '0';
    do {
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', `service:${nestId}:*`, 'COUNT', 100);
      cursor = newCursor;
      serviceKeys.push(...keys);
    } while (cursor !== '0');
    
    if (serviceKeys.length > 0) {
      await redis.del(...serviceKeys);
    }
    
    return c.json<ApiResponse>({
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete nest error:', error);
    return c.json<ApiResponse>({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Create new user
platformRoutes.post('/users/create', async (c) => {
  try {
    const redis = c.get('redis');
    const body = await c.req.json();
    const { name, email, password, role = 'viewer', nestId } = body;
    
    // Generate user ID
    const userId = crypto.randomUUID();
    const now = Date.now();
    
    // Hash password
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user object
    const user = {
      id: userId,
      nestId,
      name,
      email,
      role,
      passwordHash,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    
    // Store in Redis
    await redis.set(`auth:user:${userId}`, JSON.stringify(user));
    await redis.set(`auth:user:email:${email}`, userId);
    
    // Add to nest users if not platform_admin
    if (role !== 'platform_admin' && nestId) {
      await redis.hset(`nest:${nestId}:users`, userId, JSON.stringify({
        id: userId,
        role,
        joinedAt: now
      }));
    }
    
    // Don't send password hash back
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    return c.json<ApiResponse>({
      success: true,
      data: userWithoutPassword
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return c.json<ApiResponse>({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Update user
platformRoutes.put('/users/:userId', async (c) => {
  try {
    const redis = c.get('redis');
    const userId = c.req.param('userId');
    const body = await c.req.json();
    
    const userData = await redis.get(`auth:user:${userId}`);
    if (!userData) {
      return c.json<ApiResponse>({ 
        success: false, 
        error: 'User not found' 
      }, 404);
    }
    
    const user = JSON.parse(userData);
    const oldEmail = user.email;
    
    // Update user data (don't update password here)
    delete body.password; // Remove password from update
    Object.assign(user, {
      ...body,
      updatedAt: Date.now()
    });
    
    // Update Redis keys
    await redis.set(`auth:user:${userId}`, JSON.stringify(user));
    
    // Update email mapping if changed
    if (body.email && body.email !== oldEmail) {
      await redis.del(`auth:user:email:${oldEmail}`);
      await redis.set(`auth:user:email:${body.email}`, userId);
    }
    
    // Don't send password hash back
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    return c.json<ApiResponse>({
      success: true,
      data: userWithoutPassword
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return c.json<ApiResponse>({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Delete user
platformRoutes.delete('/users/:userId', async (c) => {
  try {
    const redis = c.get('redis');
    const userId = c.req.param('userId');
    
    const userData = await redis.get(`auth:user:${userId}`);
    if (!userData) {
      return c.json<ApiResponse>({ 
        success: false, 
        error: 'User not found' 
      }, 404);
    }
    
    const user = JSON.parse(userData);
    
    // Delete user data
    await redis.del(`auth:user:${userId}`);
    await redis.del(`auth:user:email:${user.email}`);
    
    // Remove from nest users if applicable
    if (user.nestId) {
      await redis.hdel(`nest:${user.nestId}:users`, userId);
    }
    
    // Delete user sessions
    const sessionKeys = [];
    let cursor = '0';
    do {
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', `session:*:${userId}`, 'COUNT', 100);
      cursor = newCursor;
      sessionKeys.push(...keys);
    } while (cursor !== '0');
    
    if (sessionKeys.length > 0) {
      await redis.del(...sessionKeys);
    }
    
    return c.json<ApiResponse>({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return c.json<ApiResponse>({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Update user status
platformRoutes.post('/users/:userId/status', async (c) => {
  try {
    const redis = c.get('redis');
    const userId = c.req.param('userId');
    const body = await c.req.json();
    const { isActive, reason } = body;
    
    const userKey = `auth:user:${userId}`;
    
    const userData = await redis.get(userKey);
    if (!userData) {
      return c.json<ApiResponse>({ 
        success: false, 
        error: 'User not found' 
      }, 404);
    }
    
    const user = JSON.parse(userData);
    user.isActive = isActive;
    user.updatedAt = Date.now();
    
    await redis.set(userKey, JSON.stringify(user));
    
    return c.json<ApiResponse>({
      success: true,
      data: { message: `User ${isActive ? 'activated' : 'deactivated'} successfully` }
    });
  } catch (error: any) {
    console.error('Update user status error:', error);
    return c.json<ApiResponse>({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// Update nest status
platformRoutes.post('/nests/:nestId/status', async (c) => {
  try {
    const nestId = c.req.param('nestId');
    const body = await c.req.json();
    const { isActive, reason } = body;
    
    // Use imported redis instance
    const nestKey = `nest:${nestId}`;
    
    const nestData = await redis.get(nestKey);
    if (!nestData) {
      return c.json<ApiResponse>({ 
        success: false, 
        error: 'Nest not found' 
      }, 404);
    }
    
    const nest = JSON.parse(nestData);
    nest.isActive = isActive;
    nest.updatedAt = Date.now();
    
    await redis.set(nestKey, JSON.stringify(nest));
    
    // If deactivating, also deactivate services
    if (!isActive) {
      const serviceKeys = await redis.keys(`service:${nestId}:*`);
      for (const key of serviceKeys) {
        const serviceData = await redis.get(key);
        if (serviceData) {
          const service = JSON.parse(serviceData);
          service.isActive = false;
          await redis.set(key, JSON.stringify(service));
        }
      }
    }
    
    return c.json<ApiResponse>({
      success: true,
      data: { message: `Nest ${isActive ? 'activated' : 'deactivated'} successfully` }
    });
  } catch (error: any) {
    console.error('Update nest status error:', error);
    return c.json<ApiResponse>({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});