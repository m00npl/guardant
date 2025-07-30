/**
 * Input sanitization and validation system for GuardAnt services
 * Provides XSS protection, SQL injection prevention, and data validation
 */
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
export declare enum ViolationType {
    XSS_ATTEMPT = "xss_attempt",
    SQL_INJECTION = "sql_injection",
    NOSQL_INJECTION = "nosql_injection",
    COMMAND_INJECTION = "command_injection",
    PATH_TRAVERSAL = "path_traversal",
    EXCESSIVE_LENGTH = "excessive_length",
    EXCESSIVE_DEPTH = "excessive_depth",
    MALICIOUS_PATTERN = "malicious_pattern",
    INVALID_ENCODING = "invalid_encoding",
    SUSPICIOUS_CONTENT = "suspicious_content"
}
export declare const SanitizationConfigs: {
    STRICT: {
        enableXssProtection: boolean;
        enableSqlInjectionProtection: boolean;
        enableNoSqlInjectionProtection: boolean;
        enableCommandInjectionProtection: boolean;
        enablePathTraversalProtection: boolean;
        enableHtmlSanitization: boolean;
        maxStringLength: number;
        maxArrayLength: number;
        maxObjectDepth: number;
        allowedTags: never[];
        blockedPatterns: RegExp[];
    };
    STANDARD: {
        enableXssProtection: boolean;
        enableSqlInjectionProtection: boolean;
        enableNoSqlInjectionProtection: boolean;
        enableCommandInjectionProtection: boolean;
        enablePathTraversalProtection: boolean;
        enableHtmlSanitization: boolean;
        maxStringLength: number;
        maxArrayLength: number;
        maxObjectDepth: number;
        allowedTags: string[];
        blockedPatterns: RegExp[];
    };
    LENIENT: {
        enableXssProtection: boolean;
        enableSqlInjectionProtection: boolean;
        enableNoSqlInjectionProtection: boolean;
        enableCommandInjectionProtection: boolean;
        enablePathTraversalProtection: boolean;
        enableHtmlSanitization: boolean;
        maxStringLength: number;
        maxArrayLength: number;
        maxObjectDepth: number;
        allowedTags: string[];
    };
    PUBLIC: {
        enableXssProtection: boolean;
        enableSqlInjectionProtection: boolean;
        enableNoSqlInjectionProtection: boolean;
        enableCommandInjectionProtection: boolean;
        enablePathTraversalProtection: boolean;
        enableHtmlSanitization: boolean;
        maxStringLength: number;
        maxArrayLength: number;
        maxObjectDepth: number;
        allowedTags: string[];
        blockedPatterns: RegExp[];
    };
};
export declare class InputSanitizer {
    private serviceName;
    private logger;
    private tracing?;
    constructor(serviceName: string, tracing?: GuardAntTracing);
    private detectXss;
    private detectSqlInjection;
    private detectNoSqlInjection;
    private detectCommandInjection;
    private detectPathTraversal;
    private sanitizeHtml;
    private sanitizeString;
    private sanitizeObject;
    private sanitizeValue;
    sanitize(data: any, config: SanitizationConfig): SanitizationResult;
    sanitizeEmail(email: string): string;
    sanitizeSubdomain(subdomain: string): string;
    sanitizeUrl(url: string): string;
}
export declare function createSanitizationMiddleware(sanitizer: InputSanitizer, config: SanitizationConfig): (c: any, next: any) => Promise<any>;
export declare function createInputSanitizer(serviceName: string, tracing?: GuardAntTracing): InputSanitizer;
export { SanitizationConfigs, ViolationType };
//# sourceMappingURL=sanitization.d.ts.map