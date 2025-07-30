/**
 * Database indexing strategy and management system for GuardAnt services
 * Provides intelligent index recommendations, creation, and performance monitoring
 */
import type { GuardAntTracing } from './tracing';
export interface IndexDefinition {
    name: string;
    table: string;
    columns: IndexColumn[];
    type: IndexType;
    unique: boolean;
    partial?: string;
    include?: string[];
    storage?: IndexStorage;
    priority: IndexPriority;
    estimated_size: number;
    estimated_improvement: number;
    maintenance_cost: number;
}
export interface IndexColumn {
    name: string;
    direction: 'ASC' | 'DESC';
    nulls?: 'FIRST' | 'LAST';
    collation?: string;
    opclass?: string;
}
export declare enum IndexType {
    BTREE = "btree",// Default B-tree index
    HASH = "hash",// Hash index for equality
    GIN = "gin",// Generalized Inverted Index
    GIST = "gist",// Generalized Search Tree
    SP_GIST = "spgist",// Space-partitioned GIST
    BRIN = "brin",// Block Range Index
    BLOOM = "bloom",// Bloom filter index
    PARTIAL = "partial",// Partial index with WHERE clause
    EXPRESSION = "expression",// Index on expression
    COMPOUND = "compound",// Multi-column index
    COVERING = "covering"
}
export declare enum IndexStorage {
    NORMAL = "normal",
    COMPRESSED = "compressed",
    MEMORY = "memory"
}
export declare enum IndexPriority {
    CRITICAL = "critical",// Must have for performance
    HIGH = "high",// Significant performance impact
    MEDIUM = "medium",// Moderate improvement
    LOW = "low",// Nice to have
    EXPERIMENTAL = "experimental"
}
export interface IndexUsageStats {
    index_name: string;
    table_name: string;
    index_scans: number;
    tuples_read: number;
    tuples_fetched: number;
    index_size: number;
    last_used: Date | null;
    created_at: Date;
    usage_ratio: number;
    maintenance_cost: number;
    effectiveness_score: number;
}
export interface TableAnalysis {
    table_name: string;
    row_count: number;
    table_size: number;
    index_size: number;
    seq_scan: number;
    seq_tup_read: number;
    idx_scan: number;
    idx_tup_fetch: number;
    insert_count: number;
    update_count: number;
    delete_count: number;
    hot_update_count: number;
    autovacuum_count: number;
    autoanalyze_count: number;
    last_vacuum: Date | null;
    last_analyze: Date | null;
}
export declare const IndexStrategies: {
    NESTS: {
        name: string;
        table: string;
        columns: {
            name: string;
            direction: string;
        }[];
        type: IndexType;
        unique: boolean;
        priority: IndexPriority;
        estimated_size: number;
        estimated_improvement: number;
        maintenance_cost: number;
    }[];
    SERVICES: {
        name: string;
        table: string;
        columns: {
            name: string;
            direction: string;
        }[];
        type: IndexType;
        unique: boolean;
        priority: IndexPriority;
        estimated_size: number;
        estimated_improvement: number;
        maintenance_cost: number;
    }[];
    SERVICE_STATUS: ({
        name: string;
        table: string;
        columns: {
            name: string;
            direction: string;
        }[];
        type: IndexType;
        unique: boolean;
        priority: IndexPriority;
        estimated_size: number;
        estimated_improvement: number;
        maintenance_cost: number;
        partial?: undefined;
    } | {
        name: string;
        table: string;
        columns: {
            name: string;
            direction: string;
        }[];
        type: IndexType;
        unique: boolean;
        partial: string;
        priority: IndexPriority;
        estimated_size: number;
        estimated_improvement: number;
        maintenance_cost: number;
    })[];
    USERS: {
        name: string;
        table: string;
        columns: {
            name: string;
            direction: string;
        }[];
        type: IndexType;
        unique: boolean;
        priority: IndexPriority;
        estimated_size: number;
        estimated_improvement: number;
        maintenance_cost: number;
    }[];
    USER_SESSIONS: ({
        name: string;
        table: string;
        columns: {
            name: string;
            direction: string;
        }[];
        type: IndexType;
        unique: boolean;
        priority: IndexPriority;
        estimated_size: number;
        estimated_improvement: number;
        maintenance_cost: number;
        partial?: undefined;
    } | {
        name: string;
        table: string;
        columns: {
            name: string;
            direction: string;
        }[];
        type: IndexType;
        unique: boolean;
        partial: string;
        priority: IndexPriority;
        estimated_size: number;
        estimated_improvement: number;
        maintenance_cost: number;
    })[];
    PAYMENT_TRANSACTIONS: {
        name: string;
        table: string;
        columns: {
            name: string;
            direction: string;
        }[];
        type: IndexType;
        unique: boolean;
        priority: IndexPriority;
        estimated_size: number;
        estimated_improvement: number;
        maintenance_cost: number;
    }[];
    MONITORING_ALERTS: {
        name: string;
        table: string;
        columns: {
            name: string;
            direction: string;
        }[];
        type: IndexType;
        unique: boolean;
        priority: IndexPriority;
        estimated_size: number;
        estimated_improvement: number;
        maintenance_cost: number;
    }[];
};
export declare class DatabaseIndexManager {
    private serviceName;
    private dbConnection;
    private logger;
    private tracing?;
    private indexUsageStats;
    private tableAnalysis;
    private recommendedIndexes;
    constructor(serviceName: string, dbConnection: any, // Database connection
    tracing?: GuardAntTracing);
    analyzeDatabase(): Promise<void>;
    private analyzeTableStatistics;
    private analyzeIndexUsage;
    private calculateMaintenanceCost;
    private calculateEffectivenessScore;
    private generateIndexRecommendations;
    private calculateRecommendationScore;
    private generateQueryBasedRecommendations;
    private analyzeQueryForIndexes;
    createIndex(indexDef: IndexDefinition): Promise<boolean>;
    private generateCreateIndexSQL;
    dropIndex(indexName: string): Promise<boolean>;
    reindexTable(tableName: string): Promise<boolean>;
    getIndexRecommendations(): Record<string, IndexDefinition[]>;
    getUnusedIndexes(thresholdDays?: number): IndexUsageStats[];
    getIndexEfficiencyReport(): any;
    getHealthStatus(): {
        healthy: boolean;
        details: any;
    };
}
export declare function createDatabaseIndexManager(serviceName: string, dbConnection: any, tracing?: GuardAntTracing): DatabaseIndexManager;
export { IndexStrategies, IndexType, IndexPriority };
//# sourceMappingURL=database-indexing.d.ts.map