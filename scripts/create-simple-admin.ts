#!/usr/bin/env bun

import bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const email = process.env.ADMIN_EMAIL || 'admin@guardant.me';
const password = process.env.ADMIN_PASSWORD || 'changeThisPassword123!';

async function createAdmin() {
  console.log('🔧 Creating platform admin...');
  
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  });

  try {
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
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await redis.disconnect();
  }
}

createAdmin();