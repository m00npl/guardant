import type { Context, Next } from 'hono';
import type { AuthManager } from './auth-manager';
import type { AccessTokenPayload, RolePermissions, ApiKey } from './types';

// Extend Hono context to include auth info
declare module 'hono' {
  interface ContextVariableMap {
    user: AccessTokenPayload;
    permissions: RolePermissions;
    apiKey: ApiKey;
  }
}

/**
 * JWT Authentication middleware for Hono
 */
export function createAuthMiddleware(authManager: AuthManager) {
  return async (c: Context, next: Next) => {
    try {
      // Extract token from Authorization header or cookie
      let token: string | undefined;
      
      const authHeader = c.req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        // Try cookie as fallback
        token = await c.req.cookie('auth-token');
      }

      if (!token) {
        return c.json(
          { 
            success: false, 
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
          },
          401
        );
      }

      // Validate token
      const validation = await authManager.validateAccessToken(token);
      
      if (!validation.isValid) {
        if (validation.requiresRefresh) {
          return c.json(
            { 
              success: false, 
              error: 'Token expired',
              code: 'TOKEN_EXPIRED',
              requiresRefresh: true
            },
            401
          );
        }

        return c.json(
          { 
            success: false, 
            error: validation.error || 'Invalid token',
            code: 'INVALID_TOKEN'
          },
          401
        );
      }

      // Set user and permissions in context
      c.set('user', validation.payload!);
      if (validation.payload!.type === 'access') {
        c.set('permissions', (validation.payload as AccessTokenPayload).permissions);
      }

      await next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return c.json(
        { 
          success: false, 
          error: 'Authentication failed',
          code: 'AUTH_ERROR'
        },
        500
      );
    }
  };
}

/**
 * Permission-based authorization middleware
 */
export function createPermissionMiddleware(
  requiredPermission: keyof RolePermissions
) {
  return async (c: Context, next: Next) => {
    const permissions = c.get('permissions');
    
    if (!permissions || !permissions[requiredPermission]) {
      return c.json(
        { 
          success: false, 
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: requiredPermission
        },
        403
      );
    }

    await next();
  };
}

/**
 * Role-based authorization middleware
 */
export function createRoleMiddleware(allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    
    if (!user || !allowedRoles.includes(user.role)) {
      return c.json(
        { 
          success: false, 
          error: 'Insufficient role permissions',
          code: 'INSUFFICIENT_ROLE',
          required: allowedRoles,
          current: user?.role
        },
        403
      );
    }

    await next();
  };
}

/**
 * Nest ownership middleware - ensures user belongs to the nest
 */
export function createNestOwnershipMiddleware(nestIdParam: string = 'nestId') {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    const requestedNestId = c.req.param(nestIdParam) || c.req.query(nestIdParam);
    
    if (!user) {
      return c.json(
        { 
          success: false, 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        },
        401
      );
    }

    if (user.nestId !== requestedNestId) {
      return c.json(
        { 
          success: false, 
          error: 'Access denied to this nest',
          code: 'NEST_ACCESS_DENIED'
        },
        403
      );
    }

    await next();
  };
}

/**
 * Rate limiting middleware
 */
export function createRateLimitMiddleware(
  windowMs: number,
  maxRequests: number,
  keyGenerator?: (c: Context) => string
) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return async (c: Context, next: Next) => {
    const key = keyGenerator ? keyGenerator(c) : c.req.header('x-forwarded-for') || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    const entries = Array.from(requests.entries());
    for (const [k, v] of entries) {
      if (v.resetTime < now) {
        requests.delete(k);
      }
    }

    // Check current request count
    const current = requests.get(key);
    if (current) {
      if (current.count >= maxRequests) {
        return c.json(
          { 
            success: false, 
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((current.resetTime - now) / 1000)
          },
          429
        );
      }
      current.count++;
    } else {
      requests.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
    }

    await next();
  };
}

/**
 * Helper function to extract user info from context
 */
export function getAuthUser(c: Context): AccessTokenPayload | null {
  return c.get('user') || null;
}

/**
 * Helper function to extract permissions from context
 */
export function getAuthPermissions(c: Context): RolePermissions | null {
  return c.get('permissions') || null;
}

/**
 * Helper function to check if user has specific permission
 */
export function hasPermission(c: Context, permission: keyof RolePermissions): boolean {
  const permissions = c.get('permissions');
  return permissions ? permissions[permission] : false;
}

/**
 * Helper function to check if user has specific role
 */
export function hasRole(c: Context, roles: string | string[]): boolean {
  const user = c.get('user');
  if (!user) return false;
  
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return allowedRoles.includes(user.role);
}

/**
 * API Key authentication middleware (for API endpoints)
 */
export function createApiKeyMiddleware(authManager: AuthManager) {
  return async (c: Context, next: Next) => {
    try {
      const apiKey = c.req.header('X-API-Key');
      
      if (!apiKey) {
        return c.json(
          { 
            success: false, 
            error: 'API key required',
            code: 'API_KEY_REQUIRED'
          },
          401
        );
      }

      // Extract key prefix (first 8 characters)
      const keyPrefix = apiKey.substring(0, 8);
      
      // Get API key from storage
      const storedApiKey = await authManager.storage.getApiKeyByPrefix(keyPrefix);
      
      if (!storedApiKey || !storedApiKey.isActive) {
        return c.json(
          { 
            success: false, 
            error: 'Invalid API key',
            code: 'INVALID_API_KEY'
          },
          401
        );
      }

      // Check if API key is expired
      if (storedApiKey.expiresAt && storedApiKey.expiresAt < Date.now()) {
        return c.json(
          { 
            success: false, 
            error: 'API key expired',
            code: 'API_KEY_EXPIRED'
          },
          401
        );
      }

      // Validate the full key hash
      const crypto = await import('crypto');
      const hashedInputKey = crypto.createHash('sha256').update(apiKey).digest('hex');
      
      if (hashedInputKey !== storedApiKey.hashedKey) {
        return c.json(
          { 
            success: false, 
            error: 'Invalid API key',
            code: 'INVALID_API_KEY'
          },
          401
        );
      }

      // Update usage statistics
      storedApiKey.usageCount++;
      storedApiKey.lastUsedAt = Date.now();
      await authManager.storage.updateApiKey(storedApiKey);

      // Set API key info in context for later use
      c.set('apiKey', storedApiKey);
      
      await next();
    } catch (error) {
      console.error('API key middleware error:', error);
      return c.json(
        { 
          success: false, 
          error: 'API key validation failed',
          code: 'API_KEY_ERROR'
        },
        500
      );
    }
  };
}