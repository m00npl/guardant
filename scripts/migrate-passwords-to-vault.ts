#!/usr/bin/env bun

import Redis from 'ioredis';
import { VaultPasswordService } from '../packages/vault-password-manager';

const VAULT_ADDR = process.env.VAULT_ADDR || 'http://vault:8200';
const VAULT_TOKEN = process.env.VAULT_TOKEN;

async function migratePasswords() {
  console.log('🔐 Migrating user passwords to Vault...');
  
  if (!VAULT_TOKEN) {
    console.error('❌ VAULT_TOKEN not set!');
    process.exit(1);
  }
  
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  });
  
  const vaultService = new VaultPasswordService(VAULT_ADDR, VAULT_TOKEN);

  try {
    // Get all users from Redis
    const userIds = await redis.hkeys('users');
    console.log(`Found ${userIds.length} users to migrate`);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const userId of userIds) {
      const userJson = await redis.hget('users', userId);
      if (!userJson) continue;
      
      const user = JSON.parse(userJson);
      
      if (user.password) {
        try {
          // Store password in Vault
          await vaultService.storePassword(user.id, user.password);
          
          // Remove password from Redis user object
          delete user.password;
          user.passwordInVault = true;
          
          // Update user in Redis
          await redis.hset('users', userId, JSON.stringify(user));
          
          migrated++;
          console.log(`✅ Migrated password for user: ${user.email}`);
        } catch (error) {
          console.error(`❌ Failed to migrate password for user ${user.email}:`, error);
        }
      } else {
        skipped++;
      }
    }
    
    console.log('');
    console.log('Migration complete!');
    console.log(`✅ Migrated: ${migrated} passwords`);
    console.log(`⏭️  Skipped: ${skipped} users (no password)`);
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await redis.disconnect();
  }
}

// Add rollback function in case needed
async function rollbackMigration() {
  console.log('⚠️  Rolling back password migration...');
  
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  });
  
  const vaultService = new VaultPasswordService(VAULT_ADDR, VAULT_TOKEN!);

  try {
    const userIds = await redis.hkeys('users');
    
    for (const userId of userIds) {
      const userJson = await redis.hget('users', userId);
      if (!userJson) continue;
      
      const user = JSON.parse(userJson);
      
      if (user.passwordInVault) {
        // This would need to decrypt from Vault - not implementing for security
        console.log(`⚠️  Cannot rollback password for ${user.email} - password is encrypted in Vault`);
      }
    }
    
  } finally {
    await redis.disconnect();
  }
}

// Check command line argument
const command = process.argv[2];

if (command === 'rollback') {
  rollbackMigration();
} else {
  migratePasswords();
}