# HashiCorp Vault Integration

GuardAnt uses HashiCorp Vault for secure secret management, providing centralized secret storage, automatic rotation, and fine-grained access control.

## Overview

Vault replaces environment variables for sensitive configuration, offering:
- **Centralized Secret Management**: All secrets in one secure location
- **Dynamic Secrets**: Automatic rotation and expiration
- **Access Control**: Role-based policies for different services
- **Audit Logging**: Complete audit trail of secret access
- **Encryption**: Transit encryption for sensitive data

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Admin API     │     │   Public API    │     │    Workers      │
│                 │     │                 │     │                 │
│ ConfigManager   │     │ ConfigManager   │     │ ConfigManager   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                         │
         │    ┌──────────────────┴──────────────────┐     │
         └────►         HashiCorp Vault             ◄─────┘
              │                                      │
              │  • JWT Secrets                       │
              │  • Database Credentials              │
              │  • API Keys                          │
              │  • Golem Network Keys                │
              └──────────────────────────────────────┘
```

## Quick Start

### 1. Start Vault

```bash
# Start all services including Vault
docker compose up -d

# Or start only Vault
docker compose up -d vault
```

### 2. Initialize Vault

```bash
# Run initialization script
docker exec -it guardant-vault /vault/scripts/init-vault.sh

# This will:
# - Initialize Vault if needed
# - Create secret structure
# - Set up policies
# - Generate service tokens
```

### 3. Configure Services

Add the generated tokens to your `.env` file:

```env
# Admin API
VAULT_ENABLED=true
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=hvs.CAESIH...  # Use Admin token from init script

# Public API
VAULT_ENABLED=true
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=hvs.CAESIG...  # Use Public API token

# Workers
VAULT_ENABLED=true
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=hvs.CAESIF...  # Use Worker token
```

## Secret Structure

GuardAnt organizes secrets in a hierarchical structure:

```
guardant/
├── app/
│   └── jwt                    # JWT secrets
│       ├── secret
│       ├── refresh_secret
│       └── session_secret
├── database/
│   ├── postgres/              # PostgreSQL credentials
│   │   ├── host
│   │   ├── port
│   │   ├── database
│   │   ├── username
│   │   └── password
│   └── redis/                 # Redis credentials
│       ├── host
│       ├── port
│       └── password
├── messaging/
│   └── rabbitmq/              # RabbitMQ credentials
│       ├── host
│       ├── port
│       ├── username
│       ├── password
│       └── vhost
├── blockchain/
│   └── golem/                 # Golem Network secrets
│       ├── chain_id
│       ├── http_url
│       ├── ws_url
│       ├── private_key        # Encrypted
│       └── wallet_address
├── email/
│   └── sendgrid/              # Email service
│       ├── api_key
│       └── from_email
└── monitoring/
    ├── sentry/                # Error tracking
    │   └── dsn
    └── jaeger/                # Distributed tracing
        └── endpoint
```

## Access Policies

### Admin Policy (`guardant-admin`)
- Full read/write access to all secrets
- Can manage policies and auth methods
- Used by Admin API service

### Public API Policy (`guardant-public-api`)
- Read-only access to non-sensitive secrets
- No access to blockchain private keys
- No access to email configurations
- Used by Public API service

### Worker Policy (`guardant-worker`)
- Read access to database and messaging
- Read access to monitoring configurations
- Write access to worker status
- Used by monitoring workers

## ConfigManager Integration

Services use ConfigManager to automatically load secrets from Vault:

```typescript
import { getConfig } from './shared/config-manager';

// Initialize configuration
const config = await getConfig('my-service');

// Get configuration values
const jwtSecret = config.getRequired('jwtSecret');
const dbUrl = config.get('postgresUrl');

// Configuration is automatically loaded from:
// 1. Environment variables (for non-secrets)
// 2. Vault (for secrets)
```

## Manual Secret Management

### View Secrets

```bash
# Login to Vault
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=<root-token>

# List all secrets
vault kv list guardant

# Read specific secret
vault kv get guardant/app/jwt
vault kv get -format=json guardant/database/postgres
```

### Update Secrets

```bash
# Update JWT secret
vault kv put guardant/app/jwt \
  secret="new-secret-value" \
  refresh_secret="new-refresh-secret" \
  session_secret="new-session-secret"

# Update database password
vault kv put guardant/database/postgres \
  host="postgres" \
  port="5432" \
  database="guardant" \
  username="guardant" \
  password="new-secure-password"
```

### Rotate Secrets

```bash
# Rotate specific secret
vault kv patch guardant/app/jwt \
  secret="$(openssl rand -base64 32)"

# Services will automatically pick up new values
# through ConfigManager caching (5-minute TTL)
```

## Security Best Practices

### 1. Token Management
- Never commit Vault tokens to Git
- Use separate tokens for each service
- Rotate tokens regularly
- Set appropriate TTLs

### 2. Secret Rotation
- Enable automatic rotation for supported secrets
- Manually rotate static secrets quarterly
- Update dependent services after rotation

### 3. Access Control
- Follow principle of least privilege
- Each service gets only required access
- Regularly audit token usage
- Review and update policies

### 4. Backup and Recovery
- Regularly backup Vault data
- Test recovery procedures
- Keep unseal keys secure and distributed
- Document recovery process

## Production Deployment

### 1. High Availability Setup

```hcl
# vault-config.hcl
storage "consul" {
  address = "consul:8500"
  path    = "vault/"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_cert_file = "/vault/certs/vault.crt"
  tls_key_file  = "/vault/certs/vault.key"
}

seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "your-kms-key-id"
}

ui = true
cluster_addr = "https://vault.internal:8201"
api_addr = "https://vault.guardant.me"
```

### 2. Auto-Unseal with AWS KMS

```yaml
# docker-compose.prod.yml
vault:
  environment:
    - VAULT_SEAL_TYPE=awskms
    - AWS_REGION=us-east-1
    - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
    - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
```

### 3. TLS Configuration

```bash
# Generate certificates
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout vault.key -out vault.crt \
  -subj "/C=US/ST=State/L=City/O=GuardAnt/CN=vault.guardant.me"

# Mount in container
volumes:
  - ./certs:/vault/certs:ro
```

## Monitoring

### Health Checks

```bash
# Check Vault status
curl http://localhost:8200/v1/sys/health

# Check seal status
vault status
```

### Metrics

Vault exposes Prometheus metrics:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'vault'
    static_configs:
      - targets: ['vault:8200']
    metrics_path: '/v1/sys/metrics'
    params:
      format: ['prometheus']
    bearer_token: 'your-metrics-token'
```

## Troubleshooting

### Common Issues

1. **Vault is sealed**
   ```bash
   vault operator unseal <unseal-key-1>
   vault operator unseal <unseal-key-2>
   vault operator unseal <unseal-key-3>
   ```

2. **Token expired**
   ```bash
   # Renew token
   vault token renew
   
   # Or create new token
   vault token create -policy=guardant-admin -ttl=8760h
   ```

3. **Permission denied**
   - Check token has correct policy
   - Verify path in policy matches secret path
   - Check token hasn't expired

4. **Connection refused**
   - Verify Vault is running: `docker ps`
   - Check VAULT_ADDR is correct
   - Ensure network connectivity

### Debug Mode

Enable debug logging:

```typescript
// In config-manager.ts
const config = await getConfig('my-service');
config.logger.level = 'debug';
```

### Vault Logs

```bash
# View Vault logs
docker logs guardant-vault

# Follow logs
docker logs -f guardant-vault
```

## Migration from Environment Variables

To migrate existing environment variables to Vault:

1. **Export current configuration**
   ```bash
   # Save current env vars
   env | grep -E '^(JWT|DATABASE|REDIS|RABBITMQ)' > current-env.txt
   ```

2. **Import to Vault**
   ```bash
   # Run migration script
   ./scripts/migrate-to-vault.sh current-env.txt
   ```

3. **Update services**
   - Set `VAULT_ENABLED=true`
   - Add `VAULT_TOKEN` for each service
   - Remove sensitive env vars

4. **Verify**
   - Start services
   - Check logs for successful Vault connection
   - Test functionality

## Resources

- [Vault Documentation](https://www.vaultproject.io/docs)
- [Vault Best Practices](https://www.vaultproject.io/docs/internals/security)
- [GuardAnt ConfigManager](./DEVELOPMENT.md#configuration-management)