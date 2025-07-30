"use strict";
/**
 * API versioning system for GuardAnt services
 * Supports multiple versioning strategies and backward compatibility
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiVersionManager = exports.VersioningConfigs = exports.ApiVersions = exports.MigrationType = exports.VersionStatus = exports.VersioningStrategy = void 0;
exports.createVersioningMiddleware = createVersioningMiddleware;
exports.createApiVersionManager = createApiVersionManager;
const logger_1 = require("./logger");
var VersioningStrategy;
(function (VersioningStrategy) {
    VersioningStrategy["HEADER"] = "header";
    VersioningStrategy["URL_PATH"] = "url_path";
    VersioningStrategy["QUERY_PARAM"] = "query_param";
    VersioningStrategy["ACCEPT_HEADER"] = "accept_header";
    VersioningStrategy["SUBDOMAIN"] = "subdomain"; // v1.api.guardant.me
})(VersioningStrategy || (exports.VersioningStrategy = VersioningStrategy = {}));
var VersionStatus;
(function (VersionStatus) {
    VersionStatus["DEVELOPMENT"] = "development";
    VersionStatus["STABLE"] = "stable";
    VersionStatus["DEPRECATED"] = "deprecated";
    VersionStatus["SUNSET"] = "sunset";
})(VersionStatus || (exports.VersionStatus = VersionStatus = {}));
var MigrationType;
(function (MigrationType) {
    MigrationType["FIELD_RENAME"] = "field_rename";
    MigrationType["FIELD_REMOVE"] = "field_remove";
    MigrationType["FIELD_ADD"] = "field_add";
    MigrationType["TYPE_CHANGE"] = "type_change";
    MigrationType["STRUCTURE_CHANGE"] = "structure_change";
    MigrationType["VALIDATION_CHANGE"] = "validation_change";
})(MigrationType || (exports.MigrationType = MigrationType = {}));
// Predefined API versions for GuardAnt services
exports.ApiVersions = {
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
                transformer: (monitoring) => ({
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
                transformer: (token) => {
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
                transformer: (data) => {
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
exports.VersioningConfigs = {
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
class ApiVersionManager {
    constructor(serviceName, versions = exports.ApiVersions, tracing) {
        this.serviceName = serviceName;
        this.versions = versions;
        this.versionUsage = new Map();
        this.logger = (0, logger_1.createLogger)(`${serviceName}-api-versioning`);
        this.tracing = tracing;
    }
    parseVersionFromHeader(headerValue) {
        if (!headerValue)
            return null;
        // Support formats: v1.0, 1.0, v1, 1
        const match = headerValue.match(/v?(\d+(?:\.\d+)?)/);
        return match ? `v${match[1]}` : null;
    }
    parseVersionFromPath(path) {
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
    parseVersionFromAcceptHeader(acceptHeader, pattern) {
        if (!acceptHeader || !pattern)
            return null;
        const match = acceptHeader.match(pattern);
        return match ? `v${match[1]}` : null;
    }
    findBestVersion(requestedVersion, supportedVersions) {
        // Exact match
        if (supportedVersions.includes(requestedVersion)) {
            return requestedVersion;
        }
        // Try to find compatible version (for minor version negotiation)
        const [, major, minor] = requestedVersion.match(/v(\d+)(?:\.(\d+))?/) || [];
        if (!major)
            return null;
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
    buildMigrationPath(fromVersion, toVersion) {
        const migrations = [];
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
    negotiateVersion(config, context) {
        const warnings = [];
        const errors = [];
        let requestedVersion = null;
        let cleanPath = context.path;
        // Extract version based on strategy
        switch (config.strategy) {
            case VersioningStrategy.HEADER:
                requestedVersion = this.parseVersionFromHeader(context.headers[config.headerName?.toLowerCase() || 'x-api-version']);
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
                requestedVersion = this.parseVersionFromAcceptHeader(context.headers['accept'] || '', config.acceptHeaderPattern);
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
        let deprecationWarning;
        if (versionInfo) {
            if (versionInfo.status === VersionStatus.DEPRECATED) {
                isDeprecated = true;
                deprecationWarning = `API version ${resolvedVersion} is deprecated`;
                if (versionInfo.sunsetDate) {
                    deprecationWarning += ` and will be removed on ${versionInfo.sunsetDate.toISOString().split('T')[0]}`;
                }
                warnings.push(deprecationWarning);
            }
            else if (versionInfo.status === VersionStatus.SUNSET) {
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
    buildVersionContext(version, strategy, deprecated) {
        const versionInfo = this.versions[version];
        return {
            resolvedVersion: version,
            strategy,
            isDeprecated: deprecated,
            migrationPath: versionInfo?.migrations || []
        };
    }
    recordVersionUsage(version) {
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
    migrateData(data, fromVersion, toVersion) {
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
            }
            catch (error) {
                this.logger.error('Data migration failed', error, {
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
    getVersionInfo(version) {
        return this.versions[version] || null;
    }
    getSupportedVersions() {
        return Object.keys(this.versions);
    }
    getVersionUsageStats() {
        return Object.fromEntries(this.versionUsage);
    }
    // Health check for versioning system
    getHealthStatus() {
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
exports.ApiVersionManager = ApiVersionManager;
// Middleware factory for HTTP frameworks
function createVersioningMiddleware(versionManager, config) {
    return async (c, next) => {
        const context = {
            headers: Object.fromEntries(Object.entries(c.req.headers || {}).map(([k, v]) => [k.toLowerCase(), v])),
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
function createApiVersionManager(serviceName, versions, tracing) {
    return new ApiVersionManager(serviceName, versions, tracing);
}
//# sourceMappingURL=api-versioning.js.map