# Billing System Documentation

GuardAnt uses a flexible billing system that supports multiple payment methods and wallets, with all financial transactions processed on Golem Base L2 "Erech".

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Wallets                         │
│  MetaMask | WalletConnect | Coinbase | Trust | Brave   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│               Golem Base L2 "Erech"                     │
│                 Chain ID: 393530                        │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Subscription │  │   Payment    │  │   Treasury   │  │
│  │   Manager    │  │  Processor   │  │    Wallet    │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Supported Wallets

GuardAnt supports multiple Web3 wallets for payment processing:

1. **MetaMask** - Browser extension and mobile app
2. **WalletConnect** - QR code scanning for mobile wallets
3. **Coinbase Wallet** - Coinbase's self-custody wallet
4. **Trust Wallet** - Binance's multi-chain wallet
5. **Brave Wallet** - Built into Brave browser
6. **Rainbow** - User-friendly Ethereum wallet
7. **Safe** (Gnosis Safe) - Multi-signature wallet
8. **Ledger** - Hardware wallet support

## Subscription Plans

### Free Plan
- **Price**: $0/month
- **Services**: 10 services
- **Workers**: 1 worker
- **Regions**: 1 region
- **Check Interval**: 5 minutes
- **History**: 7 days
- **API Access**: Limited
- **Support**: Community

### Pro Plan
- **Price**: 0.01 ETH/month (0.1 ETH/year)
- **Services**: 50 services
- **Workers**: 5 workers
- **Regions**: 3 regions
- **Check Interval**: 1 minute
- **History**: 30 days
- **API Access**: Full
- **Support**: Email
- **Features**: Custom domains, webhooks

### Enterprise Plan
- **Price**: 0.05 ETH/month (0.5 ETH/year)
- **Services**: Unlimited
- **Workers**: 20 workers
- **Regions**: 10 regions
- **Check Interval**: 30 seconds
- **History**: 90 days
- **API Access**: Full + Priority
- **Support**: Priority
- **Features**: SLA, dedicated support

## Payment Flow

### 1. Wallet Connection
```typescript
// Frontend component
import { WalletConnect } from '@guardant/components';

<WalletConnect 
  onConnect={(wallet) => handleWalletConnected(wallet)}
  onDisconnect={() => handleWalletDisconnected()}
/>
```

### 2. Subscription Creation
```typescript
// API call with wallet address
const response = await fetch('/api/subscription/create', {
  method: 'POST',
  body: JSON.stringify({
    planId: 'pro',
    isYearly: false,
    paymentMethod: 'eth',
    walletAddress: connectedWallet.address
  })
});
```

### 3. Payment Processing
- User approves transaction in their wallet
- Transaction is sent to Golem Base L2 "Erech"
- Payment processor contract handles the transaction
- Funds are transferred to treasury wallet
- Subscription is activated upon confirmation

## API Endpoints

### Wallet Management
- `POST /api/wallet/detect` - Detect available wallets
- `POST /api/wallet/connect` - Connect to a wallet
- `POST /api/wallet/info` - Get connected wallet info

### Subscription Management
- `POST /api/subscription/plans` - Get available plans
- `POST /api/subscription/create` - Create new subscription
- `POST /api/subscription/status` - Get subscription status
- `POST /api/subscription/upgrade` - Upgrade plan
- `POST /api/subscription/cancel` - Cancel subscription
- `POST /api/subscription/billing` - Process usage billing
- `POST /api/subscription/transactions` - Get payment history

## Usage Tracking & Overage

The system tracks usage metrics:
- Number of services monitored
- Worker utilization
- API requests per month
- Storage usage (logs, metrics)
- Bandwidth consumption

Overage charges apply when limits are exceeded:
- Additional requests: 0.000001 ETH per 1000 requests
- Extra storage: 0.00001 ETH per GB/month
- Extra bandwidth: 0.00001 ETH per GB

## Security Considerations

### Wallet Security
- Never store private keys on the server
- All transactions require user approval
- Support for hardware wallets (Ledger)
- Multi-signature wallet support (Safe)

### Payment Security
- All payments on Golem Base L2 (lower fees, faster confirmation)
- Transaction validation before service activation
- Automatic retry for failed transactions
- Refund mechanism for overpayments

### Treasury Management
- Separate hot wallet for operations
- Cold storage for accumulated funds
- Multi-sig for large withdrawals
- Regular security audits

## Testing Payments

### Local Development
1. Use test wallets with Golem Base L2 testnet ETH
2. Enable demo mode for simulated payments
3. Test all wallet types and payment flows

### Testnet Setup
1. Add Golem Base L2 "Erech" to your wallet:
   - Network: Golem Base L2 Testnet-001 "Erech"
   - RPC URL: https://execution.holesky.l2.gobas.me
   - Chain ID: 393530
   - Symbol: ETH

2. Get test ETH:
   - Get Holesky ETH from faucet
   - Bridge to Golem Base L2

## Configuration

### Environment Variables
```env
# Payment Configuration
GOLEM_L2_ENABLED=true
GOLEM_L2_CHAIN_ID=393530
GOLEM_L2_HTTP_URL=https://execution.holesky.l2.gobas.me
GOLEM_L2_WS_URL=wss://execution.holesky.l2.gobas.me/ws

# Treasury Wallet
GOLEM_PRIVATE_KEY=your_treasury_private_key
GOLEM_WALLET_ADDRESS=your_treasury_address

# Payment Features
ENABLE_BILLING=true
ENABLE_WALLET_CONNECT=true
ENABLE_OVERAGE_BILLING=true
```

## Troubleshooting

### Common Issues

1. **"No wallet detected"**
   - Ensure MetaMask or another Web3 wallet is installed
   - Check browser permissions for crypto wallets
   - Try refreshing the page

2. **"Wrong network"**
   - Switch to Golem Base L2 "Erech" in your wallet
   - Chain ID must be 393530
   - Use the network switcher in the app

3. **"Transaction failed"**
   - Check wallet balance (need ETH for gas)
   - Verify gas price settings
   - Check network congestion

4. **"Subscription not activated"**
   - Wait for transaction confirmation (usually 2-3 blocks)
   - Check transaction status on explorer
   - Contact support if issue persists

## Future Enhancements

1. **Additional Payment Methods**
   - Stablecoin support (USDC, USDT)
   - Credit card via crypto on-ramp
   - Recurring payment authorization

2. **Advanced Features**
   - Team billing and cost allocation
   - Usage-based pricing tiers
   - Custom enterprise contracts
   - Automated invoicing

3. **DeFi Integrations**
   - Stake tokens for discounts
   - DAO governance for pricing
   - Revenue sharing with node operators