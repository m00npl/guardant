import type { AuthConfig, NestUser, UserRole, UserSession, AuthResponse, TokenValidationResult, AuthAttempt, ApiKey } from './types';
export interface AuthStorage {
    createUser(user: NestUser): Promise<void>;
    getUser(userId: string): Promise<NestUser | null>;
    getUserByEmail(email: string): Promise<NestUser | null>;
    updateUser(user: NestUser): Promise<void>;
    deleteUser(userId: string): Promise<void>;
    getUsersByNest(nestId: string): Promise<NestUser[]>;
    createSession(session: UserSession): Promise<void>;
    getSession(sessionId: string): Promise<UserSession | null>;
    updateSession(session: UserSession): Promise<void>;
    deleteSession(sessionId: string): Promise<void>;
    getUserSessions(userId: string): Promise<UserSession[]>;
    deleteUserSessions(userId: string): Promise<void>;
    createAuthAttempt(attempt: AuthAttempt): Promise<void>;
    getAuthAttempts(email: string, since: number): Promise<AuthAttempt[]>;
    createApiKey(apiKey: ApiKey): Promise<void>;
    getApiKey(keyId: string): Promise<ApiKey | null>;
    getApiKeyByPrefix(prefix: string): Promise<ApiKey | null>;
    updateApiKey(apiKey: ApiKey): Promise<void>;
    deleteApiKey(keyId: string): Promise<void>;
    getUserApiKeys(userId: string): Promise<ApiKey[]>;
}
export declare class AuthManager {
    private config;
    storage: AuthStorage;
    constructor(config: AuthConfig, storage: AuthStorage);
    /**
     * Create a new user account
     */
    createUser(nestId: string, email: string, password: string, name: string, role?: UserRole): Promise<AuthResponse>;
    /**
     * Authenticate user with email and password
     */
    login(email: string, password: string, deviceInfo: {
        userAgent: string;
        ip: string;
        deviceId?: string;
    }): Promise<AuthResponse>;
    /**
     * Create a new session for user
     */
    private createSession;
    /**
     * Generate access token
     */
    private generateAccessToken;
    /**
     * Generate refresh token
     */
    private generateRefreshToken;
    /**
     * Validate access token
     */
    validateAccessToken(token: string): Promise<TokenValidationResult>;
    /**
     * Refresh access token using refresh token
     */
    refreshToken(refreshToken: string): Promise<AuthResponse>;
    /**
     * Logout user (invalidate session)
     */
    logout(sessionId: string): Promise<{
        success: boolean;
    }>;
    /**
     * Create new API key for user
     */
    createApiKey(userId: string, name: string, permissions?: string[], expiresAt?: number): Promise<{
        success: boolean;
        apiKey?: {
            key: string;
            keyInfo: Omit<ApiKey, 'hashedKey'>;
        };
        error?: string;
    }>;
    /**
     * Get user's API keys
     */
    getUserApiKeys(userId: string): Promise<{
        success: boolean;
        apiKeys?: Omit<ApiKey, 'hashedKey'>[];
        error?: string;
    }>;
    /**
     * Delete API key
     */
    deleteApiKey(keyId: string, userId: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Helper methods
     */
    private validatePassword;
    private sanitizeUser;
    private generateDeviceId;
    private extractBrowser;
    private extractOS;
}
//# sourceMappingURL=auth-manager.d.ts.map