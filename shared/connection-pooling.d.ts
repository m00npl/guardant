/**
 * Advanced connection pooling system for GuardAnt services
 * Provides optimized connection management for Redis, databases, and external APIs
 */
import type { GuardAntTracing } from './tracing';
export interface ConnectionPoolConfig {
    name: string;
    minConnections: number;
    maxConnections: number;
    acquireTimeoutMs: number;
    idleTimeoutMs: number;
    maxLifetimeMs: number;
    validateConnection: boolean;
    validateOnBorrow: boolean;
    validateOnReturn: boolean;
    testQuery?: string;
    reconnectOnFailure: boolean;
    maxReconnectAttempts: number;
    reconnectDelayMs: number;
    healthCheckIntervalMs: number;
    enableMetrics: boolean;
}
export interface ConnectionPoolMetrics {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    pendingRequests: number;
    totalAcquired: number;
    totalReleased: number;
    totalCreated: number;
    totalDestroyed: number;
    totalErrors: number;
    averageAcquireTime: number;
    averageConnectionLifetime: number;
}
export interface PooledConnection<T = any> {
    id: string;
    connection: T;
    createdAt: number;
    lastUsedAt: number;
    activeTime: number;
    useCount: number;
    isHealthy: boolean;
}
export interface ConnectionFactory<T> {
    create(): Promise<T>;
    validate(connection: T): Promise<boolean>;
    destroy(connection: T): Promise<void>;
    reset?(connection: T): Promise<void>;
}
export declare const ConnectionPoolConfigs: {
    REDIS: {
        name: string;
        minConnections: number;
        maxConnections: number;
        acquireTimeoutMs: number;
        idleTimeoutMs: number;
        maxLifetimeMs: number;
        validateConnection: boolean;
        validateOnBorrow: boolean;
        validateOnReturn: boolean;
        testQuery: string;
        reconnectOnFailure: boolean;
        maxReconnectAttempts: number;
        reconnectDelayMs: number;
        healthCheckIntervalMs: number;
        enableMetrics: boolean;
    };
    DATABASE: {
        name: string;
        minConnections: number;
        maxConnections: number;
        acquireTimeoutMs: number;
        idleTimeoutMs: number;
        maxLifetimeMs: number;
        validateConnection: boolean;
        validateOnBorrow: boolean;
        validateOnReturn: boolean;
        testQuery: string;
        reconnectOnFailure: boolean;
        maxReconnectAttempts: number;
        reconnectDelayMs: number;
        healthCheckIntervalMs: number;
        enableMetrics: boolean;
    };
    RABBITMQ: {
        name: string;
        minConnections: number;
        maxConnections: number;
        acquireTimeoutMs: number;
        idleTimeoutMs: number;
        maxLifetimeMs: number;
        validateConnection: boolean;
        validateOnBorrow: boolean;
        validateOnReturn: boolean;
        reconnectOnFailure: boolean;
        maxReconnectAttempts: number;
        reconnectDelayMs: number;
        healthCheckIntervalMs: number;
        enableMetrics: boolean;
    };
    HTTP_CLIENT: {
        name: string;
        minConnections: number;
        maxConnections: number;
        acquireTimeoutMs: number;
        idleTimeoutMs: number;
        maxLifetimeMs: number;
        validateConnection: boolean;
        validateOnBorrow: boolean;
        validateOnReturn: boolean;
        reconnectOnFailure: boolean;
        maxReconnectAttempts: number;
        reconnectDelayMs: number;
        healthCheckIntervalMs: number;
        enableMetrics: boolean;
    };
    ETHEREUM_RPC: {
        name: string;
        minConnections: number;
        maxConnections: number;
        acquireTimeoutMs: number;
        idleTimeoutMs: number;
        maxLifetimeMs: number;
        validateConnection: boolean;
        validateOnBorrow: boolean;
        validateOnReturn: boolean;
        testQuery: string;
        reconnectOnFailure: boolean;
        maxReconnectAttempts: number;
        reconnectDelayMs: number;
        healthCheckIntervalMs: number;
        enableMetrics: boolean;
    };
    GOLEM_L3: {
        name: string;
        minConnections: number;
        maxConnections: number;
        acquireTimeoutMs: number;
        idleTimeoutMs: number;
        maxLifetimeMs: number;
        validateConnection: boolean;
        validateOnBorrow: boolean;
        validateOnReturn: boolean;
        reconnectOnFailure: boolean;
        maxReconnectAttempts: number;
        reconnectDelayMs: number;
        healthCheckIntervalMs: number;
        enableMetrics: boolean;
    };
};
export declare class ConnectionPool<T> {
    private factory;
    private config;
    private serviceName;
    private logger;
    private tracing?;
    private circuitBreaker;
    private connections;
    private availableConnections;
    private waitingRequests;
    private metrics;
    private acquireTimes;
    private connectionLifetimes;
    private healthCheckInterval?;
    private isShuttingDown;
    constructor(factory: ConnectionFactory<T>, config: ConnectionPoolConfig, serviceName: string, tracing?: GuardAntTracing);
    private initialize;
    private generateConnectionId;
    private createConnection;
    private destroyConnection;
    private validateConnection;
    private isConnectionExpired;
    private processWaitingRequests;
    acquire(): Promise<PooledConnection<T>>;
    release(pooledConnection: PooledConnection<T>): Promise<void>;
    private startHealthCheck;
    getMetrics(): ConnectionPoolMetrics;
    getHealth(): {
        healthy: boolean;
        details: any;
    };
    shutdown(): Promise<void>;
}
export declare class RedisConnectionFactory implements ConnectionFactory<any> {
    private connectionString;
    constructor(connectionString: string);
    create(): Promise<any>;
    validate(connection: any): Promise<boolean>;
    destroy(connection: any): Promise<void>;
    reset(connection: any): Promise<void>;
}
export declare class HttpConnectionFactory implements ConnectionFactory<any> {
    private baseUrl;
    private options;
    constructor(baseUrl: string, options?: any);
    create(): Promise<any>;
    validate(connection: any): Promise<boolean>;
    destroy(connection: any): Promise<void>;
}
export declare class ConnectionPoolManager {
    private serviceName;
    private tracing?;
    private pools;
    private logger;
    constructor(serviceName: string, tracing?: GuardAntTracing | undefined);
    createPool<T>(name: string, factory: ConnectionFactory<T>, config: ConnectionPoolConfig): ConnectionPool<T>;
    getPool<T>(name: string): ConnectionPool<T> | undefined;
    getAllMetrics(): Record<string, ConnectionPoolMetrics>;
    getOverallHealth(): {
        healthy: boolean;
        pools: Record<string, any>;
    };
    shutdownAll(): Promise<void>;
}
export declare function createConnectionPool<T>(factory: ConnectionFactory<T>, config: ConnectionPoolConfig, serviceName: string, tracing?: GuardAntTracing): ConnectionPool<T>;
export declare function createConnectionPoolManager(serviceName: string, tracing?: GuardAntTracing): ConnectionPoolManager;
export declare function createRedisConnectionFactory(connectionString: string): RedisConnectionFactory;
export declare function createHttpConnectionFactory(baseUrl: string, options?: any): HttpConnectionFactory;
export { ConnectionPoolConfigs };
//# sourceMappingURL=connection-pooling.d.ts.map