/**
 * Secret management system for GuardAnt services with HashiCorp Vault integration
 * Provides secure secret storage, rotation, encryption, and access control
 */
import type { GuardAntTracing } from './tracing';
export interface SecretConfig {
    vaultUrl?: string;
    vaultToken?: string;
    vaultNamespace?: string;
    mountPath?: string;
    encryptionKey?: string;
    rotationInterval?: number;
    cacheTimeout?: number;
    retryAttempts?: number;
    enableCache?: boolean;
    enableRotation?: boolean;
    enableEncryption?: boolean;
}
export interface SecretMetadata {
    version: number;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
    rotatesAt?: Date;
    tags: string[];
    description?: string;
    owner: string;
    accessPolicy?: string;
    encrypted: boolean;
}
export interface SecretData {
    key: string;
    value: string | Record<string, any>;
    metadata: SecretMetadata;
}
export interface SecretRotationPolicy {
    enabled: boolean;
    interval: number;
    maxAge: number;
    strategy: RotationStrategy;
    notifyBefore: number;
}
export declare enum RotationStrategy {
    AUTOMATIC = "automatic",
    MANUAL = "manual",
    ON_ACCESS = "on_access",
    SCHEDULED = "scheduled"
}
export interface SecretAccessLog {
    secretKey: string;
    action: SecretAction;
    user: string;
    service: string;
    timestamp: Date;
    success: boolean;
    metadata?: Record<string, any>;
}
export declare enum SecretAction {
    READ = "read",
    WRITE = "write",
    DELETE = "delete",
    ROTATE = "rotate",
    ENCRYPT = "encrypt",
    DECRYPT = "decrypt"
}
export interface SecretProvider {
    name: string;
    read(key: string): Promise<SecretData | null>;
    write(key: string, value: any, metadata?: Partial<SecretMetadata>): Promise<void>;
    delete(key: string): Promise<boolean>;
    list(prefix?: string): Promise<string[]>;
    rotate(key: string): Promise<string>;
    healthCheck(): Promise<boolean>;
}
export declare class VaultSecretProvider implements SecretProvider {
    private config;
    private serviceName;
    name: string;
    private logger;
    private baseUrl;
    private token;
    private namespace?;
    private mountPath;
    constructor(config: SecretConfig, serviceName: string);
    private makeRequest;
    read(key: string): Promise<SecretData | null>;
    write(key: string, value: any, metadata?: Partial<SecretMetadata>): Promise<void>;
    delete(key: string): Promise<boolean>;
    list(prefix?: string): Promise<string[]>;
    rotate(key: string): Promise<string>;
    healthCheck(): Promise<boolean>;
    private generateSecretValue;
}
export declare class FileSecretProvider implements SecretProvider {
    private config;
    private serviceName;
    name: string;
    private logger;
    private secretsPath;
    private secrets;
    constructor(config: SecretConfig, serviceName: string);
    private loadSecrets;
    private saveSecrets;
    read(key: string): Promise<SecretData | null>;
    write(key: string, value: any, metadata?: Partial<SecretMetadata>): Promise<void>;
    delete(key: string): Promise<boolean>;
    list(prefix?: string): Promise<string[]>;
    rotate(key: string): Promise<string>;
    healthCheck(): Promise<boolean>;
    private generateSecretValue;
}
export declare class EnvironmentSecretProvider implements SecretProvider {
    private serviceName;
    name: string;
    private logger;
    constructor(serviceName: string);
    read(key: string): Promise<SecretData | null>;
    write(key: string, value: any): Promise<void>;
    delete(key: string): Promise<boolean>;
    list(prefix?: string): Promise<string[]>;
    rotate(key: string): Promise<string>;
    healthCheck(): Promise<boolean>;
}
export declare class SecretManager {
    private serviceName;
    private config;
    private logger;
    private tracing?;
    private providers;
    private cache;
    private accessLogs;
    private rotationPolicies;
    private rotationTimers;
    constructor(serviceName: string, config?: SecretConfig, tracing?: GuardAntTracing);
    private setupProviders;
    getSecret(key: string, user?: string): Promise<string | null>;
    setSecret(key: string, value: string | Record<string, any>, user?: string, metadata?: Partial<SecretMetadata>): Promise<boolean>;
    deleteSecret(key: string, user?: string): Promise<boolean>;
    rotateSecret(key: string, user?: string): Promise<string | null>;
    setRotationPolicy(key: string, policy: SecretRotationPolicy): void;
    private scheduleRotation;
    private startRotationScheduler;
    private checkRotationNeeded;
    private extractValue;
    private encrypt;
    private decrypt;
    private logAccess;
    getAccessLogs(key?: string, limit?: number): SecretAccessLog[];
    getHealthStatus(): Promise<{
        healthy: boolean;
        details: any;
    }>;
    shutdown(): Promise<void>;
}
export declare function createSecretManager(serviceName: string, config?: SecretConfig, tracing?: GuardAntTracing): SecretManager;
export declare function getDatabaseUrl(secretManager: SecretManager): Promise<string | null>;
export declare function getRedisUrl(secretManager: SecretManager): Promise<string | null>;
//# sourceMappingURL=secret-management.d.ts.map