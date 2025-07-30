"use strict";
/**
 * Configuration manager for GuardAnt services
 * Integrates with SecretManager to retrieve secrets from Vault
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
exports.getConfig = getConfig;
exports.getServiceConfig = getServiceConfig;
exports.shutdownAllConfigs = shutdownAllConfigs;
const secret_management_1 = require("./secret-management");
const logger_1 = require("./logger");
class ConfigManager {
    constructor(serviceName) {
        this.serviceName = serviceName;
        this.config = {};
        this.initialized = false;
        this.logger = (0, logger_1.createLogger)(`${serviceName}-config-manager`);
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        this.logger.info('Initializing configuration manager');
        // Load base configuration from environment
        this.loadEnvironmentConfig();
        // Initialize SecretManager if Vault is enabled
        console.log('🔐 Checking Vault config:', {
            enabled: this.config.vaultEnabled,
            hasAddr: !!this.config.vaultAddr,
            hasToken: !!this.config.vaultToken,
            addr: this.config.vaultAddr
        });
        if (this.config.vaultEnabled && this.config.vaultAddr && this.config.vaultToken) {
            this.logger.info('Vault is enabled, initializing SecretManager');
            this.secretManager = (0, secret_management_1.createSecretManager)(this.serviceName, {
                vaultUrl: this.config.vaultAddr,
                vaultToken: this.config.vaultToken,
                vaultNamespace: this.config.vaultNamespace || 'guardant',
                mountPath: this.config.vaultMountPath || 'guardant',
                enableCache: true,
                cacheTimeout: 300000, // 5 minutes
                enableRotation: true
            });
            // Load secrets from Vault
            await this.loadSecretsFromVault();
        }
        else {
            this.logger.info('Vault is disabled, using environment variables only');
        }
        this.initialized = true;
        this.logger.info('Configuration manager initialized');
    }
    loadEnvironmentConfig() {
        this.config = {
            // Application
            appName: process.env.APP_NAME || 'GuardAnt',
            nodeEnv: process.env.NODE_ENV || 'development',
            port: parseInt(process.env.PORT || '4000', 10),
            // Vault
            vaultEnabled: process.env.VAULT_ENABLED === 'true',
            vaultAddr: process.env.VAULT_ADDR,
            vaultToken: process.env.VAULT_TOKEN,
            vaultNamespace: process.env.VAULT_NAMESPACE,
            vaultMountPath: process.env.VAULT_MOUNT_PATH,
            // Feature flags (from env)
            golemEnabled: process.env.GOLEM_ENABLED !== 'false',
            emailEnabled: process.env.EMAIL_ENABLED === 'true',
            monitoringEnabled: process.env.MONITORING_ENABLED !== 'false',
            prometheusEnabled: process.env.PROMETHEUS_ENABLED !== 'false',
            enableGolemBaseL3: process.env.ENABLE_GOLEM_BASE_L3 === 'true',
            enableAnalytics: process.env.ENABLE_ANALYTICS !== 'false',
            enableBilling: process.env.ENABLE_BILLING === 'true',
            enableMfa: process.env.ENABLE_MFA === 'true',
            // Direct env vars (fallback if Vault is disabled)
            jwtSecret: process.env.JWT_SECRET,
            refreshSecret: process.env.REFRESH_SECRET,
            sessionSecret: process.env.SESSION_SECRET,
            encryptionKey: process.env.ENCRYPTION_KEY,
            postgresUrl: process.env.DATABASE_URL,
            redisUrl: process.env.REDIS_URL,
            rabbitmqUrl: process.env.RABBITMQ_URL,
            golemChainId: process.env.GOLEM_CHAIN_ID ? parseInt(process.env.GOLEM_CHAIN_ID, 10) : undefined,
            golemHttpUrl: process.env.GOLEM_HTTP_URL,
            golemWsUrl: process.env.GOLEM_WS_URL,
            golemPrivateKey: process.env.GOLEM_PRIVATE_KEY,
            golemWalletAddress: process.env.GOLEM_WALLET_ADDRESS,
            sendgridApiKey: process.env.SENDGRID_API_KEY,
            emailFrom: process.env.EMAIL_FROM,
            sentryDsn: process.env.SENTRY_DSN,
            jaegerEndpoint: process.env.JAEGER_ENDPOINT
        };
    }
    async loadSecretsFromVault() {
        if (!this.secretManager) {
            return;
        }
        try {
            // Load application secrets
            const jwtSecrets = await this.secretManager.getSecret('app/jwt');
            console.log('🔐 Loading JWT secrets from Vault:', jwtSecrets ? 'Found' : 'Not found');
            if (jwtSecrets) {
                console.log('🔐 JWT secrets raw value:', jwtSecrets);
                console.log('🔐 JWT secrets type:', typeof jwtSecrets);
                // Check if it's already an object or needs parsing
                const secrets = typeof jwtSecrets === 'string' ? JSON.parse(jwtSecrets) : jwtSecrets;
                console.log('🔐 JWT secrets keys:', Object.keys(secrets));
                this.config.jwtSecret = secrets.secret || this.config.jwtSecret;
                this.config.refreshSecret = secrets.refreshSecret || secrets.refresh_secret || this.config.refreshSecret;
                this.config.sessionSecret = secrets.sessionSecret || secrets.session_secret || this.config.sessionSecret;
                console.log('🔐 Loaded refreshSecret:', this.config.refreshSecret ? 'Yes' : 'No');
                console.log('🔐 Final config JWT values:', {
                    jwtSecret: this.config.jwtSecret ? 'Set' : 'Missing',
                    refreshSecret: this.config.refreshSecret ? 'Set' : 'Missing',
                    sessionSecret: this.config.sessionSecret ? 'Set' : 'Missing'
                });
            }
            // Load database credentials
            const postgresSecrets = await this.secretManager.getSecret('database/postgres');
            if (postgresSecrets) {
                const pg = JSON.parse(postgresSecrets);
                this.config.postgresUrl = `postgresql://${pg.username}:${pg.password}@${pg.host}:${pg.port}/${pg.database}`;
            }
            const redisSecrets = await this.secretManager.getSecret('database/redis');
            if (redisSecrets) {
                const redis = JSON.parse(redisSecrets);
                const auth = redis.password ? `:${redis.password}@` : '';
                this.config.redisUrl = `redis://${auth}${redis.host}:${redis.port}`;
            }
            // Load RabbitMQ credentials
            const rabbitmqSecrets = await this.secretManager.getSecret('messaging/rabbitmq');
            if (rabbitmqSecrets) {
                const rmq = JSON.parse(rabbitmqSecrets);
                this.config.rabbitmqUrl = `amqp://${rmq.username}:${rmq.password}@${rmq.host}:${rmq.port}${rmq.vhost}`;
            }
            // Load Golem Network secrets
            if (this.config.golemEnabled) {
                const golemSecrets = await this.secretManager.getSecret('blockchain/golem');
                if (golemSecrets) {
                    const golem = JSON.parse(golemSecrets);
                    this.config.golemChainId = parseInt(golem.chain_id, 10) || this.config.golemChainId;
                    this.config.golemHttpUrl = golem.http_url || this.config.golemHttpUrl;
                    this.config.golemWsUrl = golem.ws_url || this.config.golemWsUrl;
                    this.config.golemPrivateKey = golem.private_key || this.config.golemPrivateKey;
                    this.config.golemWalletAddress = golem.wallet_address || this.config.golemWalletAddress;
                }
            }
            // Load email configuration
            if (this.config.emailEnabled) {
                const emailSecrets = await this.secretManager.getSecret('email/sendgrid');
                if (emailSecrets) {
                    const email = JSON.parse(emailSecrets);
                    this.config.sendgridApiKey = email.api_key || this.config.sendgridApiKey;
                    this.config.emailFrom = email.from_email || this.config.emailFrom;
                }
            }
            // Load monitoring configuration
            if (this.config.monitoringEnabled) {
                const sentrySecrets = await this.secretManager.getSecret('monitoring/sentry');
                if (sentrySecrets) {
                    const sentry = JSON.parse(sentrySecrets);
                    this.config.sentryDsn = sentry.dsn || this.config.sentryDsn;
                }
                const jaegerSecrets = await this.secretManager.getSecret('monitoring/jaeger');
                if (jaegerSecrets) {
                    const jaeger = JSON.parse(jaegerSecrets);
                    this.config.jaegerEndpoint = jaeger.endpoint || this.config.jaegerEndpoint;
                }
            }
            this.logger.info('Secrets loaded from Vault successfully');
        }
        catch (error) {
            console.error('🔐 Vault error details:', error);
            this.logger.error('Failed to load secrets from Vault', error);
            throw error; // Throw original error to see details
        }
    }
    get(key) {
        if (!this.initialized) {
            throw new Error('ConfigManager not initialized. Call initialize() first.');
        }
        if (key === 'refreshSecret' || key === 'jwtSecret') {
            console.log(`🔐 Getting ${key} from config:`, this.config[key] ? 'Present' : 'Missing');
        }
        return this.config[key];
    }
    getRequired(key) {
        const value = this.get(key);
        if (value === undefined || value === null || value === '') {
            throw new Error(`Required configuration '${String(key)}' is missing`);
        }
        return value;
    }
    getAll() {
        if (!this.initialized) {
            throw new Error('ConfigManager not initialized. Call initialize() first.');
        }
        return { ...this.config };
    }
    // Get configuration without sensitive data (for logging)
    getSafeConfig() {
        const safeConfig = {};
        const sensitiveKeys = [
            'jwtSecret', 'refreshSecret', 'sessionSecret', 'encryptionKey',
            'postgresUrl', 'redisUrl', 'rabbitmqUrl', 'golemPrivateKey',
            'sendgridApiKey', 'sentryDsn', 'vaultToken'
        ];
        for (const [key, value] of Object.entries(this.config)) {
            if (sensitiveKeys.includes(key)) {
                safeConfig[key] = value ? '***' : undefined;
            }
            else {
                safeConfig[key] = value;
            }
        }
        return safeConfig;
    }
    async rotateSecrets() {
        if (!this.secretManager) {
            throw new Error('SecretManager not available. Vault must be enabled.');
        }
        this.logger.info('Rotating secrets...');
        // Rotate JWT secrets
        const newJwtSecret = await this.secretManager.rotateSecret('app/jwt');
        if (newJwtSecret) {
            // Reload configuration after rotation
            await this.loadSecretsFromVault();
            this.logger.info('JWT secrets rotated successfully');
        }
    }
    async getSecretManager() {
        if (!this.initialized) {
            await this.initialize();
        }
        return this.secretManager;
    }
    async shutdown() {
        if (this.secretManager) {
            await this.secretManager.shutdown();
        }
        this.initialized = false;
        this.logger.info('Configuration manager shut down');
    }
}
exports.ConfigManager = ConfigManager;
// Singleton instance per service
const configManagers = new Map();
async function getConfig(serviceName) {
    let manager = configManagers.get(serviceName);
    if (!manager) {
        manager = new ConfigManager(serviceName);
        await manager.initialize();
        configManagers.set(serviceName, manager);
    }
    return manager;
}
// Helper to get specific configuration values
async function getServiceConfig(serviceName) {
    const manager = await getConfig(serviceName);
    return manager.getAll();
}
// Shutdown all config managers
async function shutdownAllConfigs() {
    for (const [serviceName, manager] of configManagers) {
        await manager.shutdown();
    }
    configManagers.clear();
}
//# sourceMappingURL=config-manager.js.map