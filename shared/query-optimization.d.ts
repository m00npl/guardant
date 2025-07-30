/**
 * Advanced query optimization system for GuardAnt services
 * Provides intelligent query planning, execution optimization, and performance monitoring
 */
import type { GuardAntTracing } from './tracing';
export interface QueryPlan {
    id: string;
    query: string;
    estimatedCost: number;
    estimatedRows: number;
    executionPlan: ExecutionStep[];
    indexes: IndexRecommendation[];
    optimizations: QueryOptimization[];
    cacheability: CacheabilityScore;
}
export interface ExecutionStep {
    step: number;
    operation: OperationType;
    table?: string;
    index?: string;
    filter?: string;
    estimatedCost: number;
    estimatedRows: number;
    actualCost?: number;
    actualRows?: number;
    executionTime?: number;
}
export declare enum OperationType {
    TABLE_SCAN = "table_scan",
    INDEX_SCAN = "index_scan",
    INDEX_SEEK = "index_seek",
    NESTED_LOOP = "nested_loop",
    HASH_JOIN = "hash_join",
    MERGE_JOIN = "merge_join",
    SORT = "sort",
    GROUP_BY = "group_by",
    AGGREGATE = "aggregate",
    FILTER = "filter"
}
export interface IndexRecommendation {
    table: string;
    columns: string[];
    type: IndexType;
    priority: IndexPriority;
    estimatedImprovement: number;
    reason: string;
}
export declare enum IndexType {
    BTREE = "btree",
    HASH = "hash",
    GIN = "gin",
    GIST = "gist",
    COMPOUND = "compound",
    PARTIAL = "partial",
    UNIQUE = "unique"
}
export declare enum IndexPriority {
    CRITICAL = "critical",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low"
}
export interface QueryOptimization {
    type: OptimizationType;
    description: string;
    originalQuery: string;
    optimizedQuery: string;
    estimatedImprovement: number;
    confidence: number;
}
export declare enum OptimizationType {
    PREDICATE_PUSHDOWN = "predicate_pushdown",
    JOIN_REORDERING = "join_reordering",
    SUBQUERY_FLATTENING = "subquery_flattening",
    INDEX_HINT = "index_hint",
    LIMIT_PUSHDOWN = "limit_pushdown",
    PROJECTION_PRUNING = "projection_pruning",
    CONSTANT_FOLDING = "constant_folding",
    REDUNDANT_JOIN_ELIMINATION = "redundant_join_elimination"
}
export interface CacheabilityScore {
    score: number;
    factors: CacheabilityFactor[];
    recommendedTTL: number;
    cacheKey: string;
}
export interface CacheabilityFactor {
    factor: string;
    impact: number;
    reason: string;
}
export interface QueryExecutionStats {
    queryId: string;
    query: string;
    executionTime: number;
    rowsAffected: number;
    bytesTransferred: number;
    cacheHit: boolean;
    planHash: string;
    timestamp: number;
    nestId?: string;
    userId?: string;
}
export interface QueryPerformanceMetrics {
    totalQueries: number;
    averageExecutionTime: number;
    slowQueries: number;
    cacheHitRate: number;
    mostExpensiveQueries: QueryExecutionStats[];
    indexRecommendations: IndexRecommendation[];
    optimizationOpportunities: QueryOptimization[];
}
export declare const QueryPatterns: {
    NEST_OPERATIONS: {
        findBySubdomain: {
            pattern: RegExp;
            expectedIndexes: string[];
            cacheability: number;
            ttl: number;
        };
        findWithServices: {
            pattern: RegExp;
            expectedIndexes: string[];
            cacheability: number;
            ttl: number;
        };
    };
    SERVICE_OPERATIONS: {
        getServiceStatus: {
            pattern: RegExp;
            expectedIndexes: string[];
            cacheability: number;
            ttl: number;
        };
        getStatusHistory: {
            pattern: RegExp;
            expectedIndexes: string[];
            cacheability: number;
            ttl: number;
        };
        bulkStatusUpdate: {
            pattern: RegExp;
            expectedIndexes: never[];
            cacheability: number;
            ttl: number;
        };
    };
    AUTH_OPERATIONS: {
        findUserByEmail: {
            pattern: RegExp;
            expectedIndexes: string[];
            cacheability: number;
            ttl: number;
        };
        validateSession: {
            pattern: RegExp;
            expectedIndexes: string[];
            cacheability: number;
            ttl: number;
        };
    };
    ANALYTICS_OPERATIONS: {
        uptimeReport: {
            pattern: RegExp;
            expectedIndexes: string[];
            cacheability: number;
            ttl: number;
        };
        responseTimeMetrics: {
            pattern: RegExp;
            expectedIndexes: string[];
            cacheability: number;
            ttl: number;
        };
    };
};
export declare class QueryOptimizer {
    private serviceName;
    private logger;
    private tracing?;
    private queryStats;
    private planCache;
    private indexRecommendations;
    constructor(serviceName: string, tracing?: GuardAntTracing);
    private generateQueryId;
    private normalizeQuery;
    private analyzeQueryPattern;
    private estimateQueryCost;
    private generateOptimizations;
    private calculateCacheability;
    private generateCacheKey;
    private generateIndexRecommendations;
    analyzeQuery(query: string, context?: {
        nestId?: string;
        userId?: string;
    }): QueryPlan;
    recordExecution(queryId: string, executionTime: number, rowsAffected: number, bytesTransferred?: number, cacheHit?: boolean, context?: {
        nestId?: string;
        userId?: string;
    }): void;
    getPerformanceMetrics(): QueryPerformanceMetrics;
    getAllPlans(): QueryPlan[];
    clearCache(): void;
    getHealthStatus(): {
        healthy: boolean;
        details: any;
    };
}
export declare class OptimizedQueryExecutor {
    private serviceName;
    private executeQuery;
    private cacheGet?;
    private cacheSet?;
    private logger;
    private optimizer;
    constructor(serviceName: string, executeQuery: (query: string, params?: any[]) => Promise<any>, cacheGet?: ((key: string) => Promise<any>) | undefined, cacheSet?: ((key: string, value: any, ttl: number) => Promise<void>) | undefined, tracing?: GuardAntTracing);
    execute(query: string, params?: any[], context?: {
        nestId?: string;
        userId?: string;
    }): Promise<any>;
    getOptimizer(): QueryOptimizer;
}
export declare function createQueryOptimizer(serviceName: string, tracing?: GuardAntTracing): QueryOptimizer;
export declare function createOptimizedQueryExecutor(serviceName: string, executeQuery: (query: string, params?: any[]) => Promise<any>, cacheGet?: (key: string) => Promise<any>, cacheSet?: (key: string, value: any, ttl: number) => Promise<void>, tracing?: GuardAntTracing): OptimizedQueryExecutor;
export { QueryPatterns, OperationType, OptimizationType, IndexType, IndexPriority };
//# sourceMappingURL=query-optimization.d.ts.map