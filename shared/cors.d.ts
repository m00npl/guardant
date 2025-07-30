/**
 * Advanced CORS (Cross-Origin Resource Sharing) configuration for GuardAnt services
 * Provides fine-grained control over cross-origin requests with security-first approach
 */
import type { GuardAntTracing } from './tracing';
export interface CorsConfig {
    origins: string[] | ((origin: string) => boolean) | '*';
    methods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    credentials: boolean;
    maxAge: number;
    preflightContinue: boolean;
    optionsSuccessStatus: number;
    enablePreflight: boolean;
    allowPrivateNetwork?: boolean;
    customValidator?: (origin: string, request: any) => boolean;
    logging: boolean;
}
export interface CorsContext {
    origin: string;
    method: string;
    headers: Record<string, string>;
    userAgent: string;
    referer?: string;
    nestId?: string;
    userId?: string;
    requestId: string;
}
export interface CorsResult {
    allowed: boolean;
    headers: Record<string, string>;
    status?: number;
    reason?: string;
}
export interface CorsViolation {
    type: CorsViolationType;
    origin: string;
    method: string;
    reason: string;
    severity: 'low' | 'medium' | 'high';
    blocked: boolean;
}
export declare enum CorsViolationType {
    INVALID_ORIGIN = "invalid_origin",
    DISALLOWED_METHOD = "disallowed_method",
    FORBIDDEN_HEADER = "forbidden_header",
    CREDENTIALS_MISMATCH = "credentials_mismatch",
    PRIVATE_NETWORK_VIOLATION = "private_network_violation",
    SUSPICIOUS_REQUEST = "suspicious_request"
}
export declare const CorsConfigs: {
    DEVELOPMENT: {
        origins: string[];
        methods: string[];
        allowedHeaders: string[];
        exposedHeaders: string[];
        credentials: boolean;
        maxAge: number;
        preflightContinue: boolean;
        optionsSuccessStatus: number;
        enablePreflight: boolean;
        allowPrivateNetwork: boolean;
        logging: boolean;
    };
    PRODUCTION: {
        origins: (origin: string) => boolean;
        methods: string[];
        allowedHeaders: string[];
        exposedHeaders: string[];
        credentials: boolean;
        maxAge: number;
        preflightContinue: boolean;
        optionsSuccessStatus: number;
        enablePreflight: boolean;
        allowPrivateNetwork: boolean;
        logging: boolean;
    };
    PUBLIC_API: {
        origins: (origin: string) => boolean;
        methods: string[];
        allowedHeaders: string[];
        exposedHeaders: string[];
        credentials: boolean;
        maxAge: number;
        preflightContinue: boolean;
        optionsSuccessStatus: number;
        enablePreflight: boolean;
        allowPrivateNetwork: boolean;
        logging: boolean;
    };
    WIDGET: {
        origins: string;
        methods: string[];
        allowedHeaders: string[];
        exposedHeaders: string[];
        credentials: boolean;
        maxAge: number;
        preflightContinue: boolean;
        optionsSuccessStatus: number;
        enablePreflight: boolean;
        allowPrivateNetwork: boolean;
        logging: boolean;
    };
    ADMIN: {
        origins: string[];
        methods: string[];
        allowedHeaders: string[];
        exposedHeaders: string[];
        credentials: boolean;
        maxAge: number;
        preflightContinue: boolean;
        optionsSuccessStatus: number;
        enablePreflight: boolean;
        allowPrivateNetwork: boolean;
        customValidator: (origin: string, request: any) => boolean;
        logging: boolean;
    };
    INTERNAL: {
        origins: string[];
        methods: string[];
        allowedHeaders: string[];
        exposedHeaders: never[];
        credentials: boolean;
        maxAge: number;
        preflightContinue: boolean;
        optionsSuccessStatus: number;
        enablePreflight: boolean;
        allowPrivateNetwork: boolean;
        logging: boolean;
    };
};
export declare class CorsManager {
    private serviceName;
    private logger;
    private tracing?;
    private violations;
    constructor(serviceName: string, tracing?: GuardAntTracing);
    private isOriginAllowed;
    private validateOrigin;
    private validateMethod;
    private validateHeaders;
    private recordViolation;
    handleCors(config: CorsConfig, context: CorsContext): CorsResult;
    getViolations(): CorsViolation[];
    clearViolations(): void;
    getStats(): {
        totalViolations: number;
        violationsByType: Record<string, number>;
    };
}
export declare function createCorsMiddleware(corsManager: CorsManager, config: CorsConfig): (c: any, next: any) => Promise<any>;
export declare function createCorsManager(serviceName: string, tracing?: GuardAntTracing): CorsManager;
export { CorsConfigs, CorsViolationType };
//# sourceMappingURL=cors.d.ts.map