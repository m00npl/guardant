# GuardAnt Public API Policy
# Read-only access to public configuration and service status

# Read-only access to public configurations
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

# No access to sensitive secrets like Golem private keys
path "guardant/blockchain/*" {
  capabilities = ["deny"]
}

# No access to email configurations
path "guardant/email/*" {
  capabilities = ["deny"]
}

# Token self-management
path "auth/token/renew-self" {
  capabilities = ["update"]
}

path "auth/token/lookup-self" {
  capabilities = ["read"]
}