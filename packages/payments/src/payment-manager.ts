import { ethers } from 'ethers';
import type {
  GolemL2Config,
  Subscription,
  PaymentTransaction,
  SubscriptionPlan,
  UsageBilling,
  Invoice,
  SubscriptionEvent,
  WalletType,
} from './types';
import { getPlan, calculateOverageCosts, formatETH } from './subscription-plans';
import { v4 as uuidv4 } from 'uuid';
import { WalletConnector, WalletInfo } from './wallet-connector';

// Storage interface for payment data
export interface PaymentStorage {
  // Subscriptions
  createSubscription(subscription: Subscription): Promise<void>;
  getSubscription(id: string): Promise<Subscription | null>;
  getSubscriptionByNest(nestId: string): Promise<Subscription | null>;
  updateSubscription(subscription: Subscription): Promise<void>;
  
  // Transactions
  createTransaction(transaction: PaymentTransaction): Promise<void>;
  getTransaction(id: string): Promise<PaymentTransaction | null>;
  updateTransaction(transaction: PaymentTransaction): Promise<void>;
  getTransactionsByNest(nestId: string): Promise<PaymentTransaction[]>;
  
  // Usage billing
  createUsageBilling(billing: UsageBilling): Promise<void>;
  getUsageBilling(id: string): Promise<UsageBilling | null>;
  getCurrentBilling(nestId: string): Promise<UsageBilling | null>;
  
  // Events
  createEvent(event: SubscriptionEvent): Promise<void>;
  getEventsBySubscription(subscriptionId: string): Promise<SubscriptionEvent[]>;
}

export class PaymentManager {
  private config: GolemL2Config;
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private storage: PaymentStorage;
  private walletConnector?: WalletConnector;
  private connectedWallet?: WalletInfo;

  constructor(config: GolemL2Config, storage: PaymentStorage, walletConnector?: WalletConnector) {
    this.config = config;
    this.storage = storage;
    this.walletConnector = walletConnector;
    
    // Initialize provider and wallet
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.wallet.privateKey, this.provider);
    
    console.log(`🔗 Connected to Golem Base L2 "Erech" at ${config.rpcUrl}`);
    console.log(`💰 Treasury wallet: ${this.wallet.address}`);
  }

  /**
   * Connect user wallet for payments
   */
  async connectWallet(walletType: WalletType): Promise<WalletInfo> {
    if (!this.walletConnector) {
      throw new Error('Wallet connector not initialized');
    }
    
    this.connectedWallet = await this.walletConnector.connect(walletType);
    return this.connectedWallet;
  }

  /**
   * Get connected wallet info
   */
  getConnectedWallet(): WalletInfo | undefined {
    return this.connectedWallet;
  }

  /**
   * Create new subscription for a nest
   */
  async createSubscription(
    nestId: string,
    planId: string,
    paymentMethod: string,
    isYearly: boolean = false,
    walletAddress?: string
  ): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
    try {
      const plan = getPlan(planId);
      if (!plan) {
        return { success: false, error: 'Invalid plan ID' };
      }

      // Create subscription
      const subscription: Subscription = {
        id: uuidv4(),
        nestId,
        planId,
        tier: plan.tier,
        status: 'pending',
        currentPeriodStart: Date.now(),
        currentPeriodEnd: Date.now() + (isYearly ? 365 : 30) * 24 * 60 * 60 * 1000,
        cancelAtPeriodEnd: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        paymentMethod: 'eth',
        paymentWallet: walletAddress && this.connectedWallet ? {
          address: walletAddress,
          type: this.connectedWallet.type,
          chainId: this.connectedWallet.chainId,
          ensName: this.connectedWallet.ensName,
        } : undefined,
        usage: {
          services: 0,
          workers: 0,
          requests: 0,
          storage: 0,
          bandwidth: 0,
          lastUpdated: Date.now(),
        },
      };

      await this.storage.createSubscription(subscription);

      // Create event
      await this.createEvent(subscription.id, 'created', { planId, isYearly });

      // Create initial payment if not free plan
      if (plan.tier !== 'free') {
        const amount = isYearly ? plan.price.yearly : plan.price.monthly;
        const paymentResult = await this.createPayment(
          nestId,
          subscription.id,
          'subscription',
          amount,
          `${plan.name} subscription (${isYearly ? 'yearly' : 'monthly'})`,
          walletAddress
        );

        if (!paymentResult.success) {
          return { success: false, error: paymentResult.error };
        }
      } else {
        // Free plan - activate immediately
        subscription.status = 'active';
        await this.storage.updateSubscription(subscription);
        await this.createEvent(subscription.id, 'activated', {});
      }

      return { success: true, subscription };
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process payment for subscription
   */
  async createPayment(
    nestId: string,
    subscriptionId: string,
    type: 'subscription' | 'upgrade' | 'overage',
    amount: string,
    description: string,
    fromWallet?: string
  ): Promise<{ success: boolean; transaction?: PaymentTransaction; error?: string }> {
    try {
      const transaction: PaymentTransaction = {
        id: uuidv4(),
        nestId,
        subscriptionId,
        type,
        amount,
        currency: 'ETH',
        status: 'pending',
        description,
        from: fromWallet || this.connectedWallet?.address,
        to: this.config.wallet.address, // Treasury wallet
        walletType: this.connectedWallet?.type,
        walletMeta: this.connectedWallet ? {
          ensName: this.connectedWallet.ensName,
          chainId: this.connectedWallet.chainId,
        } : undefined,
        createdAt: Date.now(),
        retryCount: 0,
      };

      await this.storage.createTransaction(transaction);

      // Process payment based on whether user wallet is connected
      const result = fromWallet && this.walletConnector?.isConnected()
        ? await this.processWalletPayment(transaction)
        : await this.simulatePayment(transaction);

      if (result.success) {
        transaction.status = 'confirmed';
        transaction.transactionHash = result.txHash;
        transaction.confirmedAt = Date.now();
        
        await this.storage.updateTransaction(transaction);
        await this.activatePayment(transaction);
      } else {
        transaction.status = 'failed';
        transaction.failureReason = result.error;
        transaction.failedAt = Date.now();
        
        await this.storage.updateTransaction(transaction);
      }

      return { success: result.success, transaction, error: result.error };
    } catch (error: any) {
      console.error('Error creating payment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process payment from connected wallet
   */
  private async processWalletPayment(transaction: PaymentTransaction): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      if (!this.walletConnector || !this.walletConnector.isConnected()) {
        return { success: false, error: 'No wallet connected' };
      }

      // Prepare transaction
      const tx: ethers.TransactionRequest = {
        to: this.config.wallet.address,
        value: transaction.amount,
        data: ethers.hexlify(ethers.toUtf8Bytes(
          JSON.stringify({
            type: transaction.type,
            subscriptionId: transaction.subscriptionId,
            nestId: transaction.nestId,
          })
        )),
      };

      // Estimate gas
      const gasEstimate = await this.walletConnector.estimateGas(tx);
      const gasPrice = await this.walletConnector.getGasPrice();
      
      tx.gasLimit = gasEstimate;
      tx.gasPrice = gasPrice;

      // Send transaction
      console.log(`📤 Sending transaction from ${transaction.from} to ${transaction.to}`);
      const txResponse = await this.walletConnector.sendTransaction(tx);
      
      console.log(`💳 Payment sent: ${formatETH(transaction.amount)} ETH`);
      console.log(`🔗 Transaction hash: ${txResponse.hash}`);
      
      // Wait for confirmation
      const receipt = await txResponse.wait();
      
      if (receipt && receipt.status === 1) {
        return { success: true, txHash: txResponse.hash };
      } else {
        return { success: false, error: 'Transaction failed' };
      }
    } catch (error: any) {
      console.error('Wallet payment error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Simulate payment processing (for demo)
   */
  private async simulatePayment(transaction: PaymentTransaction): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success/failure (90% success rate)
      const success = Math.random() > 0.1;
      
      if (success) {
        // Generate mock transaction hash
        const txHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
        
        console.log(`💳 Payment simulated: ${formatETH(transaction.amount)} ETH`);
        console.log(`🔗 Transaction hash: ${txHash}`);
        
        return { success: true, txHash };
      } else {
        return { success: false, error: 'Insufficient funds or network error' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Activate subscription after successful payment
   */
  private async activatePayment(transaction: PaymentTransaction): Promise<void> {
    try {
      const subscription = await this.storage.getSubscription(transaction.subscriptionId);
      if (!subscription) return;

      if (transaction.type === 'subscription' && subscription.status === 'pending') {
        subscription.status = 'active';
        subscription.lastPayment = {
          amount: transaction.amount,
          transactionHash: transaction.transactionHash!,
          timestamp: transaction.confirmedAt!,
          status: 'confirmed',
        };
        
        await this.storage.updateSubscription(subscription);
        await this.createEvent(subscription.id, 'activated', { transactionId: transaction.id });
        await this.createEvent(subscription.id, 'payment_succeeded', { amount: transaction.amount });
      }
    } catch (error) {
      console.error('Error activating payment:', error);
    }
  }

  /**
   * Upgrade subscription plan
   */
  async upgradeSubscription(
    nestId: string,
    newPlanId: string,
    isYearly: boolean = false,
    walletAddress?: string
  ): Promise<{ success: boolean; transaction?: PaymentTransaction; error?: string }> {
    try {
      const subscription = await this.storage.getSubscriptionByNest(nestId);
      if (!subscription) {
        return { success: false, error: 'No active subscription found' };
      }

      const currentPlan = getPlan(subscription.planId);
      const newPlan = getPlan(newPlanId);
      
      if (!currentPlan || !newPlan) {
        return { success: false, error: 'Invalid plan ID' };
      }

      // Calculate prorated amount
      const daysRemaining = Math.ceil((subscription.currentPeriodEnd - Date.now()) / (24 * 60 * 60 * 1000));
      const proratedAmount = this.calculateProration(currentPlan, newPlan, daysRemaining, isYearly);

      // Update subscription
      subscription.planId = newPlanId;
      subscription.tier = newPlan.tier;
      subscription.updatedAt = Date.now();
      
      await this.storage.updateSubscription(subscription);
      await this.createEvent(subscription.id, 'upgraded', { 
        fromPlan: currentPlan.id,
        toPlan: newPlan.id,
        proratedAmount 
      });

      // Create payment if upgrade has cost
      if (BigInt(proratedAmount) > 0) {
        return await this.createPayment(
          nestId,
          subscription.id,
          'upgrade',
          proratedAmount,
          `Upgrade to ${newPlan.name}`,
          walletAddress
        );
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error upgrading subscription:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    nestId: string,
    immediately: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const subscription = await this.storage.getSubscriptionByNest(nestId);
      if (!subscription) {
        return { success: false, error: 'No active subscription found' };
      }

      if (immediately) {
        subscription.status = 'cancelled';
        subscription.currentPeriodEnd = Date.now();
      } else {
        subscription.cancelAtPeriodEnd = true;
      }
      
      subscription.updatedAt = Date.now();
      await this.storage.updateSubscription(subscription);
      
      await this.createEvent(subscription.id, 'cancelled', { immediately });

      return { success: true };
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process usage billing for overage charges
   */
  async processUsageBilling(nestId: string): Promise<{ success: boolean; billing?: UsageBilling; error?: string }> {
    try {
      const subscription = await this.storage.getSubscriptionByNest(nestId);
      if (!subscription || subscription.status !== 'active') {
        return { success: false, error: 'No active subscription found' };
      }

      const plan = getPlan(subscription.planId);
      if (!plan) {
        return { success: false, error: 'Invalid plan' };
      }

      // Calculate overage costs
      const overageCosts = calculateOverageCosts(subscription.usage, plan);
      
      if (BigInt(overageCosts.total) === 0n) {
        return { success: true }; // No overage charges
      }

      // Create usage billing record
      const billing: UsageBilling = {
        id: uuidv4(),
        nestId,
        subscriptionId: subscription.id,
        period: {
          start: subscription.currentPeriodStart,
          end: subscription.currentPeriodEnd,
        },
        usage: {
          requests: subscription.usage.requests,
          storage: subscription.usage.storage,
          bandwidth: subscription.usage.bandwidth,
          overageRequests: Math.max(0, subscription.usage.requests - plan.limits.requestsPerMonth),
          overageStorage: Math.max(0, subscription.usage.storage - plan.limits.storageGB * 1024 * 1024 * 1024),
          overageBandwidth: Math.max(0, subscription.usage.bandwidth - plan.limits.bandwidthGB * 1024 * 1024 * 1024),
        },
        costs: {
          baseSubscription: plan.price.monthly,
          overageRequests: overageCosts.requests,
          overageStorage: overageCosts.storage,
          overageBandwidth: overageCosts.bandwidth,
          total: overageCosts.total,
        },
        status: 'finalized',
        createdAt: Date.now(),
        finalizedAt: Date.now(),
      };

      await this.storage.createUsageBilling(billing);

      // Create payment for overage
      const paymentResult = await this.createPayment(
        nestId,
        subscription.id,
        'overage',
        overageCosts.total,
        'Usage overage charges'
      );

      return { success: true, billing };
    } catch (error: any) {
      console.error('Error processing usage billing:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(nestId: string): Promise<{
    subscription?: Subscription;
    plan?: SubscriptionPlan;
    usage?: any;
    billing?: UsageBilling[];
  } | null> {
    try {
      const subscription = await this.storage.getSubscriptionByNest(nestId);
      if (!subscription) return null;

      const plan = getPlan(subscription.planId);
      const currentBilling = await this.storage.getCurrentBilling(nestId);

      return {
        subscription,
        plan: plan || undefined,
        usage: subscription.usage,
        billing: currentBilling ? [currentBilling] : [],
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      return null;
    }
  }

  /**
   * Helper methods
   */
  private calculateProration(
    currentPlan: SubscriptionPlan,
    newPlan: SubscriptionPlan,
    daysRemaining: number,
    isYearly: boolean
  ): string {
    const currentPrice = BigInt(isYearly ? currentPlan.price.yearly : currentPlan.price.monthly);
    const newPrice = BigInt(isYearly ? newPlan.price.yearly : newPlan.price.monthly);
    
    const totalDays = isYearly ? 365 : 30;
    const dailyCurrentPrice = currentPrice / BigInt(totalDays);
    const dailyNewPrice = newPrice / BigInt(totalDays);
    
    const refund = dailyCurrentPrice * BigInt(daysRemaining);
    const charge = dailyNewPrice * BigInt(daysRemaining);
    
    const netAmount = charge - refund;
    
    return netAmount > 0n ? netAmount.toString() : '0';
  }

  private async createEvent(
    subscriptionId: string,
    type: SubscriptionEvent['type'],
    data: Record<string, any>
  ): Promise<void> {
    try {
      const subscription = await this.storage.getSubscription(subscriptionId);
      if (!subscription) return;

      const event: SubscriptionEvent = {
        id: uuidv4(),
        nestId: subscription.nestId,
        subscriptionId,
        type,
        data,
        createdAt: Date.now(),
      };

      await this.storage.createEvent(event);
    } catch (error) {
      console.error('Error creating event:', error);
    }
  }
}