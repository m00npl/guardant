/**
 * Comprehensive request validation middleware for GuardAnt services
 * Provides schema validation, business rule enforcement, and security checks
 */
import type { GuardAntTracing } from './tracing';
export interface ValidationRule {
    field: string;
    type: FieldType;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: string[];
    custom?: (value: any, context: ValidationContext) => ValidationResult;
    sanitize?: boolean;
    description?: string;
}
export declare enum FieldType {
    STRING = "string",
    NUMBER = "number",
    INTEGER = "integer",
    BOOLEAN = "boolean",
    EMAIL = "email",
    URL = "url",
    UUID = "uuid",
    DATE = "date",
    ARRAY = "array",
    OBJECT = "object",
    SUBDOMAIN = "subdomain",
    TRANSACTION_HASH = "transaction_hash",
    ETHEREUM_ADDRESS = "ethereum_address",
    SERVICE_TYPE = "service_type",
    JSON = "json"
}
export interface ValidationSchema {
    name: string;
    description: string;
    rules: ValidationRule[];
    allowUnknownFields?: boolean;
    businessRules?: BusinessRule[];
}
export interface BusinessRule {
    name: string;
    description: string;
    validator: (data: any, context: ValidationContext) => Promise<BusinessRuleResult>;
    severity: 'warning' | 'error';
    blocking: boolean;
}
export interface BusinessRuleResult {
    valid: boolean;
    message?: string;
    details?: any;
}
export interface ValidationContext {
    method: string;
    path: string;
    headers: Record<string, string>;
    nestId?: string;
    userId?: string;
    userRole?: string;
    requestId: string;
    ip: string;
}
export interface ValidationResult {
    valid: boolean;
    field?: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    value?: any;
}
export interface ValidationReport {
    valid: boolean;
    errors: ValidationResult[];
    warnings: ValidationResult[];
    sanitizedData?: any;
    businessRuleViolations: BusinessRuleResult[];
}
export declare const ValidationSchemas: {
    NEST_REGISTRATION: {
        name: string;
        description: string;
        rules: ({
            field: string;
            type: FieldType;
            required: boolean;
            minLength: number;
            maxLength: number;
            pattern: RegExp;
            sanitize: boolean;
            description: string;
        } | {
            field: string;
            type: FieldType;
            required: boolean;
            maxLength: number;
            sanitize: boolean;
            description: string;
            minLength?: undefined;
            pattern?: undefined;
        } | {
            field: string;
            type: FieldType;
            required: boolean;
            minLength: number;
            maxLength: number;
            pattern: RegExp;
            description: string;
            sanitize?: undefined;
        } | {
            field: string;
            type: FieldType;
            required: boolean;
            minLength: number;
            maxLength: number;
            sanitize: boolean;
            description: string;
            pattern?: undefined;
        })[];
        allowUnknownFields: boolean;
        businessRules: {
            name: string;
            description: string;
            validator: (data: any, context: ValidationContext) => Promise<{
                valid: boolean;
                message: string | undefined;
            }>;
            severity: string;
            blocking: boolean;
        }[];
    };
    SERVICE_CREATION: {
        name: string;
        description: string;
        rules: ({
            field: string;
            type: FieldType;
            required: boolean;
            minLength: number;
            maxLength: number;
            sanitize: boolean;
            description: string;
            enum?: undefined;
            min?: undefined;
            max?: undefined;
        } | {
            field: string;
            type: FieldType;
            required: boolean;
            enum: string[];
            description: string;
            minLength?: undefined;
            maxLength?: undefined;
            sanitize?: undefined;
            min?: undefined;
            max?: undefined;
        } | {
            field: string;
            type: FieldType;
            required: boolean;
            maxLength: number;
            sanitize: boolean;
            description: string;
            minLength?: undefined;
            enum?: undefined;
            min?: undefined;
            max?: undefined;
        } | {
            field: string;
            type: FieldType;
            required: boolean;
            min: number;
            max: number;
            description: string;
            minLength?: undefined;
            maxLength?: undefined;
            sanitize?: undefined;
            enum?: undefined;
        } | {
            field: string;
            type: FieldType;
            required: boolean;
            description: string;
            minLength?: undefined;
            maxLength?: undefined;
            sanitize?: undefined;
            enum?: undefined;
            min?: undefined;
            max?: undefined;
        })[];
        allowUnknownFields: boolean;
        businessRules: {
            name: string;
            description: string;
            validator: (data: any, context: ValidationContext) => Promise<{
                valid: boolean;
                message: string | undefined;
            }>;
            severity: string;
            blocking: boolean;
        }[];
    };
    USER_AUTH: {
        name: string;
        description: string;
        rules: ({
            field: string;
            type: FieldType;
            required: boolean;
            maxLength: number;
            sanitize: boolean;
            description: string;
            minLength?: undefined;
        } | {
            field: string;
            type: FieldType;
            required: boolean;
            minLength: number;
            maxLength: number;
            description: string;
            sanitize?: undefined;
        })[];
        allowUnknownFields: boolean;
    };
    SERVICE_UPDATE: {
        name: string;
        description: string;
        rules: ({
            field: string;
            type: FieldType;
            required: boolean;
            minLength: number;
            maxLength: number;
            sanitize: boolean;
            description: string;
            min?: undefined;
            max?: undefined;
        } | {
            field: string;
            type: FieldType;
            required: boolean;
            maxLength: number;
            sanitize: boolean;
            description: string;
            minLength?: undefined;
            min?: undefined;
            max?: undefined;
        } | {
            field: string;
            type: FieldType;
            required: boolean;
            min: number;
            max: number;
            description: string;
            minLength?: undefined;
            maxLength?: undefined;
            sanitize?: undefined;
        } | {
            field: string;
            type: FieldType;
            required: boolean;
            description: string;
            minLength?: undefined;
            maxLength?: undefined;
            sanitize?: undefined;
            min?: undefined;
            max?: undefined;
        })[];
        allowUnknownFields: boolean;
    };
    PAYMENT_TRANSACTION: {
        name: string;
        description: string;
        rules: ({
            field: string;
            type: FieldType;
            required: boolean;
            pattern: RegExp;
            description: string;
            enum?: undefined;
        } | {
            field: string;
            type: FieldType;
            required: boolean;
            enum: string[];
            description: string;
            pattern?: undefined;
        })[];
        allowUnknownFields: boolean;
        businessRules: {
            name: string;
            description: string;
            validator: (data: any, context: ValidationContext) => Promise<{
                valid: boolean;
                message: string | undefined;
            }>;
            severity: string;
            blocking: boolean;
        }[];
    };
};
export declare class RequestValidator {
    private serviceName;
    private logger;
    private tracing?;
    private sanitizer;
    constructor(serviceName: string, tracing?: GuardAntTracing);
    private validateField;
    validateRequest(data: any, schema: ValidationSchema, context: ValidationContext): Promise<ValidationReport>;
    validateNestRegistration(data: any, context: ValidationContext): Promise<ValidationReport>;
    validateServiceCreation(data: any, context: ValidationContext): Promise<ValidationReport>;
    validateUserAuth(data: any, context: ValidationContext): Promise<ValidationReport>;
    validateServiceUpdate(data: any, context: ValidationContext): Promise<ValidationReport>;
    validatePaymentTransaction(data: any, context: ValidationContext): Promise<ValidationReport>;
}
export declare function createValidationMiddleware(validator: RequestValidator, schemaName: keyof typeof ValidationSchemas | ValidationSchema): (c: any, next: any) => Promise<any>;
export declare function createRequestValidator(serviceName: string, tracing?: GuardAntTracing): RequestValidator;
export { ValidationSchemas, FieldType };
//# sourceMappingURL=request-validation.d.ts.map