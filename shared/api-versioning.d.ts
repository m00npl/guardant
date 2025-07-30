/**
 * API versioning system for GuardAnt services
 * Supports multiple versioning strategies and backward compatibility
 */
import type { GuardAntTracing } from './tracing';
export declare enum VersioningStrategy {
    HEADER = "header",// X-API-Version header
    URL_PATH = "url_path",// /v1/endpoint
    QUERY_PARAM = "query_param",// ?version=1.0
    ACCEPT_HEADER = "accept_header",// Accept: application/vnd.guardant.v1+json
    SUBDOMAIN = "subdomain"
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
export declare enum VersionStatus {
    DEVELOPMENT = "development",
    STABLE = "stable",
    DEPRECATED = "deprecated",
    SUNSET = "sunset"
}
export interface VersionMigration {
    from: string;
    to: string;
    field: string;
    type: MigrationType;
    transformer: (value: any) => any;
    description: string;
}
export declare enum MigrationType {
    FIELD_RENAME = "field_rename",
    FIELD_REMOVE = "field_remove",
    FIELD_ADD = "field_add",
    TYPE_CHANGE = "type_change",
    STRUCTURE_CHANGE = "structure_change",
    VALIDATION_CHANGE = "validation_change"
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
export declare const ApiVersions: Record<string, ApiVersion>;
export declare const VersioningConfigs: {
    HEADER_BASED: {
        strategy: VersioningStrategy;
        defaultVersion: string;
        supportedVersions: string[];
        headerName: string;
        enforceVersioning: boolean;
        allowMinorVersionNegotiation: boolean;
        logVersionUsage: boolean;
    };
    PATH_BASED: {
        strategy: VersioningStrategy;
        defaultVersion: string;
        supportedVersions: string[];
        enforceVersioning: boolean;
        allowMinorVersionNegotiation: boolean;
        logVersionUsage: boolean;
    };
    CONTENT_NEGOTIATION: {
        strategy: VersioningStrategy;
        defaultVersion: string;
        supportedVersions: string[];
        acceptHeaderPattern: RegExp;
        enforceVersioning: boolean;
        allowMinorVersionNegotiation: boolean;
        logVersionUsage: boolean;
    };
    DEVELOPMENT: {
        strategy: VersioningStrategy;
        defaultVersion: string;
        supportedVersions: string[];
        headerName: string;
        enforceVersioning: boolean;
        allowMinorVersionNegotiation: boolean;
        logVersionUsage: boolean;
    };
};
export declare class ApiVersionManager {
    private serviceName;
    private versions;
    private logger;
    private tracing?;
    private versionUsage;
    constructor(serviceName: string, versions?: Record<string, ApiVersion>, tracing?: GuardAntTracing);
    private parseVersionFromHeader;
    private parseVersionFromPath;
    private parseVersionFromAcceptHeader;
    private findBestVersion;
    private buildMigrationPath;
    negotiateVersion(config: VersioningConfig, context: {
        headers: Record<string, string>;
        path: string;
        query: Record<string, string>;
    }): VersionNegotiationResult;
    private buildVersionContext;
    private recordVersionUsage;
    migrateData(data: any, fromVersion: string, toVersion: string): any;
    getVersionInfo(version: string): ApiVersion | null;
    getSupportedVersions(): string[];
    getVersionUsageStats(): Record<string, number>;
    getHealthStatus(): {
        healthy: boolean;
        details: any;
    };
}
export declare function createVersioningMiddleware(versionManager: ApiVersionManager, config: VersioningConfig): (c: any, next: any) => Promise<any>;
export declare function createApiVersionManager(serviceName: string, versions?: Record<string, ApiVersion>, tracing?: GuardAntTracing): ApiVersionManager;
export { VersioningStrategy, VersionStatus, MigrationType, VersioningConfigs, ApiVersions };
//# sourceMappingURL=api-versioning.d.ts.map