/**
 * Advanced configuration management system for GuardAnt services
 * Provides environment-specific configs, validation, hot reloading, and hierarchical configuration
 */
import type { GuardAntTracing } from './tracing';
export interface ConfigurationSchema {
    [key: string]: ConfigFieldSchema;
}
export interface ConfigFieldSchema {
    type: ConfigFieldType;
    required: boolean;
    default?: any;
    validation?: ConfigValidation;
    sensitive?: boolean;
    description?: string;
    example?: any;
    deprecated?: boolean;
    deprecationMessage?: string;
    env?: string;
    transform?: (value: any) => any;
}
export declare enum ConfigFieldType {
    STRING = "string",
    NUMBER = "number",
    BOOLEAN = "boolean",
    ARRAY = "array",
    OBJECT = "object",
    JSON = "json",
    URL = "url",
    EMAIL = "email",
    PORT = "port",
    SECRET = "secret",
    ENUM = "enum"
}
export interface ConfigValidation {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    enum?: string[] | number[];
    custom?: (value: any) => boolean | string;
}
export declare enum Environment {
    DEVELOPMENT = "development",
    TESTING = "testing",
    STAGING = "staging",
    PRODUCTION = "production"
}
export interface ConfigurationSource {
    name: string;
    priority: number;
    load(): Promise<Record<string, any>>;
    watch?(callback: (changes: Record<string, any>) => void): void;
    supports?(key: string): boolean;
}
export interface ConfigurationChangeEvent {
    key: string;
    oldValue: any;
    newValue: any;
    source: string;
    timestamp: number;
}
export declare const ConfigurationSchemas: {
    SERVICE_BASE: {
        service: {
            type: ConfigFieldType;
            required: boolean;
            default: {};
            description: string;
            validation: {
                custom: (value: any) => boolean;
            };
        };
        'service.name': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            description: string;
            validation: {
                pattern: RegExp;
                minLength: number;
                maxLength: number;
            };
            example: string;
        };
        'service.version': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: string;
            description: string;
            validation: {
                pattern: RegExp;
            };
        };
        'service.environment': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: Environment;
            description: string;
            validation: {
                enum: Environment[];
            };
        };
        'service.port': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: number;
            description: string;
            validation: {
                min: number;
                max: number;
            };
        };
        'service.host': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: string;
            description: string;
            validation: {
                pattern: RegExp;
            };
        };
    };
    DATABASE: {
        database: {
            type: ConfigFieldType;
            required: boolean;
            default: {};
            description: string;
        };
        'database.host': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: string;
            description: string;
        };
        'database.port': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: number;
            description: string;
        };
        'database.name': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            description: string;
            validation: {
                minLength: number;
                maxLength: number;
                pattern: RegExp;
            };
        };
        'database.username': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            description: string;
        };
        'database.password': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            sensitive: boolean;
            description: string;
        };
        'database.ssl': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: boolean;
            description: string;
        };
        'database.pool': {
            type: ConfigFieldType;
            required: boolean;
            default: {};
            description: string;
        };
        'database.pool.min': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: number;
            description: string;
            validation: {
                min: number;
                max: number;
            };
        };
        'database.pool.max': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: number;
            description: string;
            validation: {
                min: number;
                max: number;
            };
        };
    };
    REDIS: {
        redis: {
            type: ConfigFieldType;
            required: boolean;
            default: {};
            description: string;
        };
        'redis.host': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: string;
            description: string;
        };
        'redis.port': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: number;
            description: string;
        };
        'redis.password': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            sensitive: boolean;
            description: string;
        };
        'redis.db': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: number;
            description: string;
            validation: {
                min: number;
                max: number;
            };
        };
        'redis.keyPrefix': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: string;
            description: string;
        };
    };
    RABBITMQ: {
        rabbitmq: {
            type: ConfigFieldType;
            required: boolean;
            default: {};
            description: string;
        };
        'rabbitmq.url': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: string;
            description: string;
        };
        'rabbitmq.exchange': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: string;
            description: string;
        };
        'rabbitmq.heartbeat': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: number;
            description: string;
            validation: {
                min: number;
                max: number;
            };
        };
    };
    ETHEREUM: {
        ethereum: {
            type: ConfigFieldType;
            required: boolean;
            default: {};
            description: string;
        };
        'ethereum.network': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: string;
            description: string;
            validation: {
                enum: string[];
            };
        };
        'ethereum.rpcUrl': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            description: string;
        };
        'ethereum.privateKey': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            sensitive: boolean;
            description: string;
            validation: {
                pattern: RegExp;
            };
        };
        'ethereum.gasLimit': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: number;
            description: string;
            validation: {
                min: number;
                max: number;
            };
        };
    };
    JWT: {
        jwt: {
            type: ConfigFieldType;
            required: boolean;
            default: {};
            description: string;
        };
        'jwt.secret': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            sensitive: boolean;
            description: string;
            validation: {
                minLength: number;
            };
        };
        'jwt.expiresIn': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: string;
            description: string;
            validation: {
                pattern: RegExp;
            };
        };
        'jwt.algorithm': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: string;
            description: string;
            validation: {
                enum: string[];
            };
        };
    };
    MONITORING: {
        monitoring: {
            type: ConfigFieldType;
            required: boolean;
            default: {};
            description: string;
        };
        'monitoring.enabled': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: boolean;
            description: string;
        };
        'monitoring.interval': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: number;
            description: string;
            validation: {
                min: number;
                max: number;
            };
        };
        'monitoring.timeout': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: number;
            description: string;
            validation: {
                min: number;
                max: number;
            };
        };
        'monitoring.regions': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: string[];
            description: string;
            transform: (value: any) => any;
        };
    };
    LOGGING: {
        logging: {
            type: ConfigFieldType;
            required: boolean;
            default: {};
            description: string;
        };
        'logging.level': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: string;
            description: string;
            validation: {
                enum: string[];
            };
        };
        'logging.format': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: string;
            description: string;
            validation: {
                enum: string[];
            };
        };
        'logging.destination': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: string;
            description: string;
            validation: {
                enum: string[];
            };
        };
    };
    SECURITY: {
        security: {
            type: ConfigFieldType;
            required: boolean;
            default: {};
            description: string;
        };
        'security.cors.enabled': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: boolean;
            description: string;
        };
        'security.cors.origins': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: string[];
            description: string;
            transform: (value: any) => any;
        };
        'security.rateLimit.enabled': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: boolean;
            description: string;
        };
        'security.rateLimit.windowMs': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: number;
            description: string;
            validation: {
                min: number;
                max: number;
            };
        };
        'security.rateLimit.max': {
            type: ConfigFieldType;
            required: boolean;
            env: string;
            default: number;
            description: string;
            validation: {
                min: number;
                max: number;
            };
        };
    };
};
export declare class EnvironmentVariableSource implements ConfigurationSource {
    name: string;
    priority: number;
    load(): Promise<Record<string, any>>;
    supports(key: string): boolean;
}
export declare class FileConfigurationSource implements ConfigurationSource {
    name: string;
    priority: number;
    private filePath;
    private watchCallback?;
    constructor(filePath: string, priority?: number);
    load(): Promise<Record<string, any>>;
    watch(callback: (changes: Record<string, any>) => void): void;
}
export declare class DefaultConfigurationSource implements ConfigurationSource {
    private defaults;
    name: string;
    priority: number;
    constructor(defaults: Record<string, any>);
    load(): Promise<Record<string, any>>;
    supports(key: string): boolean;
}
export declare class ConfigurationManager {
    private serviceName;
    private logger;
    private tracing?;
    private sources;
    private schema;
    private config;
    private changeListeners;
    private validationErrors;
    constructor(serviceName: string, tracing?: GuardAntTracing);
    addSource(source: ConfigurationSource): void;
    addSchema(schemaName: string, schema: ConfigurationSchema): void;
    load(): Promise<void>;
    private mergeConfig;
    private setNestedValue;
    private getNestedValue;
    private applySchema;
    private convertType;
    private validate;
    private validateType;
    private validateField;
    private handleSourceChange;
    get<T = any>(key: string, defaultValue?: T): T;
    has(key: string): boolean;
    getAll(): Record<string, any>;
    private sanitizeConfig;
    getEnvironment(): Environment;
    isDevelopment(): boolean;
    isProduction(): boolean;
    isTesting(): boolean;
    onChange(listener: (event: ConfigurationChangeEvent) => void): void;
    private notifyChange;
    getValidationErrors(): string[];
    getSchema(): ConfigurationSchema;
    getHealthStatus(): {
        healthy: boolean;
        details: any;
    };
}
export declare function createConfigurationManager(serviceName: string, tracing?: GuardAntTracing): ConfigurationManager;
export declare function createServiceConfiguration(serviceName: string, configSchemas?: string[], configFiles?: string[], tracing?: GuardAntTracing): Promise<ConfigurationManager>;
export { ConfigurationSchemas, ConfigFieldType, Environment };
//# sourceMappingURL=configuration-manager.d.ts.map