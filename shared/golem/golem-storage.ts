import * as fs from "fs";
import { Logger, type ILogObj } from "tslog";
const xdg = require("xdg-portable");
import {
  createClient,
  type GolemBaseCreate,
  Tagged,
  type AccountData,
} from "golem-base-sdk";
import { CacheManager, type CacheStats } from "./cache-manager";

export interface StoredData {
  timestamp: number;
  data: any;
  entityKey?: string;
}

export interface GolemConfig {
  chainId: number;
  httpUrl: string;
  wsUrl: string;
  privateKeyPath?: string;
}

export class GolemStorage {
  private client: any;
  private logger: Logger<ILogObj>;
  private isConnected: boolean = false;
  private config: GolemConfig;
  private cacheManager: CacheManager;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private serverId: string;
  private conflictResolutionMode: "timestamp" | "merge" = "timestamp";

  constructor(config?: Partial<GolemConfig>) {
    this.config = {
      chainId: parseInt(process.env.GOLEM_CHAIN_ID || "600606", 10), // Kaolin Network ID
      httpUrl:
        process.env.GOLEM_HTTP_URL ||
        "https://kaolin.holesky.golem-base.io/rpc",
      wsUrl:
        process.env.GOLEM_WS_URL || "wss://kaolin.holesky.golem-base.io/rpc/ws",
      privateKeyPath: xdg.config() + "/golembase/private.key",
      ...config,
    };

    this.logger = new Logger<ILogObj>({
      type: "pretty",
      minLevel: 3,
    });

    // Initialize cache manager
    this.cacheManager = new CacheManager();

    // Generate unique server ID
    this.serverId = this.generateServerId();
    console.log(`🆔 Server ID: ${this.serverId}`);

    // Set up private key if it doesn't exist
    this.setupPrivateKey();

    // Initialize client asynchronously
    this.initializeClient().catch((error) => {
      console.error("Failed to initialize Golem Base client:", error);
    });
  }

  private generateServerId(): string {
    const crypto = require("crypto");
    const hostname = require("os").hostname();
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString("hex");
    return `${hostname}-${timestamp}-${random}`;
  }

  private setupPrivateKey() {
    try {
      const keyPath = this.config.privateKeyPath!;
      const path = require("path");
      const keyDir = path.dirname(keyPath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(keyDir)) {
        fs.mkdirSync(keyDir, { recursive: true });
        console.log(`📁 Created Golem Base config directory: ${keyDir}`);
      }

      // Create private key file if it doesn't exist
      if (!fs.existsSync(keyPath)) {
        // Use private key from environment variable
        const privateKey = process.env.GOLEM_PRIVATE_KEY;
        if (!privateKey) {
          console.error("❌ GOLEM_PRIVATE_KEY environment variable not set");
          console.error("📝 Please set GOLEM_PRIVATE_KEY in your .env file");
          return;
        }

        const keyBuffer = Buffer.from(privateKey, "hex");
        fs.writeFileSync(keyPath, keyBuffer);
        console.log(`🔑 Created private key file: ${keyPath}`);

        const walletAddress =
          process.env.GOLEM_WALLET_ADDRESS ||
          "0x897c8acf91a4aa5f3a323da58b34f0f71508248d";
        console.log(`💰 Wallet address: ${walletAddress}`);
      }
    } catch (error) {
      console.error("❌ Failed to setup private key:", error);
    }
  }

  private async initializeClient() {
    try {
      // For now, we'll create a read-only client since we don't have the private key
      // In production, you would need to configure the private key properly
      console.log("🔄 Initializing Golem Base client");
      const walletAddress =
        process.env.GOLEM_WALLET_ADDRESS ||
        "0x897c8acf91a4aa5f3a323da58b34f0f71508248d";
      console.log(`💡 Wallet address: ${walletAddress}`);

      // Check if private key exists for full functionality
      if (fs.existsSync(this.config.privateKeyPath!)) {
        const keyBytes = fs.readFileSync(this.config.privateKeyPath!);
        const key: AccountData = new Tagged(
          "privatekey",
          new Uint8Array(keyBytes)
        );

        this.client = await createClient(
          this.config.chainId,
          key,
          this.config.httpUrl,
          this.config.wsUrl,
          this.logger
        );

        this.isConnected = true;
        console.log(
          "✅ Golem Base client initialized successfully (full access)"
        );

        // Start automatic sync of cached data
        this.startAutoSync();
      } else {
        // Create read-only client
        console.warn("⚠️  Private key not found. Running in read-only mode.");
        console.warn("📝 To enable full Golem Base integration:");
        console.warn(
          `   1. Set up private key at: ${this.config.privateKeyPath}`
        );
        const walletAddress =
          process.env.GOLEM_WALLET_ADDRESS ||
          "0x897c8acf91a4aa5f3a323da58b34f0f71508248d";
        console.warn(`   2. Fund the account: ${walletAddress}`);
        this.isConnected = false;
      }
    } catch (error) {
      console.error("❌ Failed to initialize Golem Base client:", error);
      this.isConnected = false;

      // Start reconnection attempts
      this.startReconnectionAttempts();
    }
  }

  // Public method to wait for connection
  async waitForConnection(timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();

    while (!this.isConnected && Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms
    }

    return this.isConnected;
  }

  async storeData(
    key: string,
    data: any,
    ttl: number = 3600
  ): Promise<string | null> {
    const timestamp = Date.now();

    // Always cache the data first (for offline support)
    this.cacheManager.store(key, data);

    if (!this.isConnected || !this.client) {
      console.warn(
        `⚠️  Golem Base not connected. Data cached for later sync: ${key}`
      );
      return null;
    }

    try {
      // Check if this exact data was already synced recently (avoid duplicates)
      const cachedEntry = this.cacheManager.get(key);
      if (cachedEntry?.entityKey && cachedEntry.timestamp) {
        const timeDiff = timestamp - cachedEntry.timestamp;
        // Skip if same data was synced within last 30 seconds
        if (timeDiff < 30000 && JSON.stringify(cachedEntry.data) === JSON.stringify(data)) {
          if (process.env.VERBOSE_LOGS === "true") {
            console.log(`⏭️  Skipping duplicate sync for key: ${key} (synced ${Math.round(timeDiff/1000)}s ago)`);
          }
          return cachedEntry.entityKey;
        }
      }

      // Check for existing data to handle conflicts
      const existingData = await this.retrieveDataWithoutCache(key);

      if (process.env.VERBOSE_LOGS === "true") {
        console.log("storeData:", { key, data });
      }

      // Prepare entity data with server identification and conflict resolution metadata
      const entityPayload: any = {
        key,
        data, // <-- added field with correct data!
        timestamp,
        serverId: this.serverId,
        version: 1, // Start with version 1
        conflictResolution: this.conflictResolutionMode,
      };

      // Log zakodowanego payloadu
      const encoded = new TextEncoder().encode(JSON.stringify(entityPayload));
      console.log(
        "Encoded payload length:",
        encoded.length,
        "Preview:",
        Array.from(encoded).slice(0, 20)
      );

      // Handle conflicts if existing data found
      if (existingData) {
        const existingPayload = JSON.parse(
          new TextDecoder().decode(existingData.data)
        );

        if (this.shouldResolveConflict(entityPayload, existingPayload)) {
          console.log(`🔄 Resolving conflict for key: ${key}`);
          entityPayload.version = (existingPayload.version || 1) + 1;
          entityPayload.previousServerId = existingPayload.serverId;
          entityPayload.conflictResolvedAt = timestamp;
        } else {
          console.log(
            `⏭️  Skipping write due to conflict resolution for key: ${key}`
          );
          return existingData.entityKey || null;
        }
      }

      const entityData: GolemBaseCreate = {
        data: encoded,
        btl: ttl, // block time to live
        stringAnnotations: [
          { key: "type", value: "guardant-data" },
          { key: "key", value: key },
          { key: "serverId", value: this.serverId },
          { key: "version", value: entityPayload.version.toString() },
        ],
        numericAnnotations: [
          { key: "timestamp", value: timestamp },
          { key: "version", value: entityPayload.version },
        ],
      };

      // Try to create entity with retry logic for nonce collisions
      let results;
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          results = await this.client.createEntities([entityData]);
          break; // Success, exit retry loop
        } catch (error: any) {
          retries++;
          
          // Check if it's a nonce/replacement transaction error
          if (error.message?.includes("replacement transaction underpriced") || 
              error.message?.includes("nonce too low") ||
              error.details?.includes("replacement transaction underpriced")) {
            
            if (retries < maxRetries) {
              const delay = 1000 * retries; // Increasing delay: 1s, 2s, 3s
              console.warn(`⚠️  Transaction conflict detected (attempt ${retries}/${maxRetries}), retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          
          // If it's not a nonce issue or we've exhausted retries, throw the error
          throw error;
        }
      }

      if (results && results.length > 0) {
        const entityKey = results[0].entityKey;
        // Mark as synced in cache
        this.cacheManager.markAsSynced(key, entityKey);
        console.log(
          `✅ Data stored in Golem Base with key: ${entityKey} (v${entityPayload.version})${retries > 0 ? ` (after ${retries} retries)` : ''}`
        );
        return entityKey;
      }

      return null;
    } catch (error: any) {
      // Handle specific transaction errors more gracefully
      if (error.message?.includes("replacement transaction underpriced")) {
        console.warn(`⚠️  Transaction underpriced for key: ${key} - data cached locally`);
        return null; // Data is already cached, sync will retry later
      }
      
      console.error("❌ Failed to store data in Golem Base:", error);
      return null;
    }
  }

  async retrieveData(key: string): Promise<StoredData | null> {
    // Try cache first for faster access
    const cached = this.cacheManager.get(key);
    if (cached) {
      return {
        timestamp: cached.timestamp,
        data: cached.data,
        entityKey: cached.entityKey,
      };
    }

    if (!this.isConnected || !this.client) {
      console.warn("Golem Base client not connected. Cannot retrieve data.");
      return null;
    }

    try {
      // Query all entities of our owner and filter by key
      const walletAddress =
        process.env.GOLEM_WALLET_ADDRESS ||
        "0x897c8acf91a4aa5f3a323da58b34f0f71508248d";
      
      const allEntities = await this.client.getEntitiesOfOwner(walletAddress);

      // Filter by key annotation
      const entities = allEntities.filter((entity: any) => {
        try {
          const dataString = new TextDecoder().decode(entity.data);
          const data = JSON.parse(dataString);
          return data.key === key;
        } catch {
          return false;
        }
      });

      if (entities && entities.length > 0) {
        // Get the most recent entity
        const entity = entities[0];
        const dataString = new TextDecoder().decode(entity.data);
        const parsedData = JSON.parse(dataString);

        return {
          timestamp: parsedData.timestamp,
          data: parsedData.data,
          entityKey: entity.entityKey,
        };
      }

      return null;
    } catch (error) {
      console.error("❌ Failed to retrieve data from Golem Base:", error);
      return null;
    }
  }

  // Retrieve data without using cache (for conflict detection)
  private async retrieveDataWithoutCache(
    key: string
  ): Promise<{ data: Uint8Array; entityKey?: string } | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const walletAddress =
        process.env.GOLEM_WALLET_ADDRESS ||
        "0x897c8acf91a4aa5f3a323da58b34f0f71508248d";
        
      const allEntities = await this.client.getEntitiesOfOwner(walletAddress);

      // Filter by key annotation and get the most recent version
      const entities = allEntities
        .filter((entity: any) => {
          const keyAnnotation = entity.stringAnnotations?.find(
            (ann: any) => ann.key === "key"
          );
          return keyAnnotation?.value === key;
        })
        .sort((a: any, b: any) => {
          const aVersion =
            a.numericAnnotations?.find((ann: any) => ann.key === "version")
              ?.value || 1;
          const bVersion =
            b.numericAnnotations?.find((ann: any) => ann.key === "version")
              ?.value || 1;
          return bVersion - aVersion; // Sort by version descending
        });

      if (entities && entities.length > 0) {
        return {
          data: entities[0].data,
          entityKey: entities[0].entityKey,
        };
      }

      return null;
    } catch (error) {
      console.error("❌ Failed to retrieve data without cache:", error);
      return null;
    }
  }

  // Determine if a conflict should be resolved (newer timestamp wins)
  private shouldResolveConflict(newData: any, existingData: any): boolean {
    switch (this.conflictResolutionMode) {
      case "timestamp":
        // Newer timestamp wins
        return newData.timestamp > (existingData.timestamp || 0);

      case "merge":
        // For merge mode, always resolve (merge logic would be implemented per data type)
        return true;

      default:
        return newData.timestamp > (existingData.timestamp || 0);
    }
  }

  async updateData(entityKey: string, data: any): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      console.warn("Golem Base client not connected. Cannot update data.");
      return false;
    }

    try {
      const updatedData = {
        entityKey,
        data: new TextEncoder().encode(
          JSON.stringify({ ...data, timestamp: Date.now() })
        ),
        btl: 3600, // 1 hour
        stringAnnotations: [],
        numericAnnotations: [],
      };

      await this.client.updateEntities([updatedData]);
      if (process.env.VERBOSE_LOGS === "true") {
        console.log(`✅ Data updated in Golem Base for entity: ${entityKey}`);
      }
      return true;
    } catch (error) {
      console.error("❌ Failed to update data in Golem Base:", error);
      return false;
    }
  }

  async deleteData(entityKey: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      console.warn("Golem Base client not connected. Cannot delete data.");
      return false;
    }

    try {
      await this.client.deleteEntities([entityKey]);
      if (process.env.VERBOSE_LOGS === "true") {
        console.log(`✅ Data deleted from Golem Base for entity: ${entityKey}`);
      }
      return true;
    } catch (error) {
      console.error("❌ Failed to delete data from Golem Base:", error);
      return false;
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }

  // Manual sync method
  async syncCache(): Promise<{ synced: number; failed: number }> {
    if (!this.isConnected) {
      return { synced: 0, failed: 0 };
    }
    return await this.cacheManager.syncWithGolemBase(this);
  }

  // Get cache statistics
  getCacheStats(): CacheStats {
    return this.cacheManager.getStats();
  }

  // Clear cache
  clearCache(): void {
    this.cacheManager.clear();
  }

  // Get cache manager for direct access
  getCacheManager(): CacheManager {
    return this.cacheManager;
  }

  // Start automatic sync
  private startAutoSync(): void {
    // Initial sync after 60 seconds (give more time for startup)
    setTimeout(() => {
      this.performAutoSync();
    }, 60 * 1000);

    // Then sync every 10 minutes (reduced frequency to avoid nonce collisions)
    const syncInterval = parseInt(process.env.SYNC_INTERVAL || "600", 10) * 1000; // Default 10 minutes
    setInterval(() => {
      this.performAutoSync();
    }, syncInterval);

    console.log(`🔄 Auto-sync scheduled every ${syncInterval / 1000} seconds`);
  }

  // Perform automatic sync
  private async performAutoSync(): Promise<void> {
    if (!this.isConnected) {
      console.log("⏳ Skipping auto-sync - not connected to Golem Base");
      return;
    }

    try {
      console.log("🔄 Starting automatic cache sync with Golem Base...");
      const result = await this.syncCache();
      console.log(
        `✅ Auto-sync completed: ${result.synced} synced, ${result.failed} failed`
      );
    } catch (error) {
      console.error("❌ Auto-sync failed:", error);
    }
  }

  // Start automatic reconnection attempts
  private startReconnectionAttempts() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }

    this.reconnectInterval = setInterval(async () => {
      if (
        this.isConnected ||
        this.reconnectAttempts >= this.maxReconnectAttempts
      ) {
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
        return;
      }

      this.reconnectAttempts++;
      const delay = Math.min(
        5000 * Math.pow(2, this.reconnectAttempts - 1),
        60000
      ); // Exponential backoff, max 1 minute

      console.log(
        `🔄 Attempting to reconnect to Golem Base (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );

      try {
        await this.initializeClient();

        if (this.isConnected) {
          if (process.env.VERBOSE_LOGS === "true") {
            console.log("✅ Reconnected to Golem Base successfully");
          }
          this.reconnectAttempts = 0;

          // Trigger sync when reconnected
          await this.onReconnected();

          if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
          }
        }
      } catch (error) {
        console.error(
          `❌ Reconnection attempt ${this.reconnectAttempts} failed:`,
          error
        );
      }

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, delay));
    }, 1000);
  }

  // Handle successful reconnection
  private async onReconnected() {
    console.log("🔄 Handling reconnection - syncing cached data...");

    try {
      const result = await this.cacheManager.syncWithGolemBase(this);
      console.log(
        `✅ Reconnection sync completed: ${result.synced} entries synced, ${result.failed} failed`
      );

      // Clean up old cache entries
      const cleaned = this.cacheManager.cleanup(30);
      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} old cache entries`);
      }
    } catch (error) {
      console.error("❌ Failed to sync data after reconnection:", error);
    }
  }

  // Stop reconnection attempts (useful for graceful shutdown)
  stopReconnectionAttempts() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    this.reconnectAttempts = 0;
  }

  // Check connection health and trigger reconnection if needed
  async checkConnectionHealth(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const walletAddress =
        process.env.GOLEM_WALLET_ADDRESS ||
        "0x897c8acf91a4aa5f3a323da58b34f0f71508248d";
        
      // Try a simple operation to test connection
      await this.client.getEntitiesOfOwner(walletAddress, { limit: 1 });
      return true;
    } catch (error) {
      console.warn(
        "⚠️  Connection health check failed, marking as disconnected"
      );
      this.isConnected = false;
      this.startReconnectionAttempts();
      return false;
    }
  }

  getStatus(): {
    connected: boolean;
    config: GolemConfig;
    cacheStats: CacheStats;
    reconnectAttempts: number;
    serverId: string;
  } {
    return {
      connected: this.isConnected,
      config: this.config,
      cacheStats: this.getCacheStats(),
      reconnectAttempts: this.reconnectAttempts,
      serverId: this.serverId,
    };
  }
}

// Export a singleton instance
export const golemStorage = new GolemStorage();