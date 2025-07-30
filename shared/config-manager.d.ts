/**
 * Configuration manager for GuardAnt services
 * Integrates with SecretManager to retrieve secrets from Vault
 */
import { SecretManager } from './secret-management';
export interface ServiceConfig {
    appName: string;
    nodeEnv: string;
    port: number;
    jwtSecret?: string;
    refreshSecret?: string;
    sessionSecret?: string;
    encryptionKey?: string;
    postgresUrl?: string;
    redisUrl?: string;
    rabbitmqUrl?: string;
    golemEnabled: boolean;
    golemChainId?: number;
    golemHttpUrl?: string;
    golemWsUrl?: string;
    golemPrivateKey?: string;
    golemWalletAddress?: string;
    emailEnabled: boolean;
    sendgridApiKey?: string;
    emailFrom?: string;
    monitoringEnabled: boolean;
    sentryDsn?: string;
    prometheusEnabled: boolean;
    jaegerEndpoint?: string;
    enableGolemBaseL3: boolean;
    enableAnalytics: boolean;
    enableBilling: boolean;
    enableMfa: boolean;
    vaultEnabled: boolean;
    vaultAddr?: string;
    vaultToken?: string;
    vaultNamespace?: string;
    vaultMountPath?: string;
}
export declare class ConfigManager {
    private serviceName;
    private logger;
    private config;
    private secretManager?;
    private initialized;
    constructor(serviceName: string);
    initialize(): Promise<void>;
    private loadEnvironmentConfig;
    private loadSecretsFromVault;
    get<K extends keyof ServiceConfig>(key: K): ServiceConfig[K] | undefined;
    getRequired<K extends keyof ServiceConfig>(key: K): ServiceConfig[K];
    getAll(): Partial<ServiceConfig>;
    getSafeConfig(): Record<string, any>;
    rotateSecrets(): Promise<void>;
    getSecretManager(): Promise<SecretManager | undefined>;
    shutdown(): Promise<void>;
}
export declare function getConfig(serviceName: string): Promise<ConfigManager>;
export declare function getServiceConfig(serviceName: string): Promise<ServiceConfig>;
export declare function shutdownAllConfigs(): Promise<void>;
//# sourceMappingURL=config-manager.d.ts.map