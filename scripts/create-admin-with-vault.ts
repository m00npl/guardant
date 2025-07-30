#!/usr/bin/env bun

import bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const VAULT_ADDR = process.env.VAULT_ADDR || 'http://vault:8200';
const VAULT_TOKEN = process.env.VAULT_TOKEN;

async function getVaultSecret(path: string, key: string) {
  if (!VAULT_TOKEN) {
    throw new Error('VAULT_TOKEN not set. Please set VAULT_TOKEN environment variable.');
  }
  
  const response = await fetch(`${VAULT_ADDR}/v1/secret/data/${path}`, {
    headers: {
      'X-Vault-Token': VAULT_TOKEN,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch secret from Vault: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data.data[key];
}

async function storeInVault(path: string, data: Record<string, any>) {
  if (!VAULT_TOKEN) {
    throw new Error('VAULT_TOKEN not set. Please set VAULT_TOKEN environment variable.');
  }
  
  const response = await fetch(`${VAULT_ADDR}/v1/secret/data/${path}`, {
    method: 'POST',
    headers: {
      'X-Vault-Token': VAULT_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to store secret in Vault: ${response.statusText}`);
  }
}

async function createAdmin() {
  console.log('🔧 Creating platform admin with Vault integration...');
  
  if (!VAULT_TOKEN) {
    console.error('❌ VAULT_TOKEN not set!');
    console.log('');
    console.log('Please run with VAULT_TOKEN:');
    console.log('docker compose exec -e VAULT_TOKEN=<your-token> admin-api bun run /app/scripts/create-admin-with-vault.ts');
    console.log('');
    console.log('To get root token:');
    console.log('cat vault-init-output.json | grep root_token');
    process.exit(1);
  }
  
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  });

  try {
    // Check if admin credentials exist in Vault
    let email, password;
    
    try {
      email = await getVaultSecret('platform/admin', 'email');
      password = await getVaultSecret('platform/admin', 'password');
      console.log('📦 Found existing admin credentials in Vault');
    } catch (error) {
      // Generate new credentials
      email = 'admin@guardant.me';
      password = generateSecurePassword();
      
      // Store in Vault
      await storeInVault('platform/admin', {
        email: email,
        password: password,
        created_at: new Date().toISOString(),
        note: 'Platform admin credentials - CHANGE AFTER FIRST LOGIN!'
      });
      
      console.log('🔐 Stored new admin credentials in Vault');
    }
    
    // Create platform nest
    const nestId = 'platform-admin-nest';
    const nest = {
      id: nestId,
      name: 'Platform Administration',
      subdomain: 'platform',
      subscription: {
        tier: 'unlimited',
        servicesLimit: 999999,
      }
    };
    
    await redis.hset('nests', nestId, JSON.stringify(nest));
    
    // Create admin user
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = {
      id: userId,
      nestId: nestId,
      email: email,
      password: hashedPassword,
      name: 'Platform Admin',
      role: 'platform_admin',
      createdAt: Date.now(),
      isActive: true
    };
    
    // Store user
    await redis.hset('users', userId, JSON.stringify(user));
    await redis.hset('users:email', email, userId);
    
    console.log('✅ Platform admin created!');
    console.log('');
    console.log('📧 Email:', email);
    console.log('🔑 Password is stored in Vault at: secret/platform/admin');
    console.log('');
    console.log('To retrieve password from Vault:');
    console.log(`vault kv get -field=password secret/platform/admin`);
    console.log('');
    console.log('Or via API:');
    console.log(`curl -H "X-Vault-Token: $VAULT_TOKEN" ${VAULT_ADDR}/v1/secret/data/platform/admin | jq -r .data.data.password`);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await redis.disconnect();
  }
}

function generateSecurePassword(): string {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  
  // Ensure at least one of each required type
  password += 'A'; // uppercase
  password += 'a'; // lowercase
  password += '1'; // number
  password += '!'; // symbol
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

createAdmin();