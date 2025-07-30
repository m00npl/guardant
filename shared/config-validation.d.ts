/**
 * Configuration validation and schema management system for GuardAnt services
 * Provides comprehensive validation, schema enforcement, and configuration testing
 */
import type { GuardAntTracing } from './tracing';
import { ConfigurationSchema } from './configuration-manager';
export interface ValidationRule {
    name: string;
    description: string;
    validator: (value: any, config: Record<string, any>) => ValidationResult;
    severity: ValidationSeverity;
    category: ValidationCategory;
    autoFix?: (value: any) => any;
}
export declare enum ValidationSeverity {
    ERROR = "error",
    WARNING = "warning",
    INFO = "info"
}
export declare enum ValidationCategory {
    SYNTAX = "syntax",
    SEMANTIC = "semantic",
    SECURITY = "security",
    PERFORMANCE = "performance",
    COMPATIBILITY = "compatibility",
    BEST_PRACTICE = "best_practice"
}
export interface ValidationResult {
    valid: boolean;
    message?: string;
    details?: any;
    suggestions?: string[];
    autoFixAvailable?: boolean;
}
export interface ConfigValidationReport {
    valid: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
    infos: ValidationIssue[];
    summary: ValidationSummary;
    suggestions: string[];
    autoFixedIssues: ValidationIssue[];
}
export interface ValidationIssue {
    rule: string;
    field: string;
    severity: ValidationSeverity;
    category: ValidationCategory;
    message: string;
    currentValue: any;
    suggestedValue?: any;
    details?: any;
    autoFixable: boolean;
}
export interface ValidationSummary {
    totalFields: number;
    validFields: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    autoFixableCount: number;
    coveragePercentage: number;
}
export interface SchemaValidationContext {
    environment: string;
    service: string;
    version: string;
    timestamp: Date;
}
export declare const ConfigValidationRules: ValidationRule[];
export declare class ConfigValidator {
    private serviceName;
    private logger;
    private tracing?;
    private rules;
    private customValidators;
    constructor(serviceName: string, tracing?: GuardAntTracing);
    private loadDefaultRules;
    addRule(rule: ValidationRule): void;
    removeRule(name: string): boolean;
    validate(config: Record<string, any>, schema: ConfigurationSchema, context?: SchemaValidationContext): Promise<ConfigValidationReport>;
    private validateSchema;
    private validateFieldType;
    private applyRule;
    private isRuleApplicable;
    private getNestedValue;
    private setNestedValue;
    validateEnvironmentConsistency(configs: Record<string, Record<string, any>>): Promise<ValidationIssue[]>;
    getRules(): ValidationRule[];
    getHealthStatus(): {
        healthy: boolean;
        details: any;
    };
}
export declare function createConfigValidator(serviceName: string, tracing?: GuardAntTracing): ConfigValidator;
export declare function validateServiceConfiguration(serviceName: string, config: Record<string, any>, schema: ConfigurationSchema, context?: SchemaValidationContext, tracing?: GuardAntTracing): Promise<ConfigValidationReport>;
export { ConfigValidationRules, ValidationSeverity, ValidationCategory };
//# sourceMappingURL=config-validation.d.ts.map