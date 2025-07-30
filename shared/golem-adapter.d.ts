/**
 * GuardAnt Golem Base Adapter
 * Bridges the GuardAnt multi-tenant system with the integrated Golem Base SDK
 * providing full decentralized storage capabilities for multi-tenant data
 */
import { EventEmitter } from 'events';
import { GuardAntTracing } from './tracing';
import type { CacheStats } from './golem/cache-manager';
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
    maxEntitySize: number;
    batchSize: number;
    retryAttempts: number;
}
export declare enum DataType {
    NEST_CONFIGURATION = "nest_config",
    SERVICE_STATUS = "service_status",
    MONITORING_DATA = "monitoring_data",
    INCIDENT_DATA = "incident_data",
    ANALYTICS_DATA = "analytics_data",
    SLA_DATA = "sla_data",
    COST_DATA = "cost_data",
    USER_PREFERENCES = "user_preferences",
    ALERT_RULES = "alert_rules",
    FAILOVER_CONFIG = "failover_config"
}
export declare class GolemAdapter extends EventEmitter {
    private serviceName;
    private config;
    private logger;
    private tracing?;
    private golemStorage;
    private isInitialized;
    private pendingOperations;
    constructor(serviceName: string, config: MultiTenantStorageConfig, golemConfig?: Partial<GolemConfig>, tracing?: GuardAntTracing);
    initialize(): Promise<void>;
    storeNestData(nestId: string, dataType: DataType, data: any, metadata?: Record<string, any>): Promise<string | null>;
    retrieveNestData(nestId: string, dataType: DataType, key?: string): Promise<any | null>;
    batchStoreNestData(operations: Array<{
        nestId: string;
        dataType: DataType;
        data: any;
        key?: string;
        metadata?: Record<string, any>;
    }>): Promise<Array<{
        success: boolean;
        entityKey?: string;
        error?: string;
    }>>;
    getNestDataByType(nestId: string, dataType: DataType): Promise<any[]>;
    deleteNestData(nestId: string, dataType: DataType, key?: string): Promise<boolean>;
    getConnectionStatus(): {
        connected: boolean;
        cacheStats: CacheStats;
        golemConfig: any;
    };
    syncToGolemBase(): Promise<{
        synced: number;
        failed: number;
    }>;
    private createIsolationKey;
    private estimateSize;
    private compressData;
    private decompressData;
    private isCompressed;
    private encryptData;
    private decryptData;
    private isEncrypted;
    getHealthStatus(): {
        healthy: boolean;
        details: any;
    };
    shutdown(): Promise<void>;
}
export declare function createGolemAdapter(serviceName: string, config: MultiTenantStorageConfig, golemConfig?: Partial<GolemConfig>, tracing?: GuardAntTracing): GolemAdapter;
export declare class GolemUtils {
    static createDefaultConfig(): MultiTenantStorageConfig;
    static validateNestId(nestId: string): boolean;
    static generateNestKey(nestId: string, service: string): string;
    static parseNestKey(key: string): {
        nestId: string;
        service: string;
    } | null;
}
//# sourceMappingURL=golem-adapter.d.ts.map