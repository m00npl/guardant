"use strict";
/**
 * Multi-Factor Authentication (MFA) implementation for GuardAnt
 * Supports TOTP (Time-based One-Time Password) and backup codes
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MFAManager = void 0;
exports.createMFAMiddleware = createMFAMiddleware;
exports.createMFAManager = createMFAManager;
const speakeasy = __importStar(require("speakeasy"));
const qrcode = __importStar(require("qrcode"));
const logger_1 = require("./logger");
const error_handling_1 = require("./error-handling");
class MFAManager {
    constructor(serviceName, redis, config) {
        this.serviceName = serviceName;
        this.redis = redis;
        this.logger = (0, logger_1.createLogger)(`${serviceName}-mfa`);
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
    async setupMFA(userId, userEmail) {
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
            const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
            // Store in Redis (not enabled yet)
            const mfaData = {
                userId,
                secret: secret.base32,
                backupCodes,
                enabled: false,
                createdAt: Date.now(),
            };
            await this.redis.set(`mfa:${userId}`, JSON.stringify(mfaData), 'EX', 86400 * 30 // 30 days
            );
            this.logger.info('MFA setup initiated', { userId });
            return {
                secret: secret.base32,
                qrCode: qrCodeUrl,
                backupCodes,
            };
        }
        catch (error) {
            this.logger.error('Failed to setup MFA', error, { userId });
            throw new error_handling_1.AuthenticationError({
                service: this.serviceName,
                operation: 'mfa_setup',
                metadata: { userId }
            }, 'Failed to setup MFA');
        }
    }
    /**
     * Enable MFA after successful verification
     */
    async enableMFA(userId, token) {
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
            await this.redis.set(`mfa:${userId}`, JSON.stringify(mfaData));
            this.logger.info('MFA enabled', { userId });
            return true;
        }
        catch (error) {
            this.logger.error('Failed to enable MFA', error, { userId });
            return false;
        }
    }
    /**
     * Disable MFA for a user
     */
    async disableMFA(userId) {
        try {
            await this.redis.del(`mfa:${userId}`);
            this.logger.info('MFA disabled', { userId });
            return true;
        }
        catch (error) {
            this.logger.error('Failed to disable MFA', error, { userId });
            return false;
        }
    }
    /**
     * Verify MFA token or backup code
     */
    async verifyMFA(userId, code) {
        try {
            const mfaData = await this.getMFAData(userId);
            if (!mfaData || !mfaData.enabled) {
                return { success: false };
            }
            // Try TOTP token first
            if (code.length === 6 && this.verifyToken(mfaData.secret, code)) {
                mfaData.lastUsedAt = Date.now();
                await this.redis.set(`mfa:${userId}`, JSON.stringify(mfaData));
                this.logger.info('MFA verified with TOTP', { userId });
                return { success: true, backupCodeUsed: false };
            }
            // Try backup codes
            const backupCodeIndex = mfaData.backupCodes.indexOf(code);
            if (backupCodeIndex !== -1) {
                // Remove used backup code
                mfaData.backupCodes.splice(backupCodeIndex, 1);
                mfaData.lastUsedAt = Date.now();
                await this.redis.set(`mfa:${userId}`, JSON.stringify(mfaData));
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
        }
        catch (error) {
            this.logger.error('Failed to verify MFA', error, { userId });
            return { success: false };
        }
    }
    /**
     * Check if user has MFA enabled
     */
    async isMFAEnabled(userId) {
        try {
            const mfaData = await this.getMFAData(userId);
            return mfaData?.enabled || false;
        }
        catch (error) {
            this.logger.error('Failed to check MFA status', error, { userId });
            return false;
        }
    }
    /**
     * Generate new backup codes
     */
    async regenerateBackupCodes(userId) {
        try {
            const mfaData = await this.getMFAData(userId);
            if (!mfaData) {
                throw new Error('MFA not setup for user');
            }
            const newBackupCodes = this.generateBackupCodes();
            mfaData.backupCodes = newBackupCodes;
            await this.redis.set(`mfa:${userId}`, JSON.stringify(mfaData));
            this.logger.info('Backup codes regenerated', { userId });
            return newBackupCodes;
        }
        catch (error) {
            this.logger.error('Failed to regenerate backup codes', error, { userId });
            throw new error_handling_1.AuthenticationError({
                service: this.serviceName,
                operation: 'regenerate_backup_codes',
                metadata: { userId }
            }, 'Failed to regenerate backup codes');
        }
    }
    /**
     * Get MFA data for a user
     */
    async getMFAData(userId) {
        const data = await this.redis.get(`mfa:${userId}`);
        return data ? JSON.parse(data) : null;
    }
    /**
     * Verify TOTP token
     */
    verifyToken(secret, token) {
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
    generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < this.config.backupCodeCount; i++) {
            const code = this.generateRandomCode(this.config.backupCodeLength);
            codes.push(code);
        }
        return codes;
    }
    /**
     * Generate random alphanumeric code
     */
    generateRandomCode(length) {
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
    async getMFAStats() {
        try {
            const keys = await this.redis.keys('mfa:*');
            let enabledCount = 0;
            let setupCount = 0;
            for (const key of keys) {
                const data = await this.redis.get(key);
                if (data) {
                    const mfaData = JSON.parse(data);
                    if (mfaData.enabled) {
                        enabledCount++;
                    }
                    else {
                        setupCount++;
                    }
                }
            }
            return {
                totalUsers: keys.length,
                enabledUsers: enabledCount,
                setupInProgress: setupCount,
            };
        }
        catch (error) {
            this.logger.error('Failed to get MFA stats', error);
            return {
                totalUsers: 0,
                enabledUsers: 0,
                setupInProgress: 0,
            };
        }
    }
}
exports.MFAManager = MFAManager;
/**
 * Express/Hono middleware to enforce MFA
 */
function createMFAMiddleware(mfaManager) {
    return async (c, next) => {
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
function createMFAManager(serviceName, redis, config) {
    return new MFAManager(serviceName, redis, config);
}
//# sourceMappingURL=mfa.js.map