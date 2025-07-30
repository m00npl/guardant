#!/usr/bin/env bun

// Script to create platform admin user
import { setupAuthManager } from '../services/api-admin/src/auth-setup';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const PLATFORM_ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@guardant.me';
const PLATFORM_ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'changeThisPassword123!';
const PLATFORM_ADMIN_NAME = process.env.PLATFORM_ADMIN_NAME || 'Platform Administrator';

async function createPlatformAdmin() {
  console.log('🔧 Creating platform admin user...');
  
  // Connect to Redis
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  });
  
  // Initialize auth manager using the same setup as api-admin
  const authManager = setupAuthManager(redis);
  
  try {
    // Create platform nest ID
    const platformNestId = 'platform-admin-nest';
    
    // Create platform admin user
    const result = await authManager.createUser(
      PLATFORM_ADMIN_EMAIL,
      PLATFORM_ADMIN_PASSWORD,
      platformNestId,
      PLATFORM_ADMIN_NAME,
      'platform_admin'
    );
    
    if (result.success) {
      console.log('✅ Platform admin created successfully!');
      console.log('📧 Email:', PLATFORM_ADMIN_EMAIL);
      console.log('🔑 Password:', PLATFORM_ADMIN_PASSWORD);
      console.log('🏢 Nest ID:', platformNestId);
      console.log('🆔 User ID:', result.user?.id);
      
      if (process.env.VAULT_TOKEN) {
        console.log('🔐 Password stored in Vault');
      } else {
        console.log('💾 Password stored locally (Vault not configured)');
      }
    } else {
      console.error('❌ Failed to create platform admin:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error creating platform admin:', error);
    process.exit(1);
  } finally {
    await redis.disconnect();
  }
}

// Run the script
createPlatformAdmin().catch(console.error);