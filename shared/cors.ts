/**
 * Advanced CORS (Cross-Origin Resource Sharing) configuration for GuardAnt services
 * Provides fine-grained control over cross-origin requests with security-first approach
 */

import { createLogger } from './logger';
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
  allowPrivateNetwork?: boolean; // For Private Network Access
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

export enum CorsViolationType {
  INVALID_ORIGIN = 'invalid_origin',
  DISALLOWED_METHOD = 'disallowed_method',
  FORBIDDEN_HEADER = 'forbidden_header',
  CREDENTIALS_MISMATCH = 'credentials_mismatch',
  PRIVATE_NETWORK_VIOLATION = 'private_network_violation',
  SUSPICIOUS_REQUEST = 'suspicious_request'
}

// Predefined CORS configurations for different environments
export const CorsConfigs = {
  // Development mode - permissive for local development
  DEVELOPMENT: {
    origins: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Request-ID',
      'X-Nest-ID',
      'X-API-Version'
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Total-Count'
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
    enablePreflight: true,
    allowPrivateNetwork: true,
    logging: true
  },

  // Production mode - strict security
  PRODUCTION: {
    origins: (origin: string) => {
      // Allow guardant.me subdomains
      const allowedDomains = [
        /^https:\/\/[a-z0-9-]+\.guardant\.me$/,
        /^https:\/\/guardant\.me$/,
        /^https:\/\/app\.guardant\.me$/,
        /^https:\/\/admin\.guardant\.me$/
      ];
      
      return allowedDomains.some(pattern => pattern.test(origin));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'X-Request-ID',
      'X-Nest-ID',
      'X-API-Version'
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset'
    ],
    credentials: true,
    maxAge: 3600, // 1 hour
    preflightContinue: false,
    optionsSuccessStatus: 204,
    enablePreflight: true,
    allowPrivateNetwork: false,
    logging: true
  },

  // Public API mode - allow known status page domains
  PUBLIC_API: {
    origins: (origin: string) => {
      // Allow any guardant.me subdomain for public status pages
      return /^https:\/\/[a-z0-9-]+\.guardant\.me$/.test(origin) ||
             origin === 'https://guardant.me';
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'X-Requested-With',
      'X-Request-ID'
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining'
    ],
    credentials: false,
    maxAge: 7200, // 2 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
    enablePreflight: true,
    allowPrivateNetwork: false,
    logging: false
  },

  // Widget embedding mode - more permissive for embeds
  WIDGET: {
    origins: '*', // Allow embedding from any domain
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'X-Requested-With'
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining'
    ],
    credentials: false,
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
    enablePreflight: true,
    allowPrivateNetwork: false,
    logging: true
  },

  // Admin API mode - very strict
  ADMIN: {
    origins: [
      'https://admin.guardant.me',
      'https://app.guardant.me'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'X-Request-ID',
      'X-Nest-ID',
      'X-API-Version'
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-Total-Count'
    ],
    credentials: true,
    maxAge: 1800, // 30 minutes
    preflightContinue: false,
    optionsSuccessStatus: 204,
    enablePreflight: true,
    allowPrivateNetwork: false,
    customValidator: (origin: string, request: any) => {
      // Additional validation for admin requests
      const userAgent = request.headers?.['user-agent'] || '';
      
      // Block known automation tools in production
      const blockedAgents = ['curl', 'wget', 'python-requests', 'postman'];
      return !blockedAgents.some(agent => userAgent.toLowerCase().includes(agent));
    },
    logging: true
  },

  // Monitoring endpoints - internal only
  INTERNAL: {
    origins: ['http://localhost', 'http://127.0.0.1', 'https://monitoring.guardant.me'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Monitoring-Token'
    ],
    exposedHeaders: [],
    credentials: false,
    maxAge: 300, // 5 minutes
    preflightContinue: false,
    optionsSuccessStatus: 204,
    enablePreflight: false,
    allowPrivateNetwork: true,
    logging: true
  }
};

export class CorsManager {
  private logger;
  private tracing?: GuardAntTracing;
  private violations: CorsViolation[] = [];

  constructor(
    private serviceName: string,
    tracing?: GuardAntTracing
  ) {
    this.logger = createLogger(`${serviceName}-cors`);
    this.tracing = tracing;
  }

  private isOriginAllowed(origin: string, allowedOrigins: CorsConfig['origins']): boolean {
    if (allowedOrigins === '*') {
      return true;
    }

    if (typeof allowedOrigins === 'function') {
      return allowedOrigins(origin);
    }

    if (Array.isArray(allowedOrigins)) {
      return allowedOrigins.includes(origin);
    }

    return false;
  }

  private validateOrigin(origin: string, config: CorsConfig, context: CorsContext): boolean {
    // No origin (same-origin request)
    if (!origin) {
      return true;
    }

    // Check basic origin format
    try {
      new URL(origin);
    } catch {
      this.recordViolation({
        type: CorsViolationType.INVALID_ORIGIN,
        origin,
        method: context.method,
        reason: 'Invalid origin format',
        severity: 'medium',
        blocked: true
      });
      return false;
    }

    // Check if origin is allowed
    if (!this.isOriginAllowed(origin, config.origins)) {
      this.recordViolation({
        type: CorsViolationType.INVALID_ORIGIN,
        origin,
        method: context.method,
        reason: 'Origin not in allowed list',
        severity: 'high',
        blocked: true
      });
      return false;
    }

    // Custom validation
    if (config.customValidator && !config.customValidator(origin, context)) {
      this.recordViolation({
        type: CorsViolationType.SUSPICIOUS_REQUEST,
        origin,
        method: context.method,
        reason: 'Failed custom validation',
        severity: 'high',
        blocked: true
      });
      return false;
    }

    return true;
  }

  private validateMethod(method: string, config: CorsConfig, context: CorsContext): boolean {
    if (!config.methods.includes(method)) {
      this.recordViolation({
        type: CorsViolationType.DISALLOWED_METHOD,
        origin: context.origin,
        method,
        reason: `Method ${method} not allowed`,
        severity: 'medium',
        blocked: true
      });
      return false;
    }

    return true;
  }

  private validateHeaders(requestedHeaders: string[], config: CorsConfig, context: CorsContext): boolean {
    const normalizedAllowed = config.allowedHeaders.map(h => h.toLowerCase());
    
    for (const header of requestedHeaders) {
      const normalizedHeader = header.toLowerCase();
      
      // Skip simple headers that are always allowed
      if (['accept', 'accept-language', 'content-language', 'content-type'].includes(normalizedHeader)) {
        continue;
      }

      if (!normalizedAllowed.includes(normalizedHeader)) {
        this.recordViolation({
          type: CorsViolationType.FORBIDDEN_HEADER,
          origin: context.origin,
          method: context.method,
          reason: `Header ${header} not allowed`,
          severity: 'medium',
          blocked: true
        });
        return false;
      }
    }

    return true;
  }

  private recordViolation(violation: CorsViolation): void {
    this.violations.push(violation);

    if (violation.blocked) {
      this.logger.warn('CORS violation detected', new Error('CORS policy violation'), {
        type: violation.type,
        origin: violation.origin,
        method: violation.method,
        reason: violation.reason,
        severity: violation.severity
      });

      if (this.tracing) {
        this.tracing.addEvent('cors_violation', {
          'cors.violation_type': violation.type,
          'cors.origin': violation.origin,
          'cors.method': violation.method,
          'cors.severity': violation.severity,
        });
      }
    }
  }

  handleCors(config: CorsConfig, context: CorsContext): CorsResult {
    const origin = context.origin;
    const method = context.method;
    const headers: Record<string, string> = {};

    // Handle preflight requests
    if (method === 'OPTIONS' && config.enablePreflight) {
      const requestMethod = context.headers['access-control-request-method'];
      const requestHeaders = context.headers['access-control-request-headers'];

      if (!requestMethod) {
        return {
          allowed: false,
          headers,
          status: 400,
          reason: 'Missing Access-Control-Request-Method header'
        };
      }

      // Validate preflight request
      if (!this.validateOrigin(origin, config, context)) {
        return { allowed: false, headers, status: 403, reason: 'Origin not allowed' };
      }

      if (!this.validateMethod(requestMethod, config, context)) {
        return { allowed: false, headers, status: 405, reason: 'Method not allowed' };
      }

      if (requestHeaders) {
        const headerList = requestHeaders.split(',').map(h => h.trim());
        if (!this.validateHeaders(headerList, config, context)) {
          return { allowed: false, headers, status: 403, reason: 'Headers not allowed' };
        }
      }

      // Set preflight response headers
      if (origin && config.origins !== '*') {
        headers['Access-Control-Allow-Origin'] = origin;
      } else if (config.origins === '*') {
        headers['Access-Control-Allow-Origin'] = '*';
      }

      headers['Access-Control-Allow-Methods'] = config.methods.join(', ');
      headers['Access-Control-Allow-Headers'] = config.allowedHeaders.join(', ');

      if (config.credentials) {
        headers['Access-Control-Allow-Credentials'] = 'true';
      }

      if (config.maxAge > 0) {
        headers['Access-Control-Max-Age'] = config.maxAge.toString();
      }

      if (config.allowPrivateNetwork) {
        headers['Access-Control-Allow-Private-Network'] = 'true';
      }

      return {
        allowed: true,
        headers,
        status: config.optionsSuccessStatus
      };
    }

    // Handle actual requests
    if (!this.validateOrigin(origin, config, context)) {
      return { allowed: false, headers, status: 403, reason: 'Origin not allowed' };
    }

    if (!this.validateMethod(method, config, context)) {
      return { allowed: false, headers, status: 405, reason: 'Method not allowed' };
    }

    // Set response headers for actual requests
    if (origin && config.origins !== '*') {
      headers['Access-Control-Allow-Origin'] = origin;
    } else if (config.origins === '*') {
      headers['Access-Control-Allow-Origin'] = '*';
    }

    if (config.credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    if (config.exposedHeaders.length > 0) {
      headers['Access-Control-Expose-Headers'] = config.exposedHeaders.join(', ');
    }

    // Log successful CORS validation if enabled
    if (config.logging) {
      this.logger.debug('CORS request validated', {
        origin,
        method,
        allowed: true
      });
    }

    return { allowed: true, headers };
  }

  getViolations(): CorsViolation[] {
    return [...this.violations];
  }

  clearViolations(): void {
    this.violations = [];
  }

  // Get statistics for monitoring
  getStats(): { totalViolations: number; violationsByType: Record<string, number> } {
    const violationsByType: Record<string, number> = {};
    
    for (const violation of this.violations) {
      violationsByType[violation.type] = (violationsByType[violation.type] || 0) + 1;
    }

    return {
      totalViolations: this.violations.length,
      violationsByType
    };
  }
}

// Middleware factory for HTTP frameworks
export function createCorsMiddleware(
  corsManager: CorsManager,
  config: CorsConfig
) {
  return async (c: any, next: any) => {
    const origin = c.req.header('origin') || '';
    const method = c.req.method;
    const headers = Object.fromEntries(
      Object.entries(c.req.headers || {}).map(([k, v]) => [k.toLowerCase(), v])
    );

    const context: CorsContext = {
      origin,
      method,
      headers,
      userAgent: c.req.header('user-agent') || '',
      referer: c.req.header('referer'),
      nestId: c.get('nestId'),
      userId: c.get('userId'),
      requestId: c.get('requestId') || 'unknown'
    };

    const result = corsManager.handleCors(config, context);

    // Set CORS headers
    for (const [key, value] of Object.entries(result.headers)) {
      c.res.headers.set(key, value);
    }

    if (!result.allowed) {
      return c.json({
        error: 'CORS policy violation',
        code: 'CORS_VIOLATION',
        reason: result.reason
      }, result.status || 403);
    }

    // For preflight requests, return immediately
    if (method === 'OPTIONS' && result.status) {
      return c.text('', result.status);
    }

    return next();
  };
}

// Factory function
export function createCorsManager(
  serviceName: string,
  tracing?: GuardAntTracing
): CorsManager {
  return new CorsManager(serviceName, tracing);
}

export { CorsConfigs, CorsViolationType };