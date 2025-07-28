/**
 * Comprehensive request validation middleware for GuardAnt services
 * Provides schema validation, business rule enforcement, and security checks
 */

import { createLogger } from './logger';
import { ValidationError, ErrorCategory, ErrorSeverity } from './error-handling';
import type { GuardAntTracing } from './tracing';
import { createInputSanitizer, SanitizationConfigs } from './sanitization';

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

export enum FieldType {
  STRING = 'string',
  NUMBER = 'number',
  INTEGER = 'integer',
  BOOLEAN = 'boolean',
  EMAIL = 'email',
  URL = 'url',
  UUID = 'uuid',
  DATE = 'date',
  ARRAY = 'array',
  OBJECT = 'object',
  SUBDOMAIN = 'subdomain',
  TRANSACTION_HASH = 'transaction_hash',
  ETHEREUM_ADDRESS = 'ethereum_address',
  SERVICE_TYPE = 'service_type',
  JSON = 'json'
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

// Predefined validation schemas for common endpoints
export const ValidationSchemas = {
  // Nest registration schema
  NEST_REGISTRATION: {
    name: 'nest_registration',
    description: 'Schema for registering a new nest',
    rules: [
      {
        field: 'subdomain',
        type: FieldType.SUBDOMAIN,
        required: true,
        minLength: 3,
        maxLength: 30,
        pattern: /^[a-z0-9-]+$/,
        sanitize: true,
        description: 'Unique subdomain for the nest'
      },
      {
        field: 'email',
        type: FieldType.EMAIL,
        required: true,
        maxLength: 100,
        sanitize: true,
        description: 'Admin email address'
      },
      {
        field: 'password',
        type: FieldType.STRING,
        required: true,
        minLength: 8,
        maxLength: 128,
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        description: 'Strong password with mixed case, numbers, and symbols'
      },
      {
        field: 'name',
        type: FieldType.STRING,
        required: true,
        minLength: 2,
        maxLength: 100,
        sanitize: true,
        description: 'Display name for the nest'
      },
      {
        field: 'description',
        type: FieldType.STRING,
        required: false,
        maxLength: 500,
        sanitize: true,
        description: 'Optional description of the nest'
      }
    ],
    allowUnknownFields: false,
    businessRules: [
      {
        name: 'unique_subdomain',
        description: 'Subdomain must be unique across all nests',
        validator: async (data: any, context: ValidationContext) => {
          // This would check against database/storage
          const subdomainExists = false; // Placeholder
          return {
            valid: !subdomainExists,
            message: subdomainExists ? 'Subdomain is already taken' : undefined
          };
        },
        severity: 'error',
        blocking: true
      },
      {
        name: 'email_not_registered',
        description: 'Email must not be already registered',
        validator: async (data: any, context: ValidationContext) => {
          const emailExists = false; // Placeholder
          return {
            valid: !emailExists,
            message: emailExists ? 'Email is already registered' : undefined
          };
        },
        severity: 'error',
        blocking: true
      }
    ]
  },

  // Service creation schema
  SERVICE_CREATION: {
    name: 'service_creation',
    description: 'Schema for creating a new service to monitor',
    rules: [
      {
        field: 'name',
        type: FieldType.STRING,
        required: true,
        minLength: 2,
        maxLength: 100,
        sanitize: true,
        description: 'Display name for the service'
      },
      {
        field: 'type',
        type: FieldType.SERVICE_TYPE,
        required: true,
        enum: ['web', 'tcp', 'ping', 'api'],
        description: 'Type of monitoring check'
      },
      {
        field: 'url',
        type: FieldType.URL,
        required: true,
        maxLength: 500,
        sanitize: true,
        description: 'URL or endpoint to monitor'
      },
      {
        field: 'description',
        type: FieldType.STRING,
        required: false,
        maxLength: 500,
        sanitize: true,
        description: 'Optional service description'
      },
      {
        field: 'interval',
        type: FieldType.INTEGER,
        required: false,
        min: 30,
        max: 3600,
        description: 'Check interval in seconds (30s to 1h)'
      },
      {
        field: 'timeout',
        type: FieldType.INTEGER,
        required: false,
        min: 5,
        max: 120,
        description: 'Timeout in seconds (5s to 2m)'
      },
      {
        field: 'expectedStatus',
        type: FieldType.INTEGER,
        required: false,
        min: 100,
        max: 599,
        description: 'Expected HTTP status code'
      },
      {
        field: 'regions',
        type: FieldType.ARRAY,
        required: false,
        description: 'Monitoring regions'
      }
    ],
    allowUnknownFields: false,
    businessRules: [
      {
        name: 'valid_service_limit',
        description: 'Nest must not exceed service limit',
        validator: async (data: any, context: ValidationContext) => {
          const serviceCount = 0; // Get current service count
          const maxServices = 50; // Get from subscription
          return {
            valid: serviceCount < maxServices,
            message: serviceCount >= maxServices ? `Service limit of ${maxServices} reached` : undefined
          };
        },
        severity: 'error',
        blocking: true
      }
    ]
  },

  // User authentication schema
  USER_AUTH: {
    name: 'user_auth',
    description: 'Schema for user authentication',
    rules: [
      {
        field: 'email',
        type: FieldType.EMAIL,
        required: true,
        maxLength: 100,
        sanitize: true,
        description: 'User email address'
      },
      {
        field: 'password',
        type: FieldType.STRING,
        required: true,
        minLength: 1,
        maxLength: 128,
        description: 'User password'
      }
    ],
    allowUnknownFields: false
  },

  // Service update schema
  SERVICE_UPDATE: {
    name: 'service_update',
    description: 'Schema for updating existing service',
    rules: [
      {
        field: 'name',
        type: FieldType.STRING,
        required: false,
        minLength: 2,
        maxLength: 100,
        sanitize: true,
        description: 'Service display name'
      },
      {
        field: 'description',
        type: FieldType.STRING,
        required: false,
        maxLength: 500,
        sanitize: true,
        description: 'Service description'
      },
      {
        field: 'interval',
        type: FieldType.INTEGER,
        required: false,
        min: 30,
        max: 3600,
        description: 'Check interval in seconds'
      },
      {
        field: 'timeout',
        type: FieldType.INTEGER,
        required: false,
        min: 5,
        max: 120,
        description: 'Timeout in seconds'
      },
      {
        field: 'enabled',
        type: FieldType.BOOLEAN,
        required: false,
        description: 'Whether monitoring is enabled'
      }
    ],
    allowUnknownFields: false
  },

  // Payment transaction schema
  PAYMENT_TRANSACTION: {
    name: 'payment_transaction',
    description: 'Schema for recording payment transactions',
    rules: [
      {
        field: 'transactionHash',
        type: FieldType.TRANSACTION_HASH,
        required: true,
        pattern: /^0x[a-fA-F0-9]{64}$/,
        description: 'Ethereum transaction hash'
      },
      {
        field: 'amount',
        type: FieldType.STRING,
        required: true,
        pattern: /^\d+(\.\d{1,18})?$/,
        description: 'Transaction amount in ETH'
      },
      {
        field: 'subscriptionType',
        type: FieldType.STRING,
        required: true,
        enum: ['basic', 'pro', 'enterprise'],
        description: 'Subscription tier'
      }
    ],
    allowUnknownFields: false,
    businessRules: [
      {
        name: 'unique_transaction',
        description: 'Transaction hash must be unique',
        validator: async (data: any, context: ValidationContext) => {
          const txExists = false; // Check against database
          return {
            valid: !txExists,
            message: txExists ? 'Transaction already processed' : undefined
          };
        },
        severity: 'error',
        blocking: true
      }
    ]
  }
};

export class RequestValidator {
  private logger;
  private tracing?: GuardAntTracing;
  private sanitizer;

  constructor(
    private serviceName: string,
    tracing?: GuardAntTracing
  ) {
    this.logger = createLogger(`${serviceName}-validator`);
    this.tracing = tracing;
    this.sanitizer = createInputSanitizer(serviceName, tracing);
  }

  private validateField(value: any, rule: ValidationRule, context: ValidationContext): ValidationResult {
    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      return {
        valid: false,
        field: rule.field,
        message: `Field '${rule.field}' is required`,
        severity: 'high'
      };
    }

    // Skip validation for optional empty fields
    if (!rule.required && (value === undefined || value === null || value === '')) {
      return { valid: true, message: 'Optional field is empty' };
    }

    // Type validation
    switch (rule.type) {
      case FieldType.STRING:
        if (typeof value !== 'string') {
          return {
            valid: false,
            field: rule.field,
            message: `Field '${rule.field}' must be a string`,
            severity: 'medium'
          };
        }
        break;

      case FieldType.NUMBER:
      case FieldType.INTEGER:
        const num = Number(value);
        if (isNaN(num)) {
          return {
            valid: false,
            field: rule.field,
            message: `Field '${rule.field}' must be a number`,
            severity: 'medium'
          };
        }
        if (rule.type === FieldType.INTEGER && !Number.isInteger(num)) {
          return {
            valid: false,
            field: rule.field,
            message: `Field '${rule.field}' must be an integer`,
            severity: 'medium'
          };
        }
        value = num;
        break;

      case FieldType.BOOLEAN:
        if (typeof value !== 'boolean') {
          return {
            valid: false,
            field: rule.field,
            message: `Field '${rule.field}' must be a boolean`,
            severity: 'medium'
          };
        }
        break;

      case FieldType.EMAIL:
        if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return {
            valid: false,
            field: rule.field,
            message: `Field '${rule.field}' must be a valid email address`,
            severity: 'medium'
          };
        }
        break;

      case FieldType.URL:
        try {
          new URL(value);
        } catch {
          return {
            valid: false,
            field: rule.field,
            message: `Field '${rule.field}' must be a valid URL`,
            severity: 'medium'
          };
        }
        break;

      case FieldType.UUID:
        if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
          return {
            valid: false,
            field: rule.field,
            message: `Field '${rule.field}' must be a valid UUID`,
            severity: 'medium'
          };
        }
        break;

      case FieldType.SUBDOMAIN:
        if (typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value)) {
          return {
            valid: false,
            field: rule.field,
            message: `Field '${rule.field}' must be a valid subdomain (lowercase letters, numbers, hyphens only)`,
            severity: 'medium'
          };
        }
        break;

      case FieldType.TRANSACTION_HASH:
        if (typeof value !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(value)) {
          return {
            valid: false,
            field: rule.field,
            message: `Field '${rule.field}' must be a valid transaction hash`,
            severity: 'medium'
          };
        }
        break;

      case FieldType.ETHEREUM_ADDRESS:
        if (typeof value !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
          return {
            valid: false,
            field: rule.field,
            message: `Field '${rule.field}' must be a valid Ethereum address`,
            severity: 'medium'
          };
        }
        break;
    }

    // Length validation for strings
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return {
          valid: false,
          field: rule.field,
          message: `Field '${rule.field}' must be at least ${rule.minLength} characters long`,
          severity: 'medium'
        };
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        return {
          valid: false,
          field: rule.field,
          message: `Field '${rule.field}' must be at most ${rule.maxLength} characters long`,
          severity: 'medium'
        };
      }
    }

    // Numeric range validation
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return {
          valid: false,
          field: rule.field,
          message: `Field '${rule.field}' must be at least ${rule.min}`,
          severity: 'medium'
        };
      }
      if (rule.max !== undefined && value > rule.max) {
        return {
          valid: false,
          field: rule.field,
          message: `Field '${rule.field}' must be at most ${rule.max}`,
          severity: 'medium'
        };
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return {
        valid: false,
        field: rule.field,
        message: `Field '${rule.field}' does not match required pattern`,
        severity: 'medium'
      };
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      return {
        valid: false,
        field: rule.field,
        message: `Field '${rule.field}' must be one of: ${rule.enum.join(', ')}`,
        severity: 'medium'
      };
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value, context);
    }

    return { valid: true, message: 'Field validation passed', value };
  }

  async validateRequest(
    data: any,
    schema: ValidationSchema,
    context: ValidationContext
  ): Promise<ValidationReport> {
    const errors: ValidationResult[] = [];
    const warnings: ValidationResult[] = [];
    const businessRuleViolations: BusinessRuleResult[] = [];
    let sanitizedData = { ...data };

    try {
      // Sanitize input if needed
      const sanitizationResult = this.sanitizer.sanitize(data, SanitizationConfigs.STANDARD);
      if (sanitizationResult.blocked) {
        return {
          valid: false,
          errors: [{
            valid: false,
            message: 'Request blocked due to security violations',
            severity: 'critical'
          }],
          warnings: [],
          businessRuleViolations: [],
          sanitizedData: null
        };
      }
      sanitizedData = sanitizationResult.sanitized;

      // Validate each field according to schema rules
      for (const rule of schema.rules) {
        const fieldValue = sanitizedData[rule.field];
        const result = this.validateField(fieldValue, rule, context);

        if (!result.valid) {
          if (result.severity === 'critical' || result.severity === 'high') {
            errors.push(result);
          } else {
            warnings.push(result);
          }
        } else if (result.value !== undefined) {
          sanitizedData[rule.field] = result.value;
        }
      }

      // Check for unknown fields
      if (!schema.allowUnknownFields) {
        const allowedFields = new Set(schema.rules.map(r => r.field));
        const unknownFields = Object.keys(sanitizedData).filter(key => !allowedFields.has(key));
        
        for (const field of unknownFields) {
          warnings.push({
            valid: false,
            field,
            message: `Unknown field '${field}' will be ignored`,
            severity: 'low'
          });
          delete sanitizedData[field];
        }
      }

      // Run business rules if no critical errors
      if (errors.length === 0 && schema.businessRules) {
        for (const businessRule of schema.businessRules) {
          try {
            const result = await businessRule.validator(sanitizedData, context);
            if (!result.valid) {
              businessRuleViolations.push(result);
              
              if (businessRule.blocking) {
                errors.push({
                  valid: false,
                  message: result.message || `Business rule '${businessRule.name}' failed`,
                  severity: businessRule.severity === 'error' ? 'high' : 'medium'
                });
              }
            }
          } catch (error) {
            this.logger.error(`Business rule '${businessRule.name}' execution failed`, error as Error, {
              rule: businessRule.name,
              context
            });
          }
        }
      }

      const valid = errors.length === 0;

      // Log validation results
      if (!valid) {
        this.logger.warn('Request validation failed', 
          new ValidationError('Request validation failed', {
            service: this.serviceName,
            operation: 'request_validation'
          }), {
          schema: schema.name,
          errors: errors.length,
          warnings: warnings.length,
          businessRuleViolations: businessRuleViolations.length
        });

        if (this.tracing) {
          this.tracing.addEvent('request_validation_failed', {
            'validation.schema': schema.name,
            'validation.errors_count': errors.length.toString(),
            'validation.warnings_count': warnings.length.toString(),
            'validation.business_rule_violations': businessRuleViolations.length.toString()
          });
        }
      }

      return {
        valid,
        errors,
        warnings,
        sanitizedData: valid ? sanitizedData : undefined,
        businessRuleViolations
      };

    } catch (error) {
      this.logger.error('Request validation error', error as Error, { schema: schema.name, context });
      
      return {
        valid: false,
        errors: [{
          valid: false,
          message: 'Validation system error',
          severity: 'critical'
        }],
        warnings: [],
        businessRuleViolations: [],
        sanitizedData: undefined
      };
    }
  }

  // Pre-built validators for common use cases
  async validateNestRegistration(data: any, context: ValidationContext): Promise<ValidationReport> {
    return this.validateRequest(data, ValidationSchemas.NEST_REGISTRATION, context);
  }

  async validateServiceCreation(data: any, context: ValidationContext): Promise<ValidationReport> {
    return this.validateRequest(data, ValidationSchemas.SERVICE_CREATION, context);
  }

  async validateUserAuth(data: any, context: ValidationContext): Promise<ValidationReport> {
    return this.validateRequest(data, ValidationSchemas.USER_AUTH, context);
  }

  async validateServiceUpdate(data: any, context: ValidationContext): Promise<ValidationReport> {
    return this.validateRequest(data, ValidationSchemas.SERVICE_UPDATE, context);
  }

  async validatePaymentTransaction(data: any, context: ValidationContext): Promise<ValidationReport> {
    return this.validateRequest(data, ValidationSchemas.PAYMENT_TRANSACTION, context);
  }
}

// Middleware factory for HTTP frameworks
export function createValidationMiddleware(
  validator: RequestValidator,
  schemaName: keyof typeof ValidationSchemas | ValidationSchema
) {
  return async (c: any, next: any) => {
    // Skip GET requests (no body to validate)
    if (c.req.method === 'GET') {
      return next();
    }

    try {
      // Get request body
      const body = await c.req.json().catch(() => ({}));
      
      // Build validation context
      const context: ValidationContext = {
        method: c.req.method,
        path: c.req.path,
        headers: Object.fromEntries(
          Object.entries(c.req.headers || {}).map(([k, v]) => [k.toLowerCase(), v])
        ),
        nestId: c.get('nestId'),
        userId: c.get('userId'),
        userRole: c.get('userRole'),
        requestId: c.get('requestId') || 'unknown',
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1'
      };

      // Get schema
      const schema = typeof schemaName === 'string' ? ValidationSchemas[schemaName] : schemaName;
      if (!schema) {
        return c.json({
          error: 'Validation schema not found',
          code: 'SCHEMA_ERROR'
        }, 500);
      }

      // Validate request
      const result = await validator.validateRequest(body, schema, context);

      // Handle validation errors
      if (!result.valid) {
        return c.json({
          error: 'Request validation failed',
          code: 'VALIDATION_ERROR',
          details: {
            errors: result.errors.map(e => ({
              field: e.field,
              message: e.message,
              severity: e.severity
            })),
            warnings: result.warnings.map(w => ({
              field: w.field,
              message: w.message,
              severity: w.severity
            })),
            businessRules: result.businessRuleViolations
          }
        }, 400);
      }

      // Set validated and sanitized data
      c.set('validatedBody', result.sanitizedData);
      c.set('validationWarnings', result.warnings);
      
      return next();

    } catch (error) {
      // If we can't parse the body, let it through
      // The next middleware will handle the invalid JSON
      return next();
    }
  };
}

// Factory function
export function createRequestValidator(
  serviceName: string,
  tracing?: GuardAntTracing
): RequestValidator {
  return new RequestValidator(serviceName, tracing);
}

export { ValidationSchemas, FieldType };