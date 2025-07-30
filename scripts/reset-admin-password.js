#!/usr/bin/env node

const Redis = require('ioredis');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const VAULT_ADDR = process.env.VAULT_ADDR || 'http://localhost:8200';
const VAULT_TOKEN = process.env.VAULT_TOKEN;

if (!VAULT_TOKEN) {
  console.error('❌ VAULT_TOKEN not set!');
  console.error('\nPlease run with VAULT_TOKEN:');
  console.error('VAULT_TOKEN=<your-token> node reset-admin-password.js');
  process.exit(1);
}

async function resetAdminPassword() {
  console.log('🔧 Resetting admin password...\n');

  // Connect to Redis
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  });

  // Admin details
  const email = 'admin@guardant.me';
  const newPassword = 'Admin123!@#'; // Default password
  const userId = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  
  console.log(`📧 Email: ${email}`);
  console.log(`🆔 User ID: ${userId}`);
  console.log(`🔑 New Password: ${newPassword}`);
  console.log();

  // Hash password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Store password in Vault (matching VaultAuthManager structure)
  const vaultPath = `secret/data/users/passwords/${userId}`;
  
  const vaultData = {
    data: {
      password_hash: hashedPassword,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    }
  };

  console.log('📝 Storing password in Vault...');
  const vaultResponse = await fetch(`${VAULT_ADDR}/v1/${vaultPath}`, {
    method: 'POST',
    headers: {
      'X-Vault-Token': VAULT_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(vaultData),
  });

  if (!vaultResponse.ok) {
    console.error('❌ Failed to store password in Vault:', await vaultResponse.text());
    process.exit(1);
  }

  console.log('✅ Password stored in Vault');

  // Check if user exists in Redis
  const userKey = `auth:user:${userId}`;
  const existingUser = await redis.get(userKey);

  if (!existingUser) {
    console.log('\n📝 Creating admin user in Redis...');
    
    // Create admin user
    const adminUser = {
      id: userId,
      email: email,
      role: 'admin',
      nestId: 'platform', // Platform admin doesn't belong to a specific nest
      permissions: {
        manageNests: true,
        manageUsers: true,
        manageWorkers: true,
        viewAnalytics: true,
        managePayments: true,
        managePlatform: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await redis.set(userKey, JSON.stringify(adminUser));
    await redis.set(`auth:email:${email}`, userId);
    
    console.log('✅ Admin user created');
  } else {
    console.log('✅ Admin user already exists in Redis');
  }

  // Close Redis connection
  await redis.quit();

  console.log('\n🎉 Admin password reset successfully!');
  console.log('\nYou can now login with:');
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Password: ${newPassword}`);
  console.log('\n⚠️  Remember to change the password after first login!');
}

resetAdminPassword().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});