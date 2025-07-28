import * as fs from "fs";
import * as path from "path";
import { Logger, type ILogObj } from "tslog";

const xdg = require("xdg-portable");

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  synced: boolean; // Whether this entry has been synced to Golem Base
  entityKey?: string; // Golem Base entity key when synced
}

export interface CacheStats {
  totalEntries: number;
  unsyncedEntries: number;
  cacheSize: number; // Size in bytes
  lastSync: string | null;
  enabled: boolean;
}

export interface SyncLogEntry {
  timestamp: string;
  success: boolean;
  synced: number;
  failed: number;
  duration: number; // in ms
  error?: string;
  details?: string;
}

export class CacheManager {
  private cachePath: string;
  private cache: Map<string, CacheEntry> = new Map();
  private logger: Logger<ILogObj>;
  private syncInProgress: boolean = false;
  private syncLog: SyncLogEntry[] = [];
  private maxSyncLogEntries: number = 100; // Keep last 100 sync attempts

  constructor() {
    // Check if we are in a Docker container and if cache.json is mounted
    // Use mounted file if exists, otherwise default
    const dockerCachePath = "/app/cache/cache.json";
    const defaultCachePath = path.join(
      xdg.cache(),
      "guardant-cache",
      "cache.json"
    );

    // Użyj montowanego pliku jeśli istnieje, w przeciwnym razie domyślny
    this.cachePath = fs.existsSync(dockerCachePath)
      ? dockerCachePath
      : defaultCachePath;

    this.logger = new Logger<ILogObj>({
      type: "pretty",
      minLevel: 3,
    });

    console.log(`📁 Using cache path: ${this.cachePath}`);
    this.ensureCacheDirectory();
    this.loadCache();
    this.loadSyncLog();
  }

  private ensureCacheDirectory() {
    const cacheDir = path.dirname(this.cachePath);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
      console.log(`📁 Created cache directory: ${cacheDir}`);
    }
  }

  private loadCache() {
    try {
      if (fs.existsSync(this.cachePath)) {
        const cacheData = JSON.parse(fs.readFileSync(this.cachePath, "utf8"));

        // Validate and clean cache entries
        const validEntries = new Map();
        let invalidEntries = 0;

        for (const [key, value] of Object.entries(cacheData)) {
          if (
            value &&
            typeof value === "object" &&
            "key" in value &&
            "data" in value &&
            "timestamp" in value &&
            "synced" in value
          ) {
            validEntries.set(key, value);
          } else {
            invalidEntries++;
            console.warn(`⚠️ Invalid cache entry found, skipping: ${key}`);
          }
        }

        this.cache = validEntries;

        console.log(
          `💾 Loaded ${this.cache.size} cache entries from ${this.cachePath}`
        );
        if (invalidEntries > 0) {
          console.warn(`⚠️ Skipped ${invalidEntries} invalid cache entries`);
        }

        // Save the cleaned cache back to disk
        if (invalidEntries > 0) {
          this.saveCache();
        }
      } else {
        console.log(`💾 No existing cache found at ${this.cachePath}`);
      }
    } catch (error) {
      console.error("❌ Failed to load cache:", error);
      this.cache = new Map();
    }
  }

  private saveCache() {
    try {
      const cacheObject = Object.fromEntries(this.cache);
      fs.writeFileSync(this.cachePath, JSON.stringify(cacheObject, null, 2));
      console.log(`💾 Cache saved to ${this.cachePath}`);
    } catch (error) {
      console.error("❌ Failed to save cache:", error);
    }
  }

  private loadSyncLog() {
    try {
      const syncLogPath = this.cachePath.replace(".json", ".sync.log");
      if (fs.existsSync(syncLogPath)) {
        const logData = fs.readFileSync(syncLogPath, "utf8");
        this.syncLog = logData
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => JSON.parse(line))
          .slice(-this.maxSyncLogEntries); // Keep only recent entries
      }
    } catch (error) {
      console.warn("⚠️ Failed to load sync log:", error);
      this.syncLog = [];
    }
  }

  private saveSyncLogEntry(entry: SyncLogEntry) {
    try {
      this.syncLog.push(entry);
      if (this.syncLog.length > this.maxSyncLogEntries) {
        this.syncLog = this.syncLog.slice(-this.maxSyncLogEntries);
      }

      const syncLogPath = this.cachePath.replace(".json", ".sync.log");
      const logLine = JSON.stringify(entry) + "\n";
      fs.appendFileSync(syncLogPath, logLine);
    } catch (error) {
      console.warn("⚠️ Failed to save sync log entry:", error);
    }
  }

  store(key: string, data: any): void {
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      synced: false,
    };

    this.cache.set(key, entry);
    this.saveCache();
  }

  get(key: string): CacheEntry | null {
    return this.cache.get(key) || null;
  }

  remove(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.saveCache();
    }
    return deleted;
  }

  // Mark an entry as synced to Golem Base
  markAsSynced(key: string, entityKey?: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.synced = true;
      entry.entityKey = entityKey;
      this.cache.set(key, entry);
      this.saveCache();
    }
  }

  // Get entries by pattern (supports wildcards)
  getByPattern(pattern: string): CacheEntry[] {
    const regex = new RegExp(
      pattern.replace(/\*/g, ".*").replace(/\?/g, "."),
      "i"
    );
    return Array.from(this.cache.values()).filter((entry) =>
      regex.test(entry.key)
    );
  }

  // Get all unsynced entries
  getUnsyncedEntries(): CacheEntry[] {
    return Array.from(this.cache.values()).filter((entry) => !entry.synced);
  }

  // Sync unsynced entries with Golem Base
  async syncWithGolemBase(golemStorage: any): Promise<{ synced: number; failed: number }> {
    if (this.syncInProgress) {
      console.log("🔄 Sync already in progress, skipping...");
      return { synced: 0, failed: 0 };
    }

    this.syncInProgress = true;
    const startTime = Date.now();
    let synced = 0;
    let failed = 0;

    const syncEntry: SyncLogEntry = {
      timestamp: new Date().toISOString(),
      success: false,
      synced: 0,
      failed: 0,
      duration: 0,
    };

    try {
      const unsyncedEntries = this.getUnsyncedEntries();
      console.log(`🔄 Starting sync of ${unsyncedEntries.length} unsynced entries...`);

      // Process entries in small batches to avoid overwhelming Golem Base
      const batchSize = 5;
      for (let i = 0; i < unsyncedEntries.length; i += batchSize) {
        const batch = unsyncedEntries.slice(i, i + batchSize);
        
        for (const entry of batch) {
          try {
            // Try to store in Golem Base
            const entityKey = await golemStorage.storeData(
              entry.key,
              entry.data,
              3600 // 1 hour TTL
            );

            if (entityKey) {
              this.markAsSynced(entry.key, entityKey);
              synced++;
              console.log(`✅ Synced entry: ${entry.key} -> ${entityKey}`);
            } else {
              failed++;
              console.warn(`⚠️ Failed to sync entry (no entity key): ${entry.key}`);
            }
          } catch (error) {
            failed++;
            console.error(`❌ Failed to sync entry: ${entry.key}`, error);
          }

          // Small delay between entries to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Longer delay between batches
        if (i + batchSize < unsyncedEntries.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      syncEntry.success = true;
      syncEntry.synced = synced;
      syncEntry.failed = failed;
      syncEntry.duration = Date.now() - startTime;

      console.log(
        `✅ Sync completed: ${synced} synced, ${failed} failed in ${syncEntry.duration}ms`
      );
    } catch (error) {
      syncEntry.success = false;
      syncEntry.error = error instanceof Error ? error.message : String(error);
      syncEntry.duration = Date.now() - startTime;
      console.error("❌ Sync process failed:", error);
    } finally {
      this.syncInProgress = false;
      this.saveSyncLogEntry(syncEntry);
    }

    return { synced, failed };
  }

  // Get cache statistics
  getStats(): CacheStats {
    const totalEntries = this.cache.size;
    const unsyncedEntries = this.getUnsyncedEntries().length;
    const cacheSize = JSON.stringify(Object.fromEntries(this.cache)).length;
    const lastSync = this.syncLog.length > 0 
      ? this.syncLog[this.syncLog.length - 1].timestamp 
      : null;

    return {
      totalEntries,
      unsyncedEntries,
      cacheSize,
      lastSync,
      enabled: true,
    };
  }

  // Get sync history
  getSyncHistory(): SyncLogEntry[] {
    return [...this.syncLog];
  }

  // Clean up old entries
  cleanup(maxAgeHours: number = 24): number {
    const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000;
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      // Only remove synced entries that are old
      if (entry.synced && entry.timestamp < cutoffTime) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.saveCache();
    }

    return cleaned;
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.saveCache();
    console.log("💾 Cache cleared");
  }

  // Get cache size info
  getCacheInfo(): {
    path: string;
    size: number;
    entries: number;
    unsyncedEntries: number;
    lastModified: string | null;
  } {
    let lastModified: string | null = null;
    try {
      if (fs.existsSync(this.cachePath)) {
        const stats = fs.statSync(this.cachePath);
        lastModified = stats.mtime.toISOString();
      }
    } catch (error) {
      // Ignore error
    }

    return {
      path: this.cachePath,
      size: JSON.stringify(Object.fromEntries(this.cache)).length,
      entries: this.cache.size,
      unsyncedEntries: this.getUnsyncedEntries().length,
      lastModified,
    };
  }
}