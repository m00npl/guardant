"use strict";
/**
 * Configuration validation and schema management system for GuardAnt services
 * Provides comprehensive validation, schema enforcement, and configuration testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigValidator = exports.ConfigValidationRules = exports.ValidationCategory = exports.ValidationSeverity = void 0;
exports.createConfigValidator = createConfigValidator;
exports.validateServiceConfiguration = validateServiceConfiguration;
const logger_1 = require("./logger");
const error_handling_1 = require("./error-handling");
const configuration_manager_1 = require("./configuration-manager");
var ValidationSeverity;
(function (ValidationSeverity) {
    ValidationSeverity["ERROR"] = "error";
    ValidationSeverity["WARNING"] = "warning";
    ValidationSeverity["INFO"] = "info";
})(ValidationSeverity || (exports.ValidationSeverity = ValidationSeverity = {}));
var ValidationCategory;
(function (ValidationCategory) {
    ValidationCategory["SYNTAX"] = "syntax";
    ValidationCategory["SEMANTIC"] = "semantic";
    ValidationCategory["SECURITY"] = "security";
    ValidationCategory["PERFORMANCE"] = "performance";
    ValidationCategory["COMPATIBILITY"] = "compatibility";
    ValidationCategory["BEST_PRACTICE"] = "best_practice";
})(ValidationCategory || (exports.ValidationCategory = ValidationCategory = {}));
// Predefined validation rules for GuardAnt configurations
exports.ConfigValidationRules = [
    // Security validation rules
    {
        name: 'secure_secrets',
        description: 'Ensure secrets are not stored in plain text configuration',
        validator: (value, config) => {
            if (typeof value === 'string') {
                const suspiciousPatterns = [
                    /password\s*[:=]\s*[^*]/i,
                    /secret\s*[:=]\s*[^*]/i,
                    /key\s*[:=]\s*[^*]/i,
                    /token\s*[:=]\s*[^*]/i,
                    /api[_-]?key\s*[:=]\s*[^*]/i
                ];
                const hasSuspiciousPattern = suspiciousPatterns.some(pattern => pattern.test(value));
                if (hasSuspiciousPattern) {
                    return {
                        valid: false,
                        message: 'Potential secret found in plain text configuration',
                        suggestions: [
                            'Use environment variables for secrets',
                            'Use HashiCorp Vault or similar secret management',
                            'Encrypt sensitive values'
                        ]
                    };
                }
            }
            return { valid: true };
        },
        severity: ValidationSeverity.ERROR,
        category: ValidationCategory.SECURITY
    },
    {
        name: 'strong_jwt_secret',
        description: 'Ensure JWT secrets are sufficiently strong',
        validator: (value) => {
            if (typeof value === 'string' && value.length > 0) {
                if (value.length < 32) {
                    return {
                        valid: false,
                        message: 'JWT secret is too short (minimum 32 characters recommended)',
                        suggestions: ['Generate a longer, more secure secret']
                    };
                }
                // Check for common weak secrets
                const weakSecrets = ['secret', 'password', '123456', 'your-secret-key'];
                if (weakSecrets.includes(value.toLowerCase())) {
                    return {
                        valid: false,
                        message: 'JWT secret is too weak or common',
                        suggestions: ['Use a cryptographically secure random string']
                    };
                }
            }
            return { valid: true };
        },
        severity: ValidationSeverity.ERROR,
        category: ValidationCategory.SECURITY
    },
    // Performance validation rules
    {
        name: 'reasonable_pool_sizes',
        description: 'Validate database pool sizes are reasonable',
        validator: (value) => {
            if (typeof value === 'number') {
                if (value > 100) {
                    return {
                        valid: false,
                        message: 'Database pool size is very large, may cause resource exhaustion',
                        suggestions: ['Consider reducing pool size to 10-50 connections']
                    };
                }
                if (value < 1) {
                    return {
                        valid: false,
                        message: 'Database pool size must be at least 1',
                        autoFixAvailable: true
                    };
                }
            }
            return { valid: true };
        },
        severity: ValidationSeverity.WARNING,
        category: ValidationCategory.PERFORMANCE,
        autoFix: (value) => Math.max(1, Math.min(100, Number(value) || 5))
    },
    {
        name: 'cache_timeout_bounds',
        description: 'Validate cache timeout values are within reasonable bounds',
        validator: (value) => {
            if (typeof value === 'number') {
                if (value > 86400000) { // 24 hours
                    return {
                        valid: false,
                        message: 'Cache timeout is very long (>24 hours), may cause stale data issues',
                        suggestions: ['Consider shorter timeout for frequently changing data']
                    };
                }
                if (value < 1000) { // 1 second
                    return {
                        valid: false,
                        message: 'Cache timeout is very short (<1 second), may cause performance issues',
                        suggestions: ['Consider longer timeout to improve cache effectiveness']
                    };
                }
            }
            return { valid: true };
        },
        severity: ValidationSeverity.WARNING,
        category: ValidationCategory.PERFORMANCE
    },
    // Network and connectivity rules
    {
        name: 'valid_port_range',
        description: 'Ensure port numbers are in valid range',
        validator: (value) => {
            if (typeof value === 'number') {
                if (value < 1 || value > 65535) {
                    return {
                        valid: false,
                        message: 'Port number must be between 1 and 65535',
                        autoFixAvailable: true
                    };
                }
                if (value < 1024 && process.getuid && process.getuid() !== 0) {
                    return {
                        valid: false,
                        message: 'Port numbers below 1024 require root privileges',
                        suggestions: ['Use port 3000 or higher for non-root processes']
                    };
                }
            }
            return { valid: true };
        },
        severity: ValidationSeverity.ERROR,
        category: ValidationCategory.SYNTAX,
        autoFix: (value) => {
            const num = Number(value);
            if (num < 1)
                return 3000;
            if (num > 65535)
                return 3000;
            if (num < 1024)
                return 3000;
            return num;
        }
    },
    {
        name: 'valid_url_format',
        description: 'Validate URL formats are correct',
        validator: (value) => {
            if (typeof value === 'string' && value.length > 0) {
                try {
                    new URL(value);
                    // Additional checks for database URLs
                    if (value.startsWith('postgresql://') || value.startsWith('postgres://')) {
                        if (!value.includes('@')) {
                            return {
                                valid: false,
                                message: 'Database URL is missing credentials',
                                suggestions: ['Format: postgresql://user:password@host:port/database']
                            };
                        }
                    }
                    // Check for localhost in production
                    if (value.includes('localhost') || value.includes('127.0.0.1')) {
                        return {
                            valid: true, // Not an error, but worth noting
                            message: 'URL uses localhost - ensure this is intended for your environment',
                            details: { isLocalhost: true }
                        };
                    }
                }
                catch (error) {
                    return {
                        valid: false,
                        message: 'Invalid URL format',
                        suggestions: ['Ensure URL includes protocol (http://, https://, etc.)']
                    };
                }
            }
            return { valid: true };
        },
        severity: ValidationSeverity.ERROR,
        category: ValidationCategory.SYNTAX
    },
    // Environment-specific rules
    {
        name: 'production_security_check',
        description: 'Ensure production environment has proper security settings',
        validator: (value, config) => {
            const environment = config['service.environment'] || process.env.NODE_ENV;
            if (environment === 'production') {
                // Check for debug mode
                if (config['debug'] === true || config['logging.level'] === 'debug') {
                    return {
                        valid: false,
                        message: 'Debug mode should not be enabled in production',
                        suggestions: ['Set logging level to "info" or "warn" in production']
                    };
                }
                // Check for development hosts
                const host = config['service.host'];
                if (host === '0.0.0.0' || host === 'localhost') {
                    return {
                        valid: false,
                        message: 'Service should not bind to all interfaces in production',
                        suggestions: ['Bind to specific interface or use reverse proxy']
                    };
                }
                // Check CORS settings
                const corsOrigins = config['security.cors.origins'];
                if (Array.isArray(corsOrigins) && corsOrigins.includes('*')) {
                    return {
                        valid: false,
                        message: 'CORS should not allow all origins in production',
                        suggestions: ['Specify exact allowed origins for security']
                    };
                }
            }
            return { valid: true };
        },
        severity: ValidationSeverity.ERROR,
        category: ValidationCategory.SECURITY
    },
    // Consistency and compatibility rules
    {
        name: 'consistent_redis_config',
        description: 'Ensure Redis configuration is internally consistent',
        validator: (value, config) => {
            const redisHost = config['redis.host'];
            const redisPort = config['redis.port'];
            const redisPassword = config['redis.password'];
            if (redisHost && redisPort) {
                // Check for password when not using localhost
                if (redisHost !== 'localhost' && redisHost !== '127.0.0.1' && !redisPassword) {
                    return {
                        valid: false,
                        message: 'Redis password should be set when connecting to remote host',
                        suggestions: ['Add redis.password for remote Redis instances']
                    };
                }
            }
            return { valid: true };
        },
        severity: ValidationSeverity.WARNING,
        category: ValidationCategory.SECURITY
    },
    {
        name: 'monitoring_interval_consistency',
        description: 'Ensure monitoring intervals are consistent and reasonable',
        validator: (value, config) => {
            const interval = config['monitoring.interval'];
            const timeout = config['monitoring.timeout'];
            if (typeof interval === 'number' && typeof timeout === 'number') {
                if (timeout >= interval) {
                    return {
                        valid: false,
                        message: 'Monitoring timeout should be less than monitoring interval',
                        suggestions: ['Set timeout to less than interval to avoid overlapping checks']
                    };
                }
                if (interval < 5000) {
                    return {
                        valid: false,
                        message: 'Monitoring interval is very frequent, may cause high load',
                        suggestions: ['Consider using intervals of 30 seconds or more']
                    };
                }
            }
            return { valid: true };
        },
        severity: ValidationSeverity.WARNING,
        category: ValidationCategory.PERFORMANCE
    },
    // Best practice rules
    {
        name: 'service_naming_convention',
        description: 'Ensure service names follow naming conventions',
        validator: (value) => {
            if (typeof value === 'string') {
                if (!/^[a-z][a-z0-9-]*$/.test(value)) {
                    return {
                        valid: false,
                        message: 'Service name should use lowercase letters, numbers, and hyphens only',
                        suggestions: ['Use kebab-case naming (e.g., "api-admin", "worker-monitoring")']
                    };
                }
                if (value.length > 50) {
                    return {
                        valid: false,
                        message: 'Service name is too long (max 50 characters)',
                        suggestions: ['Use shorter, more concise service names']
                    };
                }
            }
            return { valid: true };
        },
        severity: ValidationSeverity.WARNING,
        category: ValidationCategory.BEST_PRACTICE
    },
    {
        name: 'version_format',
        description: 'Ensure version follows semantic versioning',
        validator: (value) => {
            if (typeof value === 'string') {
                if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?(\+[a-zA-Z0-9-]+)?$/.test(value)) {
                    return {
                        valid: false,
                        message: 'Version should follow semantic versioning (e.g., 1.0.0)',
                        suggestions: ['Use format: MAJOR.MINOR.PATCH']
                    };
                }
            }
            return { valid: true };
        },
        severity: ValidationSeverity.INFO,
        category: ValidationCategory.BEST_PRACTICE
    }
];
class ConfigValidator {
    constructor(serviceName, tracing) {
        this.serviceName = serviceName;
        this.rules = new Map();
        this.customValidators = new Map();
        this.logger = (0, logger_1.createLogger)(`${serviceName}-config-validator`);
        this.tracing = tracing;
        this.loadDefaultRules();
    }
    loadDefaultRules() {
        for (const rule of exports.ConfigValidationRules) {
            this.rules.set(rule.name, rule);
        }
        this.logger.debug('Default validation rules loaded', {
            rulesCount: this.rules.size
        });
    }
    addRule(rule) {
        this.customValidators.set(rule.name, rule);
        this.logger.debug('Custom validation rule added', {
            name: rule.name,
            severity: rule.severity,
            category: rule.category
        });
    }
    removeRule(name) {
        const removed = this.customValidators.delete(name) || this.rules.delete(name);
        if (removed) {
            this.logger.debug('Validation rule removed', { name });
        }
        return removed;
    }
    async validate(config, schema, context) {
        const startTime = Date.now();
        const errors = [];
        const warnings = [];
        const infos = [];
        const autoFixedIssues = [];
        const suggestions = new Set();
        try {
            this.logger.info('Starting configuration validation', {
                configKeys: Object.keys(config).length,
                schemaFields: Object.keys(schema).length,
                environment: context?.environment
            });
            // First, validate against schema
            const schemaValidation = await this.validateSchema(config, schema);
            errors.push(...schemaValidation.errors);
            warnings.push(...schemaValidation.warnings);
            // Then apply custom validation rules
            const allRules = new Map([...this.rules, ...this.customValidators]);
            for (const [ruleName, rule] of allRules) {
                await this.applyRule(rule, config, errors, warnings, infos, autoFixedIssues, suggestions);
            }
            // Calculate summary
            const summary = {
                totalFields: Object.keys(config).length,
                validFields: Object.keys(config).length - errors.length,
                errorCount: errors.length,
                warningCount: warnings.length,
                infoCount: infos.length,
                autoFixableCount: autoFixedIssues.length,
                coveragePercentage: Object.keys(schema).length > 0
                    ? Math.round((Object.keys(config).length / Object.keys(schema).length) * 100)
                    : 0
            };
            const report = {
                valid: errors.length === 0,
                errors,
                warnings,
                infos,
                summary,
                suggestions: Array.from(suggestions),
                autoFixedIssues
            };
            const duration = Date.now() - startTime;
            this.logger.info('Configuration validation completed', {
                valid: report.valid,
                errors: errors.length,
                warnings: warnings.length,
                infos: infos.length,
                duration
            });
            if (this.tracing) {
                this.tracing.addEvent('config_validation_completed', {
                    'validation.valid': report.valid.toString(),
                    'validation.errors_count': errors.length.toString(),
                    'validation.warnings_count': warnings.length.toString(),
                    'validation.duration_ms': duration.toString()
                });
            }
            return report;
        }
        catch (error) {
            this.logger.error('Configuration validation failed', error);
            throw new error_handling_1.ValidationError('Configuration validation failed', {
                service: this.serviceName,
                operation: 'config_validation'
            });
        }
    }
    async validateSchema(config, schema) {
        const errors = [];
        const warnings = [];
        for (const [fieldPath, fieldSchema] of Object.entries(schema)) {
            const value = this.getNestedValue(config, fieldPath);
            // Check required fields
            if (fieldSchema.required && (value === undefined || value === null)) {
                errors.push({
                    rule: 'required_field',
                    field: fieldPath,
                    severity: ValidationSeverity.ERROR,
                    category: ValidationCategory.SYNTAX,
                    message: `Required field '${fieldPath}' is missing`,
                    currentValue: value,
                    autoFixable: fieldSchema.default !== undefined
                });
                continue;
            }
            // Skip further validation if field is not present and not required
            if (value === undefined || value === null)
                continue;
            // Type validation
            const typeValidation = this.validateFieldType(value, fieldSchema, fieldPath);
            if (!typeValidation.valid) {
                errors.push({
                    rule: 'field_type',
                    field: fieldPath,
                    severity: ValidationSeverity.ERROR,
                    category: ValidationCategory.SYNTAX,
                    message: typeValidation.message || `Invalid type for field '${fieldPath}'`,
                    currentValue: value,
                    autoFixable: false
                });
            }
            // Deprecation warnings
            if (fieldSchema.deprecated) {
                warnings.push({
                    rule: 'deprecated_field',
                    field: fieldPath,
                    severity: ValidationSeverity.WARNING,
                    category: ValidationCategory.COMPATIBILITY,
                    message: fieldSchema.deprecationMessage || `Field '${fieldPath}' is deprecated`,
                    currentValue: value,
                    autoFixable: false
                });
            }
        }
        return { errors, warnings };
    }
    validateFieldType(value, schema, fieldPath) {
        switch (schema.type) {
            case configuration_manager_1.ConfigFieldType.STRING:
            case configuration_manager_1.ConfigFieldType.SECRET:
            case configuration_manager_1.ConfigFieldType.EMAIL:
            case configuration_manager_1.ConfigFieldType.URL:
                if (typeof value !== 'string') {
                    return {
                        valid: false,
                        message: `Field '${fieldPath}' must be a string`
                    };
                }
                break;
            case configuration_manager_1.ConfigFieldType.NUMBER:
            case configuration_manager_1.ConfigFieldType.PORT:
                if (typeof value !== 'number' || isNaN(value)) {
                    return {
                        valid: false,
                        message: `Field '${fieldPath}' must be a number`
                    };
                }
                break;
            case configuration_manager_1.ConfigFieldType.BOOLEAN:
                if (typeof value !== 'boolean') {
                    return {
                        valid: false,
                        message: `Field '${fieldPath}' must be a boolean`
                    };
                }
                break;
            case configuration_manager_1.ConfigFieldType.ARRAY:
                if (!Array.isArray(value)) {
                    return {
                        valid: false,
                        message: `Field '${fieldPath}' must be an array`
                    };
                }
                break;
            case configuration_manager_1.ConfigFieldType.OBJECT:
            case configuration_manager_1.ConfigFieldType.JSON:
                if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                    return {
                        valid: false,
                        message: `Field '${fieldPath}' must be an object`
                    };
                }
                break;
        }
        return { valid: true };
    }
    async applyRule(rule, config, errors, warnings, infos, autoFixedIssues, suggestions) {
        try {
            // Apply rule to each relevant field
            for (const [fieldPath, value] of Object.entries(config)) {
                if (this.isRuleApplicable(rule, fieldPath, value)) {
                    const result = rule.validator(value, config);
                    if (!result.valid) {
                        const issue = {
                            rule: rule.name,
                            field: fieldPath,
                            severity: rule.severity,
                            category: rule.category,
                            message: result.message || `Validation failed for field '${fieldPath}'`,
                            currentValue: value,
                            autoFixable: !!rule.autoFix,
                            details: result.details
                        };
                        // Apply auto-fix if available
                        if (rule.autoFix && result.autoFixAvailable !== false) {
                            try {
                                const fixedValue = rule.autoFix(value);
                                issue.suggestedValue = fixedValue;
                                autoFixedIssues.push(issue);
                                // Actually apply the fix to the config
                                this.setNestedValue(config, fieldPath, fixedValue);
                            }
                            catch (fixError) {
                                this.logger.warn('Auto-fix failed', fixError, {
                                    rule: rule.name,
                                    field: fieldPath
                                });
                            }
                        }
                        // Categorize by severity
                        switch (rule.severity) {
                            case ValidationSeverity.ERROR:
                                errors.push(issue);
                                break;
                            case ValidationSeverity.WARNING:
                                warnings.push(issue);
                                break;
                            case ValidationSeverity.INFO:
                                infos.push(issue);
                                break;
                        }
                        // Add suggestions
                        if (result.suggestions) {
                            result.suggestions.forEach(suggestion => suggestions.add(suggestion));
                        }
                    }
                }
            }
            // Also apply rule to entire config for cross-field validation
            const globalResult = rule.validator(null, config);
            if (!globalResult.valid) {
                const issue = {
                    rule: rule.name,
                    field: '_global',
                    severity: rule.severity,
                    category: rule.category,
                    message: globalResult.message || 'Global validation failed',
                    currentValue: null,
                    autoFixable: false,
                    details: globalResult.details
                };
                switch (rule.severity) {
                    case ValidationSeverity.ERROR:
                        errors.push(issue);
                        break;
                    case ValidationSeverity.WARNING:
                        warnings.push(issue);
                        break;
                    case ValidationSeverity.INFO:
                        infos.push(issue);
                        break;
                }
                if (globalResult.suggestions) {
                    globalResult.suggestions.forEach(suggestion => suggestions.add(suggestion));
                }
            }
        }
        catch (error) {
            this.logger.warn(`Validation rule '${rule.name}' failed to execute`, error);
        }
    }
    isRuleApplicable(rule, fieldPath, value) {
        // Simple heuristics to determine if a rule applies to a field
        const ruleName = rule.name.toLowerCase();
        const fieldName = fieldPath.toLowerCase();
        // JWT secret rules
        if (ruleName.includes('jwt') && (fieldName.includes('jwt') || fieldName.includes('secret'))) {
            return true;
        }
        // Pool size rules
        if (ruleName.includes('pool') && (fieldName.includes('pool') || fieldName.includes('max') || fieldName.includes('min'))) {
            return true;
        }
        // Port rules
        if (ruleName.includes('port') && (fieldName.includes('port') || (typeof value === 'number' && value > 0 && value <= 65535))) {
            return true;
        }
        // URL rules
        if (ruleName.includes('url') && (fieldName.includes('url') || (typeof value === 'string' && value.match(/^https?:\/\//)))) {
            return true;
        }
        // Cache timeout rules
        if (ruleName.includes('cache') && fieldName.includes('cache')) {
            return true;
        }
        // Service name rules
        if (ruleName.includes('service') && fieldName.includes('service.name')) {
            return true;
        }
        // Version rules
        if (ruleName.includes('version') && fieldName.includes('version')) {
            return true;
        }
        // Security rules apply to sensitive fields
        if (rule.category === ValidationCategory.SECURITY) {
            const sensitiveFields = ['password', 'secret', 'key', 'token', 'credential'];
            return sensitiveFields.some(sensitive => fieldName.includes(sensitive));
        }
        return false;
    }
    getNestedValue(obj, path) {
        const keys = path.split('.');
        let current = obj;
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            }
            else {
                return undefined;
            }
        }
        return current;
    }
    setNestedValue(obj, path, value) {
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
    async validateEnvironmentConsistency(configs) {
        const issues = [];
        // Check for inconsistencies between environments
        const environments = Object.keys(configs);
        if (environments.length < 2) {
            return issues;
        }
        // Get common fields across all environments
        const allFields = new Set();
        for (const config of Object.values(configs)) {
            Object.keys(config).forEach(key => allFields.add(key));
        }
        // Check each field for consistency requirements
        for (const field of allFields) {
            // Some fields should be consistent across environments
            const shouldBeConsistent = [
                'service.name',
                'service.version',
                'database.name'
            ];
            if (shouldBeConsistent.includes(field)) {
                const values = environments.map(env => configs[env][field]).filter(v => v !== undefined);
                const uniqueValues = [...new Set(values)];
                if (uniqueValues.length > 1) {
                    issues.push({
                        rule: 'environment_consistency',
                        field,
                        severity: ValidationSeverity.WARNING,
                        category: ValidationCategory.COMPATIBILITY,
                        message: `Field '${field}' has different values across environments`,
                        currentValue: values,
                        autoFixable: false,
                        details: { environments: environments, values: uniqueValues }
                    });
                }
            }
            // Some fields should be different across environments
            const shouldBeDifferent = [
                'database.host',
                'redis.host',
                'service.port'
            ];
            if (shouldBeDifferent.includes(field)) {
                const values = environments.map(env => configs[env][field]).filter(v => v !== undefined);
                const uniqueValues = [...new Set(values)];
                if (uniqueValues.length === 1 && values.length > 1) {
                    issues.push({
                        rule: 'environment_separation',
                        field,
                        severity: ValidationSeverity.INFO,
                        category: ValidationCategory.BEST_PRACTICE,
                        message: `Field '${field}' has the same value across all environments`,
                        currentValue: uniqueValues[0],
                        autoFixable: false,
                        details: { environments: environments }
                    });
                }
            }
        }
        return issues;
    }
    getRules() {
        return [...Array.from(this.rules.values()), ...Array.from(this.customValidators.values())];
    }
    getHealthStatus() {
        return {
            healthy: true,
            details: {
                totalRules: this.rules.size + this.customValidators.size,
                defaultRules: this.rules.size,
                customRules: this.customValidators.size,
                categories: {
                    security: this.getRules().filter(r => r.category === ValidationCategory.SECURITY).length,
                    performance: this.getRules().filter(r => r.category === ValidationCategory.PERFORMANCE).length,
                    syntax: this.getRules().filter(r => r.category === ValidationCategory.SYNTAX).length,
                    bestPractice: this.getRules().filter(r => r.category === ValidationCategory.BEST_PRACTICE).length
                }
            }
        };
    }
}
exports.ConfigValidator = ConfigValidator;
// Factory function
function createConfigValidator(serviceName, tracing) {
    return new ConfigValidator(serviceName, tracing);
}
// Utility function for comprehensive config validation
async function validateServiceConfiguration(serviceName, config, schema, context, tracing) {
    const validator = createConfigValidator(serviceName, tracing);
    return await validator.validate(config, schema, context);
}
//# sourceMappingURL=config-validation.js.map