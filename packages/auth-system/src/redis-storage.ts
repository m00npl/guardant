import Redis from 'ioredis';
import type { AuthStorage } from './auth-manager';
import type {
  NestUser,
  UserSession,
  AuthAttempt,
  ApiKey,
} from './types';

export class RedisAuthStorage implements AuthStorage {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  // Redis key generators
  private keys = {
    user: (userId: string) => `auth:user:${userId}`,
    userByEmail: (email: string) => `auth:user:email:${email}`,
    usersByNest: (nestId: string) => `auth:users:nest:${nestId}`,
    session: (sessionId: string) => `auth:session:${sessionId}`,
    userSessions: (userId: string) => `auth:sessions:user:${userId}`,
    authAttempt: (attemptId: string) => `auth:attempt:${attemptId}`,
    authAttemptsByEmail: (email: string) => `auth:attempts:email:${email}`,
    apiKey: (keyId: string) => `auth:apikey:${keyId}`,
    apiKeyByPrefix: (prefix: string) => `auth:apikey:prefix:${prefix}`,
    userApiKeys: (userId: string) => `auth:apikeys:user:${userId}`,
  };

  // User management
  async createUser(user: NestUser): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    pipeline.set(this.keys.user(user.id), JSON.stringify(user));
    pipeline.set(this.keys.userByEmail(user.email), user.id);
    pipeline.sadd(this.keys.usersByNest(user.nestId), user.id);
    
    await pipeline.exec();
  }

  async getUser(userId: string): Promise<NestUser | null> {
    const userData = await this.redis.get(this.keys.user(userId));
    return userData ? JSON.parse(userData) : null;
  }

  async getUserByEmail(email: string): Promise<NestUser | null> {
    const userId = await this.redis.get(this.keys.userByEmail(email));
    if (!userId) return null;
    return this.getUser(userId);
  }

  async updateUser(user: NestUser): Promise<void> {
    await this.redis.set(this.keys.user(user.id), JSON.stringify(user));
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    const pipeline = this.redis.pipeline();
    
    pipeline.del(this.keys.user(userId));
    pipeline.del(this.keys.userByEmail(user.email));
    pipeline.srem(this.keys.usersByNest(user.nestId), userId);
    
    // Delete user sessions
    const sessions = await this.getUserSessions(userId);
    sessions.forEach(session => {
      pipeline.del(this.keys.session(session.id));
    });
    pipeline.del(this.keys.userSessions(userId));
    
    // Delete user API keys
    const apiKeys = await this.getUserApiKeys(userId);
    apiKeys.forEach(apiKey => {
      pipeline.del(this.keys.apiKey(apiKey.id));
      pipeline.del(this.keys.apiKeyByPrefix(apiKey.keyPrefix));
    });
    pipeline.del(this.keys.userApiKeys(userId));
    
    await pipeline.exec();
  }

  async getUsersByNest(nestId: string): Promise<NestUser[]> {
    const userIds = await this.redis.smembers(this.keys.usersByNest(nestId));
    if (userIds.length === 0) return [];

    const pipeline = this.redis.pipeline();
    userIds.forEach(userId => pipeline.get(this.keys.user(userId)));
    
    const results = await pipeline.exec();
    
    return results
      ?.map(([err, data]) => {
        if (err || !data) return null;
        try {
          return JSON.parse(data as string);
        } catch {
          return null;
        }
      })
      .filter(Boolean) || [];
  }

  // Session management
  async createSession(session: UserSession): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    pipeline.set(this.keys.session(session.id), JSON.stringify(session));
    pipeline.sadd(this.keys.userSessions(session.userId), session.id);
    
    // Set expiration
    const ttl = Math.ceil((session.expiresAt - Date.now()) / 1000);
    if (ttl > 0) {
      pipeline.expire(this.keys.session(session.id), ttl);
    }
    
    await pipeline.exec();
  }

  async getSession(sessionId: string): Promise<UserSession | null> {
    const sessionData = await this.redis.get(this.keys.session(sessionId));
    return sessionData ? JSON.parse(sessionData) : null;
  }

  async updateSession(session: UserSession): Promise<void> {
    await this.redis.set(this.keys.session(session.id), JSON.stringify(session));
  }

  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const pipeline = this.redis.pipeline();
    pipeline.del(this.keys.session(sessionId));
    pipeline.srem(this.keys.userSessions(session.userId), sessionId);
    
    await pipeline.exec();
  }

  async getUserSessions(userId: string): Promise<UserSession[]> {
    const sessionIds = await this.redis.smembers(this.keys.userSessions(userId));
    if (sessionIds.length === 0) return [];

    const pipeline = this.redis.pipeline();
    sessionIds.forEach(sessionId => pipeline.get(this.keys.session(sessionId)));
    
    const results = await pipeline.exec();
    
    return results
      ?.map(([err, data]) => {
        if (err || !data) return null;
        try {
          return JSON.parse(data as string);
        } catch {
          return null;
        }
      })
      .filter(Boolean) || [];
  }

  async deleteUserSessions(userId: string): Promise<void> {
    const sessionIds = await this.redis.smembers(this.keys.userSessions(userId));
    if (sessionIds.length === 0) return;

    const pipeline = this.redis.pipeline();
    sessionIds.forEach(sessionId => pipeline.del(this.keys.session(sessionId)));
    pipeline.del(this.keys.userSessions(userId));
    
    await pipeline.exec();
  }

  // Auth attempts tracking
  async createAuthAttempt(attempt: AuthAttempt): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    pipeline.set(this.keys.authAttempt(attempt.id), JSON.stringify(attempt));
    pipeline.zadd(this.keys.authAttemptsByEmail(attempt.email), attempt.timestamp, attempt.id);
    
    // Set TTL for cleanup (keep for 24 hours)
    pipeline.expire(this.keys.authAttempt(attempt.id), 24 * 60 * 60);
    
    await pipeline.exec();
  }

  async getAuthAttempts(email: string, since: number): Promise<AuthAttempt[]> {
    const attemptIds = await this.redis.zrangebyscore(
      this.keys.authAttemptsByEmail(email),
      since,
      '+inf'
    );
    
    if (attemptIds.length === 0) return [];

    const pipeline = this.redis.pipeline();
    attemptIds.forEach(attemptId => pipeline.get(this.keys.authAttempt(attemptId)));
    
    const results = await pipeline.exec();
    
    return results
      ?.map(([err, data]) => {
        if (err || !data) return null;
        try {
          return JSON.parse(data as string);
        } catch {
          return null;
        }
      })
      .filter(Boolean) || [];
  }

  // API Keys
  async createApiKey(apiKey: ApiKey): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    pipeline.set(this.keys.apiKey(apiKey.id), JSON.stringify(apiKey));
    pipeline.set(this.keys.apiKeyByPrefix(apiKey.keyPrefix), apiKey.id);
    pipeline.sadd(this.keys.userApiKeys(apiKey.userId), apiKey.id);
    
    // Set expiration if specified
    if (apiKey.expiresAt) {
      const ttl = Math.ceil((apiKey.expiresAt - Date.now()) / 1000);
      if (ttl > 0) {
        pipeline.expire(this.keys.apiKey(apiKey.id), ttl);
        pipeline.expire(this.keys.apiKeyByPrefix(apiKey.keyPrefix), ttl);
      }
    }
    
    await pipeline.exec();
  }

  async getApiKey(keyId: string): Promise<ApiKey | null> {
    const keyData = await this.redis.get(this.keys.apiKey(keyId));
    return keyData ? JSON.parse(keyData) : null;
  }

  async getApiKeyByPrefix(prefix: string): Promise<ApiKey | null> {
    const keyId = await this.redis.get(this.keys.apiKeyByPrefix(prefix));
    if (!keyId) return null;
    return this.getApiKey(keyId);
  }

  async updateApiKey(apiKey: ApiKey): Promise<void> {
    await this.redis.set(this.keys.apiKey(apiKey.id), JSON.stringify(apiKey));
  }

  async deleteApiKey(keyId: string): Promise<void> {
    const apiKey = await this.getApiKey(keyId);
    if (!apiKey) return;

    const pipeline = this.redis.pipeline();
    pipeline.del(this.keys.apiKey(keyId));
    pipeline.del(this.keys.apiKeyByPrefix(apiKey.keyPrefix));
    pipeline.srem(this.keys.userApiKeys(apiKey.userId), keyId);
    
    await pipeline.exec();
  }

  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    const keyIds = await this.redis.smembers(this.keys.userApiKeys(userId));
    if (keyIds.length === 0) return [];

    const pipeline = this.redis.pipeline();
    keyIds.forEach(keyId => pipeline.get(this.keys.apiKey(keyId)));
    
    const results = await pipeline.exec();
    
    return results
      ?.map(([err, data]) => {
        if (err || !data) return null;
        try {
          return JSON.parse(data as string);
        } catch {
          return null;
        }
      })
      .filter(Boolean) || [];
  }

  // Cleanup methods for maintenance
  async cleanupExpiredSessions(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    // This is a simplified cleanup - in production you'd want to use Redis SCAN
    // to avoid blocking the server with large datasets
    
    return cleaned;
  }

  async cleanupOldAuthAttempts(olderThan: number): Promise<number> {
    let cleaned = 0;

    // Clean up attempts older than specified timestamp
    // Implementation would use ZREMRANGEBYSCORE for efficiency
    
    return cleaned;
  }
}