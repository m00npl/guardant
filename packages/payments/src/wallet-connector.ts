/**
 * Wallet Connector Service
 * Handles connections to various Web3 wallets (MetaMask, WalletConnect, etc.)
 */

import { ethers } from 'ethers';
import type { WalletType, PaymentMethod } from './types';

export interface WalletInfo {
  type: WalletType;
  address: string;
  chainId: number;
  ensName?: string;
  balance?: string;
  isConnected: boolean;
}

export interface WalletConnectorConfig {
  chainId: number; // Target chain ID (393530 for Golem Base L2 "Erech")
  rpcUrl: string;
  supportedWallets: WalletType[];
}

export class WalletConnector {
  private config: WalletConnectorConfig;
  private provider?: ethers.BrowserProvider;
  private signer?: ethers.Signer;
  private currentWallet?: WalletInfo;

  constructor(config: WalletConnectorConfig) {
    this.config = config;
  }

  /**
   * Detect available wallets in the browser
   */
  async detectWallets(): Promise<WalletType[]> {
    const detected: WalletType[] = [];
    
    if (typeof window === 'undefined') {
      return detected;
    }

    // MetaMask
    if ((window as any).ethereum?.isMetaMask) {
      detected.push('metamask');
    }

    // Coinbase Wallet
    if ((window as any).ethereum?.isCoinbaseWallet) {
      detected.push('coinbase');
    }

    // Trust Wallet
    if ((window as any).ethereum?.isTrustWallet) {
      detected.push('trust');
    }

    // Brave Wallet
    if ((window as any).ethereum?.isBraveWallet) {
      detected.push('brave');
    }

    // Rainbow
    if ((window as any).ethereum?.isRainbow) {
      detected.push('rainbow');
    }

    return detected;
  }

  /**
   * Connect to a specific wallet
   */
  async connect(walletType: WalletType): Promise<WalletInfo> {
    try {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error('No Web3 provider found');
      }

      // Request account access
      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Create provider and signer
      this.provider = new ethers.BrowserProvider((window as any).ethereum);
      this.signer = await this.provider.getSigner();
      
      const address = await this.signer.getAddress();
      const network = await this.provider.getNetwork();
      
      // Check if on correct network
      if (Number(network.chainId) !== this.config.chainId) {
        await this.switchNetwork();
      }

      // Get ENS name if available
      let ensName: string | undefined;
      try {
        ensName = await this.provider.lookupAddress(address) || undefined;
      } catch {
        // ENS not available on this network
      }

      // Get balance
      const balance = await this.provider.getBalance(address);

      this.currentWallet = {
        type: walletType,
        address,
        chainId: Number(network.chainId),
        ensName,
        balance: balance.toString(),
        isConnected: true
      };

      return this.currentWallet;
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      throw new Error(`Failed to connect ${walletType}: ${error.message}`);
    }
  }

  /**
   * Switch to the correct network
   */
  async switchNetwork(): Promise<void> {
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${this.config.chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        await this.addNetwork();
      } else {
        throw switchError;
      }
    }
  }

  /**
   * Add Golem Base L2 "Erech" network to wallet
   */
  async addNetwork(): Promise<void> {
    await (window as any).ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: `0x${this.config.chainId.toString(16)}`,
        chainName: 'Golem Base L2 Testnet-001 "Erech"',
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: [this.config.rpcUrl],
        blockExplorerUrls: ['https://explorer.golem-base.io'],
      }],
    });
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    this.provider = undefined;
    this.signer = undefined;
    this.currentWallet = undefined;
  }

  /**
   * Get current wallet info
   */
  getWallet(): WalletInfo | undefined {
    return this.currentWallet;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.currentWallet?.isConnected || false;
  }

  /**
   * Sign a message
   */
  async signMessage(message: string): Promise<string> {
    if (!this.signer) {
      throw new Error('No wallet connected');
    }
    return await this.signer.signMessage(message);
  }

  /**
   * Send transaction
   */
  async sendTransaction(tx: ethers.TransactionRequest): Promise<ethers.TransactionResponse> {
    if (!this.signer) {
      throw new Error('No wallet connected');
    }

    // Ensure we're on the correct network
    const network = await this.provider!.getNetwork();
    if (Number(network.chainId) !== this.config.chainId) {
      await this.switchNetwork();
    }

    return await this.signer.sendTransaction(tx);
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(tx: ethers.TransactionRequest): Promise<bigint> {
    if (!this.provider) {
      throw new Error('No provider available');
    }
    return await this.provider.estimateGas(tx);
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    if (!this.provider) {
      throw new Error('No provider available');
    }
    const feeData = await this.provider.getFeeData();
    return feeData.gasPrice || 0n;
  }

  /**
   * Create PaymentMethod from connected wallet
   */
  createPaymentMethod(nestId: string): PaymentMethod | null {
    if (!this.currentWallet) {
      return null;
    }

    return {
      id: `wallet_${this.currentWallet.address}`,
      nestId,
      type: 'wallet',
      address: this.currentWallet.address,
      name: this.currentWallet.ensName || `${this.currentWallet.type} Wallet`,
      isDefault: true,
      metadata: {
        walletType: this.currentWallet.type,
        chainId: this.currentWallet.chainId,
        ensName: this.currentWallet.ensName,
        isConnected: true,
      },
      createdAt: Date.now(),
      verifiedAt: Date.now(),
    };
  }

  /**
   * Monitor wallet events
   */
  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if ((window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', callback);
    }
  }

  onChainChanged(callback: (chainId: string) => void): void {
    if ((window as any).ethereum) {
      (window as any).ethereum.on('chainChanged', callback);
    }
  }

  onDisconnect(callback: () => void): void {
    if ((window as any).ethereum) {
      (window as any).ethereum.on('disconnect', callback);
    }
  }
}

/**
 * WalletConnect v2 Integration
 * Supports QR code scanning for mobile wallets
 */
export class WalletConnectConnector extends WalletConnector {
  private walletConnectProvider?: any;

  async connectWalletConnect(): Promise<WalletInfo> {
    try {
      // Dynamic import to avoid SSR issues
      const { default: WalletConnectProvider } = await import('@walletconnect/web3-provider');
      
      this.walletConnectProvider = new WalletConnectProvider({
        rpc: {
          [this.config.chainId]: this.config.rpcUrl,
        },
        chainId: this.config.chainId,
      });

      // Enable session (triggers QR Code modal)
      await this.walletConnectProvider.enable();

      // Create ethers provider
      this.provider = new ethers.BrowserProvider(this.walletConnectProvider);
      this.signer = await this.provider.getSigner();
      
      const address = await this.signer.getAddress();
      const network = await this.provider.getNetwork();
      const balance = await this.provider.getBalance(address);

      this.currentWallet = {
        type: 'walletconnect',
        address,
        chainId: Number(network.chainId),
        balance: balance.toString(),
        isConnected: true
      };

      return this.currentWallet;
    } catch (error: any) {
      console.error('WalletConnect error:', error);
      throw new Error(`WalletConnect failed: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.walletConnectProvider) {
      await this.walletConnectProvider.disconnect();
    }
    await super.disconnect();
  }
}

// Export factory function
export function createWalletConnector(config: WalletConnectorConfig): WalletConnector {
  return new WalletConnector(config);
}

export function createWalletConnectConnector(config: WalletConnectorConfig): WalletConnectConnector {
  return new WalletConnectConnector(config);
}