import type { Nest } from '../../shared-types/src/index';

// User roles in the system
export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

// Permissions for each role
export interface RolePermissions {
  // Nest management
  canManageNest: boolean;
  canViewNest: boolean;
  canUpdateNestSettings: boolean;
  canDeleteNest: boolean;
  
  // Service management
  canCreateServices: boolean;
  canEditServices: boolean;
  canDeleteServices: boolean;
  canViewServices: boolean;
  
  // User management
  canInviteUsers: boolean;
  canManageUsers: boolean;
  canViewUsers: boolean;
  
  // Billing & subscription
  canManageBilling: boolean;
  canViewBilling: boolean;
  
  // Analytics & reports
  canViewAnalytics: boolean;
  canExportData: boolean;
  
  // API access
  canUseApi: boolean;
  canManageApiKeys: boolean;
}

// User information
export interface NestUser {
  id: string;
  nestId: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: number;
  createdAt: number;
  updatedAt: number;
  
  // Security
  passwordHash: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  
  // Preferences
  preferences: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      slack: boolean;
    };
  };
}

// JWT Token payloads
export interface AccessTokenPayload {
  sub: string; // user id
  nestId: string;
  email: string;
  role: UserRole;
  permissions: RolePermissions;
  sessionId: string;
  deviceId?: string;
  iat: number;
  exp: number;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string; // user id
  nestId: string;
  sessionId: string;
  deviceId?: string;
  iat: number;
  exp: number;
  type: 'refresh';
}

// Session management
export interface UserSession {
  id: string;
  userId: string;
  nestId: string;
  deviceId?: string;
  deviceInfo: {
    userAgent: string;
    ip: string;
    browser?: string;
    os?: string;
    location?: {
      country: string;
      city: string;
    };
  };
  isActive: boolean;
  lastActivityAt: number;
  createdAt: number;
  expiresAt: number;
  
  // Security flags
  isPasswordChangeRequired: boolean;
  isSuspicious: boolean; // flagged by security systems
}

// API Key management
export interface ApiKey {
  id: string;
  nestId: string;
  userId: string;
  name: string;
  keyPrefix: string; // first 8 chars for identification
  hashedKey: string;
  permissions: string[]; // specific API permissions
  isActive: boolean;
  lastUsedAt?: number;
  expiresAt?: number;
  createdAt: number;
  
  // Usage tracking
  usageCount: number;
  rateLimit: {
    requestsPerHour: number;
    requestsPerDay: number;
  };
}

// Authentication attempt tracking
export interface AuthAttempt {
  id: string;
  email: string;
  ip: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  timestamp: number;
  
  // Geographic info
  location?: {
    country: string;
    city: string;
  };
}

// Two-factor authentication
export interface TwoFactorSetup {
  userId: string;
  secret: string;
  qrCode: string;
  backupCodes: string[];
  isVerified: boolean;
  createdAt: number;
}

// Password reset tokens
export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: number;
  isUsed: boolean;
  createdAt: number;
}

// Invitation tokens for new users
export interface InvitationToken {
  id: string;
  nestId: string;
  email: string;
  role: UserRole;
  token: string;
  invitedBy: string; // user id
  expiresAt: number;
  isUsed: boolean;
  createdAt: number;
}

// Authentication configuration
export interface AuthConfig {
  jwt: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenTtl: number; // seconds
    refreshTokenTtl: number; // seconds
    issuer: string;
    audience: string;
  };
  
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    preventReuse: number; // last N passwords
  };
  
  security: {
    maxFailedAttempts: number;
    lockoutDuration: number; // seconds
    sessionTimeout: number; // seconds
    maxActiveSessions: number;
  };
  
  rateLimiting: {
    loginAttempts: {
      windowMs: number;
      maxAttempts: number;
    };
    apiRequests: {
      windowMs: number;
      maxRequests: number;
    };
  };
}

// Response types
export interface AuthResponse {
  success: boolean;
  user?: Omit<NestUser, 'passwordHash' | 'twoFactorSecret'>;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  session?: UserSession;
  error?: string;
  requiresTwoFactor?: boolean;
  isAccountLocked?: boolean;
  lockoutExpiresAt?: number;
}

export interface TokenValidationResult {
  isValid: boolean;
  payload?: AccessTokenPayload | RefreshTokenPayload;
  error?: string;
  isExpired?: boolean;
  requiresRefresh?: boolean;
}