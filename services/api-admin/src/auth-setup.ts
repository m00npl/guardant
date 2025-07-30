import { AuthManager, RedisAuthStorage } from '../../../packages/auth-system/src/index';
import { VaultAuthManager } from '../../../packages/auth-system/src/vault-auth-manager';
import { VaultHttpClient, createVaultClient } from '../../../packages/auth-system/src/vault-client';
import Redis from 'ioredis';
import type { AuthConfig } from '../../../packages/auth-system/src/types';

export function setupAuthManager(redis: Redis): AuthManager {
  const authConfig: AuthConfig = {
    jwt: {
      accessTokenSecret: process.env.JWT_SECRET || 'your-secret-key-here',
      refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-here',
      accessTokenTtl: 3600, // 1 hour
      refreshTokenTtl: 86400 * 7, // 7 days
      issuer: 'guardant-admin',
      audience: 'guardant-admin',
    },
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: true,
      preventReuse: 5,
    },
    security: {
      maxFailedAttempts: 5,
      lockoutDuration: 900, // 15 minutes
      sessionTimeout: 3600, // 1 hour
      maxActiveSessions: 5,
    },
    rateLimiting: {
      loginAttempts: {
        windowMs: 900000, // 15 minutes
        maxAttempts: 5,
      },
      apiRequests: {
        windowMs: 60000, // 1 minute
        maxRequests: 100,
      },
    },
  };

  const authStorage = new RedisAuthStorage(redis);
  
  // Check if Vault is configured
  const vaultClient = createVaultClient();
  
  if (vaultClient) {
    console.log('🔐 Using Vault for password storage');
    return new VaultAuthManager(
      authStorage,
      authConfig,
      vaultClient,
      'secret/data/users/passwords'
    );
  } else {
    console.log('💾 Using local storage for passwords (Vault not configured)');
    return new AuthManager(authStorage, authConfig);
  }
}