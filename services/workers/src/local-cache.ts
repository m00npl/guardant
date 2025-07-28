import * as fs from 'fs';
import * as path from 'path';
import amqp from 'amqplib';

// Types for cached data
interface CachedCheckResult {
  id: string;
  serviceId: string;
  nestId: string;
  timestamp: number;
  region: string;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  statusCode?: number;
  error?: string;
  retryCount: number;
  nextRetryAt: number;
}

interface LocalCacheConfig {
  cacheDir?: string;
  maxRetries?: number;
  retryDelayMs?: number;
  maxCacheSize?: number;
  rabbitmqUrl?: string;
  flushIntervalMs?: number;
}

export class LocalCache {
  private config: Required<LocalCacheConfig>;
  private cache: Map<string, CachedCheckResult> = new Map();
  private rabbitmqConnection: amqp.Connection | null = null;
  private rabbitmqChannel: amqp.Channel | null = null;
  private retryQueue: CachedCheckResult[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;

  constructor(config: LocalCacheConfig = {}) {
    this.config = {
      cacheDir: config.cacheDir || path.join(process.cwd(), '.worker-cache'),
      maxRetries: config.maxRetries || 5,
      retryDelayMs: config.retryDelayMs || 30000, // 30 seconds
      maxCacheSize: config.maxCacheSize || 1000,
      rabbitmqUrl: config.rabbitmqUrl || process.env.RABBITMQ_URL || 'amqp://localhost:5672',
      flushIntervalMs: config.flushIntervalMs || 60000, // 1 minute
    };

    this.initializeCache();
    this.connectRabbitMQ();
    this.startFlushTimer();
  }

  private initializeCache(): void {
    try {
      // Create cache directory if it doesn't exist
      if (!fs.existsSync(this.config.cacheDir)) {
        fs.mkdirSync(this.config.cacheDir, { recursive: true });
        console.log(`📁 Created worker cache directory: ${this.config.cacheDir}`);
      }

      // Load existing cache from disk
      this.loadCacheFromDisk();
      console.log(`💾 Local cache initialized with ${this.cache.size} entries`);
    } catch (error) {
      console.error('❌ Failed to initialize local cache:', error);
    }
  }

  private async connectRabbitMQ(): Promise<void> {
    try {
      console.log('🔄 Connecting to RabbitMQ...');
      this.rabbitmqConnection = await amqp.connect(this.config.rabbitmqUrl);
      this.rabbitmqChannel = await this.rabbitmqConnection.createChannel();

      // Declare queue for worker results
      await this.rabbitmqChannel.assertQueue('worker_results', {
        durable: true,
      });

      this.isConnected = true;
      console.log('✅ Connected to RabbitMQ');

      // Handle connection errors
      this.rabbitmqConnection.on('error', (error) => {
        console.error('❌ RabbitMQ connection error:', error);
        this.isConnected = false;
        this.scheduleReconnect();
      });

      this.rabbitmqConnection.on('close', () => {
        console.warn('⚠️ RabbitMQ connection closed');
        this.isConnected = false;
        this.scheduleReconnect();
      });

      // Process cached results that failed to send
      await this.processCachedResults();
    } catch (error) {
      console.error('❌ Failed to connect to RabbitMQ:', error);
      this.isConnected = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    setTimeout(() => {
      if (!this.isConnected) {
        console.log('🔄 Attempting to reconnect to RabbitMQ...');
        this.connectRabbitMQ();
      }
    }, this.config.retryDelayMs);
  }

  /**
   * Store check result - either send to RabbitMQ or cache locally if connection failed
   */
  async storeCheckResult(result: Omit<CachedCheckResult, 'retryCount' | 'nextRetryAt'>): Promise<void> {
    const cacheResult: CachedCheckResult = {
      ...result,
      retryCount: 0,
      nextRetryAt: Date.now(),
    };

    if (this.isConnected && this.rabbitmqChannel) {
      try {
        // Try to send directly to RabbitMQ
        await this.sendToRabbitMQ(cacheResult);
        console.log(`📤 Sent check result for service ${result.serviceId} to RabbitMQ`);
        return;
      } catch (error) {
        console.warn(`⚠️ Failed to send to RabbitMQ, caching locally:`, error);
        this.isConnected = false;
      }
    }

    // Cache locally if RabbitMQ unavailable
    this.addToCache(cacheResult);
    await this.saveCacheToDisk();
    console.log(`💾 Cached check result for service ${result.serviceId} locally`);
  }

  private async sendToRabbitMQ(result: CachedCheckResult): Promise<void> {
    if (!this.rabbitmqChannel) {
      throw new Error('RabbitMQ channel not available');
    }

    const message = Buffer.from(JSON.stringify(result));
    await this.rabbitmqChannel.sendToQueue('worker_results', message, {
      persistent: true,
      timestamp: Date.now(),
      messageId: result.id,
    });
  }

  private addToCache(result: CachedCheckResult): void {
    // Prevent cache from growing too large
    if (this.cache.size >= this.config.maxCacheSize) {
      // Remove oldest entries
      const sortedEntries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = sortedEntries.slice(0, Math.floor(this.config.maxCacheSize * 0.1));
      toRemove.forEach(([key]) => this.cache.delete(key));
      
      console.log(`🧹 Cleaned ${toRemove.length} old cache entries`);
    }

    this.cache.set(result.id, result);
  }

  /**
   * Process all cached results and try to send them to RabbitMQ
   */
  private async processCachedResults(): Promise<void> {
    if (!this.isConnected || this.cache.size === 0) {
      return;
    }

    console.log(`🔄 Processing ${this.cache.size} cached results...`);
    const now = Date.now();
    let processed = 0;
    let failed = 0;

    for (const [key, result] of this.cache.entries()) {
      // Skip if not ready for retry
      if (result.nextRetryAt > now) {
        continue;
      }

      // Skip if too many retries
      if (result.retryCount >= this.config.maxRetries) {
        console.warn(`⚠️ Max retries exceeded for result ${result.id}, removing from cache`);
        this.cache.delete(key);
        continue;
      }

      try {
        await this.sendToRabbitMQ(result);
        this.cache.delete(key);
        processed++;
        console.log(`✅ Successfully sent cached result ${result.id}`);
      } catch (error) {
        // Update retry info
        result.retryCount++;
        result.nextRetryAt = now + (this.config.retryDelayMs * Math.pow(2, result.retryCount)); // Exponential backoff
        failed++;
        console.warn(`⚠️ Failed to send cached result ${result.id}, retry ${result.retryCount}/${this.config.maxRetries}`);
      }
    }

    if (processed > 0 || failed > 0) {
      console.log(`📊 Cache flush: ${processed} sent, ${failed} failed, ${this.cache.size} remaining`);
      await this.saveCacheToDisk();
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.isConnected && this.cache.size > 0) {
        this.processCachedResults().catch(error => {
          console.error('❌ Error during cache flush:', error);
        });
      }
    }, this.config.flushIntervalMs);
  }

  /**
   * Save cache to disk for persistence across worker restarts
   */
  private async saveCacheToDisk(): Promise<void> {
    try {
      const cacheFile = path.join(this.config.cacheDir, 'worker-cache.json');
      const cacheData = Array.from(this.cache.entries());
      await fs.promises.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      console.error('❌ Failed to save cache to disk:', error);
    }
  }

  /**
   * Load cache from disk on startup
   */
  private loadCacheFromDisk(): void {
    try {
      const cacheFile = path.join(this.config.cacheDir, 'worker-cache.json');
      if (fs.existsSync(cacheFile)) {
        const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        this.cache = new Map(cacheData);
        console.log(`💾 Loaded ${this.cache.size} entries from disk cache`);
      }
    } catch (error) {
      console.error('❌ Failed to load cache from disk:', error);
      this.cache = new Map();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    pendingRetries: number;
    failedEntries: number;
    isConnected: boolean;
    oldestEntry?: number;
    newestEntry?: number;
  } {
    const now = Date.now();
    let pendingRetries = 0;
    let failedEntries = 0;
    let oldestEntry: number | undefined;
    let newestEntry: number | undefined;

    for (const result of this.cache.values()) {
      if (result.nextRetryAt > now) {
        pendingRetries++;
      }
      if (result.retryCount >= this.config.maxRetries) {
        failedEntries++;
      }
      
      if (!oldestEntry || result.timestamp < oldestEntry) {
        oldestEntry = result.timestamp;
      }
      if (!newestEntry || result.timestamp > newestEntry) {
        newestEntry = result.timestamp;
      }
    }

    return {
      totalEntries: this.cache.size,
      pendingRetries,
      failedEntries,
      isConnected: this.isConnected,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Force flush all cached results
   */
  async forceFlush(): Promise<void> {
    console.log('🔄 Force flushing cache...');
    await this.processCachedResults();
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    console.log('🧹 Clearing all cached data...');
    this.cache.clear();
    
    try {
      const cacheFile = path.join(this.config.cacheDir, 'worker-cache.json');
      if (fs.existsSync(cacheFile)) {
        fs.unlinkSync(cacheFile);
      }
    } catch (error) {
      console.error('❌ Failed to clear cache file:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down local cache...');
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Try to flush remaining cache entries
    if (this.cache.size > 0) {
      await this.processCachedResults();
      await this.saveCacheToDisk();
    }

    // Close RabbitMQ connection
    if (this.rabbitmqChannel) {
      await this.rabbitmqChannel.close();
    }
    if (this.rabbitmqConnection) {
      await this.rabbitmqConnection.close();
    }

    console.log('✅ Local cache shutdown complete');
  }
}

// Export singleton instance
export const localCache = new LocalCache();