# GuardAnt Worker Policy
# Access to monitoring and service configurations

# Read-only access to app configurations
path "guardant/app/*" {
  capabilities = ["read"]
}

# Read-only access to database configurations
path "guardant/database/*" {
  capabilities = ["read"]
}

# Read-only access to messaging configurations
path "guardant/messaging/*" {
  capabilities = ["read"]
}

# Read access to monitoring configurations
path "guardant/monitoring/*" {
  capabilities = ["read"]
}

# Write access to worker status (for heartbeats)
path "guardant/workers/status/*" {
  capabilities = ["create", "update"]
}

# Token self-management
path "auth/token/renew-self" {
  capabilities = ["update"]
}

path "auth/token/lookup-self" {
  capabilities = ["read"]
}