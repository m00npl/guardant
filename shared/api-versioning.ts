/**
 * API versioning system for GuardAnt services
 * Supports multiple versioning strategies and backward compatibility
 */

import { createLogger } from './logger';
import { ValidationError, ErrorCategory, ErrorSeverity } from './error-handling';
import type { GuardAntTracing } from './tracing';

export enum VersioningStrategy {
  HEADER = 'header',           // X-API-Version header
  URL_PATH = 'url_path',       // /v1/endpoint
  QUERY_PARAM = 'query_param', // ?version=1.0
  ACCEPT_HEADER = 'accept_header', // Accept: application/vnd.guardant.v1+json
  SUBDOMAIN = 'subdomain'      // v1.api.guardant.me
}

export interface ApiVersion {
  version: string;
  name: string;
  releaseDate: Date;
  deprecationDate?: Date;
  sunsetDate?: Date;
  status: VersionStatus;
  description: string;
  breaking: string[];
  features: string[];
  migrations?: VersionMigration[];
}

export enum VersionStatus {
  DEVELOPMENT = 'development',
  STABLE = 'stable',
  DEPRECATED = 'deprecated',
  SUNSET = 'sunset'
}

export interface VersionMigration {
  from: string;
  to: string;
  field: string;
  type: MigrationType;
  transformer: (value: any) => any;
  description: string;
}

export enum MigrationType {
  FIELD_RENAME = 'field_rename',
  FIELD_REMOVE = 'field_remove',
  FIELD_ADD = 'field_add',
  TYPE_CHANGE = 'type_change',
  STRUCTURE_CHANGE = 'structure_change',
  VALIDATION_CHANGE = 'validation_change'
}

export interface VersioningConfig {
  strategy: VersioningStrategy;
  defaultVersion: string;
  supportedVersions: string[];
  headerName?: string;
  queryParamName?: string;
  acceptHeaderPattern?: RegExp;
  enforceVersioning: boolean;
  allowMinorVersionNegotiation: boolean;
  logVersionUsage: boolean;
}

export interface VersionContext {
  requestedVersion?: string;
  resolvedVersion: string;
  strategy: VersioningStrategy;
  isDeprecated: boolean;
  deprecationWarning?: string;
  migrationPath?: VersionMigration[];
}

export interface VersionNegotiationResult {
  version: string;
  context: VersionContext;
  warnings: string[];
  errors: string[];
}

// Predefined API versions for GuardAnt services
export const ApiVersions: Record<string, ApiVersion> = {
  'v1.0': {
    version: 'v1.0',
    name: 'Initial Release',
    releaseDate: new Date('2024-01-01'),
    status: VersionStatus.STABLE,
    description: 'Initial stable release of GuardAnt API',
    breaking: [],
    features: [
      'Basic nest management',
      'Service monitoring',
      'User authentication',
      'Status page generation'
    ]
  },
  'v1.1': {
    version: 'v1.1',
    name: 'Enhanced Monitoring',
    releaseDate: new Date('2024-03-01'),
    status: VersionStatus.STABLE,
    description: 'Enhanced monitoring with multi-region support',
    breaking: [],
    features: [
      'Multi-region monitoring',
      'Advanced metrics',
      'Custom notification channels',
      'Enhanced widget customization'
    ],
    migrations: [
      {
        from: 'v1.0',
        to: 'v1.1',
        field: 'monitoring',
        type: MigrationType.STRUCTURE_CHANGE,
        transformer: (monitoring: any) => ({
          ...monitoring,
          regions: monitoring.regions || ['us-east-1']
        }),
        description: 'Add default region if not specified'
      }
    ]
  },
  'v1.2': {
    version: 'v1.2',
    name: 'Security & Performance',
    releaseDate: new Date('2024-06-01'),
    status: VersionStatus.STABLE,
    description: 'Security enhancements and performance improvements',
    breaking: [
      'Authentication token format changed',
      'Rate limiting headers modified'
    ],
    features: [
      'Enhanced rate limiting',
      'Input sanitization',
      'Advanced CORS policies',
      'Circuit breaker patterns'
    ],
    migrations: [
      {
        from: 'v1.1',
        to: 'v1.2',
        field: 'auth.tokenFormat',
        type: MigrationType.TYPE_CHANGE,
        transformer: (token: string) => {
          // Convert old JWT format to new format
          return token.startsWith('jwt_') ? token : `jwt_${token}`;
        },
        description: 'Migrate authentication tokens to new format'
      }
    ]
  },
  'v2.0': {
    version: 'v2.0',
    name: 'Multi-tenant Architecture',
    releaseDate: new Date('2024-09-01'),
    deprecationDate: new Date('2025-09-01'),
    status: VersionStatus.DEVELOPMENT,
    description: 'Complete rewrite with multi-tenant architecture',
    breaking: [
      'API endpoints restructured',
      'Authentication system changed',
      'Response format updated'
    ],
    features: [
      'Multi-tenant isolation',
      'Advanced error handling',
      'Distributed tracing',
      'Enhanced monitoring'
    ],
    migrations: [
      {
        from: 'v1.2',
        to: 'v2.0',
        field: 'endpoints',
        type: MigrationType.STRUCTURE_CHANGE,
        transformer: (data: any) => {
          // Migrate v1.x endpoints to v2.0 structure
          return {
            nest: data.tenant || data.nest,
            services: data.services,
            monitoring: {
              ...data.monitoring,
              enhanced: true
            }
          };
        },
        description: 'Migrate to new multi-tenant structure'
      }
    ]
  }
};

// Predefined versioning configurations
export const VersioningConfigs = {
  // Header-based versioning (recommended)
  HEADER_BASED: {
    strategy: VersioningStrategy.HEADER,
    defaultVersion: 'v1.2',
    supportedVersions: ['v1.0', 'v1.1', 'v1.2', 'v2.0'],
    headerName: 'X-API-Version',
    enforceVersioning: true,
    allowMinorVersionNegotiation: true,
    logVersionUsage: true
  },

  // URL path versioning
  PATH_BASED: {
    strategy: VersioningStrategy.URL_PATH,
    defaultVersion: 'v1.2',
    supportedVersions: ['v1', 'v2'],
    enforceVersioning: true,
    allowMinorVersionNegotiation: false,
    logVersionUsage: true
  },

  // Accept header versioning
  CONTENT_NEGOTIATION: {
    strategy: VersioningStrategy.ACCEPT_HEADER,
    defaultVersion: 'v1.2',
    supportedVersions: ['v1.0', 'v1.1', 'v1.2', 'v2.0'],
    acceptHeaderPattern: /application\/vnd\.guardant\.v([\d.]+)\+json/,
    enforceVersioning: false,
    allowMinorVersionNegotiation: true,
    logVersionUsage: true
  },

  // Development mode - lenient
  DEVELOPMENT: {
    strategy: VersioningStrategy.HEADER,
    defaultVersion: 'v2.0',
    supportedVersions: ['v1.0', 'v1.1', 'v1.2', 'v2.0'],
    headerName: 'X-API-Version',
    enforceVersioning: false,
    allowMinorVersionNegotiation: true,
    logVersionUsage: false
  }
};

export class ApiVersionManager {
  private logger;
  private tracing?: GuardAntTracing;
  private versionUsage = new Map<string, number>();

  constructor(
    private serviceName: string,
    private versions: Record<string, ApiVersion> = ApiVersions,
    tracing?: GuardAntTracing
  ) {
    this.logger = createLogger(`${serviceName}-api-versioning`);
    this.tracing = tracing;
  }

  private parseVersionFromHeader(headerValue: string): string | null {
    if (!headerValue) return null;
    
    // Support formats: v1.0, 1.0, v1, 1
    const match = headerValue.match(/v?(\d+(?:\.\d+)?)/);
    return match ? `v${match[1]}` : null;
  }

  private parseVersionFromPath(path: string): { version: string | null; cleanPath: string } {
    // Match /v1/endpoint or /v1.0/endpoint
    const match = path.match(/^\/v(\d+(?:\.\d+)?)(?:\/(.*))?$/);
    
    if (match) {
      return {
        version: `v${match[1]}`,
        cleanPath: `/${match[2] || ''}`
      };
    }

    return { version: null, cleanPath: path };
  }

  private parseVersionFromAcceptHeader(acceptHeader: string, pattern: RegExp): string | null {
    if (!acceptHeader || !pattern) return null;
    
    const match = acceptHeader.match(pattern);
    return match ? `v${match[1]}` : null;
  }

  private findBestVersion(requestedVersion: string, supportedVersions: string[]): string | null {
    // Exact match
    if (supportedVersions.includes(requestedVersion)) {
      return requestedVersion;
    }

    // Try to find compatible version (for minor version negotiation)
    const [, major, minor] = requestedVersion.match(/v(\d+)(?:\.(\d+))?/) || [];
    if (!major) return null;

    // Find highest minor version for the same major version
    const compatibleVersions = supportedVersions
      .filter(v => v.startsWith(`v${major}.`))
      .sort((a, b) => {
        const aMinor = parseFloat(a.split('.')[1] || '0');
        const bMinor = parseFloat(b.split('.')[1] || '0');
        return bMinor - aMinor;
      });

    return compatibleVersions[0] || null;
  }

  private buildMigrationPath(fromVersion: string, toVersion: string): VersionMigration[] {
    const migrations: VersionMigration[] = [];
    
    // Find all versions between from and to
    const allVersions = Object.keys(this.versions).sort();
    const fromIndex = allVersions.indexOf(fromVersion);
    const toIndex = allVersions.indexOf(toVersion);
    
    if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
      return migrations;
    }

    // Collect migrations for each version step
    for (let i = fromIndex; i < toIndex; i++) {
      const version = this.versions[allVersions[i + 1]];
      if (version.migrations) {
        migrations.push(...version.migrations.filter(m => m.from === allVersions[i]));
      }
    }

    return migrations;
  }

  negotiateVersion(
    config: VersioningConfig,
    context: {
      headers: Record<string, string>;
      path: string;
      query: Record<string, string>;
    }
  ): VersionNegotiationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    let requestedVersion: string | null = null;
    let cleanPath = context.path;

    // Extract version based on strategy
    switch (config.strategy) {
      case VersioningStrategy.HEADER:
        requestedVersion = this.parseVersionFromHeader(
          context.headers[config.headerName?.toLowerCase() || 'x-api-version']
        );
        break;

      case VersioningStrategy.URL_PATH:
        const pathResult = this.parseVersionFromPath(context.path);
        requestedVersion = pathResult.version;
        cleanPath = pathResult.cleanPath;
        break;

      case VersioningStrategy.QUERY_PARAM:
        const paramName = config.queryParamName || 'version';
        requestedVersion = this.parseVersionFromHeader(context.query[paramName]);
        break;

      case VersioningStrategy.ACCEPT_HEADER:
        requestedVersion = this.parseVersionFromAcceptHeader(
          context.headers['accept'] || '',
          config.acceptHeaderPattern!
        );
        break;

      case VersioningStrategy.SUBDOMAIN:
        // Extract version from subdomain (e.g., v1.api.guardant.me)
        const host = context.headers['host'] || '';
        const match = host.match(/^v(\d+(?:\.\d+)?)\./);
        requestedVersion = match ? `v${match[1]}` : null;
        break;
    }

    // Use default version if none requested
    if (!requestedVersion) {
      if (config.enforceVersioning) {
        errors.push('API version is required but not provided');
        return {
          version: config.defaultVersion,
          context: this.buildVersionContext(config.defaultVersion, config.strategy, true),
          warnings,
          errors
        };
      }
      requestedVersion = config.defaultVersion;
    }

    // Find best matching version
    let resolvedVersion = requestedVersion;
    
    if (config.allowMinorVersionNegotiation) {
      const bestVersion = this.findBestVersion(requestedVersion, config.supportedVersions);
      if (bestVersion && bestVersion !== requestedVersion) {
        resolvedVersion = bestVersion;
        warnings.push(`Requested version ${requestedVersion} negotiated to ${resolvedVersion}`);
      }
    }

    // Validate version is supported
    if (!config.supportedVersions.includes(resolvedVersion)) {
      errors.push(`API version ${resolvedVersion} is not supported. Supported versions: ${config.supportedVersions.join(', ')}`);
      resolvedVersion = config.defaultVersion;
    }

    // Check version status
    const versionInfo = this.versions[resolvedVersion];
    let isDeprecated = false;
    let deprecationWarning: string | undefined;

    if (versionInfo) {
      if (versionInfo.status === VersionStatus.DEPRECATED) {
        isDeprecated = true;
        deprecationWarning = `API version ${resolvedVersion} is deprecated`;
        
        if (versionInfo.sunsetDate) {
          deprecationWarning += ` and will be removed on ${versionInfo.sunsetDate.toISOString().split('T')[0]}`;
        }
        
        warnings.push(deprecationWarning);
      } else if (versionInfo.status === VersionStatus.SUNSET) {
        errors.push(`API version ${resolvedVersion} has been sunset and is no longer available`);
      }
    }

    // Log version usage
    if (config.logVersionUsage) {
      this.recordVersionUsage(resolvedVersion);
    }

    const versionContext = this.buildVersionContext(resolvedVersion, config.strategy, isDeprecated);
    versionContext.requestedVersion = requestedVersion;
    versionContext.deprecationWarning = deprecationWarning;

    return {
      version: resolvedVersion,
      context: versionContext,
      warnings,
      errors
    };
  }

  private buildVersionContext(
    version: string,
    strategy: VersioningStrategy,
    deprecated: boolean
  ): VersionContext {
    const versionInfo = this.versions[version];
    
    return {
      resolvedVersion: version,
      strategy,
      isDeprecated: deprecated,
      migrationPath: versionInfo?.migrations || []
    };
  }

  private recordVersionUsage(version: string): void {
    const count = this.versionUsage.get(version) || 0;
    this.versionUsage.set(version, count + 1);

    this.logger.debug('API version used', {
      version,
      totalUsage: count + 1
    });

    if (this.tracing) {
      this.tracing.addEvent('api_version_used', {
        'api.version': version,
        'api.usage_count': (count + 1).toString(),
      });
    }
  }

  migrateData(data: any, fromVersion: string, toVersion: string): any {
    if (fromVersion === toVersion) {
      return data;
    }

    const migrationPath = this.buildMigrationPath(fromVersion, toVersion);
    let migratedData = JSON.parse(JSON.stringify(data)); // Deep clone

    for (const migration of migrationPath) {
      try {
        migratedData = migration.transformer(migratedData);
        
        this.logger.debug('Data migration applied', {
          migration: migration.type,
          field: migration.field,
          from: migration.from,
          to: migration.to
        });
      } catch (error) {
        this.logger.error('Data migration failed', error as Error, {
          migration: migration.type,
          field: migration.field,
          from: migration.from,
          to: migration.to
        });
        
        // Continue with other migrations
      }
    }

    return migratedData;
  }

  getVersionInfo(version: string): ApiVersion | null {
    return this.versions[version] || null;
  }

  getSupportedVersions(): string[] {
    return Object.keys(this.versions);
  }

  getVersionUsageStats(): Record<string, number> {
    return Object.fromEntries(this.versionUsage);
  }

  // Health check for versioning system
  getHealthStatus(): { healthy: boolean; details: any } {
    const now = new Date();
    const supportedVersions = Object.entries(this.versions)
      .filter(([, info]) => info.status !== VersionStatus.SUNSET)
      .map(([version]) => version);

    const deprecatedVersions = Object.entries(this.versions)
      .filter(([, info]) => info.status === VersionStatus.DEPRECATED)
      .map(([version, info]) => ({
        version,
        sunsetDate: info.sunsetDate
      }));

    return {
      healthy: supportedVersions.length > 0,
      details: {
        supportedVersions,
        deprecatedVersions,
        totalVersions: Object.keys(this.versions).length,
        usageStats: this.getVersionUsageStats()
      }
    };
  }
}

// Middleware factory for HTTP frameworks
export function createVersioningMiddleware(
  versionManager: ApiVersionManager,
  config: VersioningConfig
) {
  return async (c: any, next: any) => {
    const context = {
      headers: Object.fromEntries(
        Object.entries(c.req.headers || {}).map(([k, v]) => [k.toLowerCase(), v])
      ),
      path: c.req.path,
      query: c.req.query() || {}
    };

    const result = versionManager.negotiateVersion(config, context);

    // If there are errors, return early
    if (result.errors.length > 0) {
      return c.json({
        error: 'API version negotiation failed',
        code: 'VERSION_ERROR',
        details: result.errors
      }, 400);
    }

    // Set version context
    c.set('apiVersion', result.version);
    c.set('versionContext', result.context);

    // Set response headers
    c.res.headers.set('X-API-Version', result.version);
    
    if (result.warnings.length > 0) {
      c.res.headers.set('X-API-Warnings', result.warnings.join('; '));
    }

    // Add deprecation warning header if applicable
    if (result.context.isDeprecated && result.context.deprecationWarning) {
      c.res.headers.set('X-API-Deprecation-Warning', result.context.deprecationWarning);
    }

    return next();
  };
}

// Factory function
export function createApiVersionManager(
  serviceName: string,
  versions?: Record<string, ApiVersion>,
  tracing?: GuardAntTracing
): ApiVersionManager {
  return new ApiVersionManager(serviceName, versions, tracing);
}

export { VersioningStrategy, VersionStatus, MigrationType, VersioningConfigs, ApiVersions };