"use strict";
/**
 * Wallet Connector Service
 * Handles connections to various Web3 wallets (MetaMask, WalletConnect, etc.)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletConnectConnector = exports.WalletConnector = void 0;
exports.createWalletConnector = createWalletConnector;
exports.createWalletConnectConnector = createWalletConnectConnector;
const ethers_1 = require("ethers");
class WalletConnector {
    constructor(config) {
        this.config = config;
    }
    /**
     * Detect available wallets in the browser
     */
    async detectWallets() {
        const detected = [];
        if (typeof window === 'undefined') {
            return detected;
        }
        // MetaMask
        if (window.ethereum?.isMetaMask) {
            detected.push('metamask');
        }
        // Coinbase Wallet
        if (window.ethereum?.isCoinbaseWallet) {
            detected.push('coinbase');
        }
        // Trust Wallet
        if (window.ethereum?.isTrustWallet) {
            detected.push('trust');
        }
        // Brave Wallet
        if (window.ethereum?.isBraveWallet) {
            detected.push('brave');
        }
        // Rainbow
        if (window.ethereum?.isRainbow) {
            detected.push('rainbow');
        }
        return detected;
    }
    /**
     * Connect to a specific wallet
     */
    async connect(walletType) {
        try {
            if (typeof window === 'undefined' || !window.ethereum) {
                throw new Error('No Web3 provider found');
            }
            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found');
            }
            // Create provider and signer
            this.provider = new ethers_1.ethers.BrowserProvider(window.ethereum);
            this.signer = await this.provider.getSigner();
            const address = await this.signer.getAddress();
            const network = await this.provider.getNetwork();
            // Check if on correct network
            if (Number(network.chainId) !== this.config.chainId) {
                await this.switchNetwork();
            }
            // Get ENS name if available
            let ensName;
            try {
                ensName = await this.provider.lookupAddress(address) || undefined;
            }
            catch {
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
        }
        catch (error) {
            console.error('Wallet connection error:', error);
            throw new Error(`Failed to connect ${walletType}: ${error.message}`);
        }
    }
    /**
     * Switch to the correct network
     */
    async switchNetwork() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${this.config.chainId.toString(16)}` }],
            });
        }
        catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
                await this.addNetwork();
            }
            else {
                throw switchError;
            }
        }
    }
    /**
     * Add Golem Base L2 "Erech" network to wallet
     */
    async addNetwork() {
        await window.ethereum.request({
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
    async disconnect() {
        this.provider = undefined;
        this.signer = undefined;
        this.currentWallet = undefined;
    }
    /**
     * Get current wallet info
     */
    getWallet() {
        return this.currentWallet;
    }
    /**
     * Check if wallet is connected
     */
    isConnected() {
        return this.currentWallet?.isConnected || false;
    }
    /**
     * Sign a message
     */
    async signMessage(message) {
        if (!this.signer) {
            throw new Error('No wallet connected');
        }
        return await this.signer.signMessage(message);
    }
    /**
     * Send transaction
     */
    async sendTransaction(tx) {
        if (!this.signer) {
            throw new Error('No wallet connected');
        }
        // Ensure we're on the correct network
        const network = await this.provider.getNetwork();
        if (Number(network.chainId) !== this.config.chainId) {
            await this.switchNetwork();
        }
        return await this.signer.sendTransaction(tx);
    }
    /**
     * Estimate gas for transaction
     */
    async estimateGas(tx) {
        if (!this.provider) {
            throw new Error('No provider available');
        }
        return await this.provider.estimateGas(tx);
    }
    /**
     * Get current gas price
     */
    async getGasPrice() {
        if (!this.provider) {
            throw new Error('No provider available');
        }
        const feeData = await this.provider.getFeeData();
        return feeData.gasPrice || 0n;
    }
    /**
     * Create PaymentMethod from connected wallet
     */
    createPaymentMethod(nestId) {
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
    onAccountsChanged(callback) {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', callback);
        }
    }
    onChainChanged(callback) {
        if (window.ethereum) {
            window.ethereum.on('chainChanged', callback);
        }
    }
    onDisconnect(callback) {
        if (window.ethereum) {
            window.ethereum.on('disconnect', callback);
        }
    }
}
exports.WalletConnector = WalletConnector;
/**
 * WalletConnect v2 Integration
 * Supports QR code scanning for mobile wallets
 */
class WalletConnectConnector extends WalletConnector {
    async connectWalletConnect() {
        try {
            // Dynamic import to avoid SSR issues
            const { default: WalletConnectProvider } = await Promise.resolve().then(() => __importStar(require('@walletconnect/web3-provider')));
            this.walletConnectProvider = new WalletConnectProvider({
                rpc: {
                    [this.config.chainId]: this.config.rpcUrl,
                },
                chainId: this.config.chainId,
            });
            // Enable session (triggers QR Code modal)
            await this.walletConnectProvider.enable();
            // Create ethers provider
            this.provider = new ethers_1.ethers.BrowserProvider(this.walletConnectProvider);
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
        }
        catch (error) {
            console.error('WalletConnect error:', error);
            throw new Error(`WalletConnect failed: ${error.message}`);
        }
    }
    async disconnect() {
        if (this.walletConnectProvider) {
            await this.walletConnectProvider.disconnect();
        }
        await super.disconnect();
    }
}
exports.WalletConnectConnector = WalletConnectConnector;
// Export factory function
function createWalletConnector(config) {
    return new WalletConnector(config);
}
function createWalletConnectConnector(config) {
    return new WalletConnectConnector(config);
}
//# sourceMappingURL=wallet-connector.js.map