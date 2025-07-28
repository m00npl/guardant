/**
 * GuardAnt Golem Base Adapter
 * Bridges the GuardAnt multi-tenant system with the integrated Golem Base SDK
 * providing full decentralized storage capabilities for multi-tenant data
 */

import { EventEmitter } from 'events';
import { createLogger } from './logger';
import { GuardAntTracing } from './tracing';
import { AlertError, ErrorCategory, ErrorSeverity } from './error-handling';
import { GolemStorage } from './golem/golem-storage';
import type { CacheStats } from './golem/cache-manager';

// Re-export types from the original implementation
export interface GolemConfig {
  chainId: number;
  httpUrl: string;
  wsUrl: string;
  privateKeyPath?: string;
}

export interface StoredData {
  timestamp: number;
  data: any;
  entityKey?: string;
}

export interface CacheStats {
  totalEntries: number;
  unsyncedEntries: number;
  cacheSize: number;
  lastSync: string | null;
  enabled: boolean;
}

// GuardAnt specific interfaces
export interface NestDataPayload {
  nestId: string;
  dataType: DataType;
  data: any;
  version: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface MultiTenantStorageConfig {
  enabled: boolean;
  nestIsolation: boolean;
  encryptionEnabled: boolean;
  compressionEnabled: boolean;
  ttlByDataType: Record<DataType, number>;
  maxEntitySize: number; // bytes
  batchSize: number;
  retryAttempts: number;
}

export enum DataType {
  NEST_CONFIGURATION = 'nest_config',
  SERVICE_STATUS = 'service_status',
  MONITORING_DATA = 'monitoring_data',
  INCIDENT_DATA = 'incident_data',
  ANALYTICS_DATA = 'analytics_data',
  SLA_DATA = 'sla_data',
  COST_DATA = 'cost_data',
  USER_PREFERENCES = 'user_preferences',
  ALERT_RULES = 'alert_rules',
  FAILOVER_CONFIG = 'failover_config'
}

export class GolemAdapter extends EventEmitter {
  private logger;
  private tracing?: GuardAntTracing;
  private golemStorage: GolemStorage;
  private isInitialized = false;
  private pendingOperations = new Map<string, Promise<any>>();
  
  constructor(
    private serviceName: string,
    private config: MultiTenantStorageConfig,
    golemConfig?: Partial<GolemConfig>,
    tracing?: GuardAntTracing
  ) {
    super();
    this.logger = createLogger(`${serviceName}-golem-adapter`);
    this.tracing = tracing;
    
    // Initialize our own GolemStorage instance
    this.golemStorage = new GolemStorage(golemConfig);
  }

  // Initialize the adapter and wait for Golem Base connection
  async initialize(): Promise<void> {
    const span = this.tracing?.startSpan('golem.adapter.initialize');
    
    try {
      // Wait for Golem Base connection
      const connected = await this.golemStorage.waitForConnection(30000);
      
      if (connected) {
        this.logger.info('GolemAdapter initialized with active Golem Base connection');
      } else {
        this.logger.warn('GolemAdapter initialized but Golem Base is offline - using cache mode');
      }
      
      this.isInitialized = true;
      this.emit('initialized', { connected });
      
      span?.setTag('golem.connected', connected);
      
    } catch (error) {
      this.logger.error('Failed to initialize GolemAdapter', { error });
      span?.setTag('error', true);
      throw error;
    } finally {
      span?.finish();
    }
  }

  // Store nest-specific data with proper isolation
  async storeNestData(
    nestId: string,
    dataType: DataType,
    data: any,
    metadata: Record<string, any> = {}
  ): Promise<string | null> {
    if (!this.isInitialized) {
      throw new Error('GolemAdapter not initialized');
    }

    const span = this.tracing?.startSpan('golem.adapter.store_nest_data');
    
    try {
      const payload: NestDataPayload = {
        nestId,
        dataType,
        data,
        version: 1,
        timestamp: new Date().toISOString(),
        metadata: {
          ...metadata,
          source: this.serviceName,
          guardantVersion: '1.0.0'
        }
      };

      // Create isolation key
      const isolationKey = this.createIsolationKey(nestId, dataType, metadata.key);
      
      // Apply compression if enabled and data is large
      let processedData = payload;
      if (this.config.compressionEnabled && this.estimateSize(payload) > 1024) {
        processedData = await this.compressData(payload);
      }

      // Apply encryption if enabled
      if (this.config.encryptionEnabled) {
        processedData = await this.encryptData(processedData, nestId);
      }

      // Get TTL for this data type
      const ttl = this.config.ttlByDataType[dataType] || 3600;
      
      // Store using the original GolemStorage implementation
      const entityKey = await this.golemStorage.storeData(isolationKey, processedData, ttl);
      
      if (entityKey) {
        this.logger.debug('Stored nest data in Golem Base', {
          nestId,
          dataType,
          entityKey,
          size: this.estimateSize(processedData)
        });
        
        this.emit('data-stored', { nestId, dataType, entityKey });
      }
      
      span?.setTag('nest.id', nestId);
      span?.setTag('data.type', dataType);
      span?.setTag('entity.key', entityKey || 'cached');
      
      return entityKey;
      
    } catch (error) {
      this.logger.error('Failed to store nest data', { error, nestId, dataType });
      span?.setTag('error', true);
      
      throw new AlertError(
        'Golem Base storage failed',
        ErrorCategory.SYSTEM_ERROR,
        ErrorSeverity.MEDIUM,
        { nestId, dataType, originalError: error }
      );
    } finally {
      span?.finish();
    }
  }

  // Retrieve nest-specific data with proper isolation
  async retrieveNestData(
    nestId: string,
    dataType: DataType,
    key?: string
  ): Promise<any | null> {
    if (!this.isInitialized) {
      throw new Error('GolemAdapter not initialized');
    }

    const span = this.tracing?.startSpan('golem.adapter.retrieve_nest_data');
    
    try {
      const isolationKey = this.createIsolationKey(nestId, dataType, key);
      
      // Retrieve using the original GolemStorage implementation
      const storedData = await this.golemStorage.retrieveData(isolationKey);
      
      if (!storedData) {
        return null;
      }

      let processedData = storedData.data;

      // Apply decryption if data was encrypted
      if (this.config.encryptionEnabled && this.isEncrypted(processedData)) {
        processedData = await this.decryptData(processedData, nestId);
      }

      // Apply decompression if data was compressed
      if (this.config.compressionEnabled && this.isCompressed(processedData)) {
        processedData = await this.decompressData(processedData);
      }

      // Validate nest isolation
      if (this.config.nestIsolation && processedData.nestId !== nestId) {
        this.logger.warn('Nest isolation violation detected', {
          expectedNestId: nestId,
          actualNestId: processedData.nestId,
          isolationKey
        });
        return null;
      }

      this.logger.debug('Retrieved nest data from Golem Base', {
        nestId,
        dataType,
        entityKey: storedData.entityKey,
        timestamp: processedData.timestamp
      });

      span?.setTag('nest.id', nestId);
      span?.setTag('data.type', dataType);
      span?.setTag('found', true);

      return processedData.data;
      
    } catch (error) {
      this.logger.error('Failed to retrieve nest data', { error, nestId, dataType });
      span?.setTag('error', true);
      return null;
    } finally {
      span?.finish();
    }
  }

  // Batch store multiple nest data entries
  async batchStoreNestData(
    operations: Array<{
      nestId: string;
      dataType: DataType;
      data: any;
      key?: string;
      metadata?: Record<string, any>;
    }>
  ): Promise<Array<{ success: boolean; entityKey?: string; error?: string }>> {
    const span = this.tracing?.startSpan('golem.adapter.batch_store');
    
    try {
      const results: Array<{ success: boolean; entityKey?: string; error?: string }> = [];
      
      // Process in batches to avoid overwhelming Golem Base
      for (let i = 0; i < operations.length; i += this.config.batchSize) {
        const batch = operations.slice(i, i + this.config.batchSize);
        
        const batchPromises = batch.map(async (op) => {
          try {
            const entityKey = await this.storeNestData(
              op.nestId,
              op.dataType,
              op.data,
              { ...op.metadata, key: op.key }
            );
            return { success: true, entityKey };
          } catch (error) {
            return { success: false, error: error.message };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({ success: false, error: result.reason.message });
          }
        });

        // Small delay between batches to avoid rate limiting
        if (i + this.config.batchSize < operations.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const successful = results.filter(r => r.success).length;
      this.logger.info('Batch store completed', {
        total: operations.length,
        successful,
        failed: operations.length - successful
      });

      span?.setTag('batch.size', operations.length);
      span?.setTag('batch.successful', successful);

      return results;
      
    } catch (error) {
      this.logger.error('Batch store failed', { error });
      span?.setTag('error', true);
      throw error;
    } finally {
      span?.finish();
    }
  }

  // Get all data for a specific nest
  async getNestDataByType(nestId: string, dataType: DataType): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('GolemAdapter not initialized');
    }

    const span = this.tracing?.startSpan('golem.adapter.get_nest_data_by_type');
    
    try {
      // This would require extending the original GolemStorage to support pattern queries
      // For now, we'll implement a simplified version using cache patterns
      const pattern = `${nestId}:${dataType}:*`;
      const cacheManager = this.golemStorage.getCacheManager();
      const entries = cacheManager.getByPattern(pattern);
      
      const results = await Promise.all(
        entries.map(async (entry: any) => {
          try {
            let data = entry.data;
            
            // Apply decryption and decompression as needed
            if (this.config.encryptionEnabled && this.isEncrypted(data)) {
              data = await this.decryptData(data, nestId);
            }
            
            if (this.config.compressionEnabled && this.isCompressed(data)) {
              data = await this.decompressData(data);
            }
            
            return data.data;
          } catch (error) {
            this.logger.warn('Failed to process cached entry', { error, key: entry.key });
            return null;
          }
        })
      );

      const validResults = results.filter(Boolean);
      
      this.logger.debug('Retrieved nest data by type', {
        nestId,
        dataType,
        count: validResults.length
      });

      span?.setTag('nest.id', nestId);
      span?.setTag('data.type', dataType);
      span?.setTag('result.count', validResults.length);

      return validResults;
      
    } catch (error) {
      this.logger.error('Failed to get nest data by type', { error, nestId, dataType });
      span?.setTag('error', true);
      return [];
    } finally {
      span?.finish();
    }
  }

  // Delete nest data
  async deleteNestData(nestId: string, dataType: DataType, key?: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('GolemAdapter not initialized');
    }

    const span = this.tracing?.startSpan('golem.adapter.delete_nest_data');
    
    try {
      const isolationKey = this.createIsolationKey(nestId, dataType, key);
      
      // First, retrieve to get the entity key
      const storedData = await this.golemStorage.retrieveData(isolationKey);
      if (!storedData || !storedData.entityKey) {
        return false;
      }

      // Delete using the original GolemStorage implementation
      const success = await this.golemStorage.deleteData(storedData.entityKey);
      
      if (success) {
        this.logger.debug('Deleted nest data from Golem Base', {
          nestId,
          dataType,
          entityKey: storedData.entityKey
        });
        
        this.emit('data-deleted', { nestId, dataType, entityKey: storedData.entityKey });
      }

      span?.setTag('nest.id', nestId);
      span?.setTag('data.type', dataType);
      span?.setTag('success', success);

      return success;
      
    } catch (error) {
      this.logger.error('Failed to delete nest data', { error, nestId, dataType });
      span?.setTag('error', true);
      return false;
    } finally {
      span?.finish();
    }
  }

  // Get Golem Base connection status
  getConnectionStatus(): {
    connected: boolean;
    cacheStats: CacheStats;
    golemConfig: any;
  } {
    if (!this.isInitialized || !this.golemStorage) {
      return {
        connected: false,
        cacheStats: {
          totalEntries: 0,
          unsyncedEntries: 0,
          cacheSize: 0,
          lastSync: null,
          enabled: false
        },
        golemConfig: null
      };
    }

    const status = this.golemStorage.getStatus();
    
    return {
      connected: status.connected,
      cacheStats: status.cacheStats,
      golemConfig: status.config
    };
  }

  // Sync cached data to Golem Base
  async syncToGolemBase(): Promise<{ synced: number; failed: number }> {
    if (!this.isInitialized) {
      throw new Error('GolemAdapter not initialized');
    }

    const span = this.tracing?.startSpan('golem.adapter.sync');
    
    try {
      const result = await this.golemStorage.syncCache();
      
      this.logger.info('Sync to Golem Base completed', {
        synced: result.synced,
        failed: result.failed
      });

      this.emit('sync-completed', result);

      span?.setTag('sync.synced', result.synced);
      span?.setTag('sync.failed', result.failed);

      return result;
      
    } catch (error) {
      this.logger.error('Failed to sync to Golem Base', { error });
      span?.setTag('error', true);
      throw error;
    } finally {
      span?.finish();
    }
  }

  // Private helper methods
  private createIsolationKey(nestId: string, dataType: DataType, key?: string): string {
    const baseKey = `${nestId}:${dataType}`;
    return key ? `${baseKey}:${key}` : `${baseKey}:default`;
  }

  private estimateSize(data: any): number {
    return new TextEncoder().encode(JSON.stringify(data)).length;
  }

  private async compressData(data: any): Promise<any> {
    // Simple compression placeholder - could use actual compression library
    return {
      ...data,
      _compressed: true,
      _compressionType: 'json-stringify'
    };
  }

  private async decompressData(data: any): Promise<any> {
    if (data._compressed) {
      const { _compressed, _compressionType, ...originalData } = data;
      return originalData;
    }
    return data;
  }

  private isCompressed(data: any): boolean {
    return data && typeof data === 'object' && data._compressed === true;
  }

  private async encryptData(data: any, nestId: string): Promise<any> {
    // Simple encryption placeholder - could use actual encryption
    return {
      ...data,
      _encrypted: true,
      _encryptionMethod: 'nest-isolation',
      _nestId: nestId
    };
  }

  private async decryptData(data: any, nestId: string): Promise<any> {
    if (data._encrypted && data._nestId === nestId) {
      const { _encrypted, _encryptionMethod, _nestId, ...originalData } = data;
      return originalData;
    }
    return data;
  }

  private isEncrypted(data: any): boolean {
    return data && typeof data === 'object' && data._encrypted === true;
  }

  // Health check
  getHealthStatus(): { healthy: boolean; details: any } {
    if (!this.isInitialized) {
      return {
        healthy: false,
        details: { error: 'Not initialized' }
      };
    }

    const connectionStatus = this.getConnectionStatus();
    
    return {
      healthy: this.isInitialized,
      details: {
        initialized: this.isInitialized,
        golemConnected: connectionStatus.connected,
        cacheStats: connectionStatus.cacheStats,
        configEnabled: this.config.enabled,
        pendingOperations: this.pendingOperations.size
      }
    };
  }

  // Shutdown cleanup
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down GolemAdapter');
    
    // Wait for pending operations to complete
    if (this.pendingOperations.size > 0) {
      this.logger.info(`Waiting for ${this.pendingOperations.size} pending operations to complete`);
      await Promise.allSettled(Array.from(this.pendingOperations.values()));
    }
    
    this.emit('shutdown');
  }
}

// Factory function
export function createGolemAdapter(
  serviceName: string,
  config: MultiTenantStorageConfig,
  golemConfig?: Partial<GolemConfig>,
  tracing?: GuardAntTracing
): GolemAdapter {
  return new GolemAdapter(serviceName, config, golemConfig, tracing);
}

// Utility functions for Golem Base integration
export class GolemUtils {
  static createDefaultConfig(): MultiTenantStorageConfig {
    return {
      enabled: true,
      nestIsolation: true,
      encryptionEnabled: false, // Can be enabled for additional security
      compressionEnabled: true,
      ttlByDataType: {
        [DataType.NEST_CONFIGURATION]: 86400 * 30, // 30 days
        [DataType.SERVICE_STATUS]: 3600 * 24, // 24 hours
        [DataType.MONITORING_DATA]: 3600 * 6, // 6 hours
        [DataType.INCIDENT_DATA]: 86400 * 7, // 7 days
        [DataType.ANALYTICS_DATA]: 86400 * 90, // 90 days
        [DataType.SLA_DATA]: 86400 * 365, // 1 year
        [DataType.COST_DATA]: 86400 * 365, // 1 year
        [DataType.USER_PREFERENCES]: 86400 * 30, // 30 days
        [DataType.ALERT_RULES]: 86400 * 30, // 30 days
        [DataType.FAILOVER_CONFIG]: 86400 * 30 // 30 days
      },
      maxEntitySize: 1024 * 1024, // 1MB
      batchSize: 10,
      retryAttempts: 3
    };
  }

  static validateNestId(nestId: string): boolean {
    // Validate nest ID format (should be UUID or similar)
    const nestIdRegex = /^[a-zA-Z0-9-_]{1,64}$/;
    return nestIdRegex.test(nestId);
  }

  static generateNestKey(nestId: string, service: string): string {
    return `nest:${nestId}:service:${service}`;
  }

  static parseNestKey(key: string): { nestId: string; service: string } | null {
    const match = key.match(/^nest:([^:]+):service:([^:]+)$/);
    if (match) {
      return { nestId: match[1], service: match[2] };
    }
    return null;
  }
}