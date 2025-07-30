/**
 * Multi-Factor Authentication (MFA) implementation for GuardAnt
 * Supports TOTP (Time-based One-Time Password) and backup codes
 */
import type { Redis } from 'ioredis';
export interface MFAConfig {
    issuer: string;
    window: number;
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
export declare class MFAManager {
    private serviceName;
    private redis;
    private logger;
    private config;
    constructor(serviceName: string, redis: Redis, config?: Partial<MFAConfig>);
    /**
     * Generate MFA secret and setup for a user
     */
    setupMFA(userId: string, userEmail: string): Promise<MFASetupResult>;
    /**
     * Enable MFA after successful verification
     */
    enableMFA(userId: string, token: string): Promise<boolean>;
    /**
     * Disable MFA for a user
     */
    disableMFA(userId: string): Promise<boolean>;
    /**
     * Verify MFA token or backup code
     */
    verifyMFA(userId: string, code: string): Promise<MFAVerificationResult>;
    /**
     * Check if user has MFA enabled
     */
    isMFAEnabled(userId: string): Promise<boolean>;
    /**
     * Generate new backup codes
     */
    regenerateBackupCodes(userId: string): Promise<string[]>;
    /**
     * Get MFA data for a user
     */
    private getMFAData;
    /**
     * Verify TOTP token
     */
    private verifyToken;
    /**
     * Generate backup codes
     */
    private generateBackupCodes;
    /**
     * Generate random alphanumeric code
     */
    private generateRandomCode;
    /**
     * Get MFA statistics
     */
    getMFAStats(): Promise<{
        totalUsers: number;
        enabledUsers: number;
        setupInProgress: number;
    }>;
}
/**
 * Express/Hono middleware to enforce MFA
 */
export declare function createMFAMiddleware(mfaManager: MFAManager): (c: any, next: any) => Promise<any>;
export declare function createMFAManager(serviceName: string, redis: Redis, config?: Partial<MFAConfig>): MFAManager;
//# sourceMappingURL=mfa.d.ts.map