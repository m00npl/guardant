import type { Context, Next } from 'hono';
import type { AuthManager } from './auth-manager';
import type { AccessTokenPayload, RolePermissions, ApiKey } from './types';
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
export declare function createAuthMiddleware(authManager: AuthManager): (c: Context, next: Next) => Promise<(Response & import("hono").TypedResponse<{
    success: boolean;
    error: string;
    code: string;
}>) | undefined>;
/**
 * Permission-based authorization middleware
 */
export declare function createPermissionMiddleware(requiredPermission: keyof RolePermissions): (c: Context, next: Next) => Promise<(Response & import("hono").TypedResponse<{
    success: boolean;
    error: string;
    code: string;
    required: keyof RolePermissions;
}>) | undefined>;
/**
 * Role-based authorization middleware
 */
export declare function createRoleMiddleware(allowedRoles: string[]): (c: Context, next: Next) => Promise<(Response & import("hono").TypedResponse<{
    success: boolean;
    error: string;
    code: string;
    required: string[];
    current: import("../dist").UserRole;
}>) | undefined>;
/**
 * Nest ownership middleware - ensures user belongs to the nest
 */
export declare function createNestOwnershipMiddleware(nestIdParam?: string): (c: Context, next: Next) => Promise<(Response & import("hono").TypedResponse<{
    success: boolean;
    error: string;
    code: string;
}>) | undefined>;
/**
 * Rate limiting middleware
 */
export declare function createRateLimitMiddleware(windowMs: number, maxRequests: number, keyGenerator?: (c: Context) => string): (c: Context, next: Next) => Promise<(Response & import("hono").TypedResponse<{
    success: boolean;
    error: string;
    code: string;
    retryAfter: number;
}>) | undefined>;
/**
 * Helper function to extract user info from context
 */
export declare function getAuthUser(c: Context): AccessTokenPayload | null;
/**
 * Helper function to extract permissions from context
 */
export declare function getAuthPermissions(c: Context): RolePermissions | null;
/**
 * Helper function to check if user has specific permission
 */
export declare function hasPermission(c: Context, permission: keyof RolePermissions): boolean;
/**
 * Helper function to check if user has specific role
 */
export declare function hasRole(c: Context, roles: string | string[]): boolean;
/**
 * API Key authentication middleware (for API endpoints)
 */
export declare function createApiKeyMiddleware(authManager: AuthManager): (c: Context, next: Next) => Promise<(Response & import("hono").TypedResponse<{
    success: boolean;
    error: string;
    code: string;
}>) | undefined>;
//# sourceMappingURL=hono-middleware.d.ts.map