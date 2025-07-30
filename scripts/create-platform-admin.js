#!/usr/bin/env bun
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Script to create platform admin user
const index_1 = require("../packages/auth-system/src/index");
const ioredis_1 = __importDefault(require("ioredis"));
const PLATFORM_ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@guardant.me';
const PLATFORM_ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'changeThisPassword123!';
const PLATFORM_ADMIN_NAME = process.env.PLATFORM_ADMIN_NAME || 'Platform Administrator';
async function createPlatformAdmin() {
    console.log('🔧 Creating platform admin user...');
    // Connect to Redis
    const redis = new ioredis_1.default({
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    });
    // Initialize auth storage
    const authStorage = new index_1.RedisAuthStorage(redis);
    // Initialize auth manager
    const authManager = new index_1.AuthManager(authStorage, {
        jwt: {
            accessTokenSecret: process.env.JWT_SECRET || 'your-secret-key-here',
            refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-here',
            accessTokenTtl: 3600,
            refreshTokenTtl: 86400 * 7,
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
            lockoutDuration: 900,
            sessionTimeout: 3600,
            maxActiveSessions: 5,
        },
        rateLimiting: {
            loginAttempts: {
                windowMs: 900000,
                maxAttempts: 5,
            },
            apiRequests: {
                windowMs: 60000,
                maxRequests: 100,
            },
        },
    });
    try {
        // Check if platform admin already exists
        const existingUser = await authStorage.getUserByEmail(PLATFORM_ADMIN_EMAIL);
        if (existingUser) {
            console.log('⚠️  Platform admin already exists');
            // Update to platform_admin role if needed
            if (existingUser.role !== 'platform_admin') {
                existingUser.role = 'platform_admin';
                await authStorage.updateUser(existingUser);
                console.log('✅ Updated existing user to platform_admin role');
            }
            process.exit(0);
        }
        // Create special nest for platform admin
        const platformNestId = 'platform-admin-nest';
        const platformNest = {
            id: platformNestId,
            name: 'Platform Administration',
            subdomain: 'platform',
            description: 'Platform administration nest',
            logoUrl: null,
            faviconUrl: null,
            customDomain: null,
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            subscription: {
                tier: 'unlimited',
                servicesLimit: 999999,
                validUntil: Date.now() + (365 * 24 * 60 * 60 * 1000 * 10), // 10 years
            },
            settings: {
                branding: {
                    primaryColor: '#FF0000',
                    logo: null,
                    favicon: null,
                },
                notifications: {
                    email: true,
                    webhook: null,
                    slack: null,
                },
                monitoring: {
                    checkInterval: 30,
                    timeout: 5000,
                    retries: 3,
                },
                features: {
                    customDomain: true,
                    advancedMonitoring: true,
                    apiAccess: true,
                    whiteLabel: true,
                },
            },
        };
        // Store platform nest in Redis
        await redis.hset('nests', platformNestId, JSON.stringify(platformNest));
        // Create platform admin user
        const result = await authManager.createUser(platformNestId, PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD, PLATFORM_ADMIN_NAME, 'platform_admin');
        if (result.success) {
            console.log('✅ Platform admin created successfully!');
            console.log('📧 Email:', PLATFORM_ADMIN_EMAIL);
            console.log('🔑 Password:', PLATFORM_ADMIN_PASSWORD);
            console.log('⚠️  Please change the password after first login!');
        }
        else {
            console.error('❌ Failed to create platform admin:', result.error);
            process.exit(1);
        }
    }
    catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
    finally {
        await redis.disconnect();
    }
}
// Run the script
createPlatformAdmin();
//# sourceMappingURL=create-platform-admin.js.map