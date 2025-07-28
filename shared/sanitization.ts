/**
 * Input sanitization and validation system for GuardAnt services
 * Provides XSS protection, SQL injection prevention, and data validation
 */

import { createLogger } from './logger';
import { ValidationError, ErrorCategory, ErrorSeverity } from './error-handling';
import type { GuardAntTracing } from './tracing';

export interface SanitizationConfig {
  enableXssProtection: boolean;
  enableSqlInjectionProtection: boolean;
  enableNoSqlInjectionProtection: boolean;
  enableCommandInjectionProtection: boolean;
  enablePathTraversalProtection: boolean;
  enableHtmlSanitization: boolean;
  maxStringLength: number;
  maxArrayLength: number;
  maxObjectDepth: number;
  allowedTags?: string[];
  blockedPatterns?: RegExp[];
  customSanitizers?: Record<string, (value: any) => any>;
}

export interface SanitizationResult {
  sanitized: any;
  violations: SanitizationViolation[];
  blocked: boolean;
}

export interface SanitizationViolation {
  type: ViolationType;
  field: string;
  originalValue: any;
  sanitizedValue: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export enum ViolationType {
  XSS_ATTEMPT = 'xss_attempt',
  SQL_INJECTION = 'sql_injection',
  NOSQL_INJECTION = 'nosql_injection',
  COMMAND_INJECTION = 'command_injection',
  PATH_TRAVERSAL = 'path_traversal',
  EXCESSIVE_LENGTH = 'excessive_length',
  EXCESSIVE_DEPTH = 'excessive_depth',
  MALICIOUS_PATTERN = 'malicious_pattern',
  INVALID_ENCODING = 'invalid_encoding',
  SUSPICIOUS_CONTENT = 'suspicious_content'
}

// Predefined sanitization configurations
export const SanitizationConfigs = {
  // Strict mode for authentication endpoints
  STRICT: {
    enableXssProtection: true,
    enableSqlInjectionProtection: true,
    enableNoSqlInjectionProtection: true,
    enableCommandInjectionProtection: true,
    enablePathTraversalProtection: true,
    enableHtmlSanitization: true,
    maxStringLength: 1000,
    maxArrayLength: 100,
    maxObjectDepth: 5,
    allowedTags: [],
    blockedPatterns: [
      /\b(eval|exec|system|shell_exec|passthru)\b/i,
      /\b(drop|delete|truncate|alter|create)\s+table\b/i,
      /\b(union|select|insert|update)\s+/i,
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/i,
      /vbscript:/i,
      /data:text\/html/i
    ]
  },

  // Standard mode for regular API endpoints
  STANDARD: {
    enableXssProtection: true,
    enableSqlInjectionProtection: true,
    enableNoSqlInjectionProtection: true,
    enableCommandInjectionProtection: false,
    enablePathTraversalProtection: true,
    enableHtmlSanitization: true,
    maxStringLength: 5000,
    maxArrayLength: 1000,
    maxObjectDepth: 10,
    allowedTags: ['b', 'i', 'u', 'strong', 'em', 'p', 'br'],
    blockedPatterns: [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/i,
      /vbscript:/i
    ]
  },

  // Lenient mode for content that may contain HTML
  LENIENT: {
    enableXssProtection: true,
    enableSqlInjectionProtection: false,
    enableNoSqlInjectionProtection: false,
    enableCommandInjectionProtection: false,
    enablePathTraversalProtection: true,
    enableHtmlSanitization: true,
    maxStringLength: 50000,
    maxArrayLength: 5000,
    maxObjectDepth: 20,
    allowedTags: [
      'b', 'i', 'u', 'strong', 'em', 'p', 'br', 'a', 'div', 'span',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote'
    ]
  },

  // Public API mode (moderate)
  PUBLIC: {
    enableXssProtection: true,
    enableSqlInjectionProtection: true,
    enableNoSqlInjectionProtection: true,
    enableCommandInjectionProtection: true,
    enablePathTraversalProtection: true,
    enableHtmlSanitization: true,
    maxStringLength: 2000,
    maxArrayLength: 500,
    maxObjectDepth: 8,
    allowedTags: ['b', 'i', 'strong', 'em'],
    blockedPatterns: [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i
    ]
  }
};

export class InputSanitizer {
  private logger;
  private tracing?: GuardAntTracing;

  constructor(
    private serviceName: string,
    tracing?: GuardAntTracing
  ) {
    this.logger = createLogger(`${serviceName}-sanitizer`);
    this.tracing = tracing;
  }

  private detectXss(value: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>/gi,
      /<link[^>]*>/gi,
      /<meta[^>]*>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /on\w+\s*=/gi,
      /<.*?(?:onerror|onload|onclick|onmouseover).*?>/gi
    ];

    return xssPatterns.some(pattern => pattern.test(value));
  }

  private detectSqlInjection(value: string): boolean {
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
      /(\b(or|and)\s+\d+\s*=\s*\d+)/gi,
      /(['"])\s*;\s*\w+/gi,
      /\b(waitfor\s+delay|benchmark|sleep)\s*\(/gi,
      /\b(information_schema|sysobjects|syscolumns)\b/gi,
      /(\/\*.*?\*\/)|(--[^\r\n]*)/gi
    ];

    return sqlPatterns.some(pattern => pattern.test(value));
  }

  private detectNoSqlInjection(value: string): boolean {
    const noSqlPatterns = [
      /\$where\s*:/gi,
      /\$regex\s*:/gi,
      /\$gt\s*:/gi,
      /\$lt\s*:/gi,
      /\$ne\s*:/gi,
      /\$in\s*:/gi,
      /\$nin\s*:/gi,
      /\$exists\s*:/gi,
      /\$or\s*:/gi,
      /\$and\s*:/gi,
      /\$nor\s*:/gi,
      /\$not\s*:/gi
    ];

    return noSqlPatterns.some(pattern => pattern.test(value));
  }

  private detectCommandInjection(value: string): boolean {
    const commandPatterns = [
      /[;&|`$(){}]/g,
      /\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig|wget|curl|nc|telnet|ssh|ftp)\b/gi,
      /\b(rm|mv|cp|chmod|chown|kill|sudo|su)\b/gi,
      /\b(eval|exec|system|shell_exec|passthru|popen|proc_open)\b/gi
    ];

    return commandPatterns.some(pattern => pattern.test(value));
  }

  private detectPathTraversal(value: string): boolean {
    const pathPatterns = [
      /\.\.[\/\\]/g,
      /\/(etc|proc|sys|dev|var|tmp)[\/\\]/gi,
      /[\\\/](windows|winnt|system32)[\\\/]/gi,
      /%2e%2e[%2f%5c]/gi,
      /\.\.%2f/gi,
      /\.\.%5c/gi
    ];

    return pathPatterns.some(pattern => pattern.test(value));
  }

  private sanitizeHtml(value: string, allowedTags: string[] = []): string {
    // Remove script tags completely
    value = value.replace(/<script[^>]*>.*?<\/script>/gi, '');
    
    // Remove dangerous attributes
    value = value.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
    value = value.replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
    
    // Remove javascript: and vbscript: protocols
    value = value.replace(/(javascript|vbscript):/gi, '');
    
    // If no tags are allowed, strip all HTML
    if (allowedTags.length === 0) {
      value = value.replace(/<[^>]*>/g, '');
    } else {
      // Remove tags not in allowedTags
      const tagPattern = /<\/?(\w+)[^>]*>/g;
      value = value.replace(tagPattern, (match, tagName) => {
        if (allowedTags.includes(tagName.toLowerCase())) {
          // Keep allowed tags but sanitize attributes
          return match.replace(/\s+\w+\s*=\s*["'][^"']*["']/g, '');
        }
        return '';
      });
    }

    return value;
  }

  private sanitizeString(
    value: string, 
    field: string, 
    config: SanitizationConfig
  ): { sanitized: string; violations: SanitizationViolation[] } {
    const violations: SanitizationViolation[] = [];
    let sanitized = value;

    // Check length
    if (sanitized.length > config.maxStringLength) {
      violations.push({
        type: ViolationType.EXCESSIVE_LENGTH,
        field,
        originalValue: value,
        sanitizedValue: sanitized.substring(0, config.maxStringLength),
        severity: 'medium',
        message: `String exceeds maximum length of ${config.maxStringLength} characters`
      });
      sanitized = sanitized.substring(0, config.maxStringLength);
    }

    // XSS detection and sanitization
    if (config.enableXssProtection && this.detectXss(sanitized)) {
      violations.push({
        type: ViolationType.XSS_ATTEMPT,
        field,
        originalValue: value,
        sanitizedValue: sanitized,
        severity: 'high',
        message: 'Potential XSS attack detected'
      });
    }

    // SQL injection detection
    if (config.enableSqlInjectionProtection && this.detectSqlInjection(sanitized)) {
      violations.push({
        type: ViolationType.SQL_INJECTION,
        field,
        originalValue: value,
        sanitizedValue: sanitized,
        severity: 'critical',
        message: 'Potential SQL injection attack detected'
      });
    }

    // NoSQL injection detection
    if (config.enableNoSqlInjectionProtection && this.detectNoSqlInjection(sanitized)) {
      violations.push({
        type: ViolationType.NOSQL_INJECTION,
        field,
        originalValue: value,
        sanitizedValue: sanitized,
        severity: 'high',
        message: 'Potential NoSQL injection attack detected'
      });
    }

    // Command injection detection
    if (config.enableCommandInjectionProtection && this.detectCommandInjection(sanitized)) {
      violations.push({
        type: ViolationType.COMMAND_INJECTION,
        field,
        originalValue: value,
        sanitizedValue: sanitized,
        severity: 'critical',
        message: 'Potential command injection attack detected'
      });
    }

    // Path traversal detection
    if (config.enablePathTraversalProtection && this.detectPathTraversal(sanitized)) {
      violations.push({
        type: ViolationType.PATH_TRAVERSAL,
        field,
        originalValue: value,
        sanitizedValue: sanitized,
        severity: 'high',
        message: 'Potential path traversal attack detected'
      });
    }

    // Custom pattern checking
    if (config.blockedPatterns) {
      for (const pattern of config.blockedPatterns) {
        if (pattern.test(sanitized)) {
          violations.push({
            type: ViolationType.MALICIOUS_PATTERN,
            field,
            originalValue: value,
            sanitizedValue: sanitized,
            severity: 'high',
            message: 'Blocked pattern detected'
          });
        }
      }
    }

    // HTML sanitization (always do this last)
    if (config.enableHtmlSanitization) {
      const htmlSanitized = this.sanitizeHtml(sanitized, config.allowedTags);
      if (htmlSanitized !== sanitized) {
        sanitized = htmlSanitized;
      }
    }

    return { sanitized, violations };
  }

  private sanitizeObject(
    obj: any, 
    field: string, 
    config: SanitizationConfig, 
    depth: number = 0
  ): { sanitized: any; violations: SanitizationViolation[] } {
    const violations: SanitizationViolation[] = [];

    // Check depth
    if (depth > config.maxObjectDepth) {
      violations.push({
        type: ViolationType.EXCESSIVE_DEPTH,
        field,
        originalValue: obj,
        sanitizedValue: null,
        severity: 'medium',
        message: `Object exceeds maximum depth of ${config.maxObjectDepth}`
      });
      return { sanitized: null, violations };
    }

    if (Array.isArray(obj)) {
      // Check array length
      if (obj.length > config.maxArrayLength) {
        violations.push({
          type: ViolationType.EXCESSIVE_LENGTH,
          field,
          originalValue: obj,
          sanitizedValue: obj.slice(0, config.maxArrayLength),
          severity: 'medium',
          message: `Array exceeds maximum length of ${config.maxArrayLength}`
        });
        obj = obj.slice(0, config.maxArrayLength);
      }

      const sanitizedArray = [];
      for (let i = 0; i < obj.length; i++) {
        const result = this.sanitizeValue(obj[i], `${field}[${i}]`, config, depth + 1);
        sanitizedArray.push(result.sanitized);
        violations.push(...result.violations);
      }
      return { sanitized: sanitizedArray, violations };
    }

    if (obj !== null && typeof obj === 'object') {
      const sanitizedObj: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize the key itself
        const keyResult = this.sanitizeString(key, `${field}.key`, config);
        violations.push(...keyResult.violations);
        
        const sanitizedKey = keyResult.sanitized;
        const result = this.sanitizeValue(value, `${field}.${sanitizedKey}`, config, depth + 1);
        sanitizedObj[sanitizedKey] = result.sanitized;
        violations.push(...result.violations);
      }
      return { sanitized: sanitizedObj, violations };
    }

    return { sanitized: obj, violations };
  }

  private sanitizeValue(
    value: any, 
    field: string, 
    config: SanitizationConfig, 
    depth: number = 0
  ): { sanitized: any; violations: SanitizationViolation[] } {
    if (typeof value === 'string') {
      return this.sanitizeString(value, field, config);
    }

    if (typeof value === 'object' && value !== null) {
      return this.sanitizeObject(value, field, config, depth);
    }

    // For primitives (number, boolean, null), return as-is
    return { sanitized: value, violations: [] };
  }

  sanitize(data: any, config: SanitizationConfig): SanitizationResult {
    const startTime = Date.now();
    
    try {
      const result = this.sanitizeValue(data, 'root', config);
      
      // Check if we should block the request
      const criticalViolations = result.violations.filter(v => v.severity === 'critical');
      const blocked = criticalViolations.length > 0;

      // Log violations
      if (result.violations.length > 0) {
        const highSeverityViolations = result.violations.filter(v => 
          v.severity === 'high' || v.severity === 'critical'
        );

        if (highSeverityViolations.length > 0) {
          this.logger.warn('Security violations detected during sanitization', 
            new ValidationError('Input contains malicious content', {
              service: this.serviceName,
              operation: 'input_sanitization'
            }), {
            violations: result.violations,
            blocked
          });

          if (this.tracing) {
            this.tracing.addEvent('security_violation_detected', {
              'sanitization.violations_count': result.violations.length.toString(),
              'sanitization.blocked': blocked.toString(),
              'sanitization.critical_violations': criticalViolations.length.toString(),
            });
          }
        }
      }

      const duration = Date.now() - startTime;
      this.logger.debug('Input sanitization completed', {
        violations: result.violations.length,
        blocked,
        duration
      });

      return {
        sanitized: result.sanitized,
        violations: result.violations,
        blocked
      };

    } catch (error) {
      this.logger.error('Error during input sanitization', error as Error);
      
      // On error, return original data but mark as potential security risk
      return {
        sanitized: data,
        violations: [{
          type: ViolationType.SUSPICIOUS_CONTENT,
          field: 'unknown',
          originalValue: data,
          sanitizedValue: data,
          severity: 'medium',
          message: 'Sanitization failed - potential security risk'
        }],
        blocked: false
      };
    }
  }

  // Pre-built sanitizers for common use cases
  sanitizeEmail(email: string): string {
    const result = this.sanitize(email, SanitizationConfigs.STRICT);
    const sanitized = result.sanitized as string;
    
    // Additional email-specific validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
      throw new ValidationError('Invalid email format', {
        service: this.serviceName,
        operation: 'email_sanitization'
      }, 'email');
    }

    return sanitized;
  }

  sanitizeSubdomain(subdomain: string): string {
    const result = this.sanitize(subdomain, SanitizationConfigs.STRICT);
    const sanitized = result.sanitized as string;
    
    // Additional subdomain-specific validation
    if (!/^[a-z0-9-]+$/.test(sanitized)) {
      throw new ValidationError('Subdomain must contain only lowercase letters, numbers, and hyphens', {
        service: this.serviceName,
        operation: 'subdomain_sanitization'
      }, 'subdomain');
    }

    return sanitized;
  }

  sanitizeUrl(url: string): string {
    const result = this.sanitize(url, SanitizationConfigs.STANDARD);
    const sanitized = result.sanitized as string;
    
    // Additional URL-specific validation
    try {
      new URL(sanitized);
    } catch {
      throw new ValidationError('Invalid URL format', {
        service: this.serviceName,
        operation: 'url_sanitization'
      }, 'url');
    }

    return sanitized;
  }
}

// Middleware factory for HTTP frameworks
export function createSanitizationMiddleware(
  sanitizer: InputSanitizer,
  config: SanitizationConfig
) {
  return async (c: any, next: any) => {
    // Skip GET requests (no body to sanitize)
    if (c.req.method === 'GET') {
      return next();
    }

    try {
      // Get request body
      const body = await c.req.json().catch(() => ({}));
      
      // Sanitize the body
      const result = sanitizer.sanitize(body, config);
      
      // If blocked, return error
      if (result.blocked) {
        return c.json({
          error: 'Request blocked due to security violations',
          code: 'SECURITY_VIOLATION',
          violations: result.violations.map(v => ({
            type: v.type,
            field: v.field,
            message: v.message
          }))
        }, 400);
      }

      // Replace request body with sanitized version
      c.set('sanitizedBody', result.sanitized);
      c.set('sanitizationViolations', result.violations);
      
      return next();

    } catch (error) {
      // If we can't parse the body, let it through
      // The next middleware will handle the invalid JSON
      return next();
    }
  };
}

// Factory function
export function createInputSanitizer(
  serviceName: string,
  tracing?: GuardAntTracing
): InputSanitizer {
  return new InputSanitizer(serviceName, tracing);
}

export { SanitizationConfigs, ViolationType };