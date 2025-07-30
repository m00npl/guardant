// src/redis-storage.ts
class RedisAuthStorage {
  redis;
  constructor(redis) {
    this.redis = redis;
  }
  keys = {
    user: (userId) => `auth:user:${userId}`,
    userByEmail: (email) => `auth:user:email:${email}`,
    usersByNest: (nestId) => `auth:users:nest:${nestId}`,
    session: (sessionId) => `auth:session:${sessionId}`,
    userSessions: (userId) => `auth:sessions:user:${userId}`,
    authAttempt: (attemptId) => `auth:attempt:${attemptId}`,
    authAttemptsByEmail: (email) => `auth:attempts:email:${email}`,
    apiKey: (keyId) => `auth:apikey:${keyId}`,
    apiKeyByPrefix: (prefix) => `auth:apikey:prefix:${prefix}`,
    userApiKeys: (userId) => `auth:apikeys:user:${userId}`
  };
  async createUser(user) {
    const pipeline = this.redis.pipeline();
    pipeline.set(this.keys.user(user.id), JSON.stringify(user));
    pipeline.set(this.keys.userByEmail(user.email), user.id);
    pipeline.sadd(this.keys.usersByNest(user.nestId), user.id);
    await pipeline.exec();
  }
  async getUser(userId) {
    const userData = await this.redis.get(this.keys.user(userId));
    return userData ? JSON.parse(userData) : null;
  }
  async getUserByEmail(email) {
    const userId = await this.redis.get(this.keys.userByEmail(email));
    if (!userId)
      return null;
    return this.getUser(userId);
  }
  async updateUser(user) {
    await this.redis.set(this.keys.user(user.id), JSON.stringify(user));
  }
  async deleteUser(userId) {
    const user = await this.getUser(userId);
    if (!user)
      return;
    const pipeline = this.redis.pipeline();
    pipeline.del(this.keys.user(userId));
    pipeline.del(this.keys.userByEmail(user.email));
    pipeline.srem(this.keys.usersByNest(user.nestId), userId);
    const sessions = await this.getUserSessions(userId);
    sessions.forEach((session) => {
      pipeline.del(this.keys.session(session.id));
    });
    pipeline.del(this.keys.userSessions(userId));
    const apiKeys = await this.getUserApiKeys(userId);
    apiKeys.forEach((apiKey) => {
      pipeline.del(this.keys.apiKey(apiKey.id));
      pipeline.del(this.keys.apiKeyByPrefix(apiKey.keyPrefix));
    });
    pipeline.del(this.keys.userApiKeys(userId));
    await pipeline.exec();
  }
  async getUsersByNest(nestId) {
    const userIds = await this.redis.smembers(this.keys.usersByNest(nestId));
    if (userIds.length === 0)
      return [];
    const pipeline = this.redis.pipeline();
    userIds.forEach((userId) => pipeline.get(this.keys.user(userId)));
    const results = await pipeline.exec();
    return results?.map(([err, data]) => {
      if (err || !data)
        return null;
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }).filter(Boolean) || [];
  }
  async createSession(session) {
    const pipeline = this.redis.pipeline();
    pipeline.set(this.keys.session(session.id), JSON.stringify(session));
    pipeline.sadd(this.keys.userSessions(session.userId), session.id);
    const ttl = Math.ceil((session.expiresAt - Date.now()) / 1000);
    if (ttl > 0) {
      pipeline.expire(this.keys.session(session.id), ttl);
    }
    await pipeline.exec();
  }
  async getSession(sessionId) {
    const sessionData = await this.redis.get(this.keys.session(sessionId));
    return sessionData ? JSON.parse(sessionData) : null;
  }
  async updateSession(session) {
    await this.redis.set(this.keys.session(session.id), JSON.stringify(session));
  }
  async deleteSession(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session)
      return;
    const pipeline = this.redis.pipeline();
    pipeline.del(this.keys.session(sessionId));
    pipeline.srem(this.keys.userSessions(session.userId), sessionId);
    await pipeline.exec();
  }
  async getUserSessions(userId) {
    const sessionIds = await this.redis.smembers(this.keys.userSessions(userId));
    if (sessionIds.length === 0)
      return [];
    const pipeline = this.redis.pipeline();
    sessionIds.forEach((sessionId) => pipeline.get(this.keys.session(sessionId)));
    const results = await pipeline.exec();
    return results?.map(([err, data]) => {
      if (err || !data)
        return null;
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }).filter(Boolean) || [];
  }
  async deleteUserSessions(userId) {
    const sessionIds = await this.redis.smembers(this.keys.userSessions(userId));
    if (sessionIds.length === 0)
      return;
    const pipeline = this.redis.pipeline();
    sessionIds.forEach((sessionId) => pipeline.del(this.keys.session(sessionId)));
    pipeline.del(this.keys.userSessions(userId));
    await pipeline.exec();
  }
  async createAuthAttempt(attempt) {
    const pipeline = this.redis.pipeline();
    pipeline.set(this.keys.authAttempt(attempt.id), JSON.stringify(attempt));
    pipeline.zadd(this.keys.authAttemptsByEmail(attempt.email), attempt.timestamp, attempt.id);
    pipeline.expire(this.keys.authAttempt(attempt.id), 24 * 60 * 60);
    await pipeline.exec();
  }
  async getAuthAttempts(email, since) {
    const attemptIds = await this.redis.zrangebyscore(this.keys.authAttemptsByEmail(email), since, "+inf");
    if (attemptIds.length === 0)
      return [];
    const pipeline = this.redis.pipeline();
    attemptIds.forEach((attemptId) => pipeline.get(this.keys.authAttempt(attemptId)));
    const results = await pipeline.exec();
    return results?.map(([err, data]) => {
      if (err || !data)
        return null;
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }).filter(Boolean) || [];
  }
  async createApiKey(apiKey) {
    const pipeline = this.redis.pipeline();
    pipeline.set(this.keys.apiKey(apiKey.id), JSON.stringify(apiKey));
    pipeline.set(this.keys.apiKeyByPrefix(apiKey.keyPrefix), apiKey.id);
    pipeline.sadd(this.keys.userApiKeys(apiKey.userId), apiKey.id);
    if (apiKey.expiresAt) {
      const ttl = Math.ceil((apiKey.expiresAt - Date.now()) / 1000);
      if (ttl > 0) {
        pipeline.expire(this.keys.apiKey(apiKey.id), ttl);
        pipeline.expire(this.keys.apiKeyByPrefix(apiKey.keyPrefix), ttl);
      }
    }
    await pipeline.exec();
  }
  async getApiKey(keyId) {
    const keyData = await this.redis.get(this.keys.apiKey(keyId));
    return keyData ? JSON.parse(keyData) : null;
  }
  async getApiKeyByPrefix(prefix) {
    const keyId = await this.redis.get(this.keys.apiKeyByPrefix(prefix));
    if (!keyId)
      return null;
    return this.getApiKey(keyId);
  }
  async updateApiKey(apiKey) {
    await this.redis.set(this.keys.apiKey(apiKey.id), JSON.stringify(apiKey));
  }
  async deleteApiKey(keyId) {
    const apiKey = await this.getApiKey(keyId);
    if (!apiKey)
      return;
    const pipeline = this.redis.pipeline();
    pipeline.del(this.keys.apiKey(keyId));
    pipeline.del(this.keys.apiKeyByPrefix(apiKey.keyPrefix));
    pipeline.srem(this.keys.userApiKeys(apiKey.userId), keyId);
    await pipeline.exec();
  }
  async getUserApiKeys(userId) {
    const keyIds = await this.redis.smembers(this.keys.userApiKeys(userId));
    if (keyIds.length === 0)
      return [];
    const pipeline = this.redis.pipeline();
    keyIds.forEach((keyId) => pipeline.get(this.keys.apiKey(keyId)));
    const results = await pipeline.exec();
    return results?.map(([err, data]) => {
      if (err || !data)
        return null;
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }).filter(Boolean) || [];
  }
  async cleanupExpiredSessions() {
    const now = Date.now();
    let cleaned = 0;
    return cleaned;
  }
  async cleanupOldAuthAttempts(olderThan) {
    let cleaned = 0;
    return cleaned;
  }
}
export {
  RedisAuthStorage
};
