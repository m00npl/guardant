const { VaultHttpClient } = require('../packages/auth-system/src/vault-client');

async function test() {
  console.log('🔧 Testing Vault connection...');
  
  const vaultClient = new VaultHttpClient({
    address: process.env.VAULT_ADDR || 'http://guardant-vault:8200',
    token: process.env.VAULT_TOKEN
  });
  
  const userId = 'YWRtaW5AZ3VhcmRhbnQubWU';
  const path = `secret/data/users/passwords/${userId}`;
  
  console.log('📍 Vault address:', process.env.VAULT_ADDR);
  console.log('🔑 Token:', process.env.VAULT_TOKEN?.substring(0, 10) + '...');
  console.log('📂 Path:', path);
  
  try {
    const data = await vaultClient.read(path);
    console.log('✅ Data retrieved:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

test();