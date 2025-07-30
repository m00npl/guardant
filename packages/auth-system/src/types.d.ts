export type UserRole = 'platform_admin' | 'owner' | 'admin' | 'editor' | 'viewer';
export interface RolePermissions {
    canManageNest: boolean;
    canViewNest: boolean;
    canUpdateNestSettings: boolean;
    canDeleteNest: boolean;
    canCreateServices: boolean;
    canEditServices: boolean;
    canDeleteServices: boolean;
    canViewServices: boolean;
    canInviteUsers: boolean;
    canManageUsers: boolean;
    canViewUsers: boolean;
    canManageBilling: boolean;
    canViewBilling: boolean;
    canViewAnalytics: boolean;
    canExportData: boolean;
    canUseApi: boolean;
    canManageApiKeys: boolean;
    canViewAllNests?: boolean;
    canManageAllNests?: boolean;
    canViewAllUsers?: boolean;
    canManageAllUsers?: boolean;
    canViewPlatformStats?: boolean;
    canManagePlatformSettings?: boolean;
    canModerateContent?: boolean;
    canManageSubscriptions?: boolean;
}
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
    passwordHash: string;
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
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
export interface AccessTokenPayload {
    sub: string;
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
    sub: string;
    nestId: string;
    sessionId: string;
    deviceId?: string;
    iat: number;
    exp: number;
    type: 'refresh';
}
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
    isPasswordChangeRequired: boolean;
    isSuspicious: boolean;
}
export interface ApiKey {
    id: string;
    nestId: string;
    userId: string;
    name: string;
    keyPrefix: string;
    hashedKey: string;
    permissions: string[];
    isActive: boolean;
    lastUsedAt?: number;
    expiresAt?: number;
    createdAt: number;
    usageCount: number;
    rateLimit: {
        requestsPerHour: number;
        requestsPerDay: number;
    };
}
export interface AuthAttempt {
    id: string;
    email: string;
    ip: string;
    userAgent: string;
    success: boolean;
    failureReason?: string;
    timestamp: number;
    location?: {
        country: string;
        city: string;
    };
}
export interface TwoFactorSetup {
    userId: string;
    secret: string;
    qrCode: string;
    backupCodes: string[];
    isVerified: boolean;
    createdAt: number;
}
export interface PasswordResetToken {
    id: string;
    userId: string;
    token: string;
    expiresAt: number;
    isUsed: boolean;
    createdAt: number;
}
export interface InvitationToken {
    id: string;
    nestId: string;
    email: string;
    role: UserRole;
    token: string;
    invitedBy: string;
    expiresAt: number;
    isUsed: boolean;
    createdAt: number;
}
export interface AuthConfig {
    jwt: {
        accessTokenSecret: string;
        refreshTokenSecret: string;
        accessTokenTtl: number;
        refreshTokenTtl: number;
        issuer: string;
        audience: string;
    };
    password: {
        minLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumbers: boolean;
        requireSymbols: boolean;
        preventReuse: number;
    };
    security: {
        maxFailedAttempts: number;
        lockoutDuration: number;
        sessionTimeout: number;
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
//# sourceMappingURL=types.d.ts.map