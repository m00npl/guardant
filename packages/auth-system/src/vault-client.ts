export interface VaultConfig {
  address: string;
  token: string;
  namespace?: string;
}

export class VaultHttpClient {
  private config: VaultConfig;

  constructor(config: VaultConfig) {
    this.config = config;
  }

  async read(path: string): Promise<any> {
    const url = `${this.config.address}/v1/${path}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Vault-Token': this.config.token,
        ...(this.config.namespace && { 'X-Vault-Namespace': this.config.namespace }),
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Vault read failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data?.data || null;
  }

  async write(path: string, data: any): Promise<void> {
    const url = `${this.config.address}/v1/${path}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Vault-Token': this.config.token,
        'Content-Type': 'application/json',
        ...(this.config.namespace && { 'X-Vault-Namespace': this.config.namespace }),
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      throw new Error(`Vault write failed: ${response.statusText}`);
    }
  }

  async delete(path: string): Promise<void> {
    // Delete the actual data
    const dataUrl = `${this.config.address}/v1/${path}`;
    
    const dataResponse = await fetch(dataUrl, {
      method: 'DELETE',
      headers: {
        'X-Vault-Token': this.config.token,
        ...(this.config.namespace && { 'X-Vault-Namespace': this.config.namespace }),
      },
    });

    // Also delete metadata to fully remove
    const metadataPath = path.replace('/data/', '/metadata/');
    const metadataUrl = `${this.config.address}/v1/${metadataPath}`;
    
    await fetch(metadataUrl, {
      method: 'DELETE',
      headers: {
        'X-Vault-Token': this.config.token,
        ...(this.config.namespace && { 'X-Vault-Namespace': this.config.namespace }),
      },
    });
  }

  async list(path: string): Promise<string[]> {
    const url = `${this.config.address}/v1/${path}?list=true`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Vault-Token': this.config.token,
        ...(this.config.namespace && { 'X-Vault-Namespace': this.config.namespace }),
      },
    });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error(`Vault list failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data?.keys || [];
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.address}/v1/sys/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Check if sealed
  async isSealed(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.address}/v1/sys/seal-status`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        return true;
      }

      const data = await response.json();
      return data.sealed;
    } catch {
      return true;
    }
  }
}

// Factory function to create Vault client from environment
export function createVaultClient(): VaultHttpClient | null {
  const address = process.env.VAULT_ADDR || process.env.VAULT_ADDRESS;
  const token = process.env.VAULT_TOKEN;

  if (!address || !token) {
    console.warn('Vault configuration missing. Password storage will use local storage.');
    return null;
  }

  return new VaultHttpClient({
    address,
    token,
    namespace: process.env.VAULT_NAMESPACE,
  });
}