# GuardAnt Security Documentation

## Table of Contents

1. [Security Overview](#security-overview)
2. [Threat Model](#threat-model)
3. [Authentication & Authorization](#authentication--authorization)
4. [Data Security](#data-security)
5. [Network Security](#network-security)
6. [Application Security](#application-security)
7. [Infrastructure Security](#infrastructure-security)
8. [Compliance & Auditing](#compliance--auditing)
9. [Incident Response](#incident-response)
10. [Security Best Practices](#security-best-practices)
11. [Security Checklist](#security-checklist)

## Security Overview

GuardAnt implements defense-in-depth security architecture with multiple layers of protection:

```
┌─────────────────────────────────────────────────────────────┐
│                   Security Layers                            │
├─────────────────┬─────────────────┬────────────────────────┤
│   Perimeter     │   Application   │      Data              │
│   Security      │   Security      │      Security          │
├─────────────────┼─────────────────┼────────────────────────┤
│ • WAF           │ • Authentication│ • Encryption at Rest   │
│ • DDoS Protect. │ • Authorization │ • Encryption in Transit│
│ • Rate Limiting │ • Input Valid.  │ • Key Management       │
│ • Geo-blocking  │ • CSRF/XSS      │ • Data Masking         │
│ • TLS 1.3       │ • API Security  │ • Secure Backup        │
└─────────────────┴─────────────────┴────────────────────────┘
```

### Security Principles

1. **Least Privilege**: Users and services have minimum required permissions
2. **Zero Trust**: Never trust, always verify
3. **Defense in Depth**: Multiple security layers
4. **Fail Secure**: System fails to a secure state
5. **Security by Design**: Security built into architecture

## Threat Model

### Identified Threats

```typescript
enum ThreatCategory {
  AUTHENTICATION = 'Authentication bypass',
  AUTHORIZATION = 'Privilege escalation',
  INJECTION = 'Code/SQL injection',
  DATA_EXPOSURE = 'Sensitive data exposure',
  DOS = 'Denial of service',
  MITM = 'Man in the middle',
  SUPPLY_CHAIN = 'Dependency vulnerabilities'
}

interface ThreatAssessment {
  category: ThreatCategory;
  likelihood: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High' | 'Critical';
  mitigations: string[];
}
```

### Risk Matrix

| Threat | Likelihood | Impact | Risk Level | Mitigations |
|--------|------------|--------|------------|--------------|
| SQL Injection | Low | Critical | High | Parameterized queries, ORMs |
| XSS | Medium | High | High | CSP, Input sanitization |
| DDoS | High | Medium | High | Rate limiting, CDN |
| Data Breach | Low | Critical | High | Encryption, Access controls |
| Auth Bypass | Low | Critical | High | MFA, Session management |

## Authentication & Authorization

### Authentication Flow

```typescript
// Multi-factor authentication implementation
class AuthenticationService {
  async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    // 1. Validate credentials
    const user = await this.validatePassword(
      credentials.email,
      credentials.password
    );
    
    // 2. Check account status
    if (user.locked) {
      throw new AccountLockedException();
    }
    
    // 3. Verify MFA if enabled
    if (user.mfaEnabled) {
      await this.verifyMFA(user, credentials.mfaCode);
    }
    
    // 4. Generate secure session
    const session = await this.createSession(user, {
      ip: credentials.ip,
      userAgent: credentials.userAgent,
      duration: '24h'
    });
    
    // 5. Audit log
    await this.auditLog('auth.success', {
      userId: user.id,
      method: user.mfaEnabled ? 'mfa' : 'password'
    });
    
    return { user, session };
  }
}
```

### JWT Token Security

```typescript
// Secure JWT implementation
class JWTService {
  private readonly algorithm = 'RS256';
  private readonly issuer = 'guardant.me';
  private readonly audience = 'guardant-api';
  
  async generateToken(payload: TokenPayload): Promise<string> {
    return jwt.sign(payload, this.privateKey, {
      algorithm: this.algorithm,
      expiresIn: '15m', // Short-lived access tokens
      issuer: this.issuer,
      audience: this.audience,
      jwtid: crypto.randomUUID(),
      notBefore: '0s'
    });
  }
  
  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: [this.algorithm],
        issuer: this.issuer,
        audience: this.audience,
        clockTolerance: 30 // 30 seconds clock skew
      });
      
      // Check if token is revoked
      if (await this.isRevoked(decoded.jti)) {
        throw new TokenRevokedException();
      }
      
      return decoded;
    } catch (error) {
      throw new InvalidTokenException();
    }
  }
}
```

### Role-Based Access Control (RBAC)

```typescript
// Permission system
interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

class AuthorizationService {
  async authorize(
    user: User,
    resource: string,
    action: string,
    context?: any
  ): Promise<boolean> {
    // 1. Get user roles
    const roles = await this.getUserRoles(user.id);
    
    // 2. Collect permissions
    const permissions = roles.flatMap(role => role.permissions);
    
    // 3. Check permission
    const allowed = permissions.some(perm => 
      perm.resource === resource && 
      perm.action === action &&
      this.evaluateConditions(perm.conditions, context)
    );
    
    // 4. Audit authorization attempt
    await this.auditLog('auth.check', {
      userId: user.id,
      resource,
      action,
      allowed
    });
    
    return allowed;
  }
}

// Predefined roles
const roles: Role[] = [
  {
    id: 'owner',
    name: 'Owner',
    permissions: [
      { resource: '*', action: '*' } // Full access
    ]
  },
  {
    id: 'admin',
    name: 'Administrator',
    permissions: [
      { resource: 'nest', action: '*' },
      { resource: 'service', action: '*' },
      { resource: 'user', action: 'read' },
      { resource: 'user', action: 'update', conditions: { self: true } }
    ]
  },
  {
    id: 'viewer',
    name: 'Viewer',
    permissions: [
      { resource: 'nest', action: 'read' },
      { resource: 'service', action: 'read' },
      { resource: 'analytics', action: 'read' }
    ]
  }
];
```

### Session Management

```typescript
class SessionManager {
  // Secure session configuration
  private readonly config = {
    secret: process.env.SESSION_SECRET!,
    name: '__Host-session', // __Host- prefix for security
    cookie: {
      secure: true,        // HTTPS only
      httpOnly: true,      // No JS access
      sameSite: 'strict',  // CSRF protection
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
      domain: undefined    // Current domain only
    }
  };
  
  async createSession(user: User, metadata: SessionMetadata): Promise<Session> {
    const sessionId = crypto.randomUUID();
    
    const session: Session = {
      id: sessionId,
      userId: user.id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.cookie.maxAge),
      metadata,
      fingerprint: await this.generateFingerprint(metadata)
    };
    
    // Store in Redis with TTL
    await redis.setex(
      `session:${sessionId}`,
      this.config.cookie.maxAge / 1000,
      JSON.stringify(session)
    );
    
    return session;
  }
  
  async validateSession(sessionId: string, fingerprint: string): Promise<Session> {
    const session = await redis.get(`session:${sessionId}`);
    if (!session) throw new SessionExpiredException();
    
    const parsed = JSON.parse(session);
    
    // Verify fingerprint to prevent session hijacking
    if (parsed.fingerprint !== fingerprint) {
      await this.revokeSession(sessionId);
      throw new SessionHijackException();
    }
    
    return parsed;
  }
}
```

## Data Security

### Encryption at Rest

```typescript
// Field-level encryption for sensitive data
class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyDerivation = 'scrypt';
  
  async encryptField(plaintext: string, context: string): Promise<EncryptedData> {
    // 1. Derive key from master key and context
    const key = await this.deriveKey(this.masterKey, context);
    
    // 2. Generate IV
    const iv = crypto.randomBytes(16);
    
    // 3. Encrypt
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);
    
    // 4. Get auth tag
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: this.algorithm,
      keyId: this.currentKeyId
    };
  }
  
  async decryptField(data: EncryptedData, context: string): Promise<string> {
    // 1. Get key by ID
    const key = await this.getKey(data.keyId, context);
    
    // 2. Decrypt
    const decipher = crypto.createDecipheriv(
      data.algorithm,
      key,
      Buffer.from(data.iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(data.authTag, 'base64'));
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(data.encrypted, 'base64')),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  }
}

// Transparent encryption for database
class EncryptedModel {
  static encryptedFields = ['apiKey', 'webhookSecret', 'email'];
  
  async beforeSave(data: any): Promise<any> {
    for (const field of EncryptedModel.encryptedFields) {
      if (data[field]) {
        data[field] = await encryptionService.encryptField(
          data[field],
          `${this.tableName}:${field}`
        );
      }
    }
    return data;
  }
  
  async afterLoad(data: any): Promise<any> {
    for (const field of EncryptedModel.encryptedFields) {
      if (data[field]) {
        data[field] = await encryptionService.decryptField(
          data[field],
          `${this.tableName}:${field}`
        );
      }
    }
    return data;
  }
}
```

### Encryption in Transit

```typescript
// TLS configuration
const tlsConfig = {
  minVersion: 'TLSv1.3',
  ciphers: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256'
  ].join(':'),
  ecdhCurve: 'X25519:P-256:P-384',
  honorCipherOrder: true,
  preferServerCiphers: true
};

// Certificate pinning for internal services
class ServiceClient {
  private readonly pins = new Map<string, string[]>([
    ['api-admin', ['sha256/base64hash1', 'sha256/base64hash2']],
    ['api-public', ['sha256/base64hash3', 'sha256/base64hash4']]
  ]);
  
  async request(service: string, endpoint: string, data: any) {
    return fetch(`https://${service}.internal${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Auth': await this.getServiceToken()
      },
      body: JSON.stringify(data),
      agent: new https.Agent({
        checkServerIdentity: (hostname, cert) => {
          const pin = this.calculatePin(cert);
          const validPins = this.pins.get(service);
          
          if (!validPins?.includes(pin)) {
            throw new Error('Certificate pin validation failed');
          }
        }
      })
    });
  }
}
```

### Key Management

```typescript
// Hierarchical key derivation
class KeyManager {
  private readonly kms: KMSClient;
  private keyCache = new Map<string, CryptoKey>();
  
  async getMasterKey(): Promise<CryptoKey> {
    // Master key is stored in KMS/HSM
    return this.kms.getKey('master-key-id');
  }
  
  async deriveKey(purpose: string, context: string): Promise<CryptoKey> {
    const cacheKey = `${purpose}:${context}`;
    
    // Check cache
    if (this.keyCache.has(cacheKey)) {
      return this.keyCache.get(cacheKey)!;
    }
    
    // Derive new key
    const masterKey = await this.getMasterKey();
    const info = Buffer.from(`${purpose}:${context}`);
    const salt = await this.getSalt(purpose);
    
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt,
        info
      },
      masterKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    // Cache with TTL
    this.keyCache.set(cacheKey, derivedKey);
    setTimeout(() => this.keyCache.delete(cacheKey), 3600000); // 1 hour
    
    return derivedKey;
  }
  
  async rotateKeys(): Promise<void> {
    // 1. Generate new master key
    const newKey = await this.kms.generateKey();
    
    // 2. Re-encrypt all data with new key
    await this.reencryptData(newKey);
    
    // 3. Update key version
    await this.kms.promoteKey(newKey.id);
    
    // 4. Clear cache
    this.keyCache.clear();
  }
}
```

## Network Security

### Web Application Firewall (WAF)

```nginx
# Nginx WAF configuration
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

# Block common attacks
location ~ /\. {
    deny all;
}

location ~ /\.git {
    deny all;
}

# SQL injection protection
if ($args ~* "(union.*select|select.*from|insert.*into|delete.*from|drop.*table|script.*>|<.*script)") {
    return 403;
}

# File upload restrictions
location /api/upload {
    client_max_body_size 10M;
    
    # Allow only specific file types
    if ($request_filename !~* \.(jpg|jpeg|png|gif|pdf)$) {
        return 403;
    }
}
```

### DDoS Protection

```typescript
// Application-level DDoS protection
class DDoSProtection {
  private readonly limits = {
    global: { requests: 10000, window: 60 }, // 10k req/min globally
    ip: { requests: 100, window: 60 },       // 100 req/min per IP
    user: { requests: 1000, window: 60 },    // 1k req/min per user
    endpoint: {
      '/api/auth/login': { requests: 5, window: 300 }, // 5 attempts/5min
      '/api/status': { requests: 60, window: 60 }      // 1 req/sec
    }
  };
  
  async checkLimit(request: Request): Promise<void> {
    const checks = [
      this.checkGlobalLimit(),
      this.checkIPLimit(request.ip),
      this.checkUserLimit(request.userId),
      this.checkEndpointLimit(request.path, request.ip)
    ];
    
    const results = await Promise.all(checks);
    
    if (results.some(r => r.blocked)) {
      throw new RateLimitException();
    }
  }
  
  async checkIPLimit(ip: string): Promise<RateLimitResult> {
    const key = `rate:ip:${ip}`;
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, this.limits.ip.window);
    }
    
    return {
      blocked: count > this.limits.ip.requests,
      remaining: Math.max(0, this.limits.ip.requests - count),
      reset: await redis.ttl(key)
    };
  }
}

// Cloudflare integration
class CloudflareProtection {
  async enableUnderAttackMode(): Promise<void> {
    await this.cf.zones.edit(this.zoneId, {
      security_level: 'under_attack'
    });
  }
  
  async blockIP(ip: string, reason: string): Promise<void> {
    await this.cf.firewall.rules.create(this.zoneId, {
      mode: 'block',
      configuration: {
        target: 'ip',
        value: ip
      },
      notes: reason
    });
  }
}
```

### API Security

```typescript
// API key management
class APIKeyService {
  async generateKey(userId: string, name: string): Promise<APIKey> {
    // Generate cryptographically secure key
    const key = `gnt_${crypto.randomBytes(32).toString('hex')}`;
    
    // Hash for storage
    const hash = await bcrypt.hash(key, 12);
    
    // Store with metadata
    const apiKey = await db.apiKeys.create({
      userId,
      name,
      hash,
      prefix: key.substring(0, 10),
      lastUsed: null,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    });
    
    // Return key only once
    return { ...apiKey, key };
  }
  
  async validateKey(key: string): Promise<APIKeyValidation> {
    const prefix = key.substring(0, 10);
    
    // Find by prefix
    const candidates = await db.apiKeys.findByPrefix(prefix);
    
    // Verify hash
    for (const candidate of candidates) {
      if (await bcrypt.compare(key, candidate.hash)) {
        // Update last used
        await db.apiKeys.updateLastUsed(candidate.id);
        
        // Check expiration
        if (candidate.expiresAt < new Date()) {
          throw new APIKeyExpiredException();
        }
        
        return {
          valid: true,
          userId: candidate.userId,
          scopes: candidate.scopes
        };
      }
    }
    
    throw new InvalidAPIKeyException();
  }
}

// Request signing for webhooks
class WebhookSecurity {
  async signRequest(url: string, payload: any, secret: string): Promise<Headers> {
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify(payload);
    
    // Create signature
    const signaturePayload = `${timestamp}.${body}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');
    
    return {
      'X-GuardAnt-Signature': signature,
      'X-GuardAnt-Timestamp': timestamp.toString(),
      'Content-Type': 'application/json'
    };
  }
  
  verifyWebhook(headers: Headers, body: string, secret: string): boolean {
    const signature = headers['x-guardant-signature'];
    const timestamp = headers['x-guardant-timestamp'];
    
    // Check timestamp (prevent replay attacks)
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - parseInt(timestamp)) > 300) { // 5 minutes
      return false;
    }
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}
```

## Application Security

### Input Validation

```typescript
// Comprehensive input validation
class InputValidator {
  // SQL injection prevention
  validateSQL(input: string): string {
    // Use parameterized queries instead
    throw new Error('Direct SQL not allowed');
  }
  
  // XSS prevention
  sanitizeHTML(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
      ALLOWED_ATTR: ['href']
    });
  }
  
  // Path traversal prevention
  validatePath(path: string): string {
    const normalized = path.normalize(path);
    if (normalized.includes('..') || normalized.includes('~')) {
      throw new PathTraversalException();
    }
    return normalized;
  }
  
  // Command injection prevention
  validateCommand(cmd: string): string {
    const dangerous = [';', '|', '&', '$', '`', '\\', '\n', '\r'];
    if (dangerous.some(char => cmd.includes(char))) {
      throw new CommandInjectionException();
    }
    return cmd;
  }
}

// Zod schemas for validation
const serviceSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['web', 'tcp', 'ping', 'dns']),
  target: z.string().url().or(z.string().ip()),
  interval: z.number().min(30).max(3600),
  timeout: z.number().min(1000).max(30000),
  method: z.enum(['GET', 'POST', 'HEAD']).optional(),
  headers: z.record(z.string()).optional(),
  regions: z.array(z.string()).min(1).max(10)
});

// Request validation middleware
async function validateRequest(schema: ZodSchema) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const validated = await schema.parseAsync(body);
      c.set('validatedBody', validated);
      await next();
    } catch (error) {
      return c.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, 400);
    }
  };
}
```

### CSRF Protection

```typescript
// CSRF token management
class CSRFProtection {
  private readonly tokenLength = 32;
  private readonly headerName = 'X-CSRF-Token';
  private readonly cookieName = '__Host-csrf';
  
  generateToken(): string {
    return crypto.randomBytes(this.tokenLength).toString('hex');
  }
  
  async middleware(c: Context, next: Next) {
    const method = c.req.method;
    
    // Skip safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next();
    }
    
    // Get token from header
    const headerToken = c.req.header(this.headerName);
    
    // Get token from cookie
    const cookieToken = getCookie(c, this.cookieName);
    
    // Validate
    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      return c.json({
        success: false,
        error: 'CSRF token validation failed'
      }, 403);
    }
    
    await next();
  }
}

// Double submit cookie pattern
class DoubleSubmitCSRF {
  async setToken(c: Context) {
    const token = crypto.randomBytes(32).toString('hex');
    
    setCookie(c, '__Host-csrf', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/'
    });
    
    return token;
  }
}
```

### Content Security Policy

```typescript
// Dynamic CSP generation
class ContentSecurityPolicy {
  private directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'nonce-{{nonce}}'"],
    'style-src': ["'self'", "'unsafe-inline'"], // For Tailwind
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", 'wss://guardant.me'],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': []
  };
  
  generatePolicy(nonce: string): string {
    return Object.entries(this.directives)
      .map(([directive, sources]) => {
        const sourcesStr = sources
          .map(s => s.replace('{{nonce}}', nonce))
          .join(' ');
        return `${directive} ${sourcesStr}`;
      })
      .join('; ');
  }
  
  middleware() {
    return async (c: Context, next: Next) => {
      const nonce = crypto.randomBytes(16).toString('base64');
      c.set('cspNonce', nonce);
      
      const policy = this.generatePolicy(nonce);
      c.header('Content-Security-Policy', policy);
      
      await next();
    };
  }
}
```

## Infrastructure Security

### Container Security

```dockerfile
# Secure Dockerfile
FROM node:20-alpine AS base

# Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Install only production dependencies
FROM base AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile

# Build application
FROM base AS build
WORKDIR /app
COPY . .
RUN yarn build

# Production image
FROM base AS runtime
WORKDIR /app

# Copy built application
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist

# Security hardening
RUN apk add --no-cache dumb-init
RUN rm -rf /var/cache/apk/*

# Read-only filesystem
RUN chmod -R 555 /app

USER nodejs

EXPOSE 3000

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js
```

### Secrets Management

```typescript
// Secure secrets handling
class SecretsManager {
  private cache = new Map<string, Secret>();
  
  async getSecret(name: string): Promise<string> {
    // Check cache
    if (this.cache.has(name)) {
      const cached = this.cache.get(name)!;
      if (cached.expiresAt > new Date()) {
        return cached.value;
      }
    }
    
    // Fetch from secure store
    const secret = await this.fetchFromVault(name);
    
    // Cache with TTL
    this.cache.set(name, {
      value: secret.value,
      expiresAt: new Date(Date.now() + 3600000) // 1 hour
    });
    
    return secret.value;
  }
  
  private async fetchFromVault(name: string): Promise<Secret> {
    // Use HashiCorp Vault, AWS Secrets Manager, etc.
    const response = await vault.read(`secret/data/${name}`);
    return response.data;
  }
}

// Environment validation
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  JWT_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().regex(/^[A-Za-z0-9+/]{44}$/), // Base64
  SESSION_SECRET: z.string().min(32)
});

// Validate on startup
const env = envSchema.parse(process.env);
```

### Network Isolation

```yaml
# Docker network isolation
version: '3.9'

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
  data:
    driver: bridge
    internal: true

services:
  nginx:
    networks:
      - frontend
  
  api:
    networks:
      - frontend
      - backend
  
  redis:
    networks:
      - backend
      - data
  
  postgres:
    networks:
      - data
```

## Compliance & Auditing

### Audit Logging

```typescript
// Comprehensive audit logging
interface AuditEvent {
  id: string;
  timestamp: Date;
  actor: {
    type: 'user' | 'system' | 'api';
    id: string;
    ip?: string;
    userAgent?: string;
  };
  action: string;
  resource: {
    type: string;
    id: string;
  };
  outcome: 'success' | 'failure';
  details?: Record<string, any>;
}

class AuditLogger {
  async log(event: Partial<AuditEvent>): Promise<void> {
    const fullEvent: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      outcome: 'success',
      ...event
    };
    
    // Log to multiple destinations
    await Promise.all([
      this.logToDatabase(fullEvent),
      this.logToSIEM(fullEvent),
      this.logToGolem(fullEvent) // Immutable audit trail
    ]);
  }
  
  private async logToGolem(event: AuditEvent): Promise<void> {
    // Store on Golem L3 for immutability
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(event))
      .digest('hex');
    
    await golemStorage.store({
      key: `audit/${event.timestamp.toISOString()}/${event.id}`,
      value: event,
      metadata: { hash },
      replication: 3
    });
  }
}

// Audit middleware
function auditMiddleware() {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const requestId = c.get('requestId');
    
    await next();
    
    // Log API access
    await auditLogger.log({
      actor: {
        type: 'user',
        id: c.get('userId') || 'anonymous',
        ip: c.req.header('X-Forwarded-For') || c.req.ip,
        userAgent: c.req.header('User-Agent')
      },
      action: `${c.req.method} ${c.req.path}`,
      resource: {
        type: 'api',
        id: requestId
      },
      outcome: c.res.status < 400 ? 'success' : 'failure',
      details: {
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        duration: Date.now() - start
      }
    });
  };
}
```

### GDPR Compliance

```typescript
// Data privacy implementation
class PrivacyService {
  // Right to access
  async exportUserData(userId: string): Promise<UserDataExport> {
    const data = await Promise.all([
      this.db.users.findById(userId),
      this.db.services.findByUser(userId),
      this.db.incidents.findByUser(userId),
      this.db.auditLogs.findByUser(userId)
    ]);
    
    return {
      profile: this.sanitizeProfile(data[0]),
      services: data[1],
      incidents: data[2],
      auditLogs: data[3],
      exportedAt: new Date()
    };
  }
  
  // Right to erasure
  async deleteUserData(userId: string): Promise<void> {
    await this.db.transaction(async (trx) => {
      // Anonymize instead of delete for audit trail
      await trx.users.update(userId, {
        email: `deleted-${userId}@example.com`,
        name: 'Deleted User',
        phone: null,
        address: null
      });
      
      // Delete personal data
      await trx.sessions.deleteByUser(userId);
      await trx.apiKeys.deleteByUser(userId);
      
      // Anonymize logs
      await trx.auditLogs.anonymizeUser(userId);
    });
  }
  
  // Consent management
  async updateConsent(userId: string, consents: Consents): Promise<void> {
    await this.db.consents.upsert({
      userId,
      marketing: consents.marketing,
      analytics: consents.analytics,
      updatedAt: new Date(),
      ip: consents.ip
    });
  }
}
```

## Incident Response

### Incident Response Plan

```typescript
enum IncidentSeverity {
  CRITICAL = 'P0', // Data breach, system compromise
  HIGH = 'P1',     // Service outage, security vulnerability
  MEDIUM = 'P2',   // Performance degradation, minor security issue
  LOW = 'P3'       // Non-critical issue
}

interface IncidentResponse {
  severity: IncidentSeverity;
  detected: Date;
  description: string;
  affectedSystems: string[];
  containmentSteps: string[];
  eradicationSteps: string[];
  recoverySteps: string[];
  lessonsLearned: string[];
}

class IncidentManager {
  async handleIncident(incident: SecurityIncident): Promise<void> {
    // 1. Assess severity
    const severity = this.assessSeverity(incident);
    
    // 2. Notify team
    await this.notifyTeam(severity, incident);
    
    // 3. Contain threat
    await this.containThreat(incident);
    
    // 4. Investigate
    const investigation = await this.investigate(incident);
    
    // 5. Eradicate
    await this.eradicate(investigation);
    
    // 6. Recover
    await this.recover(incident);
    
    // 7. Post-mortem
    await this.postMortem(incident, investigation);
  }
  
  private async containThreat(incident: SecurityIncident): Promise<void> {
    switch (incident.type) {
      case 'unauthorized_access':
        await this.revokeUserSessions(incident.userId);
        await this.blockIP(incident.sourceIP);
        break;
        
      case 'data_breach':
        await this.isolateAffectedSystems(incident.systems);
        await this.rotateCredentials();
        break;
        
      case 'ddos_attack':
        await this.enableDDoSProtection();
        await this.scaleInfrastructure();
        break;
    }
  }
}
```

### Security Monitoring

```typescript
// Real-time security monitoring
class SecurityMonitor {
  private rules: SecurityRule[] = [
    {
      name: 'Multiple failed login attempts',
      condition: (events) => {
        const failedLogins = events.filter(e => 
          e.action === 'auth.login' && 
          e.outcome === 'failure'
        );
        return failedLogins.length > 5;
      },
      action: 'block_ip'
    },
    {
      name: 'Unusual API activity',
      condition: (events) => {
        const apiCalls = events.filter(e => e.action.startsWith('api.'));
        return apiCalls.length > 1000; // Per minute
      },
      action: 'rate_limit'
    },
    {
      name: 'Privilege escalation attempt',
      condition: (events) => {
        return events.some(e => 
          e.action === 'auth.elevate' && 
          e.outcome === 'failure'
        );
      },
      action: 'alert_security'
    }
  ];
  
  async analyze(timeWindow: number = 60000): Promise<void> {
    const events = await this.getRecentEvents(timeWindow);
    
    for (const rule of this.rules) {
      if (rule.condition(events)) {
        await this.executeAction(rule.action, events);
      }
    }
  }
}
```

## Security Best Practices

### Development Security

```typescript
// Secure coding practices
class SecureCoding {
  // Never log sensitive data
  sanitizeForLogging(data: any): any {
    const sensitive = ['password', 'token', 'apiKey', 'secret'];
    
    return JSON.parse(JSON.stringify(data), (key, value) => {
      if (sensitive.some(s => key.toLowerCase().includes(s))) {
        return '[REDACTED]';
      }
      return value;
    });
  }
  
  // Use secure random
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
  
  // Constant time comparison
  secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}

// Dependency security
{
  "scripts": {
    "audit": "npm audit --production",
    "audit:fix": "npm audit fix --force",
    "check:licenses": "license-checker --production --failOn 'GPL'",
    "check:vulnerabilities": "snyk test"
  }
}
```

### Operational Security

1. **Regular Updates**
   - Security patches within 24 hours
   - Dependency updates weekly
   - System updates monthly

2. **Access Control**
   - Principle of least privilege
   - Regular access reviews
   - MFA for all admin accounts

3. **Monitoring**
   - 24/7 security monitoring
   - Automated threat detection
   - Incident response team

4. **Testing**
   - Penetration testing quarterly
   - Security code reviews
   - Vulnerability scanning

## Security Checklist

### Pre-deployment

- [ ] All dependencies updated and audited
- [ ] Security headers configured
- [ ] TLS 1.3 enabled
- [ ] Secrets rotated
- [ ] RBAC configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Audit logging enabled
- [ ] Backup encryption verified
- [ ] Security scanning completed

### Post-deployment

- [ ] SSL certificate valid
- [ ] Security monitoring active
- [ ] Incident response team notified
- [ ] Penetration test scheduled
- [ ] Security policies documented
- [ ] Employee training completed
- [ ] Compliance audit scheduled
- [ ] Disaster recovery tested
- [ ] Security metrics baseline established
- [ ] Bug bounty program active

## Security Contacts

- **Security Team**: security@guardant.me
- **Incident Response**: incident@guardant.me
- **Bug Bounty**: bugbounty@guardant.me
- **Security Hotline**: +1-xxx-xxx-xxxx (24/7)