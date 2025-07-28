import React, { useState, useEffect } from 'react';
import {
  WalletConnector,
  WalletInfo,
  WalletType,
  createWalletConnector,
} from '@guardant/payments';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const WALLET_ICONS: Record<WalletType, string> = {
  metamask: '🦊',
  walletconnect: '🔗',
  coinbase: '🪙',
  trust: '🛡️',
  brave: '🦁',
  rainbow: '🌈',
  safe: '🔐',
  ledger: '📱',
};

const WALLET_NAMES: Record<WalletType, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
  trust: 'Trust Wallet',
  brave: 'Brave Wallet',
  rainbow: 'Rainbow',
  safe: 'Safe',
  ledger: 'Ledger',
};

interface WalletConnectProps {
  onConnect: (wallet: WalletInfo) => void;
  onDisconnect: () => void;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({
  onConnect,
  onDisconnect,
}) => {
  const { user } = useAuth();
  const [connector, setConnector] = useState<WalletConnector | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [availableWallets, setAvailableWallets] = useState<WalletType[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);

  useEffect(() => {
    // Initialize wallet connector
    const conn = createWalletConnector({
      chainId: 393530, // Golem Base L2 "Erech"
      rpcUrl: 'https://execution.holesky.l2.gobas.me',
      supportedWallets: [
        'metamask',
        'walletconnect',
        'coinbase',
        'trust',
        'brave',
        'rainbow',
      ],
    });
    setConnector(conn);

    // Detect available wallets
    conn.detectWallets().then(setAvailableWallets);

    // Set up event listeners
    conn.onAccountsChanged((accounts) => {
      if (accounts.length === 0) {
        handleDisconnect();
      }
    });

    conn.onChainChanged(() => {
      // Reload on chain change
      window.location.reload();
    });

    conn.onDisconnect(() => {
      handleDisconnect();
    });

    return () => {
      // Cleanup
      conn.disconnect();
    };
  }, []);

  const handleConnect = async (walletType: WalletType) => {
    if (!connector) return;

    setIsConnecting(true);
    try {
      const walletInfo = await connector.connect(walletType);
      setWallet(walletInfo);
      onConnect(walletInfo);
      setShowWalletSelector(false);
      toast.success(`Connected to ${WALLET_NAMES[walletType]}`);
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connector) return;

    await connector.disconnect();
    setWallet(null);
    onDisconnect();
    toast.success('Wallet disconnected');
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance?: string) => {
    if (!balance) return '0.00';
    const eth = Number(balance) / 1e18;
    return eth.toFixed(4);
  };

  if (wallet) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{WALLET_ICONS[wallet.type]}</span>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {wallet.ensName || formatAddress(wallet.address)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatBalance(wallet.balance)} ETH • Chain ID: {wallet.chainId}
              </p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowWalletSelector(!showWalletSelector)}
        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2"
      >
        <span>🔗</span>
        <span>Connect Wallet</span>
      </button>

      {showWalletSelector && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-50">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Select Wallet
          </h3>
          
          {availableWallets.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No wallets detected. Please install MetaMask or another Web3 wallet.
            </p>
          ) : (
            <div className="space-y-2">
              {availableWallets.map((walletType) => (
                <button
                  key={walletType}
                  onClick={() => handleConnect(walletType)}
                  disabled={isConnecting}
                  className="w-full px-3 py-2 text-left flex items-center space-x-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <span className="text-xl">{WALLET_ICONS[walletType]}</span>
                  <span className="text-sm font-medium">
                    {WALLET_NAMES[walletType]}
                  </span>
                </button>
              ))}
              
              {/* Always show WalletConnect option */}
              {!availableWallets.includes('walletconnect') && (
                <button
                  onClick={() => handleConnect('walletconnect')}
                  disabled={isConnecting}
                  className="w-full px-3 py-2 text-left flex items-center space-x-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <span className="text-xl">{WALLET_ICONS.walletconnect}</span>
                  <span className="text-sm font-medium">
                    {WALLET_NAMES.walletconnect}
                  </span>
                </button>
              )}
            </div>
          )}

          {isConnecting && (
            <div className="mt-3 text-center">
              <div className="inline-flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Connecting...
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};