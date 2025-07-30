import Redis from 'ioredis';
import type { AuthStorage } from './auth-manager';
import type { NestUser, UserSession, AuthAttempt, ApiKey } from './types';
export declare class RedisAuthStorage implements AuthStorage {
    private redis;
    constructor(redis: Redis);
    private keys;
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
    cleanupExpiredSessions(): Promise<number>;
    cleanupOldAuthAttempts(olderThan: number): Promise<number>;
}
//# sourceMappingURL=redis-storage.d.ts.map