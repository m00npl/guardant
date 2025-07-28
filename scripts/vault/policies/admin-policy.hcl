# GuardAnt Admin API Policy
# Full access to GuardAnt secrets and ability to manage them

# Read/Write access to all GuardAnt secrets
path "guardant/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Ability to manage policies (for admin operations)
path "sys/policies/*" {
  capabilities = ["read", "list"]
}

# Ability to manage auth methods
path "sys/auth/*" {
  capabilities = ["read", "list"]
}

# Token self-management
path "auth/token/renew-self" {
  capabilities = ["update"]
}

path "auth/token/lookup-self" {
  capabilities = ["read"]
}

# Encryption key management
path "transit/encrypt/guardant" {
  capabilities = ["update"]
}

path "transit/decrypt/guardant" {
  capabilities = ["update"]
}

# Audit log access
path "sys/audit" {
  capabilities = ["read", "list"]
}