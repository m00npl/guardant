"use strict";
/**
 * Database indexing strategy and management system for GuardAnt services
 * Provides intelligent index recommendations, creation, and performance monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseIndexManager = exports.IndexStrategies = exports.IndexPriority = exports.IndexStorage = exports.IndexType = void 0;
exports.createDatabaseIndexManager = createDatabaseIndexManager;
const logger_1 = require("./logger");
const error_handling_1 = require("./error-handling");
var IndexType;
(function (IndexType) {
    IndexType["BTREE"] = "btree";
    IndexType["HASH"] = "hash";
    IndexType["GIN"] = "gin";
    IndexType["GIST"] = "gist";
    IndexType["SP_GIST"] = "spgist";
    IndexType["BRIN"] = "brin";
    IndexType["BLOOM"] = "bloom";
    IndexType["PARTIAL"] = "partial";
    IndexType["EXPRESSION"] = "expression";
    IndexType["COMPOUND"] = "compound";
    IndexType["COVERING"] = "covering"; // Index with INCLUDE columns
})(IndexType || (exports.IndexType = IndexType = {}));
var IndexStorage;
(function (IndexStorage) {
    IndexStorage["NORMAL"] = "normal";
    IndexStorage["COMPRESSED"] = "compressed";
    IndexStorage["MEMORY"] = "memory";
})(IndexStorage || (exports.IndexStorage = IndexStorage = {}));
var IndexPriority;
(function (IndexPriority) {
    IndexPriority["CRITICAL"] = "critical";
    IndexPriority["HIGH"] = "high";
    IndexPriority["MEDIUM"] = "medium";
    IndexPriority["LOW"] = "low";
    IndexPriority["EXPERIMENTAL"] = "experimental"; // Testing phase
})(IndexPriority || (exports.IndexPriority = IndexPriority = {}));
// Predefined index strategies for GuardAnt tables
exports.IndexStrategies = {
    // Nests table - core tenant data
    NESTS: [
        {
            name: 'idx_nests_subdomain',
            table: 'nests',
            columns: [{ name: 'subdomain', direction: 'ASC' }],
            type: IndexType.BTREE,
            unique: true,
            priority: IndexPriority.CRITICAL,
            estimated_size: 50, // KB
            estimated_improvement: 0.95,
            maintenance_cost: 0.1
        },
        {
            name: 'idx_nests_email',
            table: 'nests',
            columns: [{ name: 'email', direction: 'ASC' }],
            type: IndexType.BTREE,
            unique: true,
            priority: IndexPriority.CRITICAL,
            estimated_size: 40,
            estimated_improvement: 0.9,
            maintenance_cost: 0.1
        },
        {
            name: 'idx_nests_created_at',
            table: 'nests',
            columns: [{ name: 'created_at', direction: 'DESC' }],
            type: IndexType.BTREE,
            unique: false,
            priority: IndexPriority.MEDIUM,
            estimated_size: 30,
            estimated_improvement: 0.3,
            maintenance_cost: 0.15
        },
        {
            name: 'idx_nests_subscription_tier',
            table: 'nests',
            columns: [{ name: 'subscription_tier', direction: 'ASC' }],
            type: IndexType.BTREE,
            unique: false,
            priority: IndexPriority.MEDIUM,
            estimated_size: 25,
            estimated_improvement: 0.4,
            maintenance_cost: 0.1
        }
    ],
    // Services table - monitored services
    SERVICES: [
        {
            name: 'idx_services_nest_id',
            table: 'services',
            columns: [{ name: 'nest_id', direction: 'ASC' }],
            type: IndexType.BTREE,
            unique: false,
            priority: IndexPriority.CRITICAL,
            estimated_size: 100,
            estimated_improvement: 0.9,
            maintenance_cost: 0.2
        },
        {
            name: 'idx_services_nest_id_name',
            table: 'services',
            columns: [
                { name: 'nest_id', direction: 'ASC' },
                { name: 'name', direction: 'ASC' }
            ],
            type: IndexType.COMPOUND,
            unique: true,
            priority: IndexPriority.HIGH,
            estimated_size: 120,
            estimated_improvement: 0.8,
            maintenance_cost: 0.25
        },
        {
            name: 'idx_services_type_enabled',
            table: 'services',
            columns: [
                { name: 'type', direction: 'ASC' },
                { name: 'enabled', direction: 'ASC' }
            ],
            type: IndexType.COMPOUND,
            unique: false,
            priority: IndexPriority.MEDIUM,
            estimated_size: 60,
            estimated_improvement: 0.5,
            maintenance_cost: 0.2
        },
        {
            name: 'idx_services_url_gin',
            table: 'services',
            columns: [{ name: 'url', direction: 'ASC' }],
            type: IndexType.GIN,
            unique: false,
            priority: IndexPriority.LOW,
            estimated_size: 80,
            estimated_improvement: 0.3,
            maintenance_cost: 0.3
        }
    ],
    // Service status table - high-volume monitoring data
    SERVICE_STATUS: [
        {
            name: 'idx_service_status_service_id_timestamp',
            table: 'service_status',
            columns: [
                { name: 'service_id', direction: 'ASC' },
                { name: 'timestamp', direction: 'DESC' }
            ],
            type: IndexType.COMPOUND,
            unique: false,
            priority: IndexPriority.CRITICAL,
            estimated_size: 500,
            estimated_improvement: 0.95,
            maintenance_cost: 0.4
        },
        {
            name: 'idx_service_status_timestamp',
            table: 'service_status',
            columns: [{ name: 'timestamp', direction: 'DESC' }],
            type: IndexType.BRIN, // Efficient for time-series data
            unique: false,
            priority: IndexPriority.HIGH,
            estimated_size: 50,
            estimated_improvement: 0.7,
            maintenance_cost: 0.1
        },
        {
            name: 'idx_service_status_status',
            table: 'service_status',
            columns: [{ name: 'status', direction: 'ASC' }],
            type: IndexType.BTREE,
            unique: false,
            priority: IndexPriority.MEDIUM,
            estimated_size: 100,
            estimated_improvement: 0.4,
            maintenance_cost: 0.3
        },
        {
            name: 'idx_service_status_response_time',
            table: 'service_status',
            columns: [{ name: 'response_time', direction: 'ASC' }],
            type: IndexType.BTREE,
            unique: false,
            priority: IndexPriority.LOW,
            estimated_size: 150,
            estimated_improvement: 0.3,
            maintenance_cost: 0.2
        },
        {
            name: 'idx_service_status_recent_data',
            table: 'service_status',
            columns: [
                { name: 'service_id', direction: 'ASC' },
                { name: 'timestamp', direction: 'DESC' }
            ],
            type: IndexType.PARTIAL,
            unique: false,
            partial: 'timestamp > NOW() - INTERVAL \'7 days\'',
            priority: IndexPriority.HIGH,
            estimated_size: 200,
            estimated_improvement: 0.8,
            maintenance_cost: 0.3
        }
    ],
    // Users table - authentication data
    USERS: [
        {
            name: 'idx_users_email',
            table: 'users',
            columns: [{ name: 'email', direction: 'ASC' }],
            type: IndexType.BTREE,
            unique: true,
            priority: IndexPriority.CRITICAL,
            estimated_size: 80,
            estimated_improvement: 0.95,
            maintenance_cost: 0.1
        },
        {
            name: 'idx_users_nest_id',
            table: 'users',
            columns: [{ name: 'nest_id', direction: 'ASC' }],
            type: IndexType.BTREE,
            unique: false,
            priority: IndexPriority.HIGH,
            estimated_size: 40,
            estimated_improvement: 0.8,
            maintenance_cost: 0.15
        },
        {
            name: 'idx_users_last_login',
            table: 'users',
            columns: [{ name: 'last_login_at', direction: 'DESC' }],
            type: IndexType.BTREE,
            unique: false,
            priority: IndexPriority.LOW,
            estimated_size: 30,
            estimated_improvement: 0.2,
            maintenance_cost: 0.1
        }
    ],
    // User sessions table - session management
    USER_SESSIONS: [
        {
            name: 'idx_user_sessions_token',
            table: 'user_sessions',
            columns: [{ name: 'token', direction: 'ASC' }],
            type: IndexType.HASH, // Hash is perfect for equality lookups
            unique: true,
            priority: IndexPriority.CRITICAL,
            estimated_size: 100,
            estimated_improvement: 0.9,
            maintenance_cost: 0.1
        },
        {
            name: 'idx_user_sessions_user_id',
            table: 'user_sessions',
            columns: [{ name: 'user_id', direction: 'ASC' }],
            type: IndexType.BTREE,
            unique: false,
            priority: IndexPriority.HIGH,
            estimated_size: 60,
            estimated_improvement: 0.7,
            maintenance_cost: 0.15
        },
        {
            name: 'idx_user_sessions_expires_at',
            table: 'user_sessions',
            columns: [{ name: 'expires_at', direction: 'ASC' }],
            type: IndexType.BTREE,
            unique: false,
            priority: IndexPriority.MEDIUM,
            estimated_size: 40,
            estimated_improvement: 0.5,
            maintenance_cost: 0.1
        },
        {
            name: 'idx_user_sessions_active',
            table: 'user_sessions',
            columns: [
                { name: 'user_id', direction: 'ASC' },
                { name: 'expires_at', direction: 'DESC' }
            ],
            type: IndexType.PARTIAL,
            unique: false,
            partial: 'expires_at > NOW()',
            priority: IndexPriority.HIGH,
            estimated_size: 50,
            estimated_improvement: 0.8,
            maintenance_cost: 0.2
        }
    ],
    // Payment transactions table - financial data
    PAYMENT_TRANSACTIONS: [
        {
            name: 'idx_payment_transactions_nest_id',
            table: 'payment_transactions',
            columns: [{ name: 'nest_id', direction: 'ASC' }],
            type: IndexType.BTREE,
            unique: false,
            priority: IndexPriority.HIGH,
            estimated_size: 60,
            estimated_improvement: 0.8,
            maintenance_cost: 0.15
        },
        {
            name: 'idx_payment_transactions_tx_hash',
            table: 'payment_transactions',
            columns: [{ name: 'transaction_hash', direction: 'ASC' }],
            type: IndexType.BTREE,
            unique: true,
            priority: IndexPriority.CRITICAL,
            estimated_size: 80,
            estimated_improvement: 0.9,
            maintenance_cost: 0.1
        },
        {
            name: 'idx_payment_transactions_created_at',
            table: 'payment_transactions',
            columns: [{ name: 'created_at', direction: 'DESC' }],
            type: IndexType.BRIN,
            unique: false,
            priority: IndexPriority.MEDIUM,
            estimated_size: 20,
            estimated_improvement: 0.4,
            maintenance_cost: 0.05
        },
        {
            name: 'idx_payment_transactions_status',
            table: 'payment_transactions',
            columns: [{ name: 'status', direction: 'ASC' }],
            type: IndexType.BTREE,
            unique: false,
            priority: IndexPriority.MEDIUM,
            estimated_size: 30,
            estimated_improvement: 0.5,
            maintenance_cost: 0.1
        }
    ],
    // Monitoring alerts table
    MONITORING_ALERTS: [
        {
            name: 'idx_monitoring_alerts_service_id',
            table: 'monitoring_alerts',
            columns: [{ name: 'service_id', direction: 'ASC' }],
            type: IndexType.BTREE,
            unique: false,
            priority: IndexPriority.HIGH,
            estimated_size: 80,
            estimated_improvement: 0.8,
            maintenance_cost: 0.2
        },
        {
            name: 'idx_monitoring_alerts_created_at',
            table: 'monitoring_alerts',
            columns: [{ name: 'created_at', direction: 'DESC' }],
            type: IndexType.BTREE,
            unique: false,
            priority: IndexPriority.HIGH,
            estimated_size: 60,
            estimated_improvement: 0.7,
            maintenance_cost: 0.15
        },
        {
            name: 'idx_monitoring_alerts_severity_status',
            table: 'monitoring_alerts',
            columns: [
                { name: 'severity', direction: 'DESC' },
                { name: 'status', direction: 'ASC' }
            ],
            type: IndexType.COMPOUND,
            unique: false,
            priority: IndexPriority.MEDIUM,
            estimated_size: 50,
            estimated_improvement: 0.6,
            maintenance_cost: 0.2
        }
    ]
};
class DatabaseIndexManager {
    constructor(serviceName, dbConnection, // Database connection
    tracing) {
        this.serviceName = serviceName;
        this.dbConnection = dbConnection;
        this.indexUsageStats = new Map();
        this.tableAnalysis = new Map();
        this.recommendedIndexes = new Map();
        this.logger = (0, logger_1.createLogger)(`${serviceName}-index-manager`);
        this.tracing = tracing;
    }
    async analyzeDatabase() {
        this.logger.info('Starting database analysis for index optimization');
        try {
            // Analyze table statistics
            await this.analyzeTableStatistics();
            // Analyze index usage
            await this.analyzeIndexUsage();
            // Generate recommendations
            await this.generateIndexRecommendations();
            this.logger.info('Database analysis completed', {
                tablesAnalyzed: this.tableAnalysis.size,
                indexesAnalyzed: this.indexUsageStats.size,
                recommendations: Array.from(this.recommendedIndexes.values())
                    .reduce((total, indexes) => total + indexes.length, 0)
            });
        }
        catch (error) {
            this.logger.error('Database analysis failed', error);
            throw new error_handling_1.DatabaseError('Failed to analyze database for indexing', {
                service: this.serviceName,
                operation: 'database_analysis'
            });
        }
    }
    async analyzeTableStatistics() {
        const query = `
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as insert_count,
        n_tup_upd as update_count,
        n_tup_del as delete_count,
        n_tup_hot_upd as hot_update_count,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch,
        n_dead_tup as dead_tuples,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze,
        vacuum_count,
        autovacuum_count,
        analyze_count,
        autoanalyze_count
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
    `;
        try {
            const result = await this.dbConnection.query(query);
            for (const row of result.rows) {
                // Get table size information
                const sizeQuery = `
          SELECT 
            pg_total_relation_size('${row.tablename}') as total_size,
            pg_relation_size('${row.tablename}') as table_size,
            pg_indexes_size('${row.tablename}') as index_size,
            (SELECT reltuples FROM pg_class WHERE relname = '${row.tablename}') as row_count
        `;
                const sizeResult = await this.dbConnection.query(sizeQuery);
                const sizeData = sizeResult.rows[0];
                const analysis = {
                    table_name: row.tablename,
                    row_count: parseInt(sizeData.row_count) || 0,
                    table_size: parseInt(sizeData.table_size) || 0,
                    index_size: parseInt(sizeData.index_size) || 0,
                    seq_scan: parseInt(row.seq_scan) || 0,
                    seq_tup_read: parseInt(row.seq_tup_read) || 0,
                    idx_scan: parseInt(row.idx_scan) || 0,
                    idx_tup_fetch: parseInt(row.idx_tup_fetch) || 0,
                    insert_count: parseInt(row.insert_count) || 0,
                    update_count: parseInt(row.update_count) || 0,
                    delete_count: parseInt(row.delete_count) || 0,
                    hot_update_count: parseInt(row.hot_update_count) || 0,
                    autovacuum_count: parseInt(row.autovacuum_count) || 0,
                    autoanalyze_count: parseInt(row.autoanalyze_count) || 0,
                    last_vacuum: row.last_vacuum,
                    last_analyze: row.last_analyze
                };
                this.tableAnalysis.set(row.tablename, analysis);
            }
        }
        catch (error) {
            this.logger.error('Failed to analyze table statistics', error);
        }
    }
    async analyzeIndexUsage() {
        const query = `
      SELECT 
        t.schemaname,
        t.tablename as table_name,
        i.indexrelname as index_name,
        i.idx_scan as index_scans,
        i.idx_tup_read as tuples_read,
        i.idx_tup_fetch as tuples_fetched,
        pg_relation_size(i.indexrelid) as index_size,
        pg_stat_get_last_analyze_time(i.indexrelid) as last_used,
        (SELECT (n_tup_ins + n_tup_upd + n_tup_del) FROM pg_stat_user_tables WHERE relname = t.tablename) as table_writes
      FROM pg_stat_user_tables t
      JOIN pg_stat_user_indexes i ON t.relid = i.relid
      WHERE t.schemaname = 'public'
    `;
        try {
            const result = await this.dbConnection.query(query);
            for (const row of result.rows) {
                const tableWrites = parseInt(row.table_writes) || 0;
                const indexScans = parseInt(row.index_scans) || 0;
                const indexSize = parseInt(row.index_size) || 0;
                // Calculate usage metrics
                const usageRatio = tableWrites > 0 ? indexScans / tableWrites : 0;
                const maintenanceCost = this.calculateMaintenanceCost(indexSize, tableWrites);
                const effectivenessScore = this.calculateEffectivenessScore(indexScans, parseInt(row.tuples_read) || 0, parseInt(row.tuples_fetched) || 0, indexSize);
                const usage = {
                    index_name: row.index_name,
                    table_name: row.table_name,
                    index_scans: indexScans,
                    tuples_read: parseInt(row.tuples_read) || 0,
                    tuples_fetched: parseInt(row.tuples_fetched) || 0,
                    index_size: indexSize,
                    last_used: row.last_used,
                    created_at: new Date(), // Would get from pg_indexes
                    usage_ratio: usageRatio,
                    maintenance_cost: maintenanceCost,
                    effectiveness_score: effectivenessScore
                };
                this.indexUsageStats.set(row.index_name, usage);
            }
        }
        catch (error) {
            this.logger.error('Failed to analyze index usage', error);
        }
    }
    calculateMaintenanceCost(indexSize, writeOperations) {
        // Simple heuristic: larger indexes and more writes = higher maintenance cost
        const sizeFactor = Math.log(Math.max(indexSize, 1)) / Math.log(1024 * 1024); // MB scale
        const writeFactor = Math.log(Math.max(writeOperations, 1)) / Math.log(10000); // 10k scale
        return Math.min(1.0, (sizeFactor * 0.3) + (writeFactor * 0.7));
    }
    calculateEffectivenessScore(scans, tuplesRead, tuplesFetched, indexSize) {
        if (scans === 0)
            return 0;
        // Selectivity: how many tuples we actually use vs read
        const selectivity = tuplesRead > 0 ? tuplesFetched / tuplesRead : 1;
        // Usage frequency (normalized)
        const usageFrequency = Math.min(1.0, scans / 1000);
        // Size efficiency (prefer smaller indexes that do the same job)
        const sizeEfficiency = 1.0 / (1.0 + Math.log(Math.max(indexSize, 1)) / Math.log(1024));
        return (selectivity * 0.5) + (usageFrequency * 0.3) + (sizeEfficiency * 0.2);
    }
    async generateIndexRecommendations() {
        // Apply predefined strategies
        for (const [tableGroup, indexes] of Object.entries(exports.IndexStrategies)) {
            for (const indexDef of indexes) {
                const table = indexDef.table;
                const analysis = this.tableAnalysis.get(table);
                if (!analysis)
                    continue;
                // Check if index already exists
                const existingIndex = Array.from(this.indexUsageStats.values())
                    .find(usage => usage.table_name === table &&
                    usage.index_name.includes(indexDef.name.replace('idx_', '')));
                if (existingIndex) {
                    // Analyze existing index performance
                    if (existingIndex.effectiveness_score < 0.3) {
                        this.logger.warn('Low effectiveness index detected', {
                            indexName: existingIndex.index_name,
                            effectivenessScore: existingIndex.effectiveness_score,
                            recommendation: 'Consider dropping or redesigning'
                        });
                    }
                    continue;
                }
                // Calculate recommendation score based on table analysis
                const recommendationScore = this.calculateRecommendationScore(indexDef, analysis);
                if (recommendationScore > 0.5) { // Threshold for recommendation
                    if (!this.recommendedIndexes.has(table)) {
                        this.recommendedIndexes.set(table, []);
                    }
                    const recommendations = this.recommendedIndexes.get(table);
                    recommendations.push({
                        ...indexDef,
                        estimated_improvement: recommendationScore
                    });
                }
            }
        }
        // Generate additional recommendations based on query patterns
        await this.generateQueryBasedRecommendations();
    }
    calculateRecommendationScore(index, analysis) {
        let score = 0.5; // Base score
        // High sequential scan ratio suggests need for indexes
        if (analysis.seq_scan > 0 && analysis.idx_scan > 0) {
            const seqScanRatio = analysis.seq_scan / (analysis.seq_scan + analysis.idx_scan);
            if (seqScanRatio > 0.5) {
                score += 0.3;
            }
        }
        // Large table size suggests indexes are more valuable
        if (analysis.row_count > 10000) {
            score += 0.2;
        }
        // High write activity suggests indexes have maintenance cost
        const writeActivity = analysis.insert_count + analysis.update_count + analysis.delete_count;
        if (writeActivity > analysis.row_count * 0.1) { // More than 10% writes
            score -= 0.1;
        }
        // Priority-based scoring
        switch (index.priority) {
            case IndexPriority.CRITICAL:
                score += 0.4;
                break;
            case IndexPriority.HIGH:
                score += 0.3;
                break;
            case IndexPriority.MEDIUM:
                score += 0.1;
                break;
            case IndexPriority.LOW:
                score -= 0.1;
                break;
        }
        return Math.max(0, Math.min(1, score));
    }
    async generateQueryBasedRecommendations() {
        // This would analyze actual query patterns from pg_stat_statements
        // For now, we'll implement basic heuristics
        try {
            const slowQueriesQuery = `
        SELECT query, calls, mean_exec_time, total_exec_time
        FROM pg_stat_statements 
        WHERE mean_exec_time > 100 
        ORDER BY total_exec_time DESC 
        LIMIT 20
      `;
            const result = await this.dbConnection.query(slowQueriesQuery);
            for (const row of result.rows) {
                const recommendations = this.analyzeQueryForIndexes(row.query);
                for (const rec of recommendations) {
                    const table = rec.table;
                    if (!this.recommendedIndexes.has(table)) {
                        this.recommendedIndexes.set(table, []);
                    }
                    const existing = this.recommendedIndexes.get(table);
                    // Check if similar recommendation already exists
                    const similar = existing.find(idx => idx.columns.some(col => rec.columns.some(recCol => recCol.name === col.name)));
                    if (!similar) {
                        existing.push(rec);
                    }
                }
            }
        }
        catch (error) {
            // pg_stat_statements might not be available
            this.logger.debug('Could not analyze pg_stat_statements', { error: error.message });
        }
    }
    analyzeQueryForIndexes(query) {
        const recommendations = [];
        const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();
        // Look for WHERE conditions that could benefit from indexes
        const whereMatch = normalizedQuery.match(/where\s+(.+?)(?:\s+group\s+by|\s+order\s+by|\s+limit|$)/);
        if (whereMatch) {
            const whereClause = whereMatch[1];
            // Extract table and column references
            const columnMatches = whereClause.match(/(\w+)\.(\w+)\s*[=<>]/g);
            if (columnMatches) {
                for (const match of columnMatches) {
                    const [, table, column] = match.match(/(\w+)\.(\w+)/) || [];
                    if (table && column) {
                        recommendations.push({
                            name: `idx_${table}_${column}_query_based`,
                            table,
                            columns: [{ name: column, direction: 'ASC' }],
                            type: IndexType.BTREE,
                            unique: false,
                            priority: IndexPriority.MEDIUM,
                            estimated_size: 50,
                            estimated_improvement: 0.6,
                            maintenance_cost: 0.2
                        });
                    }
                }
            }
        }
        return recommendations;
    }
    async createIndex(indexDef) {
        try {
            const sql = this.generateCreateIndexSQL(indexDef);
            this.logger.info('Creating database index', {
                indexName: indexDef.name,
                table: indexDef.table,
                type: indexDef.type,
                sql: sql.substring(0, 200)
            });
            const startTime = Date.now();
            await this.dbConnection.query(sql);
            const duration = Date.now() - startTime;
            this.logger.info('Database index created successfully', {
                indexName: indexDef.name,
                duration,
                estimatedSize: indexDef.estimated_size
            });
            if (this.tracing) {
                this.tracing.addEvent('index_created', {
                    'index.name': indexDef.name,
                    'index.table': indexDef.table,
                    'index.type': indexDef.type,
                    'index.creation_time_ms': duration.toString()
                });
            }
            return true;
        }
        catch (error) {
            this.logger.error('Failed to create database index', error, {
                indexName: indexDef.name,
                table: indexDef.table
            });
            return false;
        }
    }
    generateCreateIndexSQL(indexDef) {
        let sql = 'CREATE';
        if (indexDef.unique) {
            sql += ' UNIQUE';
        }
        sql += ` INDEX ${indexDef.name} ON ${indexDef.table}`;
        if (indexDef.type !== IndexType.BTREE) {
            sql += ` USING ${indexDef.type}`;
        }
        // Column list
        const columns = indexDef.columns.map(col => {
            let colDef = col.name;
            if (col.direction === 'DESC') {
                colDef += ' DESC';
            }
            if (col.nulls) {
                colDef += ` NULLS ${col.nulls}`;
            }
            return colDef;
        }).join(', ');
        sql += ` (${columns})`;
        // INCLUDE columns for covering indexes
        if (indexDef.include && indexDef.include.length > 0) {
            sql += ` INCLUDE (${indexDef.include.join(', ')})`;
        }
        // WHERE clause for partial indexes
        if (indexDef.partial) {
            sql += ` WHERE ${indexDef.partial}`;
        }
        return sql;
    }
    async dropIndex(indexName) {
        try {
            const sql = `DROP INDEX IF EXISTS ${indexName}`;
            this.logger.info('Dropping database index', { indexName });
            await this.dbConnection.query(sql);
            this.logger.info('Database index dropped successfully', { indexName });
            return true;
        }
        catch (error) {
            this.logger.error('Failed to drop database index', error, { indexName });
            return false;
        }
    }
    async reindexTable(tableName) {
        try {
            this.logger.info('Reindexing table', { tableName });
            const startTime = Date.now();
            await this.dbConnection.query(`REINDEX TABLE ${tableName}`);
            const duration = Date.now() - startTime;
            this.logger.info('Table reindexed successfully', { tableName, duration });
            return true;
        }
        catch (error) {
            this.logger.error('Failed to reindex table', error, { tableName });
            return false;
        }
    }
    getIndexRecommendations() {
        return Object.fromEntries(this.recommendedIndexes);
    }
    getUnusedIndexes(thresholdDays = 30) {
        const threshold = Date.now() - (thresholdDays * 24 * 60 * 60 * 1000);
        return Array.from(this.indexUsageStats.values())
            .filter(usage => usage.index_scans < 10 && // Very few scans
            (!usage.last_used || usage.last_used.getTime() < threshold) &&
            !usage.index_name.endsWith('_pkey') // Don't suggest dropping primary keys
        )
            .sort((a, b) => b.index_size - a.index_size); // Largest first
    }
    getIndexEfficiencyReport() {
        const inefficientIndexes = Array.from(this.indexUsageStats.values())
            .filter(usage => usage.effectiveness_score < 0.5)
            .sort((a, b) => a.effectiveness_score - b.effectiveness_score);
        const totalIndexSize = Array.from(this.indexUsageStats.values())
            .reduce((sum, usage) => sum + usage.index_size, 0);
        const averageEffectiveness = Array.from(this.indexUsageStats.values())
            .reduce((sum, usage) => sum + usage.effectiveness_score, 0) / this.indexUsageStats.size;
        return {
            totalIndexes: this.indexUsageStats.size,
            totalIndexSize,
            averageEffectiveness,
            inefficientIndexes: inefficientIndexes.slice(0, 10),
            recommendationsCount: Array.from(this.recommendedIndexes.values())
                .reduce((sum, indexes) => sum + indexes.length, 0),
            unusedIndexesCount: this.getUnusedIndexes().length
        };
    }
    getHealthStatus() {
        const report = this.getIndexEfficiencyReport();
        const unusedIndexes = this.getUnusedIndexes();
        // Health criteria
        const hasHighUnusedIndexRatio = unusedIndexes.length / report.totalIndexes > 0.2;
        const hasLowAverageEffectiveness = report.averageEffectiveness < 0.6;
        const hasTooManyRecommendations = report.recommendationsCount > report.totalIndexes * 0.5;
        const isHealthy = !hasHighUnusedIndexRatio && !hasLowAverageEffectiveness && !hasTooManyRecommendations;
        return {
            healthy: isHealthy,
            details: {
                totalIndexes: report.totalIndexes,
                totalIndexSizeMB: Math.round(report.totalIndexSize / (1024 * 1024)),
                averageEffectiveness: Math.round(report.averageEffectiveness * 100) / 100,
                unusedIndexes: unusedIndexes.length,
                inefficientIndexes: report.inefficientIndexes.length,
                pendingRecommendations: report.recommendationsCount,
                tablesAnalyzed: this.tableAnalysis.size
            }
        };
    }
}
exports.DatabaseIndexManager = DatabaseIndexManager;
// Factory function
function createDatabaseIndexManager(serviceName, dbConnection, tracing) {
    return new DatabaseIndexManager(serviceName, dbConnection, tracing);
}
//# sourceMappingURL=database-indexing.js.map