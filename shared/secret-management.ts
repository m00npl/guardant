/**
 * Secret management system for GuardAnt services with HashiCorp Vault integration
 * Provides secure secret storage, rotation, encryption, and access control
 */

import { createLogger } from './logger';
import { SecretError, ErrorCategory, ErrorSeverity } from './error-handling';
import type { GuardAntTracing } from './tracing';

export interface SecretConfig {
  vaultUrl?: string;
  vaultToken?: string;
  vaultNamespace?: string;
  mountPath?: string;
  encryptionKey?: string;
  rotationInterval?: number;
  cacheTimeout?: number;
  retryAttempts?: number;
  enableCache?: boolean;
  enableRotation?: boolean;
  enableEncryption?: boolean;
}

export interface SecretMetadata {
  version: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  rotatesAt?: Date;
  tags: string[];
  description?: string;
  owner: string;
  accessPolicy?: string;
  encrypted: boolean;
}

export interface SecretData {
  key: string;
  value: string | Record<string, any>;
  metadata: SecretMetadata;
}

export interface SecretRotationPolicy {
  enabled: boolean;
  interval: number; // milliseconds
  maxAge: number; // milliseconds
  strategy: RotationStrategy;
  notifyBefore: number; // milliseconds before expiry to notify
}

export enum RotationStrategy {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
  ON_ACCESS = 'on_access',
  SCHEDULED = 'scheduled'
}

export interface SecretAccessLog {
  secretKey: string;
  action: SecretAction;
  user: string;
  service: string;
  timestamp: Date;
  success: boolean;
  metadata?: Record<string, any>;
}

export enum SecretAction {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ROTATE = 'rotate',
  ENCRYPT = 'encrypt',
  DECRYPT = 'decrypt'
}

export interface SecretProvider {
  name: string;
  read(key: string): Promise<SecretData | null>;
  write(key: string, value: any, metadata?: Partial<SecretMetadata>): Promise<void>;
  delete(key: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
  rotate(key: string): Promise<string>;
  healthCheck(): Promise<boolean>;
}

// HashiCorp Vault provider
export class VaultSecretProvider implements SecretProvider {
  name = 'vault';
  private logger;
  private baseUrl: string;
  private token: string;
  private namespace?: string;
  private mountPath: string;

  constructor(
    private config: SecretConfig,
    private serviceName: string
  ) {
    this.logger = createLogger(`${serviceName}-vault-provider`);
    this.baseUrl = config.vaultUrl || 'http://localhost:8200';
    this.token = config.vaultToken || '';
    this.namespace = config.vaultNamespace;
    this.mountPath = config.mountPath || 'guardant';
  }

  private async makeRequest(
    method: string,
    path: string,
    data?: any
  ): Promise<any> {
    const url = `${this.baseUrl}/v1/${this.mountPath}/${path}`;
    
    const headers: Record<string, string> = {
      'X-Vault-Token': this.token,
      'Content-Type': 'application/json'
    };

    if (this.namespace) {
      headers['X-Vault-Namespace'] = this.namespace;
    }

    try {
      console.log(`🔐 VaultProvider: Making ${method} request to ${url}`);
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vault API error: ${response.status} ${errorText}`);
      }

      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Vault API request failed', error as Error, {
        method,
        path,
        hasData: !!data
      });
      throw new SecretError(`Vault operation failed: ${(error as Error).message}`, {
        service: this.serviceName,
        operation: 'vault_request'
      });
    }
  }

  async read(key: string): Promise<SecretData | null> {
    try {
      console.log(`🔐 VaultProvider: Reading secret from path: ${this.mountPath}/data/${key}`);
      const response = await this.makeRequest('GET', `data/${key}`);
      
      if (!response || !response.data) {
        return null;
      }

      const vaultData = response.data.data;
      const vaultMetadata = response.data.metadata;
      console.log('🔐 VaultProvider: Response data:', vaultData);

      return {
        key,
        value: vaultData,
        metadata: {
          version: vaultMetadata.version || 1,
          createdAt: new Date(vaultMetadata.created_time),
          updatedAt: new Date(vaultMetadata.updated_time || vaultMetadata.created_time),
          tags: [],
          owner: 'vault',
          encrypted: false
        }
      };
    } catch (error) {
      this.logger.error(`Failed to read secret from Vault: ${key}`, error as Error);
      return null;
    }
  }

  async write(
    key: string,
    value: any,
    metadata?: Partial<SecretMetadata>
  ): Promise<void> {
    const data = {
      data: value,
      options: {
        cas: 0 // Check-and-Set version
      }
    };

    await this.makeRequest('POST', `data/${key}`, data);
    
    this.logger.info('Secret written to Vault', { key });
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.makeRequest('DELETE', `metadata/${key}`);
      this.logger.info('Secret deleted from Vault', { key });
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete secret from Vault: ${key}`, error as Error);
      return false;
    }
  }

  async list(prefix?: string): Promise<string[]> {
    try {
      const path = prefix ? `metadata/${prefix}` : 'metadata';
      const response = await this.makeRequest('LIST', path);
      
      return response?.data?.keys || [];
    } catch (error) {
      this.logger.error('Failed to list secrets from Vault', error as Error, { prefix });
      return [];
    }
  }

  async rotate(key: string): Promise<string> {
    // This would implement secret rotation logic
    // For now, generate a new random value
    const newValue = this.generateSecretValue();
    await this.write(key, { rotated_value: newValue });
    return newValue;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.makeRequest('GET', 'sys/health');
      return true;
    } catch (error) {
      return false;
    }
  }

  private generateSecretValue(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}

// File-based secret provider (for development)
export class FileSecretProvider implements SecretProvider {
  name = 'file';
  private logger;
  private secretsPath: string;
  private secrets = new Map<string, SecretData>();

  constructor(
    private config: SecretConfig,
    private serviceName: string
  ) {
    this.logger = createLogger(`${serviceName}-file-provider`);
    this.secretsPath = process.env.SECRETS_FILE || './secrets.json';
    this.loadSecrets();
  }

  private async loadSecrets(): Promise<void> {
    try {
      const fs = require('fs').promises;
      const data = await fs.readFile(this.secretsPath, 'utf8');
      const secretsData = JSON.parse(data);
      
      for (const [key, secretInfo] of Object.entries(secretsData)) {
        this.secrets.set(key, {
          key,
          value: (secretInfo as any).value,
          metadata: {
            version: 1,
            createdAt: new Date((secretInfo as any).createdAt || Date.now()),
            updatedAt: new Date((secretInfo as any).updatedAt || Date.now()),
            tags: (secretInfo as any).tags || [],
            owner: 'file',
            encrypted: false
          }
        });
      }
      
      this.logger.debug('Secrets loaded from file', {
        secretsCount: this.secrets.size,
        path: this.secretsPath
      });
    } catch (error) {
      // File doesn't exist or is invalid, start with empty secrets
      this.logger.debug('No secrets file found, starting with empty secrets');
    }
  }

  private async saveSecrets(): Promise<void> {
    try {
      const fs = require('fs').promises;
      const secretsData: Record<string, any> = {};
      
      for (const [key, secret] of this.secrets) {
        secretsData[key] = {
          value: secret.value,
          createdAt: secret.metadata.createdAt.toISOString(),
          updatedAt: secret.metadata.updatedAt.toISOString(),
          tags: secret.metadata.tags
        };
      }
      
      await fs.writeFile(this.secretsPath, JSON.stringify(secretsData, null, 2));
    } catch (error) {
      this.logger.error('Failed to save secrets to file', error as Error);
    }
  }

  async read(key: string): Promise<SecretData | null> {
    return this.secrets.get(key) || null;
  }

  async write(
    key: string,
    value: any,
    metadata?: Partial<SecretMetadata>
  ): Promise<void> {
    const secret: SecretData = {
      key,
      value,
      metadata: {
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: metadata?.tags || [],
        owner: metadata?.owner || 'file',
        encrypted: false,
        ...metadata
      }
    };

    this.secrets.set(key, secret);
    await this.saveSecrets();
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.secrets.delete(key);
    if (deleted) {
      await this.saveSecrets();
    }
    return deleted;
  }

  async list(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.secrets.keys());
    return prefix ? keys.filter(key => key.startsWith(prefix)) : keys;
  }

  async rotate(key: string): Promise<string> {
    const secret = this.secrets.get(key);
    if (!secret) {
      throw new Error(`Secret not found: ${key}`);
    }

    const newValue = this.generateSecretValue();
    await this.write(key, newValue, secret.metadata);
    return newValue;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  private generateSecretValue(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}

// Environment variable provider (fallback)
export class EnvironmentSecretProvider implements SecretProvider {
  name = 'environment';
  private logger;

  constructor(private serviceName: string) {
    this.logger = createLogger(`${serviceName}-env-provider`);
  }

  async read(key: string): Promise<SecretData | null> {
    const envKey = key.toUpperCase().replace(/[.-]/g, '_');
    const value = process.env[envKey];
    
    if (!value) {
      return null;
    }

    return {
      key,
      value,
      metadata: {
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['environment'],
        owner: 'env',
        encrypted: false
      }
    };
  }

  async write(key: string, value: any): Promise<void> {
    throw new Error('Environment provider is read-only');
  }

  async delete(key: string): Promise<boolean> {
    throw new Error('Environment provider is read-only');
  }

  async list(prefix?: string): Promise<string[]> {
    const envKeys = Object.keys(process.env);
    const secretKeys = envKeys.map(key => 
      key.toLowerCase().replace(/_/g, '.')
    );
    
    return prefix ? secretKeys.filter(key => key.startsWith(prefix)) : secretKeys;
  }

  async rotate(key: string): Promise<string> {
    throw new Error('Environment provider does not support rotation');
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

// Main secret manager
export class SecretManager {
  private logger;
  private tracing?: GuardAntTracing;
  private providers: SecretProvider[] = [];
  private cache = new Map<string, { data: SecretData; expiresAt: number }>();
  private accessLogs: SecretAccessLog[] = [];
  private rotationPolicies = new Map<string, SecretRotationPolicy>();
  private rotationTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private serviceName: string,
    private config: SecretConfig = {},
    tracing?: GuardAntTracing
  ) {
    this.logger = createLogger(`${serviceName}-secret-manager`);
    this.tracing = tracing;
    
    this.setupProviders();
    this.startRotationScheduler();
  }

  private setupProviders(): void {
    // Add Vault provider if configured
    if (this.config.vaultUrl && this.config.vaultToken) {
      this.providers.push(new VaultSecretProvider(this.config, this.serviceName));
    }

    // Add file provider for development
    if (process.env.NODE_ENV === 'development') {
      this.providers.push(new FileSecretProvider(this.config, this.serviceName));
    }

    // Always add environment provider as fallback
    this.providers.push(new EnvironmentSecretProvider(this.serviceName));

    this.logger.info('Secret providers initialized', {
      providersCount: this.providers.length,
      providers: this.providers.map(p => p.name)
    });
  }

  async getSecret(key: string, user: string = 'system'): Promise<string | null> {
    const startTime = Date.now();

    try {
      // Check cache first
      if (this.config.enableCache !== false) {
        const cached = this.cache.get(key);
        if (cached && Date.now() < cached.expiresAt) {
          this.logAccess(key, SecretAction.READ, user, true, 'cache');
          return this.extractValue(cached.data.value);
        }
      }

      // Try each provider
      for (const provider of this.providers) {
        try {
          const secret = await provider.read(key);
          if (secret) {
            // Cache the secret
            if (this.config.enableCache !== false) {
              const cacheTimeout = this.config.cacheTimeout || 300000; // 5 minutes
              this.cache.set(key, {
                data: secret,
                expiresAt: Date.now() + cacheTimeout
              });
            }

            this.logAccess(key, SecretAction.READ, user, true, provider.name);
            
            const duration = Date.now() - startTime;
            this.logger.debug('Secret retrieved successfully', {
              key,
              provider: provider.name,
              duration,
              fromCache: false
            });

            if (this.tracing) {
              this.tracing.addEvent('secret_retrieved', {
                'secret.key': key,
                'secret.provider': provider.name,
                'secret.duration_ms': duration.toString(),
                'secret.from_cache': 'false'
              });
            }

            return this.extractValue(secret.value);
          }
        } catch (error) {
          this.logger.warn(`Provider ${provider.name} failed to read secret ${key}`, error as Error);
        }
      }

      this.logAccess(key, SecretAction.READ, user, false);
      return null;

    } catch (error) {
      this.logger.error(`Failed to get secret: ${key}`, error as Error);
      this.logAccess(key, SecretAction.READ, user, false);
      return null;
    }
  }

  async setSecret(
    key: string,
    value: string | Record<string, any>,
    user: string = 'system',
    metadata?: Partial<SecretMetadata>
  ): Promise<boolean> {
    try {
      // Use the first writable provider
      const writableProvider = this.providers.find(p => p.name !== 'environment');
      
      if (!writableProvider) {
        throw new Error('No writable secret provider available');
      }

      // Encrypt if enabled
      let processedValue = value;
      if (this.config.enableEncryption && this.config.encryptionKey) {
        processedValue = this.encrypt(value);
        metadata = { ...metadata, encrypted: true };
      }

      await writableProvider.write(key, processedValue, {
        ...metadata,
        owner: user,
        updatedAt: new Date()
      });

      // Invalidate cache
      this.cache.delete(key);

      this.logAccess(key, SecretAction.WRITE, user, true, writableProvider.name);
      
      this.logger.info('Secret stored successfully', {
        key,
        provider: writableProvider.name,
        encrypted: !!metadata?.encrypted
      });

      if (this.tracing) {
        this.tracing.addEvent('secret_stored', {
          'secret.key': key,
          'secret.provider': writableProvider.name,
          'secret.encrypted': (!!metadata?.encrypted).toString()
        });
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to set secret: ${key}`, error as Error);
      this.logAccess(key, SecretAction.WRITE, user, false);
      return false;
    }
  }

  async deleteSecret(key: string, user: string = 'system'): Promise<boolean> {
    try {
      let deleted = false;

      // Delete from all providers
      for (const provider of this.providers) {
        if (provider.name !== 'environment') {
          try {
            const result = await provider.delete(key);
            deleted = deleted || result;
          } catch (error) {
            this.logger.warn(`Provider ${provider.name} failed to delete secret ${key}`, error as Error);
          }
        }
      }

      // Remove from cache
      this.cache.delete(key);

      // Cancel rotation timer
      const timer = this.rotationTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.rotationTimers.delete(key);
      }

      this.logAccess(key, SecretAction.DELETE, user, deleted);
      
      if (deleted) {
        this.logger.info('Secret deleted successfully', { key });
      }

      return deleted;
    } catch (error) {
      this.logger.error(`Failed to delete secret: ${key}`, error as Error);
      this.logAccess(key, SecretAction.DELETE, user, false);
      return false;
    }
  }

  async rotateSecret(key: string, user: string = 'system'): Promise<string | null> {
    try {
      const writableProvider = this.providers.find(p => p.name !== 'environment');
      
      if (!writableProvider) {
        throw new Error('No writable secret provider available for rotation');
      }

      const newValue = await writableProvider.rotate(key);
      
      // Invalidate cache
      this.cache.delete(key);

      this.logAccess(key, SecretAction.ROTATE, user, true, writableProvider.name);
      
      this.logger.info('Secret rotated successfully', {
        key,
        provider: writableProvider.name
      });

      if (this.tracing) {
        this.tracing.addEvent('secret_rotated', {
          'secret.key': key,
          'secret.provider': writableProvider.name
        });
      }

      return newValue;
    } catch (error) {
      this.logger.error(`Failed to rotate secret: ${key}`, error as Error);
      this.logAccess(key, SecretAction.ROTATE, user, false);
      return null;
    }
  }

  setRotationPolicy(key: string, policy: SecretRotationPolicy): void {
    this.rotationPolicies.set(key, policy);
    
    if (policy.enabled && policy.strategy === RotationStrategy.SCHEDULED) {
      this.scheduleRotation(key, policy);
    }

    this.logger.info('Rotation policy set', {
      key,
      strategy: policy.strategy,
      interval: policy.interval,
      enabled: policy.enabled
    });
  }

  private scheduleRotation(key: string, policy: SecretRotationPolicy): void {
    // Cancel existing timer
    const existingTimer = this.rotationTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new rotation
    const timer = setTimeout(async () => {
      await this.rotateSecret(key, 'automatic');
      
      // Reschedule if still enabled
      const currentPolicy = this.rotationPolicies.get(key);
      if (currentPolicy?.enabled && currentPolicy.strategy === RotationStrategy.SCHEDULED) {
        this.scheduleRotation(key, currentPolicy);
      }
    }, policy.interval);

    this.rotationTimers.set(key, timer);
  }

  private startRotationScheduler(): void {
    // Check for secrets that need rotation every hour
    setInterval(async () => {
      await this.checkRotationNeeded();
    }, 3600000); // 1 hour
  }

  private async checkRotationNeeded(): Promise<void> {
    for (const [key, policy] of this.rotationPolicies) {
      if (!policy.enabled) continue;

      try {
        // This would check secret age and rotate if needed
        // Implementation depends on specific rotation logic
      } catch (error) {
        this.logger.warn(`Failed to check rotation for secret: ${key}`, error as Error);
      }
    }
  }

  private extractValue(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    
    if (value && typeof value === 'object') {
      // If object has multiple keys, return the whole object as JSON
      const keys = Object.keys(value);
      if (keys.length > 1) {
        return JSON.stringify(value);
      }
      
      // Try common secret value keys for single values
      return value.value || value.secret || value.password || JSON.stringify(value);
    }
    
    return String(value);
  }

  private encrypt(value: any): string {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, this.config.encryptionKey);
    
    let encrypted = cipher.update(JSON.stringify(value), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    });
  }

  private decrypt(encryptedValue: string): any {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const { encrypted, iv, authTag } = JSON.parse(encryptedValue);
    
    const decipher = crypto.createDecipher(algorithm, this.config.encryptionKey);
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  private logAccess(
    secretKey: string,
    action: SecretAction,
    user: string,
    success: boolean,
    provider?: string
  ): void {
    const logEntry: SecretAccessLog = {
      secretKey,
      action,
      user,
      service: this.serviceName,
      timestamp: new Date(),
      success,
      metadata: provider ? { provider } : undefined
    };

    this.accessLogs.push(logEntry);

    // Keep only recent logs (last 1000)
    if (this.accessLogs.length > 1000) {
      this.accessLogs.shift();
    }

    this.logger.debug('Secret access logged', {
      key: secretKey,
      action,
      user,
      success,
      provider
    });
  }

  getAccessLogs(key?: string, limit: number = 100): SecretAccessLog[] {
    let logs = key 
      ? this.accessLogs.filter(log => log.secretKey === key)
      : this.accessLogs;

    return logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getHealthStatus(): Promise<{ healthy: boolean; details: any }> {
    const providerHealth = await Promise.all(
      this.providers.map(async provider => ({
        name: provider.name,
        healthy: await provider.healthCheck().catch(() => false)
      }))
    );

    const healthyProviders = providerHealth.filter(p => p.healthy).length;
    const totalProviders = providerHealth.length;
    
    return {
      healthy: healthyProviders > 0,
      details: {
        providersTotal: totalProviders,
        providersHealthy: healthyProviders,
        providers: providerHealth,
        cacheSize: this.cache.size,
        rotationPolicies: this.rotationPolicies.size,
        accessLogsCount: this.accessLogs.length,
        encryptionEnabled: !!this.config.encryptionKey
      }
    };
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down secret manager');

    // Cancel all rotation timers
    for (const timer of this.rotationTimers.values()) {
      clearTimeout(timer);
    }
    this.rotationTimers.clear();

    // Clear cache
    this.cache.clear();

    this.logger.info('Secret manager shutdown completed');
  }
}

// Factory function
export function createSecretManager(
  serviceName: string,
  config: SecretConfig = {},
  tracing?: GuardAntTracing
): SecretManager {
  return new SecretManager(serviceName, config, tracing);
}

// Utility functions for common secrets
export async function getDatabaseUrl(secretManager: SecretManager): Promise<string | null> {
  const host = await secretManager.getSecret('database.host');
  const port = await secretManager.getSecret('database.port');
  const name = await secretManager.getSecret('database.name');
  const username = await secretManager.getSecret('database.username');
  const password = await secretManager.getSecret('database.password');

  if (host && port && name && username && password) {
    return `postgresql://${username}:${password}@${host}:${port}/${name}`;
  }

  return null;
}

export async function getRedisUrl(secretManager: SecretManager): Promise<string | null> {
  const host = await secretManager.getSecret('redis.host');
  const port = await secretManager.getSecret('redis.port');
  const password = await secretManager.getSecret('redis.password');

  if (host && port) {
    const auth = password ? `:${password}@` : '';
    return `redis://${auth}${host}:${port}`;
  }

  return null;
}

// All enums are already exported above