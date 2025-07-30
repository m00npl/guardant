import bcrypt from 'bcrypt';

export interface VaultPasswordManager {
  storePassword(userId: string, hashedPassword: string): Promise<void>;
  verifyPassword(userId: string, plainPassword: string): Promise<boolean>;
  updatePassword(userId: string, newHashedPassword: string): Promise<void>;
  deletePassword(userId: string): Promise<void>;
}

export class VaultPasswordService implements VaultPasswordManager {
  private vaultAddr: string;
  private vaultToken: string;
  private basePath: string;

  constructor(vaultAddr: string, vaultToken: string, basePath: string = 'users/passwords') {
    this.vaultAddr = vaultAddr;
    this.vaultToken = vaultToken;
    this.basePath = basePath;
  }

  async storePassword(userId: string, hashedPassword: string): Promise<void> {
    const path = `${this.basePath}/${userId}`;
    
    const response = await fetch(`${this.vaultAddr}/v1/secret/data/${path}`, {
      method: 'POST',
      headers: {
        'X-Vault-Token': this.vaultToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          password_hash: hashedPassword,
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to store password in Vault: ${response.statusText}`);
    }
  }

  async verifyPassword(userId: string, plainPassword: string): Promise<boolean> {
    const hashedPassword = await this.getPasswordHash(userId);
    if (!hashedPassword) {
      return false;
    }
    
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async updatePassword(userId: string, newHashedPassword: string): Promise<void> {
    const path = `${this.basePath}/${userId}`;
    
    // Get existing data to preserve history
    const existing = await this.getPasswordData(userId);
    
    const response = await fetch(`${this.vaultAddr}/v1/secret/data/${path}`, {
      method: 'POST',
      headers: {
        'X-Vault-Token': this.vaultToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          password_hash: newHashedPassword,
          created_at: existing?.created_at || new Date().toISOString(),
          last_updated: new Date().toISOString(),
          previous_hash: existing?.password_hash,
          history: [
            ...(existing?.history || []),
            {
              changed_at: new Date().toISOString(),
              hash_prefix: existing?.password_hash?.substring(0, 10) + '...',
            }
          ].slice(-5), // Keep last 5 password changes
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update password in Vault: ${response.statusText}`);
    }
  }

  async deletePassword(userId: string): Promise<void> {
    const path = `${this.basePath}/${userId}`;
    
    const response = await fetch(`${this.vaultAddr}/v1/secret/metadata/${path}`, {
      method: 'DELETE',
      headers: {
        'X-Vault-Token': this.vaultToken,
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete password from Vault: ${response.statusText}`);
    }
  }

  private async getPasswordHash(userId: string): Promise<string | null> {
    const data = await this.getPasswordData(userId);
    return data?.password_hash || null;
  }

  private async getPasswordData(userId: string): Promise<any> {
    const path = `${this.basePath}/${userId}`;
    
    const response = await fetch(`${this.vaultAddr}/v1/secret/data/${path}`, {
      headers: {
        'X-Vault-Token': this.vaultToken,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch password from Vault: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.data;
  }

  // Utility method to migrate existing passwords to Vault
  async migratePasswordToVault(userId: string, existingHashedPassword: string): Promise<void> {
    await this.storePassword(userId, existingHashedPassword);
  }
}

// Helper functions for integration
export function createVaultPasswordManager(): VaultPasswordService | null {
  const vaultAddr = process.env.VAULT_ADDR;
  const vaultToken = process.env.VAULT_TOKEN;
  
  if (!vaultAddr || !vaultToken) {
    console.warn('Vault not configured for password storage. Using local storage.');
    return null;
  }
  
  return new VaultPasswordService(vaultAddr, vaultToken);
}