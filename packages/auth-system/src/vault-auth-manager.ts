import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { AuthManager } from './auth-manager';
import type { AuthConfig, AuthStorage, AuthResponse, NestUser, UserRole } from './types';

interface VaultClient {
  read(path: string): Promise<any>;
  write(path: string, data: any): Promise<void>;
  delete(path: string): Promise<void>;
}

export class VaultAuthManager extends AuthManager {
  private vaultClient: VaultClient;
  private vaultBasePath: string;

  constructor(
    storage: AuthStorage,
    config: AuthConfig,
    vaultClient: VaultClient,
    vaultBasePath: string = 'secret/users/passwords'
  ) {
    super(config, storage);
    this.vaultClient = vaultClient;
    this.vaultBasePath = vaultBasePath;
  }

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
        return { success: false, error: 'User already exists' };
      }

      // Validate password
      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.error };
      }

      // Create user ID
      const userId = uuidv4();
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Store password in Vault
      await this.storePasswordInVault(userId, hashedPassword);

      // Create user (without password)
      const user: NestUser = {
        id: userId,
        nestId,
        email,
        name,
        role,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: true,
        emailVerified: false,
        passwordInVault: true, // Flag to indicate password is in Vault
      };

      // Store user in regular storage
      await this.storage.createUser(user);

      // Create session
      const sessionResult = await this.createSession(user, { userAgent: 'System', ip: '127.0.0.1' });

      if (!sessionResult.success) {
        return { success: false, error: 'Failed to create session' };
      }

      return {
        success: true,
        user,
        tokens: sessionResult.tokens!,
        session: sessionResult.session!,
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Internal server error' };
    }
  }

  async login(
    email: string,
    password: string,
    deviceInfo: { userAgent: string; ip: string }
  ): Promise<AuthResponse> {
    try {
      // Get user
      const user = await this.storage.getUserByEmail(email);
      if (!user || !user.isActive) {
        await this.storage.createAuthAttempt({
          userId: user?.id || 'unknown',
          email,
          ip: deviceInfo.ip,
          userAgent: deviceInfo.userAgent,
          timestamp: Date.now(),
          success: false,
          failureReason: 'Invalid credentials',
        });
        return { success: false, error: 'Invalid credentials' };
      }

      // Check rate limiting
      const recentAttempts = await this.storage.getAuthAttempts(
        email,
        Date.now() - this.config.rateLimiting.loginAttempts.windowMs
      );

      const failedAttempts = recentAttempts.filter(a => !a.success);
      if (failedAttempts.length >= this.config.rateLimiting.loginAttempts.maxAttempts) {
        await this.storage.createAuthAttempt({
          userId: user?.id || 'unknown',
          email,
          ip: deviceInfo.ip,
          userAgent: deviceInfo.userAgent,
          timestamp: Date.now(),
          success: false,
          failureReason: 'Invalid credentials',
        });
        return {
          success: false,
          error: 'Too many failed attempts. Please try again later.',
          isAccountLocked: true,
          lockoutExpiresAt: Date.now() + this.config.security.lockoutDuration * 1000,
        };
      }

      // Verify password from Vault
      const isValidPassword = await this.verifyPasswordFromVault(user.id, password);
      if (!isValidPassword) {
        await this.storage.createAuthAttempt({
          userId: user?.id || 'unknown',
          email,
          ip: deviceInfo.ip,
          userAgent: deviceInfo.userAgent,
          timestamp: Date.now(),
          success: false,
          failureReason: 'Invalid credentials',
        });
        return { success: false, error: 'Invalid credentials' };
      }

      // Record successful login attempt
      await this.storage.createAuthAttempt({
        userId: user.id,
        email,
        ip: deviceInfo.ip,
        userAgent: deviceInfo.userAgent,
        timestamp: Date.now(),
        success: true,
      });

      // Check for 2FA
      if (user.twoFactorEnabled) {
        return {
          success: false,
          error: 'Two-factor authentication required',
          requiresTwoFactor: true,
        };
      }

      // Create session
      const sessionResult = await this.createSession(user, deviceInfo);

      if (!sessionResult.success) {
        return { success: false, error: 'Failed to create session' };
      }

      return {
        success: true,
        user,
        tokens: sessionResult.tokens!,
        session: sessionResult.session!,
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Internal server error' };
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<AuthResponse> {
    try {
      const user = await this.storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify current password from Vault
      const isValidPassword = await this.verifyPasswordFromVault(userId, currentPassword);
      if (!isValidPassword) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Validate new password
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.error };
      }

      // Check password history in Vault
      const isReused = await this.checkPasswordHistory(userId, newPassword);
      if (isReused) {
        return { success: false, error: 'Password has been used recently' };
      }

      // Hash and update password in Vault
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.updatePasswordInVault(userId, hashedPassword);

      // Update user timestamp
      user.updatedAt = Date.now();
      await this.storage.updateUser(user);

      return { success: true, user };
    } catch (error: any) {
      return { success: false, error: error.message || 'Internal server error' };
    }
  }

  // Vault-specific methods
  private async storePasswordInVault(userId: string, hashedPassword: string): Promise<void> {
    const path = `${this.vaultBasePath}/${userId}`;
    await this.vaultClient.write(path, {
      password_hash: hashedPassword,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      history: [],
    });
  }

  private async verifyPasswordFromVault(userId: string, plainPassword: string): Promise<boolean> {
    try {
      const path = `${this.vaultBasePath}/${userId}`;
      const data = await this.vaultClient.read(path);
      
      if (!data || !data.password_hash) {
        return false;
      }

      return bcrypt.compare(plainPassword, data.password_hash);
    } catch (error) {
      console.error('Error verifying password from Vault:', error);
      return false;
    }
  }

  private async updatePasswordInVault(userId: string, newHashedPassword: string): Promise<void> {
    const path = `${this.vaultBasePath}/${userId}`;
    
    // Get existing data
    const existing = await this.vaultClient.read(path);
    
    // Update with history
    await this.vaultClient.write(path, {
      password_hash: newHashedPassword,
      created_at: existing?.created_at || new Date().toISOString(),
      last_updated: new Date().toISOString(),
      previous_hash: existing?.password_hash,
      history: [
        ...(existing?.history || []),
        {
          changed_at: new Date().toISOString(),
          hash_prefix: existing?.password_hash?.substring(0, 10) + '...',
        }
      ].slice(-5), // Keep last 5 changes
    });
  }

  private async checkPasswordHistory(userId: string, newPassword: string): Promise<boolean> {
    try {
      const path = `${this.vaultBasePath}/${userId}`;
      const data = await this.vaultClient.read(path);
      
      if (!data || !data.history) {
        return false;
      }

      // Check against previous password
      if (data.previous_hash) {
        const matchesPrevious = await bcrypt.compare(newPassword, data.previous_hash);
        if (matchesPrevious) return true;
      }

      // We can't check full history without storing plain hashes
      // This is a security trade-off
      return false;
    } catch (error) {
      console.error('Error checking password history:', error);
      return false;
    }
  }

  async deleteUser(userId: string): Promise<AuthResponse> {
    try {
      // Delete from Vault
      const path = `${this.vaultBasePath}/${userId}`;
      await this.vaultClient.delete(path);

      // Delete from regular storage
      return super.deleteUser(userId);
    } catch (error: any) {
      return { success: false, error: error.message || 'Internal server error' };
    }
  }
}