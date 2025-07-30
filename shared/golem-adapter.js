"use strict";
/**
 * GuardAnt Golem Base Adapter
 * Bridges the GuardAnt multi-tenant system with the integrated Golem Base SDK
 * providing full decentralized storage capabilities for multi-tenant data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GolemUtils = exports.GolemAdapter = exports.DataType = void 0;
exports.createGolemAdapter = createGolemAdapter;
const events_1 = require("events");
const logger_1 = require("./logger");
const error_handling_1 = require("./error-handling");
const golem_storage_1 = require("./golem/golem-storage");
var DataType;
(function (DataType) {
    DataType["NEST_CONFIGURATION"] = "nest_config";
    DataType["SERVICE_STATUS"] = "service_status";
    DataType["MONITORING_DATA"] = "monitoring_data";
    DataType["INCIDENT_DATA"] = "incident_data";
    DataType["ANALYTICS_DATA"] = "analytics_data";
    DataType["SLA_DATA"] = "sla_data";
    DataType["COST_DATA"] = "cost_data";
    DataType["USER_PREFERENCES"] = "user_preferences";
    DataType["ALERT_RULES"] = "alert_rules";
    DataType["FAILOVER_CONFIG"] = "failover_config";
})(DataType || (exports.DataType = DataType = {}));
class GolemAdapter extends events_1.EventEmitter {
    constructor(serviceName, config, golemConfig, tracing) {
        super();
        this.serviceName = serviceName;
        this.config = config;
        this.isInitialized = false;
        this.pendingOperations = new Map();
        this.logger = (0, logger_1.createLogger)(`${serviceName}-golem-adapter`);
        this.tracing = tracing;
        // Initialize our own GolemStorage instance
        this.golemStorage = new golem_storage_1.GolemStorage(golemConfig);
    }
    // Initialize the adapter and wait for Golem Base connection
    async initialize() {
        const span = this.tracing?.startSpan('golem.adapter.initialize');
        try {
            // Wait for Golem Base connection
            const connected = await this.golemStorage.waitForConnection(30000);
            if (connected) {
                this.logger.info('GolemAdapter initialized with active Golem Base connection');
            }
            else {
                this.logger.warn('GolemAdapter initialized but Golem Base is offline - using cache mode');
            }
            this.isInitialized = true;
            this.emit('initialized', { connected });
            span?.setTag('golem.connected', connected);
        }
        catch (error) {
            this.logger.error('Failed to initialize GolemAdapter', { error });
            span?.setTag('error', true);
            throw error;
        }
        finally {
            span?.finish();
        }
    }
    // Store nest-specific data with proper isolation
    async storeNestData(nestId, dataType, data, metadata = {}) {
        if (!this.isInitialized) {
            throw new Error('GolemAdapter not initialized');
        }
        const span = this.tracing?.startSpan('golem.adapter.store_nest_data');
        try {
            const payload = {
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
        }
        catch (error) {
            this.logger.error('Failed to store nest data', { error, nestId, dataType });
            span?.setTag('error', true);
            throw new error_handling_1.AlertError('Golem Base storage failed', error_handling_1.ErrorCategory.SYSTEM_ERROR, error_handling_1.ErrorSeverity.MEDIUM, { nestId, dataType, originalError: error });
        }
        finally {
            span?.finish();
        }
    }
    // Retrieve nest-specific data with proper isolation
    async retrieveNestData(nestId, dataType, key) {
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
        }
        catch (error) {
            this.logger.error('Failed to retrieve nest data', { error, nestId, dataType });
            span?.setTag('error', true);
            return null;
        }
        finally {
            span?.finish();
        }
    }
    // Batch store multiple nest data entries
    async batchStoreNestData(operations) {
        const span = this.tracing?.startSpan('golem.adapter.batch_store');
        try {
            const results = [];
            // Process in batches to avoid overwhelming Golem Base
            for (let i = 0; i < operations.length; i += this.config.batchSize) {
                const batch = operations.slice(i, i + this.config.batchSize);
                const batchPromises = batch.map(async (op) => {
                    try {
                        const entityKey = await this.storeNestData(op.nestId, op.dataType, op.data, { ...op.metadata, key: op.key });
                        return { success: true, entityKey };
                    }
                    catch (error) {
                        return { success: false, error: error.message };
                    }
                });
                const batchResults = await Promise.allSettled(batchPromises);
                batchResults.forEach((result) => {
                    if (result.status === 'fulfilled') {
                        results.push(result.value);
                    }
                    else {
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
        }
        catch (error) {
            this.logger.error('Batch store failed', { error });
            span?.setTag('error', true);
            throw error;
        }
        finally {
            span?.finish();
        }
    }
    // Get all data for a specific nest
    async getNestDataByType(nestId, dataType) {
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
            const results = await Promise.all(entries.map(async (entry) => {
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
                }
                catch (error) {
                    this.logger.warn('Failed to process cached entry', { error, key: entry.key });
                    return null;
                }
            }));
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
        }
        catch (error) {
            this.logger.error('Failed to get nest data by type', { error, nestId, dataType });
            span?.setTag('error', true);
            return [];
        }
        finally {
            span?.finish();
        }
    }
    // Delete nest data
    async deleteNestData(nestId, dataType, key) {
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
        }
        catch (error) {
            this.logger.error('Failed to delete nest data', { error, nestId, dataType });
            span?.setTag('error', true);
            return false;
        }
        finally {
            span?.finish();
        }
    }
    // Get Golem Base connection status
    getConnectionStatus() {
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
    async syncToGolemBase() {
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
        }
        catch (error) {
            this.logger.error('Failed to sync to Golem Base', { error });
            span?.setTag('error', true);
            throw error;
        }
        finally {
            span?.finish();
        }
    }
    // Private helper methods
    createIsolationKey(nestId, dataType, key) {
        const baseKey = `${nestId}:${dataType}`;
        return key ? `${baseKey}:${key}` : `${baseKey}:default`;
    }
    estimateSize(data) {
        return new TextEncoder().encode(JSON.stringify(data)).length;
    }
    async compressData(data) {
        // Simple compression placeholder - could use actual compression library
        return {
            ...data,
            _compressed: true,
            _compressionType: 'json-stringify'
        };
    }
    async decompressData(data) {
        if (data._compressed) {
            const { _compressed, _compressionType, ...originalData } = data;
            return originalData;
        }
        return data;
    }
    isCompressed(data) {
        return data && typeof data === 'object' && data._compressed === true;
    }
    async encryptData(data, nestId) {
        // Simple encryption placeholder - could use actual encryption
        return {
            ...data,
            _encrypted: true,
            _encryptionMethod: 'nest-isolation',
            _nestId: nestId
        };
    }
    async decryptData(data, nestId) {
        if (data._encrypted && data._nestId === nestId) {
            const { _encrypted, _encryptionMethod, _nestId, ...originalData } = data;
            return originalData;
        }
        return data;
    }
    isEncrypted(data) {
        return data && typeof data === 'object' && data._encrypted === true;
    }
    // Health check
    getHealthStatus() {
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
    async shutdown() {
        this.logger.info('Shutting down GolemAdapter');
        // Wait for pending operations to complete
        if (this.pendingOperations.size > 0) {
            this.logger.info(`Waiting for ${this.pendingOperations.size} pending operations to complete`);
            await Promise.allSettled(Array.from(this.pendingOperations.values()));
        }
        this.emit('shutdown');
    }
}
exports.GolemAdapter = GolemAdapter;
// Factory function
function createGolemAdapter(serviceName, config, golemConfig, tracing) {
    return new GolemAdapter(serviceName, config, golemConfig, tracing);
}
// Utility functions for Golem Base integration
class GolemUtils {
    static createDefaultConfig() {
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
    static validateNestId(nestId) {
        // Validate nest ID format (should be UUID or similar)
        const nestIdRegex = /^[a-zA-Z0-9-_]{1,64}$/;
        return nestIdRegex.test(nestId);
    }
    static generateNestKey(nestId, service) {
        return `nest:${nestId}:service:${service}`;
    }
    static parseNestKey(key) {
        const match = key.match(/^nest:([^:]+):service:([^:]+)$/);
        if (match) {
            return { nestId: match[1], service: match[2] };
        }
        return null;
    }
}
exports.GolemUtils = GolemUtils;
//# sourceMappingURL=golem-adapter.js.map