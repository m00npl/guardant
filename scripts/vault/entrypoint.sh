#!/bin/sh

# Vault container entrypoint
# Starts Vault and automatically initializes it

# Start Vault in background
vault server -config=/vault/config/vault.hcl &
VAULT_PID=$!

# Wait for Vault to start
sleep 5

# Run initialization
/vault/scripts/init-vault.sh

# Keep Vault running
wait $VAULT_PID