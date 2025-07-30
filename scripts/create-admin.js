#!/usr/bin/env node

// Simple script to create platform admin
// Usage: docker compose exec admin-api node /app/scripts/create-admin.js email@example.com password123

const bcrypt = require('bcrypt');

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: create-admin.js <email> <password>');
  process.exit(1);
}

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('\n=== Platform Admin Credentials ===');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Password Hash: ${hashedPassword}`);
    console.log('\nAdd these to your .env file:');
    console.log(`PLATFORM_ADMIN_EMAIL=${email}`);
    console.log(`PLATFORM_ADMIN_PASSWORD=${password}`);
    console.log(`PLATFORM_ADMIN_PASSWORD_HASH=${hashedPassword}`);
    console.log('=================================\n');
    
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();