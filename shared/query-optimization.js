"use strict";
/**
 * Advanced query optimization system for GuardAnt services
 * Provides intelligent query planning, execution optimization, and performance monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizedQueryExecutor = exports.QueryOptimizer = exports.QueryPatterns = exports.OptimizationType = exports.IndexPriority = exports.IndexType = exports.OperationType = void 0;
exports.createQueryOptimizer = createQueryOptimizer;
exports.createOptimizedQueryExecutor = createOptimizedQueryExecutor;
const logger_1 = require("./logger");
const error_handling_1 = require("./error-handling");
var OperationType;
(function (OperationType) {
    OperationType["TABLE_SCAN"] = "table_scan";
    OperationType["INDEX_SCAN"] = "index_scan";
    OperationType["INDEX_SEEK"] = "index_seek";
    OperationType["NESTED_LOOP"] = "nested_loop";
    OperationType["HASH_JOIN"] = "hash_join";
    OperationType["MERGE_JOIN"] = "merge_join";
    OperationType["SORT"] = "sort";
    OperationType["GROUP_BY"] = "group_by";
    OperationType["AGGREGATE"] = "aggregate";
    OperationType["FILTER"] = "filter";
})(OperationType || (exports.OperationType = OperationType = {}));
var IndexType;
(function (IndexType) {
    IndexType["BTREE"] = "btree";
    IndexType["HASH"] = "hash";
    IndexType["GIN"] = "gin";
    IndexType["GIST"] = "gist";
    IndexType["COMPOUND"] = "compound";
    IndexType["PARTIAL"] = "partial";
    IndexType["UNIQUE"] = "unique";
})(IndexType || (exports.IndexType = IndexType = {}));
var IndexPriority;
(function (IndexPriority) {
    IndexPriority["CRITICAL"] = "critical";
    IndexPriority["HIGH"] = "high";
    IndexPriority["MEDIUM"] = "medium";
    IndexPriority["LOW"] = "low";
})(IndexPriority || (exports.IndexPriority = IndexPriority = {}));
var OptimizationType;
(function (OptimizationType) {
    OptimizationType["PREDICATE_PUSHDOWN"] = "predicate_pushdown";
    OptimizationType["JOIN_REORDERING"] = "join_reordering";
    OptimizationType["SUBQUERY_FLATTENING"] = "subquery_flattening";
    OptimizationType["INDEX_HINT"] = "index_hint";
    OptimizationType["LIMIT_PUSHDOWN"] = "limit_pushdown";
    OptimizationType["PROJECTION_PRUNING"] = "projection_pruning";
    OptimizationType["CONSTANT_FOLDING"] = "constant_folding";
    OptimizationType["REDUNDANT_JOIN_ELIMINATION"] = "redundant_join_elimination";
})(OptimizationType || (exports.OptimizationType = OptimizationType = {}));
// Predefined query patterns for different operations
exports.QueryPatterns = {
    // Nest-related queries
    NEST_OPERATIONS: {
        findBySubdomain: {
            pattern: /SELECT .* FROM nests WHERE subdomain = \$1/i,
            expectedIndexes: ['idx_nests_subdomain'],
            cacheability: 0.9,
            ttl: 300000 // 5 minutes
        },
        findWithServices: {
            pattern: /SELECT .* FROM nests n LEFT JOIN services s ON n\.id = s\.nest_id WHERE n\.subdomain = \$1/i,
            expectedIndexes: ['idx_nests_subdomain', 'idx_services_nest_id'],
            cacheability: 0.8,
            ttl: 60000 // 1 minute
        }
    },
    // Service monitoring queries
    SERVICE_OPERATIONS: {
        getServiceStatus: {
            pattern: /SELECT .* FROM service_status WHERE service_id = \$1 ORDER BY timestamp DESC LIMIT 1/i,
            expectedIndexes: ['idx_service_status_service_id_timestamp'],
            cacheability: 0.7,
            ttl: 30000 // 30 seconds
        },
        getStatusHistory: {
            pattern: /SELECT .* FROM service_status WHERE service_id = \$1 AND timestamp >= \$2 ORDER BY timestamp/i,
            expectedIndexes: ['idx_service_status_service_id_timestamp'],
            cacheability: 0.9,
            ttl: 300000 // 5 minutes
        },
        bulkStatusUpdate: {
            pattern: /INSERT INTO service_status \(service_id, status, response_time, timestamp\) VALUES/i,
            expectedIndexes: [],
            cacheability: 0.0,
            ttl: 0
        }
    },
    // User authentication queries
    AUTH_OPERATIONS: {
        findUserByEmail: {
            pattern: /SELECT .* FROM users WHERE email = \$1/i,
            expectedIndexes: ['idx_users_email'],
            cacheability: 0.8,
            ttl: 600000 // 10 minutes
        },
        validateSession: {
            pattern: /SELECT .* FROM user_sessions WHERE token = \$1 AND expires_at > NOW\(\)/i,
            expectedIndexes: ['idx_user_sessions_token', 'idx_user_sessions_expires_at'],
            cacheability: 0.6,
            ttl: 60000 // 1 minute
        }
    },
    // Analytics and reporting queries
    ANALYTICS_OPERATIONS: {
        uptimeReport: {
            pattern: /SELECT.*AVG.*FROM service_status WHERE.*GROUP BY/i,
            expectedIndexes: ['idx_service_status_service_id_timestamp', 'idx_service_status_status'],
            cacheability: 0.95,
            ttl: 1800000 // 30 minutes
        },
        responseTimeMetrics: {
            pattern: /SELECT.*response_time.*FROM service_status WHERE.*timestamp/i,
            expectedIndexes: ['idx_service_status_service_id_timestamp'],
            cacheability: 0.9,
            ttl: 900000 // 15 minutes
        }
    }
};
class QueryOptimizer {
    constructor(serviceName, tracing) {
        this.serviceName = serviceName;
        this.queryStats = new Map();
        this.planCache = new Map();
        this.indexRecommendations = new Map();
        this.logger = (0, logger_1.createLogger)(`${serviceName}-query-optimizer`);
        this.tracing = tracing;
    }
    generateQueryId(query) {
        // Simple hash function for query identification
        let hash = 0;
        for (let i = 0; i < query.length; i++) {
            const char = query.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return `query_${Math.abs(hash).toString(36)}`;
    }
    normalizeQuery(query) {
        // Normalize query for consistent analysis
        return query
            .replace(/\s+/g, ' ')
            .replace(/\$\d+/g, '?')
            .replace(/['"][^'"]*['"]/g, '?')
            .trim()
            .toLowerCase();
    }
    analyzeQueryPattern(query) {
        const normalized = this.normalizeQuery(query);
        for (const [category, patterns] of Object.entries(exports.QueryPatterns)) {
            for (const [operation, config] of Object.entries(patterns)) {
                if (config.pattern.test(normalized)) {
                    return {
                        category,
                        operation,
                        config,
                        pattern: config.pattern
                    };
                }
            }
        }
        return null;
    }
    estimateQueryCost(query) {
        const normalized = this.normalizeQuery(query);
        let cost = 1;
        // Base cost adjustments
        if (normalized.includes('join'))
            cost *= 2;
        if (normalized.includes('left join') || normalized.includes('right join'))
            cost *= 1.5;
        if (normalized.includes('group by'))
            cost *= 1.8;
        if (normalized.includes('order by'))
            cost *= 1.3;
        if (normalized.includes('distinct'))
            cost *= 1.5;
        if (normalized.includes('having'))
            cost *= 1.4;
        if (normalized.includes('subquery') || normalized.includes('exists'))
            cost *= 2.5;
        // Table scan indicators
        if (!normalized.includes('where'))
            cost *= 3;
        if (normalized.includes('like'))
            cost *= 1.8;
        if (normalized.includes('not in'))
            cost *= 2.2;
        return Math.round(cost * 100) / 100;
    }
    generateOptimizations(query, pattern) {
        const optimizations = [];
        const normalized = this.normalizeQuery(query);
        // Predicate pushdown optimization
        if (normalized.includes('where') && normalized.includes('join')) {
            const whereClause = normalized.match(/where (.+?)(?:group by|order by|limit|$)/i)?.[1];
            if (whereClause && !whereClause.includes('join')) {
                optimizations.push({
                    type: OptimizationType.PREDICATE_PUSHDOWN,
                    description: 'Move WHERE conditions closer to table scans',
                    originalQuery: query,
                    optimizedQuery: query, // Would contain actual optimized query
                    estimatedImprovement: 0.3,
                    confidence: 0.8
                });
            }
        }
        // Index hint optimization
        if (pattern?.config?.expectedIndexes?.length > 0) {
            for (const index of pattern.config.expectedIndexes) {
                optimizations.push({
                    type: OptimizationType.INDEX_HINT,
                    description: `Consider using index: ${index}`,
                    originalQuery: query,
                    optimizedQuery: query, // Would contain index hint
                    estimatedImprovement: 0.4,
                    confidence: 0.9
                });
            }
        }
        // Subquery flattening
        if (normalized.includes('exists') || normalized.includes('in (select')) {
            optimizations.push({
                type: OptimizationType.SUBQUERY_FLATTENING,
                description: 'Convert subquery to JOIN for better performance',
                originalQuery: query,
                optimizedQuery: query, // Would contain flattened query
                estimatedImprovement: 0.5,
                confidence: 0.7
            });
        }
        // Limit pushdown
        if (normalized.includes('limit') && normalized.includes('order by')) {
            optimizations.push({
                type: OptimizationType.LIMIT_PUSHDOWN,
                description: 'Push LIMIT operation earlier in execution',
                originalQuery: query,
                optimizedQuery: query,
                estimatedImprovement: 0.6,
                confidence: 0.8
            });
        }
        return optimizations;
    }
    calculateCacheability(query, pattern) {
        const factors = [];
        let score = 0.5; // Base score
        // Pattern-based cacheability
        if (pattern?.config?.cacheability) {
            score = pattern.config.cacheability;
            factors.push({
                factor: 'query_pattern',
                impact: pattern.config.cacheability - 0.5,
                reason: `Recognized pattern: ${pattern.category}.${pattern.operation}`
            });
        }
        const normalized = this.normalizeQuery(query);
        // Read-only queries are more cacheable
        if (normalized.startsWith('select')) {
            score += 0.2;
            factors.push({
                factor: 'read_only',
                impact: 0.2,
                reason: 'SELECT queries are cacheable'
            });
        }
        // Queries with time-based conditions are less cacheable
        if (normalized.includes('now()') || normalized.includes('current_timestamp')) {
            score -= 0.4;
            factors.push({
                factor: 'time_dependent',
                impact: -0.4,
                reason: 'Time-dependent queries change frequently'
            });
        }
        // Aggregation queries are often cacheable
        if (normalized.includes('count') || normalized.includes('avg') || normalized.includes('sum')) {
            score += 0.2;
            factors.push({
                factor: 'aggregation',
                impact: 0.2,
                reason: 'Aggregation results change less frequently'
            });
        }
        // User-specific queries are less cacheable
        if (normalized.includes('user_id') || normalized.includes('session')) {
            score -= 0.3;
            factors.push({
                factor: 'user_specific',
                impact: -0.3,
                reason: 'User-specific data varies per user'
            });
        }
        score = Math.max(0, Math.min(1, score));
        return {
            score,
            factors,
            recommendedTTL: pattern?.config?.ttl || Math.round(score * 600000), // Up to 10 minutes
            cacheKey: this.generateCacheKey(query)
        };
    }
    generateCacheKey(query) {
        const normalized = this.normalizeQuery(query);
        return `query_cache_${this.generateQueryId(normalized)}`;
    }
    generateIndexRecommendations(query) {
        const recommendations = [];
        const normalized = this.normalizeQuery(query);
        // Extract table names
        const tableMatches = normalized.match(/from\s+(\w+)|join\s+(\w+)/gi);
        const tables = new Set();
        if (tableMatches) {
            for (const match of tableMatches) {
                const table = match.replace(/^(from|join)\s+/i, '');
                tables.add(table);
            }
        }
        // Extract WHERE conditions
        const whereClause = normalized.match(/where\s+(.+?)(?:\s+group\s+by|\s+order\s+by|\s+limit|$)/i)?.[1];
        if (whereClause) {
            // Look for equality conditions
            const equalityMatches = whereClause.match(/(\w+)\s*=\s*[?$\d]/g);
            if (equalityMatches) {
                for (const match of equalityMatches) {
                    const column = match.split('=')[0].trim();
                    recommendations.push({
                        table: Array.from(tables)[0] || 'unknown',
                        columns: [column],
                        type: IndexType.BTREE,
                        priority: IndexPriority.HIGH,
                        estimatedImprovement: 0.7,
                        reason: `Equality condition on ${column}`
                    });
                }
            }
            // Look for range conditions
            const rangeMatches = whereClause.match(/(\w+)\s*[<>]=?\s*[?$\d]/g);
            if (rangeMatches) {
                for (const match of rangeMatches) {
                    const column = match.split(/[<>]/)[0].trim();
                    recommendations.push({
                        table: Array.from(tables)[0] || 'unknown',
                        columns: [column],
                        type: IndexType.BTREE,
                        priority: IndexPriority.MEDIUM,
                        estimatedImprovement: 0.5,
                        reason: `Range condition on ${column}`
                    });
                }
            }
            // Look for LIKE conditions
            const likeMatches = whereClause.match(/(\w+)\s+like\s+[?$\d]/gi);
            if (likeMatches) {
                for (const match of likeMatches) {
                    const column = match.split(/\s+like\s+/i)[0].trim();
                    recommendations.push({
                        table: Array.from(tables)[0] || 'unknown',
                        columns: [column],
                        type: IndexType.GIN,
                        priority: IndexPriority.MEDIUM,
                        estimatedImprovement: 0.4,
                        reason: `LIKE condition on ${column}`
                    });
                }
            }
        }
        // Extract ORDER BY columns
        const orderByClause = normalized.match(/order\s+by\s+(.+?)(?:\s+limit|$)/i)?.[1];
        if (orderByClause) {
            const orderColumns = orderByClause.split(',').map(col => col.trim().split(' ')[0]);
            recommendations.push({
                table: Array.from(tables)[0] || 'unknown',
                columns: orderColumns,
                type: IndexType.BTREE,
                priority: IndexPriority.MEDIUM,
                estimatedImprovement: 0.6,
                reason: 'ORDER BY optimization'
            });
        }
        // Extract JOIN conditions
        const joinMatches = normalized.match(/on\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/gi);
        if (joinMatches) {
            for (const match of joinMatches) {
                const parts = match.replace(/^on\s+/i, '').split('=');
                if (parts.length === 2) {
                    const leftPart = parts[0].trim().split('.');
                    const rightPart = parts[1].trim().split('.');
                    if (leftPart.length === 2 && rightPart.length === 2) {
                        recommendations.push({
                            table: leftPart[0],
                            columns: [leftPart[1]],
                            type: IndexType.BTREE,
                            priority: IndexPriority.HIGH,
                            estimatedImprovement: 0.8,
                            reason: 'JOIN condition optimization'
                        });
                        recommendations.push({
                            table: rightPart[0],
                            columns: [rightPart[1]],
                            type: IndexType.BTREE,
                            priority: IndexPriority.HIGH,
                            estimatedImprovement: 0.8,
                            reason: 'JOIN condition optimization'
                        });
                    }
                }
            }
        }
        return recommendations;
    }
    analyzeQuery(query, context) {
        const queryId = this.generateQueryId(query);
        // Check if we have a cached plan
        if (this.planCache.has(queryId)) {
            const cachedPlan = this.planCache.get(queryId);
            this.logger.debug('Using cached query plan', { queryId, query: query.substring(0, 100) });
            return cachedPlan;
        }
        const pattern = this.analyzeQueryPattern(query);
        const estimatedCost = this.estimateQueryCost(query);
        const optimizations = this.generateOptimizations(query, pattern);
        const cacheability = this.calculateCacheability(query, pattern);
        const indexes = this.generateIndexRecommendations(query);
        const plan = {
            id: queryId,
            query,
            estimatedCost,
            estimatedRows: Math.round(estimatedCost * 100), // Rough estimate
            executionPlan: [{
                    step: 1,
                    operation: OperationType.TABLE_SCAN,
                    estimatedCost,
                    estimatedRows: Math.round(estimatedCost * 100)
                }],
            indexes,
            optimizations,
            cacheability
        };
        // Cache the plan
        this.planCache.set(queryId, plan);
        // Store index recommendations
        if (indexes.length > 0) {
            this.indexRecommendations.set(queryId, indexes);
        }
        this.logger.debug('Query analysis completed', {
            queryId,
            estimatedCost,
            optimizations: optimizations.length,
            cacheability: cacheability.score,
            indexes: indexes.length
        });
        if (this.tracing) {
            this.tracing.addEvent('query_analyzed', {
                'query.id': queryId,
                'query.estimated_cost': estimatedCost.toString(),
                'query.optimizations_count': optimizations.length.toString(),
                'query.cacheability_score': cacheability.score.toString(),
                'query.index_recommendations': indexes.length.toString()
            });
        }
        return plan;
    }
    recordExecution(queryId, executionTime, rowsAffected, bytesTransferred = 0, cacheHit = false, context) {
        const plan = this.planCache.get(queryId);
        if (!plan) {
            this.logger.warn('Recording execution for unknown query', { queryId });
            return;
        }
        const stats = {
            queryId,
            query: plan.query,
            executionTime,
            rowsAffected,
            bytesTransferred,
            cacheHit,
            planHash: queryId,
            timestamp: Date.now(),
            nestId: context?.nestId,
            userId: context?.userId
        };
        // Store stats
        if (!this.queryStats.has(queryId)) {
            this.queryStats.set(queryId, []);
        }
        const queryStatsList = this.queryStats.get(queryId);
        queryStatsList.push(stats);
        // Keep only recent stats (last 100 executions)
        if (queryStatsList.length > 100) {
            queryStatsList.shift();
        }
        // Log slow queries
        const isSlowQuery = executionTime > 1000; // 1 second
        if (isSlowQuery) {
            this.logger.warn('Slow query detected', new error_handling_1.PerformanceError(`Query execution time: ${executionTime}ms`, {
                service: this.serviceName,
                operation: 'query_execution'
            }), {
                queryId,
                executionTime,
                query: plan.query.substring(0, 200),
                rowsAffected,
                estimatedCost: plan.estimatedCost
            });
            if (this.tracing) {
                this.tracing.addEvent('slow_query_detected', {
                    'query.id': queryId,
                    'query.execution_time_ms': executionTime.toString(),
                    'query.rows_affected': rowsAffected.toString(),
                    'query.estimated_cost': plan.estimatedCost.toString()
                });
            }
        }
        this.logger.debug('Query execution recorded', {
            queryId,
            executionTime,
            rowsAffected,
            cacheHit,
            isSlowQuery
        });
    }
    getPerformanceMetrics() {
        let totalQueries = 0;
        let totalExecutionTime = 0;
        let slowQueries = 0;
        let cacheHits = 0;
        const allStats = [];
        // Aggregate stats from all queries
        for (const statsList of this.queryStats.values()) {
            for (const stats of statsList) {
                totalQueries++;
                totalExecutionTime += stats.executionTime;
                allStats.push(stats);
                if (stats.executionTime > 1000) {
                    slowQueries++;
                }
                if (stats.cacheHit) {
                    cacheHits++;
                }
            }
        }
        // Find most expensive queries
        const mostExpensiveQueries = allStats
            .sort((a, b) => b.executionTime - a.executionTime)
            .slice(0, 10);
        // Collect all index recommendations
        const allIndexRecommendations = [];
        for (const recommendations of this.indexRecommendations.values()) {
            allIndexRecommendations.push(...recommendations);
        }
        // Collect optimization opportunities
        const optimizationOpportunities = [];
        for (const plan of this.planCache.values()) {
            optimizationOpportunities.push(...plan.optimizations);
        }
        return {
            totalQueries,
            averageExecutionTime: totalQueries > 0 ? totalExecutionTime / totalQueries : 0,
            slowQueries,
            cacheHitRate: totalQueries > 0 ? cacheHits / totalQueries : 0,
            mostExpensiveQueries,
            indexRecommendations: allIndexRecommendations,
            optimizationOpportunities
        };
    }
    getAllPlans() {
        return Array.from(this.planCache.values());
    }
    clearCache() {
        this.planCache.clear();
        this.queryStats.clear();
        this.indexRecommendations.clear();
        this.logger.info('Query optimizer cache cleared');
    }
    getHealthStatus() {
        const metrics = this.getPerformanceMetrics();
        const avgExecutionTime = metrics.averageExecutionTime;
        const slowQueryRate = metrics.totalQueries > 0 ? metrics.slowQueries / metrics.totalQueries : 0;
        return {
            healthy: avgExecutionTime < 500 && slowQueryRate < 0.1, // Less than 500ms avg and <10% slow queries
            details: {
                cachedPlans: this.planCache.size,
                averageExecutionTime: avgExecutionTime,
                slowQueryRate: slowQueryRate,
                cacheHitRate: metrics.cacheHitRate,
                indexRecommendations: metrics.indexRecommendations.length
            }
        };
    }
}
exports.QueryOptimizer = QueryOptimizer;
// Query execution wrapper with optimization
class OptimizedQueryExecutor {
    constructor(serviceName, executeQuery, cacheGet, cacheSet, tracing) {
        this.serviceName = serviceName;
        this.executeQuery = executeQuery;
        this.cacheGet = cacheGet;
        this.cacheSet = cacheSet;
        this.logger = (0, logger_1.createLogger)(`${serviceName}-query-executor`);
        this.optimizer = new QueryOptimizer(serviceName, tracing);
    }
    async execute(query, params, context) {
        const startTime = Date.now();
        // Analyze query
        const plan = this.optimizer.analyzeQuery(query, context);
        // Check cache if available and query is cacheable
        let result;
        let cacheHit = false;
        if (this.cacheGet && plan.cacheability.score > 0.5) {
            const cacheKey = `${plan.cacheability.cacheKey}_${JSON.stringify(params || [])}`;
            try {
                const cachedResult = await this.cacheGet(cacheKey);
                if (cachedResult !== null && cachedResult !== undefined) {
                    result = cachedResult;
                    cacheHit = true;
                    this.logger.debug('Query result served from cache', {
                        queryId: plan.id,
                        cacheKey
                    });
                }
            }
            catch (error) {
                this.logger.warn('Cache lookup failed', error, { cacheKey });
            }
        }
        // Execute query if not cached
        if (!cacheHit) {
            try {
                result = await this.executeQuery(query, params);
                // Cache result if cacheable
                if (this.cacheSet && plan.cacheability.score > 0.5) {
                    const cacheKey = `${plan.cacheability.cacheKey}_${JSON.stringify(params || [])}`;
                    try {
                        await this.cacheSet(cacheKey, result, plan.cacheability.recommendedTTL);
                        this.logger.debug('Query result cached', {
                            queryId: plan.id,
                            cacheKey,
                            ttl: plan.cacheability.recommendedTTL
                        });
                    }
                    catch (error) {
                        this.logger.warn('Cache storage failed', error, { cacheKey });
                    }
                }
            }
            catch (error) {
                const executionTime = Date.now() - startTime;
                this.optimizer.recordExecution(plan.id, executionTime, 0, 0, false, context);
                throw error;
            }
        }
        // Record execution stats
        const executionTime = Date.now() - startTime;
        const rowsAffected = Array.isArray(result) ? result.length : (result?.rowCount || 1);
        const bytesTransferred = JSON.stringify(result).length;
        this.optimizer.recordExecution(plan.id, executionTime, rowsAffected, bytesTransferred, cacheHit, context);
        return result;
    }
    getOptimizer() {
        return this.optimizer;
    }
}
exports.OptimizedQueryExecutor = OptimizedQueryExecutor;
// Factory functions
function createQueryOptimizer(serviceName, tracing) {
    return new QueryOptimizer(serviceName, tracing);
}
function createOptimizedQueryExecutor(serviceName, executeQuery, cacheGet, cacheSet, tracing) {
    return new OptimizedQueryExecutor(serviceName, executeQuery, cacheGet, cacheSet, tracing);
}
//# sourceMappingURL=query-optimization.js.map