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
    chainId: number;
    rpcUrl: string;
    supportedWallets: WalletType[];
}
export declare class WalletConnector {
    private config;
    private provider?;
    private signer?;
    private currentWallet?;
    constructor(config: WalletConnectorConfig);
    /**
     * Detect available wallets in the browser
     */
    detectWallets(): Promise<WalletType[]>;
    /**
     * Connect to a specific wallet
     */
    connect(walletType: WalletType): Promise<WalletInfo>;
    /**
     * Switch to the correct network
     */
    switchNetwork(): Promise<void>;
    /**
     * Add Golem Base L2 "Erech" network to wallet
     */
    addNetwork(): Promise<void>;
    /**
     * Disconnect wallet
     */
    disconnect(): Promise<void>;
    /**
     * Get current wallet info
     */
    getWallet(): WalletInfo | undefined;
    /**
     * Check if wallet is connected
     */
    isConnected(): boolean;
    /**
     * Sign a message
     */
    signMessage(message: string): Promise<string>;
    /**
     * Send transaction
     */
    sendTransaction(tx: ethers.TransactionRequest): Promise<ethers.TransactionResponse>;
    /**
     * Estimate gas for transaction
     */
    estimateGas(tx: ethers.TransactionRequest): Promise<bigint>;
    /**
     * Get current gas price
     */
    getGasPrice(): Promise<bigint>;
    /**
     * Create PaymentMethod from connected wallet
     */
    createPaymentMethod(nestId: string): PaymentMethod | null;
    /**
     * Monitor wallet events
     */
    onAccountsChanged(callback: (accounts: string[]) => void): void;
    onChainChanged(callback: (chainId: string) => void): void;
    onDisconnect(callback: () => void): void;
}
/**
 * WalletConnect v2 Integration
 * Supports QR code scanning for mobile wallets
 */
export declare class WalletConnectConnector extends WalletConnector {
    private walletConnectProvider?;
    connectWalletConnect(): Promise<WalletInfo>;
    disconnect(): Promise<void>;
}
export declare function createWalletConnector(config: WalletConnectorConfig): WalletConnector;
export declare function createWalletConnectConnector(config: WalletConnectorConfig): WalletConnectConnector;
//# sourceMappingURL=wallet-connector.d.ts.map