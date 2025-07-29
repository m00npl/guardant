import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import type {
  AuthConfig,
  NestUser,
  UserRole,
  RolePermissions,
  AccessTokenPayload,
  RefreshTokenPayload,
  UserSession,
  AuthResponse,
  TokenValidationResult,
  AuthAttempt,
  ApiKey,
} from './types';

// Default role permissions
const DEFAULT_PERMISSIONS: Record<UserRole, RolePermissions> = {
  platform_admin: {
    canManageNest: true,
    canViewNest: true,
    canUpdateNestSettings: true,
    canDeleteNest: true,
    canCreateServices: true,
    canEditServices: true,
    canDeleteServices: true,
    canViewServices: true,
    canInviteUsers: true,
    canManageUsers: true,
    canViewUsers: true,
    canManageBilling: true,
    canViewBilling: true,
    canViewAnalytics: true,
    canExportData: true,
    canUseApi: true,
    canManageApiKeys: true,
    // Platform admin specific permissions
    canViewAllNests: true,
    canManageAllNests: true,
    canViewAllUsers: true,
    canManageAllUsers: true,
    canViewPlatformStats: true,
    canManagePlatformSettings: true,
    canModerateContent: true,
    canManageSubscriptions: true,
  },
  owner: {
    canManageNest: true,
    canViewNest: true,
    canUpdateNestSettings: true,
    canDeleteNest: true,
    canCreateServices: true,
    canEditServices: true,
    canDeleteServices: true,
    canViewServices: true,
    canInviteUsers: true,
    canManageUsers: true,
    canViewUsers: true,
    canManageBilling: true,
    canViewBilling: true,
    canViewAnalytics: true,
    canExportData: true,
    canUseApi: true,
    canManageApiKeys: true,
  },
  admin: {
    canManageNest: false,
    canViewNest: true,
    canUpdateNestSettings: true,
    canDeleteNest: false,
    canCreateServices: true,
    canEditServices: true,
    canDeleteServices: true,
    canViewServices: true,
    canInviteUsers: true,
    canManageUsers: true,
    canViewUsers: true,
    canManageBilling: false,
    canViewBilling: true,
    canViewAnalytics: true,
    canExportData: true,
    canUseApi: true,
    canManageApiKeys: true,
  },
  editor: {
    canManageNest: false,
    canViewNest: true,
    canUpdateNestSettings: false,
    canDeleteNest: false,
    canCreateServices: true,
    canEditServices: true,
    canDeleteServices: false,
    canViewServices: true,
    canInviteUsers: false,
    canManageUsers: false,
    canViewUsers: true,
    canManageBilling: false,
    canViewBilling: false,
    canViewAnalytics: true,
    canExportData: false,
    canUseApi: true,
    canManageApiKeys: false,
  },
  viewer: {
    canManageNest: false,
    canViewNest: true,
    canUpdateNestSettings: false,
    canDeleteNest: false,
    canCreateServices: false,
    canEditServices: false,
    canDeleteServices: false,
    canViewServices: true,
    canInviteUsers: false,
    canManageUsers: false,
    canViewUsers: false,
    canManageBilling: false,
    canViewBilling: false,
    canViewAnalytics: true,
    canExportData: false,
    canUseApi: false,
    canManageApiKeys: false,
  },
};

// Storage interface for persistence
export interface AuthStorage {
  // User management
  createUser(user: NestUser): Promise<void>;
  getUser(userId: string): Promise<NestUser | null>;
  getUserByEmail(email: string): Promise<NestUser | null>;
  updateUser(user: NestUser): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  getUsersByNest(nestId: string): Promise<NestUser[]>;
  
  // Session management
  createSession(session: UserSession): Promise<void>;
  getSession(sessionId: string): Promise<UserSession | null>;
  updateSession(session: UserSession): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  getUserSessions(userId: string): Promise<UserSession[]>;
  deleteUserSessions(userId: string): Promise<void>;
  
  // Auth attempts tracking
  createAuthAttempt(attempt: AuthAttempt): Promise<void>;
  getAuthAttempts(email: string, since: number): Promise<AuthAttempt[]>;
  
  // API Keys
  createApiKey(apiKey: ApiKey): Promise<void>;
  getApiKey(keyId: string): Promise<ApiKey | null>;
  getApiKeyByPrefix(prefix: string): Promise<ApiKey | null>;
  updateApiKey(apiKey: ApiKey): Promise<void>;
  deleteApiKey(keyId: string): Promise<void>;
  getUserApiKeys(userId: string): Promise<ApiKey[]>;
}

export class AuthManager {
  private config: AuthConfig;
  public storage: AuthStorage;

  constructor(config: AuthConfig, storage: AuthStorage) {
    this.config = config;
    this.storage = storage;
  }

  /**
   * Create a new user account
   */
  async createUser(
    nestId: string,
    email: string,
    password: string,
    name: string,
    role: UserRole = 'owner'
  ): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await this.storage.getUserByEmail(email);
      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists',
        };
      }

      // Validate password
      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.error,
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const user: NestUser = {
        id: uuidv4(),
        nestId,
        email,
        name,
        role,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        passwordHash,
        twoFactorEnabled: false,
        preferences: {
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: true,
            push: true,
            slack: false,
          },
        },
      };

      await this.storage.createUser(user);

      // Create initial session
      const sessionResult = await this.createSession(user, {
        userAgent: 'Registration',
        ip: '127.0.0.1',
      });

      if (!sessionResult.success) {
        return {
          success: false,
          error: 'Failed to create session',
        };
      }

      return {
        success: true,
        user: this.sanitizeUser(user),
        tokens: sessionResult.tokens,
        session: sessionResult.session,
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: 'Internal server error',
      };
    }
  }

  /**
   * Authenticate user with email and password
   */
  async login(
    email: string,
    password: string,
    deviceInfo: { userAgent: string; ip: string; deviceId?: string }
  ): Promise<AuthResponse> {
    try {
      // Track authentication attempt
      const authAttempt: AuthAttempt = {
        id: uuidv4(),
        email,
        ip: deviceInfo.ip,
        userAgent: deviceInfo.userAgent,
        success: false,
        timestamp: Date.now(),
      };

      // Check rate limiting
      const recentAttempts = await this.storage.getAuthAttempts(
        email,
        Date.now() - this.config.rateLimiting.loginAttempts.windowMs
      );

      const failedAttempts = recentAttempts.filter(a => !a.success);
      if (failedAttempts.length >= this.config.rateLimiting.loginAttempts.maxAttempts) {
        authAttempt.failureReason = 'Rate limited';
        await this.storage.createAuthAttempt(authAttempt);
        
        return {
          success: false,
          error: 'Too many failed attempts. Please try again later.',
          isAccountLocked: true,
          lockoutExpiresAt: Date.now() + this.config.security.lockoutDuration * 1000,
        };
      }

      // Find user
      const user = await this.storage.getUserByEmail(email);
      if (!user || !user.isActive) {
        authAttempt.failureReason = 'User not found or inactive';
        await this.storage.createAuthAttempt(authAttempt);
        
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        authAttempt.failureReason = 'Invalid password';
        await this.storage.createAuthAttempt(authAttempt);
        
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // Check if 2FA is required
      if (user.twoFactorEnabled) {
        authAttempt.success = true;
        authAttempt.failureReason = '2FA required';
        await this.storage.createAuthAttempt(authAttempt);
        
        return {
          success: false,
          requiresTwoFactor: true,
          error: 'Two-factor authentication required',
        };
      }

      // Success - create session
      authAttempt.success = true;
      await this.storage.createAuthAttempt(authAttempt);

      // Update last login
      user.lastLoginAt = Date.now();
      user.updatedAt = Date.now();
      await this.storage.updateUser(user);

      // Create session
      const sessionResult = await this.createSession(user, deviceInfo);
      if (!sessionResult.success) {
        return {
          success: false,
          error: 'Failed to create session',
        };
      }

      return {
        success: true,
        user: this.sanitizeUser(user),
        tokens: sessionResult.tokens,
        session: sessionResult.session,
      };
    } catch (error) {
      console.error('Error during login:', error);
      return {
        success: false,
        error: 'Internal server error',
      };
    }
  }

  /**
   * Create a new session for user
   */
  private async createSession(
    user: NestUser,
    deviceInfo: { userAgent: string; ip: string; deviceId?: string }
  ): Promise<AuthResponse> {
    try {
      // Generate session ID
      const sessionId = uuidv4();
      const deviceId = deviceInfo.deviceId || this.generateDeviceId(deviceInfo);

      // Check session limits
      const existingSessions = await this.storage.getUserSessions(user.id);
      const activeSessions = existingSessions.filter(s => s.isActive && s.expiresAt > Date.now());
      
      if (activeSessions.length >= this.config.security.maxActiveSessions) {
        // Remove oldest session
        const oldestSession = activeSessions.sort((a, b) => a.lastActivityAt - b.lastActivityAt)[0];
        await this.storage.deleteSession(oldestSession.id);
      }

      // Create session
      const session: UserSession = {
        id: sessionId,
        userId: user.id,
        nestId: user.nestId,
        deviceId,
        deviceInfo: {
          userAgent: deviceInfo.userAgent,
          ip: deviceInfo.ip,
          browser: this.extractBrowser(deviceInfo.userAgent),
          os: this.extractOS(deviceInfo.userAgent),
        },
        isActive: true,
        lastActivityAt: Date.now(),
        createdAt: Date.now(),
        expiresAt: Date.now() + (this.config.security.sessionTimeout * 1000),
        isPasswordChangeRequired: false,
        isSuspicious: false,
      };

      await this.storage.createSession(session);

      // Generate tokens
      const accessToken = this.generateAccessToken(user, sessionId, deviceId);
      const refreshToken = this.generateRefreshToken(user, sessionId, deviceId);

      return {
        success: true,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: this.config.jwt.accessTokenTtl,
        },
        session,
      };
    } catch (error) {
      console.error('Error creating session:', error);
      return {
        success: false,
        error: 'Failed to create session',
      };
    }
  }

  /**
   * Generate access token
   */
  private generateAccessToken(user: NestUser, sessionId: string, deviceId?: string): string {
    const payload: AccessTokenPayload = {
      sub: user.id,
      nestId: user.nestId,
      email: user.email,
      role: user.role,
      permissions: DEFAULT_PERMISSIONS[user.role],
      sessionId,
      deviceId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.config.jwt.accessTokenTtl,
      type: 'access',
    };

    return jwt.sign(payload, this.config.jwt.accessTokenSecret, {
      issuer: this.config.jwt.issuer,
      audience: this.config.jwt.audience,
    });
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(user: NestUser, sessionId: string, deviceId?: string): string {
    const payload: RefreshTokenPayload = {
      sub: user.id,
      nestId: user.nestId,
      sessionId,
      deviceId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.config.jwt.refreshTokenTtl,
      type: 'refresh',
    };

    return jwt.sign(payload, this.config.jwt.refreshTokenSecret, {
      issuer: this.config.jwt.issuer,
      audience: this.config.jwt.audience,
    });
  }

  /**
   * Validate access token
   */
  async validateAccessToken(token: string): Promise<TokenValidationResult> {
    try {
      const payload = jwt.verify(token, this.config.jwt.accessTokenSecret, {
        issuer: this.config.jwt.issuer,
        audience: this.config.jwt.audience,
      }) as AccessTokenPayload;

      if (payload.type !== 'access') {
        return {
          isValid: false,
          error: 'Invalid token type',
        };
      }

      // Check if session is still active
      const session = await this.storage.getSession(payload.sessionId);
      if (!session || !session.isActive || session.expiresAt < Date.now()) {
        return {
          isValid: false,
          error: 'Session expired or invalid',
          isExpired: true,
        };
      }

      // Update session activity
      session.lastActivityAt = Date.now();
      await this.storage.updateSession(session);

      return {
        isValid: true,
        payload,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          isValid: false,
          error: 'Token expired',
          isExpired: true,
          requiresRefresh: true,
        };
      }

      return {
        isValid: false,
        error: 'Invalid token',
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = jwt.verify(refreshToken, this.config.jwt.refreshTokenSecret, {
        issuer: this.config.jwt.issuer,
        audience: this.config.jwt.audience,
      }) as RefreshTokenPayload;

      if (payload.type !== 'refresh') {
        return {
          success: false,
          error: 'Invalid token type',
        };
      }

      // Check session
      const session = await this.storage.getSession(payload.sessionId);
      if (!session || !session.isActive) {
        return {
          success: false,
          error: 'Session not found or inactive',
        };
      }

      // Get user
      const user = await this.storage.getUser(payload.sub);
      if (!user || !user.isActive) {
        return {
          success: false,
          error: 'User not found or inactive',
        };
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(user, session.id, payload.deviceId);
      const newRefreshToken = this.generateRefreshToken(user, session.id, payload.deviceId);

      return {
        success: true,
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: this.config.jwt.accessTokenTtl,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Invalid refresh token',
      };
    }
  }

  /**
   * Logout user (invalidate session)
   */
  async logout(sessionId: string): Promise<{ success: boolean }> {
    try {
      await this.storage.deleteSession(sessionId);
      return { success: true };
    } catch (error) {
      console.error('Error during logout:', error);
      return { success: false };
    }
  }

  /**
   * Create new API key for user
   */
  async createApiKey(
    userId: string,
    name: string,
    permissions: string[] = [],
    expiresAt?: number
  ): Promise<{ success: boolean; apiKey?: { key: string; keyInfo: Omit<ApiKey, 'hashedKey'> }; error?: string }> {
    try {
      // Get user to verify nest
      const user = await this.storage.getUser(userId);
      if (!user || !user.isActive) {
        return {
          success: false,
          error: 'User not found or inactive',
        };
      }

      // Generate API key
      const keyId = uuidv4();
      const rawKey = `gnt_${crypto.randomBytes(32).toString('hex')}`;
      const keyPrefix = rawKey.substring(0, 8);
      const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

      const apiKey: ApiKey = {
        id: keyId,
        nestId: user.nestId,
        userId,
        name,
        keyPrefix,
        hashedKey,
        permissions,
        isActive: true,
        expiresAt,
        createdAt: Date.now(),
        usageCount: 0,
        rateLimit: {
          requestsPerHour: 1000,
          requestsPerDay: 10000,
        },
      };

      await this.storage.createApiKey(apiKey);

      const { hashedKey: _, ...keyInfo } = apiKey;
      return {
        success: true,
        apiKey: {
          key: rawKey,
          keyInfo,
        },
      };
    } catch (error) {
      console.error('Error creating API key:', error);
      return {
        success: false,
        error: 'Failed to create API key',
      };
    }
  }

  /**
   * Get user's API keys
   */
  async getUserApiKeys(userId: string): Promise<{ success: boolean; apiKeys?: Omit<ApiKey, 'hashedKey'>[]; error?: string }> {
    try {
      const apiKeys = await this.storage.getUserApiKeys(userId);
      const sanitizedKeys = apiKeys.map(({ hashedKey, ...key }) => key);

      return {
        success: true,
        apiKeys: sanitizedKeys,
      };
    } catch (error) {
      console.error('Error getting API keys:', error);
      return {
        success: false,
        error: 'Failed to get API keys',
      };
    }
  }

  /**
   * Delete API key
   */
  async deleteApiKey(keyId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify ownership
      const apiKey = await this.storage.getApiKey(keyId);
      if (!apiKey || apiKey.userId !== userId) {
        return {
          success: false,
          error: 'API key not found or access denied',
        };
      }

      await this.storage.deleteApiKey(keyId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting API key:', error);
      return {
        success: false,
        error: 'Failed to delete API key',
      };
    }
  }

  /**
   * Helper methods
   */
  private validatePassword(password: string): { isValid: boolean; error?: string } {
    if (password.length < this.config.password.minLength) {
      return {
        isValid: false,
        error: `Password must be at least ${this.config.password.minLength} characters long`,
      };
    }

    if (this.config.password.requireUppercase && !/[A-Z]/.test(password)) {
      return {
        isValid: false,
        error: 'Password must contain at least one uppercase letter',
      };
    }

    if (this.config.password.requireLowercase && !/[a-z]/.test(password)) {
      return {
        isValid: false,
        error: 'Password must contain at least one lowercase letter',
      };
    }

    if (this.config.password.requireNumbers && !/\d/.test(password)) {
      return {
        isValid: false,
        error: 'Password must contain at least one number',
      };
    }

    if (this.config.password.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return {
        isValid: false,
        error: 'Password must contain at least one symbol',
      };
    }

    return { isValid: true };
  }

  private sanitizeUser(user: NestUser): Omit<NestUser, 'passwordHash' | 'twoFactorSecret'> {
    const { passwordHash, twoFactorSecret, ...sanitized } = user;
    return sanitized;
  }

  private generateDeviceId(deviceInfo: { userAgent: string; ip: string }): string {
    return crypto
      .createHash('sha256')
      .update(`${deviceInfo.userAgent}-${deviceInfo.ip}`)
      .digest('hex')
      .substring(0, 16);
  }

  private extractBrowser(userAgent: string): string | undefined {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return undefined;
  }

  private extractOS(userAgent: string): string | undefined {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return undefined;
  }
}