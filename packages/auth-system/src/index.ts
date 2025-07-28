// Main auth system exports
export { AuthManager } from './auth-manager';
export { RedisAuthStorage } from './redis-storage';
export {
  createAuthMiddleware,
  createPermissionMiddleware,
  createRoleMiddleware,
  createNestOwnershipMiddleware,
  createRateLimitMiddleware,
  createApiKeyMiddleware,
  getAuthUser,
  getAuthPermissions,
  hasPermission,
  hasRole,
} from './hono-middleware';

// Type exports
export type {
  // User and roles
  UserRole,
  RolePermissions,
  NestUser,
  
  // Sessions and tokens
  UserSession,
  AccessTokenPayload,
  RefreshTokenPayload,
  TokenValidationResult,
  
  // API Keys
  ApiKey,
  
  // Authentication
  AuthConfig,
  AuthResponse,
  AuthAttempt,
  
  // Two-factor and tokens
  TwoFactorSetup,
  PasswordResetToken,
  InvitationToken,
} from './types';

export type { AuthStorage } from './auth-manager';