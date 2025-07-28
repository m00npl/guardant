/**
 * Multi-Factor Authentication (MFA) implementation for GuardAnt
 * Supports TOTP (Time-based One-Time Password) and backup codes
 */

import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { createLogger } from './logger';
import { AuthenticationError } from './error-handling';
import type { Redis } from 'ioredis';

export interface MFAConfig {
  issuer: string;
  window: number; // Time window for TOTP validation
  backupCodeCount: number;
  backupCodeLength: number;
}

export interface MFASecret {
  userId: string;
  secret: string;
  backupCodes: string[];
  enabled: boolean;
  createdAt: number;
  lastUsedAt?: number;
}

export interface MFASetupResult {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface MFAVerificationResult {
  success: boolean;
  backupCodeUsed?: boolean;
  remainingBackupCodes?: number;
}

export class MFAManager {
  private logger;
  private config: MFAConfig;
  
  constructor(
    private serviceName: string,
    private redis: Redis,
    config?: Partial<MFAConfig>
  ) {
    this.logger = createLogger(`${serviceName}-mfa`);
    this.config = {
      issuer: config?.issuer || 'GuardAnt',
      window: config?.window || 2, // Allow 2 time windows (60 seconds)
      backupCodeCount: config?.backupCodeCount || 10,
      backupCodeLength: config?.backupCodeLength || 8,
    };
  }

  /**
   * Generate MFA secret and setup for a user
   */
  async setupMFA(userId: string, userEmail: string): Promise<MFASetupResult> {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${this.config.issuer} (${userEmail})`,
        issuer: this.config.issuer,
        length: 32,
      });

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Generate QR code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

      // Store in Redis (not enabled yet)
      const mfaData: MFASecret = {
        userId,
        secret: secret.base32,
        backupCodes,
        enabled: false,
        createdAt: Date.now(),
      };

      await this.redis.set(
        `mfa:${userId}`,
        JSON.stringify(mfaData),
        'EX',
        86400 * 30 // 30 days
      );

      this.logger.info('MFA setup initiated', { userId });

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes,
      };
    } catch (error) {
      this.logger.error('Failed to setup MFA', error as Error, { userId });
      throw new AuthenticationError({
        service: this.serviceName,
        operation: 'mfa_setup',
        metadata: { userId }
      }, 'Failed to setup MFA');
    }
  }

  /**
   * Enable MFA after successful verification
   */
  async enableMFA(userId: string, token: string): Promise<boolean> {
    try {
      const mfaData = await this.getMFAData(userId);
      if (!mfaData) {
        throw new Error('MFA not setup for user');
      }

      // Verify token
      const isValid = this.verifyToken(mfaData.secret, token);
      if (!isValid) {
        return false;
      }

      // Enable MFA
      mfaData.enabled = true;
      await this.redis.set(
        `mfa:${userId}`,
        JSON.stringify(mfaData)
      );

      this.logger.info('MFA enabled', { userId });
      return true;
    } catch (error) {
      this.logger.error('Failed to enable MFA', error as Error, { userId });
      return false;
    }
  }

  /**
   * Disable MFA for a user
   */
  async disableMFA(userId: string): Promise<boolean> {
    try {
      await this.redis.del(`mfa:${userId}`);
      this.logger.info('MFA disabled', { userId });
      return true;
    } catch (error) {
      this.logger.error('Failed to disable MFA', error as Error, { userId });
      return false;
    }
  }

  /**
   * Verify MFA token or backup code
   */
  async verifyMFA(userId: string, code: string): Promise<MFAVerificationResult> {
    try {
      const mfaData = await this.getMFAData(userId);
      if (!mfaData || !mfaData.enabled) {
        return { success: false };
      }

      // Try TOTP token first
      if (code.length === 6 && this.verifyToken(mfaData.secret, code)) {
        mfaData.lastUsedAt = Date.now();
        await this.redis.set(
          `mfa:${userId}`,
          JSON.stringify(mfaData)
        );
        
        this.logger.info('MFA verified with TOTP', { userId });
        return { success: true, backupCodeUsed: false };
      }

      // Try backup codes
      const backupCodeIndex = mfaData.backupCodes.indexOf(code);
      if (backupCodeIndex !== -1) {
        // Remove used backup code
        mfaData.backupCodes.splice(backupCodeIndex, 1);
        mfaData.lastUsedAt = Date.now();
        
        await this.redis.set(
          `mfa:${userId}`,
          JSON.stringify(mfaData)
        );

        this.logger.info('MFA verified with backup code', { 
          userId, 
          remainingCodes: mfaData.backupCodes.length 
        });

        return {
          success: true,
          backupCodeUsed: true,
          remainingBackupCodes: mfaData.backupCodes.length,
        };
      }

      this.logger.warn('MFA verification failed', { userId });
      return { success: false };
    } catch (error) {
      this.logger.error('Failed to verify MFA', error as Error, { userId });
      return { success: false };
    }
  }

  /**
   * Check if user has MFA enabled
   */
  async isMFAEnabled(userId: string): Promise<boolean> {
    try {
      const mfaData = await this.getMFAData(userId);
      return mfaData?.enabled || false;
    } catch (error) {
      this.logger.error('Failed to check MFA status', error as Error, { userId });
      return false;
    }
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      const mfaData = await this.getMFAData(userId);
      if (!mfaData) {
        throw new Error('MFA not setup for user');
      }

      const newBackupCodes = this.generateBackupCodes();
      mfaData.backupCodes = newBackupCodes;

      await this.redis.set(
        `mfa:${userId}`,
        JSON.stringify(mfaData)
      );

      this.logger.info('Backup codes regenerated', { userId });
      return newBackupCodes;
    } catch (error) {
      this.logger.error('Failed to regenerate backup codes', error as Error, { userId });
      throw new AuthenticationError({
        service: this.serviceName,
        operation: 'regenerate_backup_codes',
        metadata: { userId }
      }, 'Failed to regenerate backup codes');
    }
  }

  /**
   * Get MFA data for a user
   */
  private async getMFAData(userId: string): Promise<MFASecret | null> {
    const data = await this.redis.get(`mfa:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Verify TOTP token
   */
  private verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: this.config.window,
    });
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.config.backupCodeCount; i++) {
      const code = this.generateRandomCode(this.config.backupCodeLength);
      codes.push(code);
    }
    return codes;
  }

  /**
   * Generate random alphanumeric code
   */
  private generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    const crypto = require('crypto');
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      code += chars[randomIndex];
    }
    
    // Format as XXXX-XXXX for 8 character codes
    if (length === 8) {
      return `${code.slice(0, 4)}-${code.slice(4)}`;
    }
    
    return code;
  }

  /**
   * Get MFA statistics
   */
  async getMFAStats(): Promise<{
    totalUsers: number;
    enabledUsers: number;
    setupInProgress: number;
  }> {
    try {
      const keys = await this.redis.keys('mfa:*');
      let enabledCount = 0;
      let setupCount = 0;

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const mfaData: MFASecret = JSON.parse(data);
          if (mfaData.enabled) {
            enabledCount++;
          } else {
            setupCount++;
          }
        }
      }

      return {
        totalUsers: keys.length,
        enabledUsers: enabledCount,
        setupInProgress: setupCount,
      };
    } catch (error) {
      this.logger.error('Failed to get MFA stats', error as Error);
      return {
        totalUsers: 0,
        enabledUsers: 0,
        setupInProgress: 0,
      };
    }
  }
}

/**
 * Express/Hono middleware to enforce MFA
 */
export function createMFAMiddleware(mfaManager: MFAManager) {
  return async (c: any, next: any) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if MFA is required but not completed
    const mfaRequired = await mfaManager.isMFAEnabled(user.id);
    const mfaCompleted = c.get('mfaCompleted') || false;

    if (mfaRequired && !mfaCompleted) {
      return c.json({
        error: 'MFA required',
        requiresMFA: true,
      }, 403);
    }

    return next();
  };
}

// Export factory function
export function createMFAManager(
  serviceName: string,
  redis: Redis,
  config?: Partial<MFAConfig>
): MFAManager {
  return new MFAManager(serviceName, redis, config);
}