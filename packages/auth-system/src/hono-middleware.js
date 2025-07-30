"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthMiddleware = createAuthMiddleware;
exports.createPermissionMiddleware = createPermissionMiddleware;
exports.createRoleMiddleware = createRoleMiddleware;
exports.createNestOwnershipMiddleware = createNestOwnershipMiddleware;
exports.createRateLimitMiddleware = createRateLimitMiddleware;
exports.getAuthUser = getAuthUser;
exports.getAuthPermissions = getAuthPermissions;
exports.hasPermission = hasPermission;
exports.hasRole = hasRole;
exports.createApiKeyMiddleware = createApiKeyMiddleware;
/**
 * JWT Authentication middleware for Hono
 */
function createAuthMiddleware(authManager) {
    return async (c, next) => {
        try {
            // Extract token from Authorization header or cookie
            let token;
            const authHeader = c.req.header('Authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
            else {
                // Try cookie as fallback
                token = await c.req.cookie('auth-token');
            }
            if (!token) {
                return c.json({
                    success: false,
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                }, 401);
            }
            // Validate token
            const validation = await authManager.validateAccessToken(token);
            if (!validation.isValid) {
                if (validation.requiresRefresh) {
                    return c.json({
                        success: false,
                        error: 'Token expired',
                        code: 'TOKEN_EXPIRED',
                        requiresRefresh: true
                    }, 401);
                }
                return c.json({
                    success: false,
                    error: validation.error || 'Invalid token',
                    code: 'INVALID_TOKEN'
                }, 401);
            }
            // Set user and permissions in context
            c.set('user', validation.payload);
            if (validation.payload.type === 'access') {
                c.set('permissions', validation.payload.permissions);
            }
            await next();
        }
        catch (error) {
            console.error('Auth middleware error:', error);
            return c.json({
                success: false,
                error: 'Authentication failed',
                code: 'AUTH_ERROR'
            }, 500);
        }
    };
}
/**
 * Permission-based authorization middleware
 */
function createPermissionMiddleware(requiredPermission) {
    return async (c, next) => {
        const permissions = c.get('permissions');
        if (!permissions || !permissions[requiredPermission]) {
            return c.json({
                success: false,
                error: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: requiredPermission
            }, 403);
        }
        await next();
    };
}
/**
 * Role-based authorization middleware
 */
function createRoleMiddleware(allowedRoles) {
    return async (c, next) => {
        const user = c.get('user');
        if (!user || !allowedRoles.includes(user.role)) {
            return c.json({
                success: false,
                error: 'Insufficient role permissions',
                code: 'INSUFFICIENT_ROLE',
                required: allowedRoles,
                current: user?.role
            }, 403);
        }
        await next();
    };
}
/**
 * Nest ownership middleware - ensures user belongs to the nest
 */
function createNestOwnershipMiddleware(nestIdParam = 'nestId') {
    return async (c, next) => {
        const user = c.get('user');
        const requestedNestId = c.req.param(nestIdParam) || c.req.query(nestIdParam);
        if (!user) {
            return c.json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            }, 401);
        }
        if (user.nestId !== requestedNestId) {
            return c.json({
                success: false,
                error: 'Access denied to this nest',
                code: 'NEST_ACCESS_DENIED'
            }, 403);
        }
        await next();
    };
}
/**
 * Rate limiting middleware
 */
function createRateLimitMiddleware(windowMs, maxRequests, keyGenerator) {
    const requests = new Map();
    return async (c, next) => {
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
                return c.json({
                    success: false,
                    error: 'Rate limit exceeded',
                    code: 'RATE_LIMIT_EXCEEDED',
                    retryAfter: Math.ceil((current.resetTime - now) / 1000)
                }, 429);
            }
            current.count++;
        }
        else {
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
function getAuthUser(c) {
    return c.get('user') || null;
}
/**
 * Helper function to extract permissions from context
 */
function getAuthPermissions(c) {
    return c.get('permissions') || null;
}
/**
 * Helper function to check if user has specific permission
 */
function hasPermission(c, permission) {
    const permissions = c.get('permissions');
    return permissions ? permissions[permission] : false;
}
/**
 * Helper function to check if user has specific role
 */
function hasRole(c, roles) {
    const user = c.get('user');
    if (!user)
        return false;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(user.role);
}
/**
 * API Key authentication middleware (for API endpoints)
 */
function createApiKeyMiddleware(authManager) {
    return async (c, next) => {
        try {
            const apiKey = c.req.header('X-API-Key');
            if (!apiKey) {
                return c.json({
                    success: false,
                    error: 'API key required',
                    code: 'API_KEY_REQUIRED'
                }, 401);
            }
            // Extract key prefix (first 8 characters)
            const keyPrefix = apiKey.substring(0, 8);
            // Get API key from storage
            const storedApiKey = await authManager.storage.getApiKeyByPrefix(keyPrefix);
            if (!storedApiKey || !storedApiKey.isActive) {
                return c.json({
                    success: false,
                    error: 'Invalid API key',
                    code: 'INVALID_API_KEY'
                }, 401);
            }
            // Check if API key is expired
            if (storedApiKey.expiresAt && storedApiKey.expiresAt < Date.now()) {
                return c.json({
                    success: false,
                    error: 'API key expired',
                    code: 'API_KEY_EXPIRED'
                }, 401);
            }
            // Validate the full key hash
            const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
            const hashedInputKey = crypto.createHash('sha256').update(apiKey).digest('hex');
            if (hashedInputKey !== storedApiKey.hashedKey) {
                return c.json({
                    success: false,
                    error: 'Invalid API key',
                    code: 'INVALID_API_KEY'
                }, 401);
            }
            // Update usage statistics
            storedApiKey.usageCount++;
            storedApiKey.lastUsedAt = Date.now();
            await authManager.storage.updateApiKey(storedApiKey);
            // Set API key info in context for later use
            c.set('apiKey', storedApiKey);
            await next();
        }
        catch (error) {
            console.error('API key middleware error:', error);
            return c.json({
                success: false,
                error: 'API key validation failed',
                code: 'API_KEY_ERROR'
            }, 500);
        }
    };
}
//# sourceMappingURL=hono-middleware.js.map