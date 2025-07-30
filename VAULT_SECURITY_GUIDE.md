# Vault Security Best Practices

## 🔐 CRITICAL: Vault Keys Management

### Where to store Vault keys:

**NEVER store on the server:**
- ❌ Not in files on the server
- ❌ Not in environment variables on the server
- ❌ Not in the database
- ❌ Not in git repository
- ❌ Not in Docker volumes

**SECURE storage options:**

1. **Password Manager (Recommended)**
   - Use 1Password, Bitwarden, or similar
   - Create separate entries for each unseal key
   - Share with trusted team members only

2. **Hardware Security Module (HSM)**
   - For enterprise deployments
   - Provides hardware-based key protection

3. **Split Knowledge**
   - Give different keys to different trusted people
   - Require multiple people to unseal (Shamir's Secret Sharing)

4. **Encrypted Offline Storage**
   - Store on encrypted USB drives
   - Keep in secure physical locations
   - Multiple backup copies in different locations

## 🚀 Secure Deployment Process

### Option 1: Manual Unsealing (Most Secure)
```bash
# Deploy without automatic unsealing
./deploy-to-production.sh

# When prompted, manually enter keys
docker-compose exec vault vault operator unseal
# Enter key 1
docker-compose exec vault vault operator unseal
# Enter key 2
docker-compose exec vault vault operator unseal
# Enter key 3
```

### Option 2: Temporary Environment Variables
```bash
# Set keys temporarily (they won't be saved)
export VAULT_UNSEAL_KEY_1="your-key-1"
export VAULT_UNSEAL_KEY_2="your-key-2"
export VAULT_UNSEAL_KEY_3="your-key-3"

# Run deployment
./deploy-to-production.sh

# IMPORTANT: Clear the keys from memory
unset VAULT_UNSEAL_KEY_1
unset VAULT_UNSEAL_KEY_2
unset VAULT_UNSEAL_KEY_3

# Clear bash history
history -c
```

### Option 3: Secure Key Injection
```bash
# Use a secure key management service
# Example with HashiCorp Vault (meta!)
vault kv get -field=unseal_key_1 secret/guardant/vault | ./unseal-vault.sh
```

## 🛡️ Security Checklist

### Initial Setup
- [ ] Generate strong root token (not default)
- [ ] Create separate tokens for each service
- [ ] Enable audit logging
- [ ] Set up access policies
- [ ] Rotate root token after initial setup

### Ongoing Security
- [ ] Regularly rotate service tokens
- [ ] Monitor audit logs
- [ ] Use TLS for Vault communication
- [ ] Implement IP whitelisting
- [ ] Set up alerts for unauthorized access

### Emergency Procedures
- [ ] Document key recovery process
- [ ] Test disaster recovery
- [ ] Have emergency contact list
- [ ] Practice unsealing procedures

## 🚨 What to do if keys are compromised

1. **Immediate Actions:**
   ```bash
   # Seal Vault immediately
   docker-compose exec vault vault operator seal
   
   # Stop all services
   docker-compose down
   ```

2. **Recovery Steps:**
   - Rekey Vault with new keys
   - Rotate all secrets stored in Vault
   - Audit all access logs
   - Update all service tokens

## 📝 Example Secure Key Storage

### In 1Password (or similar)
```
Title: GuardAnt Vault - Unseal Key 1
Username: unseal_key_1
Password: <actual-key-here>
Notes: 1 of 5 keys, need 3 to unseal
Tags: vault, critical, guardant

Title: GuardAnt Vault - Unseal Key 2
Username: unseal_key_2
Password: <actual-key-here>
Notes: 2 of 5 keys, need 3 to unseal
Tags: vault, critical, guardant

[... repeat for all 5 keys ...]

Title: GuardAnt Vault - Root Token
Username: root
Password: <root-token>
Notes: USE ONLY FOR EMERGENCY
Tags: vault, critical, guardant, emergency
```

## 🔄 Auto-Unseal Options (Advanced)

For production, consider using Vault's auto-unseal features:

1. **AWS KMS Auto-Unseal**
2. **Azure Key Vault Auto-Unseal**
3. **Google Cloud KMS Auto-Unseal**

These eliminate the need to manually unseal but require cloud provider setup.

## ⚠️ Remember

- Vault keys are like the keys to your kingdom
- Anyone with 3 keys can access ALL secrets
- Treat them with maximum security
- Never share keys over insecure channels
- Always verify recipient identity before sharing
- Audit key usage regularly

## 📞 Emergency Contacts

Set up an emergency contact list for key holders:
- Person 1: Has keys 1, 3
- Person 2: Has keys 2, 4
- Person 3: Has keys 3, 5
- Person 4: Has keys 1, 2 (backup)

This ensures no single person can unseal alone.