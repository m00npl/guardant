# Golem Base Integration Guide

GuardAnt uses Golem Base blockchain infrastructure for decentralized data storage and payments:

- **Golem Base L3** - For monitoring data, configurations, and logs
- **Golem Base L2 "Erech"** - For payment transactions

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   GuardAnt                          │
├─────────────────────┬───────────────────────────────┤
│   Monitoring Data   │        Payments               │
│   (High Volume)     │    (ONLY on L2)              │
├─────────────────────┼───────────────────────────────┤
│   Golem Base L3     │   Golem Base L2 "Erech"      │
│   Chain ID: 600606  │   Chain ID: 393530           │
│   (Data only)       │   (All financial transactions)│
└─────────────────────┴───────────────────────────────┘
```

**Important**: L3 is for data storage only - NO payments can be processed on L3. All financial transactions MUST go through L2 "Erech".

## Wallet Setup

### Add Golem Base L2 Testnet "Erech" to MetaMask

1. Open MetaMask and click on the network selector
2. Click "Add Network" → "Add a network manually"
3. Enter the following details:

   - **Network name**: Golem Base L2 Testnet-001 "Erech"
   - **RPC URL**: https://execution.holesky.l2.gobas.me
   - **Chain ID**: 393530
   - **Currency symbol**: ETH
   - **Block explorer URL**: https://explorer.golem-base.io

4. Click "Save"

### Add Golem Base L3 (Optional - for debugging)

1. Follow the same steps with:
   - **Network name**: Golem Base L3 Kaolin
   - **RPC URL**: https://kaolin.holesky.golem-base.io/rpc
   - **Chain ID**: 600606
   - **Currency symbol**: ETH
   - **Block explorer**: https://explorer.golem-base.io

## Getting Test ETH

### For L2 "Erech"
1. Get Holesky ETH from: https://faucet.holesky.io
2. Bridge to Golem Base L2 using the official bridge
3. Your ETH will appear on L2 "Erech"

### Verify Setup
1. Switch your wallet to "Golem Base L2 Testnet-001 'Erech'"
2. Check your balance - you should see the bridged ETH
3. Test by sending 0.001 ETH to yourself
4. Visit https://explorer.golem-base.io and search for your address
5. You should see your transaction

## Configuration

### Environment Variables

```env
# Golem Base L3 (for monitoring data)
GOLEM_L3_ENABLED=true
GOLEM_L3_CHAIN_ID=600606
GOLEM_L3_HTTP_URL=https://kaolin.holesky.golem-base.io/rpc
GOLEM_L3_WS_URL=wss://kaolin.holesky.golem-base.io/rpc/ws

# Golem Base L2 "Erech" (for payments)
GOLEM_L2_ENABLED=true
GOLEM_L2_CHAIN_ID=393530
GOLEM_L2_HTTP_URL=https://execution.holesky.l2.gobas.me
GOLEM_L2_WS_URL=wss://execution.holesky.l2.gobas.me/ws
GOLEM_L2_EXPLORER=https://explorer.golem-base.io

# Wallet (same for both L2 and L3)
GOLEM_PRIVATE_KEY=your_private_key_here
GOLEM_WALLET_ADDRESS=your_wallet_address_here
```

## Smart Contracts

### L2 "Erech" - Payment Contracts
- **Subscription Manager**: Handles subscription payments
- **Payment Processor**: Processes one-time payments
- **Treasury**: Collects platform fees

### L3 - Data Contracts
- **Monitoring Registry**: Stores service configurations
- **Status Logger**: Immutable status history
- **SLA Tracker**: Records SLA compliance

## Usage in Code

### Writing Monitoring Data to L3

```typescript
import { getGolemL3Adapter } from '@guardant/golem-base-l3';

const adapter = await getGolemL3Adapter();
await adapter.storeServiceStatus(nestId, serviceId, {
  status: 'up',
  responseTime: 142,
  timestamp: Date.now()
});
```

### Processing Payments on L2

```typescript
import { PaymentManager } from '@guardant/payments';

const payment = new PaymentManager({
  chainId: 393530, // L2 "Erech"
  rpcUrl: process.env.GOLEM_L2_HTTP_URL
});

await payment.processSubscription(nestId, 'pro', 'yearly');
```

## Cost Optimization

### L3 Usage (Monitoring Data Only)
- **Purpose**: Store monitoring states, logs, configurations
- **Write frequency**: Every 30 seconds per service
- **Cost**: Minimal (optimized for high-volume data)
- **NO PAYMENTS**: L3 cannot process any financial transactions

### L2 "Erech" Usage (All Payments)
- **Purpose**: ALL subscription payments, billing, refunds
- **Transaction frequency**: Monthly subscriptions, one-time payments
- **Cost**: ~$0.10 per transaction
- **Security**: Full Ethereum security for financial operations

## Security Considerations

1. **Private Keys**: Never commit to git
2. **Hot Wallet**: Keep minimal funds for operations
3. **Cold Wallet**: Treasury for collected payments
4. **Multi-sig**: For contract upgrades

## Monitoring & Debugging

### Check L3 Data
```bash
# View recent monitoring writes
curl $GOLEM_L3_HTTP_URL \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"method":"eth_getLogs","params":[{"address":"CONTRACT_ADDRESS"}],"id":1,"jsonrpc":"2.0"}'
```

### Check L2 Payments
Visit: https://explorer.golem-base.io/address/YOUR_CONTRACT_ADDRESS

## Troubleshooting

### Common Issues

1. **"Insufficient funds"**
   - Check you're on the correct network
   - Verify ETH balance on L2 "Erech"

2. **"Transaction failed"**
   - Check gas price settings
   - Verify contract addresses

3. **"Network error"**
   - Check RPC endpoint is accessible
   - Try alternative RPC if available

### Support

- Golem Discord: https://discord.gg/golem
- GuardAnt Issues: https://github.com/m00npl/guardant/issues