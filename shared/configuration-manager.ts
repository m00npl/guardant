/**
 * Advanced configuration management system for GuardAnt services
 * Provides environment-specific configs, validation, hot reloading, and hierarchical configuration
 */

import { createLogger } from './logger';
import { ConfigurationError, ErrorCategory, ErrorSeverity } from './error-handling';
import type { GuardAntTracing } from './tracing';

export interface ConfigurationSchema {
  [key: string]: ConfigFieldSchema;
}

export interface ConfigFieldSchema {
  type: ConfigFieldType;
  required: boolean;
  default?: any;
  validation?: ConfigValidation;
  sensitive?: boolean; // For secrets
  description?: string;
  example?: any;
  deprecated?: boolean;
  deprecationMessage?: string;
  env?: string; // Environment variable name
  transform?: (value: any) => any;
}

export enum ConfigFieldType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
  JSON = 'json',
  URL = 'url',
  EMAIL = 'email',
  PORT = 'port',
  SECRET = 'secret',
  ENUM = 'enum'
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

export enum Environment {
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  STAGING = 'staging',
  PRODUCTION = 'production'
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

// Predefined configuration schemas for GuardAnt services
export const ConfigurationSchemas = {
  // Core service configuration
  SERVICE_BASE: {
    service: {
      type: ConfigFieldType.OBJECT,
      required: true,
      default: {},
      description: 'Service configuration',
      validation: {
        custom: (value) => typeof value === 'object' && value !== null
      }
    },
    'service.name': {
      type: ConfigFieldType.STRING,
      required: true,
      env: 'SERVICE_NAME',
      description: 'Service name identifier',
      validation: {
        pattern: /^[a-z][a-z0-9-]*$/,
        minLength: 2,
        maxLength: 50
      },
      example: 'api-admin'
    },
    'service.version': {
      type: ConfigFieldType.STRING,
      required: true,
      env: 'SERVICE_VERSION',
      default: '1.0.0',
      description: 'Service version',
      validation: {
        pattern: /^\d+\.\d+\.\d+$/
      }
    },
    'service.environment': {
      type: ConfigFieldType.ENUM,
      required: true,
      env: 'NODE_ENV',
      default: Environment.DEVELOPMENT,
      description: 'Runtime environment',
      validation: {
        enum: Object.values(Environment)
      }
    },
    'service.port': {
      type: ConfigFieldType.PORT,
      required: true,
      env: 'PORT',
      default: 3000,
      description: 'HTTP server port',
      validation: {
        min: 1024,
        max: 65535
      }
    },
    'service.host': {
      type: ConfigFieldType.STRING,
      required: false,
      env: 'HOST',
      default: '0.0.0.0',
      description: 'HTTP server host',
      validation: {
        pattern: /^(\d{1,3}\.){3}\d{1,3}$|^localhost$|^0\.0\.0\.0$/
      }
    }
  },

  // Database configuration
  DATABASE: {
    database: {
      type: ConfigFieldType.OBJECT,
      required: true,
      default: {},
      description: 'Database configuration'
    },
    'database.host': {
      type: ConfigFieldType.STRING,
      required: true,
      env: 'DB_HOST',
      default: 'localhost',
      description: 'Database host'
    },
    'database.port': {
      type: ConfigFieldType.PORT,
      required: true,
      env: 'DB_PORT',
      default: 5432,
      description: 'Database port'
    },
    'database.name': {
      type: ConfigFieldType.STRING,
      required: true,
      env: 'DB_NAME',
      description: 'Database name',
      validation: {
        minLength: 1,
        maxLength: 63,
        pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/
      }
    },
    'database.username': {
      type: ConfigFieldType.STRING,
      required: true,
      env: 'DB_USERNAME',
      description: 'Database username'
    },
    'database.password': {
      type: ConfigFieldType.SECRET,
      required: true,
      env: 'DB_PASSWORD',
      sensitive: true,
      description: 'Database password'
    },
    'database.ssl': {
      type: ConfigFieldType.BOOLEAN,
      required: false,
      env: 'DB_SSL',
      default: false,
      description: 'Enable SSL connection'
    },
    'database.pool': {
      type: ConfigFieldType.OBJECT,
      required: false,
      default: {},
      description: 'Connection pool configuration'
    },
    'database.pool.min': {
      type: ConfigFieldType.NUMBER,
      required: false,
      env: 'DB_POOL_MIN',
      default: 2,
      description: 'Minimum pool connections',
      validation: { min: 0, max: 100 }
    },
    'database.pool.max': {
      type: ConfigFieldType.NUMBER,
      required: false,
      env: 'DB_POOL_MAX',
      default: 20,
      description: 'Maximum pool connections',
      validation: { min: 1, max: 1000 }
    }
  },

  // Redis configuration
  REDIS: {
    redis: {
      type: ConfigFieldType.OBJECT,
      required: true,
      default: {},
      description: 'Redis configuration'
    },
    'redis.host': {
      type: ConfigFieldType.STRING,
      required: true,
      env: 'REDIS_HOST',
      default: 'localhost',
      description: 'Redis host'
    },
    'redis.port': {
      type: ConfigFieldType.PORT,
      required: true,
      env: 'REDIS_PORT',
      default: 6379,
      description: 'Redis port'
    },
    'redis.password': {
      type: ConfigFieldType.SECRET,
      required: false,
      env: 'REDIS_PASSWORD',
      sensitive: true,
      description: 'Redis password'
    },
    'redis.db': {
      type: ConfigFieldType.NUMBER,
      required: false,
      env: 'REDIS_DB',
      default: 0,
      description: 'Redis database number',
      validation: { min: 0, max: 15 }
    },
    'redis.keyPrefix': {
      type: ConfigFieldType.STRING,
      required: false,
      env: 'REDIS_KEY_PREFIX',
      default: 'guardant:',
      description: 'Redis key prefix'
    }
  },

  // RabbitMQ configuration
  RABBITMQ: {
    rabbitmq: {
      type: ConfigFieldType.OBJECT,
      required: true,
      default: {},
      description: 'RabbitMQ configuration'
    },
    'rabbitmq.url': {
      type: ConfigFieldType.URL,
      required: true,
      env: 'RABBITMQ_URL',
      default: 'amqp://localhost:5672',
      description: 'RabbitMQ connection URL'
    },
    'rabbitmq.exchange': {
      type: ConfigFieldType.STRING,
      required: false,
      env: 'RABBITMQ_EXCHANGE',
      default: 'guardant',
      description: 'Default exchange name'
    },
    'rabbitmq.heartbeat': {
      type: ConfigFieldType.NUMBER,
      required: false,
      env: 'RABBITMQ_HEARTBEAT',
      default: 60,
      description: 'Heartbeat interval in seconds',
      validation: { min: 10, max: 3600 }
    }
  },

  // Ethereum configuration
  ETHEREUM: {
    ethereum: {
      type: ConfigFieldType.OBJECT,
      required: true,
      default: {},
      description: 'Ethereum configuration'
    },
    'ethereum.network': {
      type: ConfigFieldType.ENUM,
      required: true,
      env: 'ETHEREUM_NETWORK',
      default: 'holesky',
      description: 'Ethereum network',
      validation: {
        enum: ['mainnet', 'holesky', 'sepolia', 'goerli']
      }
    },
    'ethereum.rpcUrl': {
      type: ConfigFieldType.URL,
      required: true,
      env: 'ETHEREUM_RPC_URL',
      description: 'Ethereum RPC URL'
    },
    'ethereum.privateKey': {
      type: ConfigFieldType.SECRET,
      required: true,
      env: 'ETHEREUM_PRIVATE_KEY',
      sensitive: true,
      description: 'Ethereum private key',
      validation: {
        pattern: /^0x[a-fA-F0-9]{64}$/
      }
    },
    'ethereum.gasLimit': {
      type: ConfigFieldType.NUMBER,
      required: false,
      env: 'ETHEREUM_GAS_LIMIT',
      default: 21000,
      description: 'Default gas limit',
      validation: { min: 21000, max: 10000000 }
    }
  },

  // JWT configuration
  JWT: {
    jwt: {
      type: ConfigFieldType.OBJECT,
      required: true,
      default: {},
      description: 'JWT configuration'
    },
    'jwt.secret': {
      type: ConfigFieldType.SECRET,
      required: true,
      env: 'JWT_SECRET',
      sensitive: true,
      description: 'JWT signing secret',
      validation: {
        minLength: 32
      }
    },
    'jwt.expiresIn': {
      type: ConfigFieldType.STRING,
      required: false,
      env: 'JWT_EXPIRES_IN',
      default: '24h',
      description: 'JWT expiration time',
      validation: {
        pattern: /^\d+[smhd]$/
      }
    },
    'jwt.algorithm': {
      type: ConfigFieldType.ENUM,
      required: false,
      env: 'JWT_ALGORITHM',
      default: 'HS256',
      description: 'JWT signing algorithm',
      validation: {
        enum: ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512']
      }
    }
  },

  // Monitoring configuration
  MONITORING: {
    monitoring: {
      type: ConfigFieldType.OBJECT,
      required: false,
      default: {},
      description: 'Monitoring configuration'
    },
    'monitoring.enabled': {
      type: ConfigFieldType.BOOLEAN,
      required: false,
      env: 'MONITORING_ENABLED',
      default: true,
      description: 'Enable monitoring'
    },
    'monitoring.interval': {
      type: ConfigFieldType.NUMBER,
      required: false,
      env: 'MONITORING_INTERVAL',
      default: 30000,
      description: 'Monitoring interval in milliseconds',
      validation: { min: 5000, max: 300000 }
    },
    'monitoring.timeout': {
      type: ConfigFieldType.NUMBER,
      required: false,
      env: 'MONITORING_TIMEOUT',
      default: 10000,
      description: 'Monitoring timeout in milliseconds',
      validation: { min: 1000, max: 60000 }
    },
    'monitoring.regions': {
      type: ConfigFieldType.ARRAY,
      required: false,
      env: 'MONITORING_REGIONS',
      default: ['us-east-1'],
      description: 'Monitoring regions',
      transform: (value) => typeof value === 'string' ? value.split(',') : value
    }
  },

  // Logging configuration
  LOGGING: {
    logging: {
      type: ConfigFieldType.OBJECT,
      required: false,
      default: {},
      description: 'Logging configuration'
    },
    'logging.level': {
      type: ConfigFieldType.ENUM,
      required: false,
      env: 'LOG_LEVEL',
      default: 'info',
      description: 'Log level',
      validation: {
        enum: ['error', 'warn', 'info', 'debug', 'trace']
      }
    },
    'logging.format': {
      type: ConfigFieldType.ENUM,
      required: false,
      env: 'LOG_FORMAT',
      default: 'json',
      description: 'Log format',
      validation: {
        enum: ['json', 'text', 'pretty']
      }
    },
    'logging.destination': {
      type: ConfigFieldType.ENUM,
      required: false,
      env: 'LOG_DESTINATION',
      default: 'console',
      description: 'Log destination',
      validation: {
        enum: ['console', 'file', 'syslog', 'elasticsearch']
      }
    }
  },

  // Security configuration
  SECURITY: {
    security: {
      type: ConfigFieldType.OBJECT,
      required: false,
      default: {},
      description: 'Security configuration'
    },
    'security.cors.enabled': {
      type: ConfigFieldType.BOOLEAN,
      required: false,
      env: 'CORS_ENABLED',
      default: true,
      description: 'Enable CORS'
    },
    'security.cors.origins': {
      type: ConfigFieldType.ARRAY,
      required: false,
      env: 'CORS_ORIGINS',
      default: ['*'],
      description: 'CORS allowed origins',
      transform: (value) => typeof value === 'string' ? value.split(',') : value
    },
    'security.rateLimit.enabled': {
      type: ConfigFieldType.BOOLEAN,
      required: false,
      env: 'RATE_LIMIT_ENABLED',
      default: true,
      description: 'Enable rate limiting'
    },
    'security.rateLimit.windowMs': {
      type: ConfigFieldType.NUMBER,
      required: false,
      env: 'RATE_LIMIT_WINDOW_MS',
      default: 60000,
      description: 'Rate limit window in milliseconds',
      validation: { min: 1000, max: 3600000 }
    },
    'security.rateLimit.max': {
      type: ConfigFieldType.NUMBER,
      required: false,
      env: 'RATE_LIMIT_MAX',
      default: 100,
      description: 'Maximum requests per window',
      validation: { min: 1, max: 10000 }
    }
  }
};

// Configuration sources
export class EnvironmentVariableSource implements ConfigurationSource {
  name = 'environment';
  priority = 1;

  async load(): Promise<Record<string, any>> {
    return { ...process.env };
  }

  supports(key: string): boolean {
    return key.toUpperCase() in process.env;
  }
}

export class FileConfigurationSource implements ConfigurationSource {
  name: string;
  priority: number;
  private filePath: string;
  private watchCallback?: (changes: Record<string, any>) => void;

  constructor(filePath: string, priority: number = 2) {
    this.name = `file:${filePath}`;
    this.priority = priority;
    this.filePath = filePath;
  }

  async load(): Promise<Record<string, any>> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      if (!(await fs.access(this.filePath).then(() => true).catch(() => false))) {
        return {};
      }

      const content = await fs.readFile(this.filePath, 'utf8');
      const ext = path.extname(this.filePath).toLowerCase();

      switch (ext) {
        case '.json':
          return JSON.parse(content);
        case '.yaml':
        case '.yml':
          const yaml = require('yaml');
          return yaml.parse(content);
        case '.toml':
          const toml = require('@iarna/toml');
          return toml.parse(content);
        default:
          throw new Error(`Unsupported config file format: ${ext}`);
      }
    } catch (error) {
      throw new ConfigurationError(`Failed to load config file: ${this.filePath}`, {
        service: 'configuration-manager',
        operation: 'file_load'
      });
    }
  }

  watch(callback: (changes: Record<string, any>) => void): void {
    this.watchCallback = callback;
    
    const fs = require('fs');
    const watcher = fs.watch(this.filePath, (eventType: string) => {
      if (eventType === 'change') {
        this.load().then(config => {
          callback(config);
        }).catch(error => {
          console.error('Failed to reload config file:', error);
        });
      }
    });

    // Clean up on process exit
    process.on('SIGTERM', () => watcher.close());
    process.on('SIGINT', () => watcher.close());
  }
}

export class DefaultConfigurationSource implements ConfigurationSource {
  name = 'defaults';
  priority = 0;

  constructor(private defaults: Record<string, any>) {}

  async load(): Promise<Record<string, any>> {
    return { ...this.defaults };
  }

  supports(key: string): boolean {
    return key in this.defaults;
  }
}

export class ConfigurationManager {
  private logger;
  private tracing?: GuardAntTracing;
  private sources: ConfigurationSource[] = [];
  private schema: ConfigurationSchema = {};
  private config: Record<string, any> = {};
  private changeListeners: ((event: ConfigurationChangeEvent) => void)[] = [];
  private validationErrors: string[] = [];

  constructor(
    private serviceName: string,
    tracing?: GuardAntTracing
  ) {
    this.logger = createLogger(`${serviceName}-config-manager`);
    this.tracing = tracing;
  }

  addSource(source: ConfigurationSource): void {
    this.sources.push(source);
    this.sources.sort((a, b) => b.priority - a.priority); // Higher priority first

    this.logger.debug('Configuration source added', {
      sourceName: source.name,
      priority: source.priority,
      totalSources: this.sources.length
    });

    // Set up watching if supported
    if (source.watch) {
      source.watch((changes) => {
        this.handleSourceChange(source.name, changes);
      });
    }
  }

  addSchema(schemaName: string, schema: ConfigurationSchema): void {
    this.schema = { ...this.schema, ...schema };
    
    this.logger.debug('Configuration schema added', {
      schemaName,
      fieldsCount: Object.keys(schema).length,
      totalFields: Object.keys(this.schema).length
    });
  }

  async load(): Promise<void> {
    this.logger.info('Loading configuration', {
      sources: this.sources.length,
      schemaFields: Object.keys(this.schema).length
    });

    try {
      // Load from all sources in priority order
      const configData: Record<string, any> = {};
      
      for (const source of this.sources) {
        try {
          const sourceData = await source.load();
          this.mergeConfig(configData, sourceData);
          
          this.logger.debug('Configuration source loaded', {
            sourceName: source.name,
            keysLoaded: Object.keys(sourceData).length
          });
        } catch (error) {
          this.logger.warn(`Failed to load configuration from ${source.name}`, error as Error);
        }
      }

      // Apply schema transformations and defaults
      this.config = this.applySchema(configData);

      // Validate configuration
      await this.validate();

      this.logger.info('Configuration loaded successfully', {
        totalKeys: Object.keys(this.config).length,
        validationErrors: this.validationErrors.length
      });

      if (this.tracing) {
        this.tracing.addEvent('configuration_loaded', {
          'config.sources_count': this.sources.length.toString(),
          'config.keys_count': Object.keys(this.config).length.toString(),
          'config.validation_errors': this.validationErrors.length.toString()
        });
      }

    } catch (error) {
      this.logger.error('Configuration loading failed', error as Error);
      throw new ConfigurationError('Failed to load configuration', {
        service: this.serviceName,
        operation: 'configuration_load'
      });
    }
  }

  private mergeConfig(target: Record<string, any>, source: Record<string, any>): void {
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined && value !== null && value !== '') {
        this.setNestedValue(target, key, value);
      }
    }
  }

  private setNestedValue(obj: Record<string, any>, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private applySchema(configData: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, fieldSchema] of Object.entries(this.schema)) {
      let value = this.getNestedValue(configData, key);

      // Use environment variable if specified
      if (fieldSchema.env && fieldSchema.env in process.env) {
        value = process.env[fieldSchema.env];
      }

      // Apply default if value is not provided
      if (value === undefined && fieldSchema.default !== undefined) {
        value = fieldSchema.default;
      }

      // Apply transformation if specified
      if (value !== undefined && fieldSchema.transform) {
        try {
          value = fieldSchema.transform(value);
        } catch (error) {
          this.logger.warn(`Failed to transform config value for ${key}`, error as Error);
        }
      }

      // Type conversion
      if (value !== undefined) {
        value = this.convertType(value, fieldSchema.type);
      }

      if (value !== undefined) {
        this.setNestedValue(result, key, value);
      }
    }

    // Include non-schema values (for flexibility)
    for (const [key, value] of Object.entries(configData)) {
      if (!(key in this.schema) && !key.includes('.')) {
        result[key] = value;
      }
    }

    return result;
  }

  private convertType(value: any, type: ConfigFieldType): any {
    if (value === null || value === undefined) return value;

    switch (type) {
      case ConfigFieldType.STRING:
        return String(value);
      
      case ConfigFieldType.NUMBER:
      case ConfigFieldType.PORT:
        const num = Number(value);
        return isNaN(num) ? value : num;
      
      case ConfigFieldType.BOOLEAN:
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
        }
        return Boolean(value);
      
      case ConfigFieldType.ARRAY:
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value.split(',').map(s => s.trim());
          }
        }
        return [value];
      
      case ConfigFieldType.OBJECT:
      case ConfigFieldType.JSON:
        if (typeof value === 'object') return value;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;
      
      default:
        return value;
    }
  }

  private async validate(): Promise<void> {
    this.validationErrors = [];

    for (const [key, fieldSchema] of Object.entries(this.schema)) {
      const value = this.getNestedValue(this.config, key);

      // Check required fields
      if (fieldSchema.required && (value === undefined || value === null)) {
        this.validationErrors.push(`Required field '${key}' is missing`);
        continue;
      }

      // Skip validation if value is not provided and not required
      if (value === undefined || value === null) continue;

      // Type validation
      if (!this.validateType(value, fieldSchema.type)) {
        this.validationErrors.push(`Field '${key}' has invalid type. Expected ${fieldSchema.type}, got ${typeof value}`);
        continue;
      }

      // Custom validation
      if (fieldSchema.validation) {
        const validationResult = this.validateField(key, value, fieldSchema.validation);
        if (validationResult !== true) {
          this.validationErrors.push(validationResult);
        }
      }

      // Log deprecation warnings
      if (fieldSchema.deprecated) {
        this.logger.warn(`Configuration field '${key}' is deprecated`, {
          key,
          deprecationMessage: fieldSchema.deprecationMessage
        });
      }
    }

    if (this.validationErrors.length > 0) {
      this.logger.error('Configuration validation failed', new ConfigurationError('Invalid configuration', {
        service: this.serviceName,
        operation: 'configuration_validation'
      }), {
        errors: this.validationErrors
      });

      if (this.getEnvironment() === Environment.PRODUCTION) {
        throw new ConfigurationError(`Configuration validation failed: ${this.validationErrors.join(', ')}`, {
          service: this.serviceName,
          operation: 'configuration_validation'
        });
      }
    }
  }

  private validateType(value: any, type: ConfigFieldType): boolean {
    switch (type) {
      case ConfigFieldType.STRING:
      case ConfigFieldType.SECRET:
      case ConfigFieldType.EMAIL:
      case ConfigFieldType.URL:
        return typeof value === 'string';
      
      case ConfigFieldType.NUMBER:
      case ConfigFieldType.PORT:
        return typeof value === 'number' && !isNaN(value);
      
      case ConfigFieldType.BOOLEAN:
        return typeof value === 'boolean';
      
      case ConfigFieldType.ARRAY:
        return Array.isArray(value);
      
      case ConfigFieldType.OBJECT:
      case ConfigFieldType.JSON:
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      
      case ConfigFieldType.ENUM:
        return true; // Enum validation is done in validateField
      
      default:
        return true;
    }
  }

  private validateField(key: string, value: any, validation: ConfigValidation): true | string {
    // Numeric validations
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        return `Field '${key}' value ${value} is below minimum ${validation.min}`;
      }
      if (validation.max !== undefined && value > validation.max) {
        return `Field '${key}' value ${value} is above maximum ${validation.max}`;
      }
    }

    // String validations
    if (typeof value === 'string') {
      if (validation.minLength !== undefined && value.length < validation.minLength) {
        return `Field '${key}' length ${value.length} is below minimum ${validation.minLength}`;
      }
      if (validation.maxLength !== undefined && value.length > validation.maxLength) {
        return `Field '${key}' length ${value.length} is above maximum ${validation.maxLength}`;
      }
      if (validation.pattern && !validation.pattern.test(value)) {
        return `Field '${key}' does not match required pattern`;
      }
    }

    // Enum validation
    if (validation.enum && !validation.enum.includes(value)) {
      return `Field '${key}' value '${value}' is not one of allowed values: ${validation.enum.join(', ')}`;
    }

    // Custom validation
    if (validation.custom) {
      const result = validation.custom(value);
      if (result !== true) {
        return typeof result === 'string' ? result : `Field '${key}' failed custom validation`;
      }
    }

    return true;
  }

  private handleSourceChange(sourceName: string, changes: Record<string, any>): void {
    this.logger.debug('Configuration source changed', {
      sourceName,
      changesCount: Object.keys(changes).length
    });

    // Reload configuration
    this.load().catch(error => {
      this.logger.error('Failed to reload configuration after source change', error);
    });
  }

  get<T = any>(key: string, defaultValue?: T): T {
    const value = this.getNestedValue(this.config, key);
    return value !== undefined ? value : defaultValue;
  }

  has(key: string): boolean {
    return this.getNestedValue(this.config, key) !== undefined;
  }

  getAll(): Record<string, any> {
    // Return copy without sensitive values
    return this.sanitizeConfig(this.config);
  }

  private sanitizeConfig(config: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(config)) {
      const fieldSchema = this.schema[key];
      
      if (fieldSchema?.sensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeConfig(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  getEnvironment(): Environment {
    return this.get('service.environment', Environment.DEVELOPMENT);
  }

  isDevelopment(): boolean {
    return this.getEnvironment() === Environment.DEVELOPMENT;
  }

  isProduction(): boolean {
    return this.getEnvironment() === Environment.PRODUCTION;
  }

  isTesting(): boolean {
    return this.getEnvironment() === Environment.TESTING;
  }

  onChange(listener: (event: ConfigurationChangeEvent) => void): void {
    this.changeListeners.push(listener);
  }

  private notifyChange(key: string, oldValue: any, newValue: any, source: string): void {
    const event: ConfigurationChangeEvent = {
      key,
      oldValue,
      newValue,
      source,
      timestamp: Date.now()
    };

    for (const listener of this.changeListeners) {
      try {
        listener(event);
      } catch (error) {
        this.logger.warn('Configuration change listener failed', error as Error, { key });
      }
    }

    if (this.tracing) {
      this.tracing.addEvent('configuration_changed', {
        'config.key': key,
        'config.source': source,
        'config.has_old_value': (oldValue !== undefined).toString(),
        'config.has_new_value': (newValue !== undefined).toString()
      });
    }
  }

  getValidationErrors(): string[] {
    return [...this.validationErrors];
  }

  getSchema(): ConfigurationSchema {
    return { ...this.schema };
  }

  getHealthStatus(): { healthy: boolean; details: any } {
    const hasValidationErrors = this.validationErrors.length > 0;
    const hasRequiredConfig = this.has('service.name') && this.has('service.version');
    
    return {
      healthy: !hasValidationErrors && hasRequiredConfig,
      details: {
        sourcesCount: this.sources.length,
        schemaFieldsCount: Object.keys(this.schema).length,
        configKeysCount: Object.keys(this.config).length,
        validationErrors: this.validationErrors.length,
        environment: this.getEnvironment(),
        hasRequiredFields: hasRequiredConfig
      }
    };
  }
}

// Factory function
export function createConfigurationManager(
  serviceName: string,
  tracing?: GuardAntTracing
): ConfigurationManager {
  return new ConfigurationManager(serviceName, tracing);
}

// Utility function to create a fully configured manager
export async function createServiceConfiguration(
  serviceName: string,
  configSchemas: string[] = ['SERVICE_BASE'],
  configFiles: string[] = [],
  tracing?: GuardAntTracing
): Promise<ConfigurationManager> {
  const manager = createConfigurationManager(serviceName, tracing);

  // Add schemas
  for (const schemaName of configSchemas) {
    if (schemaName in ConfigurationSchemas) {
      manager.addSchema(schemaName, (ConfigurationSchemas as any)[schemaName]);
    }
  }

  // Add configuration sources
  manager.addSource(new EnvironmentVariableSource());
  
  for (const configFile of configFiles) {
    manager.addSource(new FileConfigurationSource(configFile));
  }

  // Load configuration
  await manager.load();

  return manager;
}

export { ConfigurationSchemas, ConfigFieldType, Environment };