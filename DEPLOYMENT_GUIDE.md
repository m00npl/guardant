# GuardAnt Production Deployment Guide

## Quick Start

1. **Clone the repository on your production server:**
   ```bash
   git clone https://github.com/m00npl/guardant.git
   cd guardant
   ```

2. **Configure production environment:**
   ```bash
   # Copy the production environment file
   cp .env.production .env
   
   # Edit the .env file and update all passwords and secrets
   nano .env
   ```

3. **Run the deployment script:**
   ```bash
   chmod +x deploy-to-production.sh
   ./deploy-to-production.sh
   ```

## What the deployment script does:

1. **Pulls latest code** from the main branch
2. **Builds all Docker images** with the latest changes
3. **Starts infrastructure services** (PostgreSQL, Redis, RabbitMQ, Vault)
4. **Initializes HashiCorp Vault** for secret management
5. **Runs database migrations**
6. **Creates platform admin user**
7. **Starts all application services**
8. **Performs health checks**

## Post-deployment steps:

### 1. Save Vault credentials
After deployment, Vault will display:
- Root token
- Unseal keys
- Service tokens for each component

**SAVE THESE SECURELY!** You'll need them to:
- Unseal Vault after restarts
- Manage secrets
- Configure services

### 2. Configure SSL/TLS
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d guardant.me -d www.guardant.me
```

### 3. Configure firewall
```bash
# Allow necessary ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5672/tcp  # RabbitMQ (for workers)
sudo ufw enable
```

### 4. Test the deployment
- Admin Panel: https://guardant.me/admin
- Worker install: `curl -sSL https://guardant.me/install | bash`
- API Health: https://guardant.me/api/health

## Managing the deployment

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f admin-api
```

### Restart services
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart admin-api
```

### Update deployment
```bash
git pull origin main
./deploy-to-production.sh
```

### Backup data
```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U guardant guardant > backup.sql

# Backup Redis
docker-compose exec redis redis-cli SAVE
docker cp guardant-redis:/data/dump.rdb ./redis-backup.rdb

# Backup Vault
docker cp guardant-vault:/vault/file ./vault-backup
```

## Security checklist

- [ ] Change all default passwords in .env
- [ ] Configure SSL certificates
- [ ] Set up firewall rules
- [ ] Save Vault credentials securely
- [ ] Enable 2FA for admin accounts
- [ ] Configure backup strategy
- [ ] Set up monitoring alerts
- [ ] Review and update IP whitelists

## Troubleshooting

### Vault is sealed
```bash
# Unseal Vault with saved keys
docker-compose exec vault vault operator unseal <UNSEAL_KEY_1>
docker-compose exec vault vault operator unseal <UNSEAL_KEY_2>
docker-compose exec vault vault operator unseal <UNSEAL_KEY_3>
```

### Services not starting
```bash
# Check logs
docker-compose logs <service-name>

# Check disk space
df -h

# Check memory
free -m
```

### Database connection issues
```bash
# Check PostgreSQL
docker-compose exec postgres psql -U guardant -d guardant -c "SELECT 1"

# Check Redis
docker-compose exec redis redis-cli ping
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/m00npl/guardant/issues
- Email: support@guardant.me