// Nest types (formerly Tenant)
export interface Nest {
  id: string;
  subdomain: string;
  name: string;
  email: string;
  walletAddress: string;
  subscription: NestSubscription;
  settings: NestSettings;
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'suspended' | 'cancelled';
}

export interface NestSubscription {
  tier: 'free' | 'pro' | 'unlimited';
  servicesLimit: number;
  validUntil: number;
  paymentTxHash?: string;
}

export interface NestSettings {
  isPublic: boolean;
  passwordHash?: string;
  customDomain?: string;
  timezone: string;
  language: string;
  theme?: string;
}

// Service types
export type ServiceType = 'web' | 'tcp' | 'ping' | 'github' | 'uptime-api' | 'keyword' | 'heartbeat' | 'port';
export type ServiceStatus = 'up' | 'down' | 'degraded';

// Monitoring regions
export interface MonitoringRegion {
  id: string;
  name: string;
  continent: string;
  country: string;
  city: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  available: boolean;
}

export interface Service {
  id: string;
  nestId: string;
  name: string;
  type: ServiceType;
  target: string;
  interval: number;
  config: Record<string, any>;
  notifications: ServiceNotifications;
  tags: string[];
  isActive: boolean;
  // Monitoring preferences
  monitoring: {
    regions: string[]; // Array of region IDs user wants to monitor from
    strategy: 'closest' | 'all-selected' | 'round-robin' | 'failover';
    minRegions?: number; // Minimum number of regions for redundancy
    maxRegions?: number; // Maximum number of regions (cost control)
  };
  createdAt: number;
  updatedAt: number;
}

export interface ServiceNotifications {
  webhooks: string[];
  emails: string[];
}

// Metrics types
export interface AggregatedMetrics {
  id: string;
  nestId: string;
  serviceId: string;
  period: 'hour' | 'day' | 'month';
  timestamp: number;
  stats: MetricStats;
}

export interface MetricStats {
  uptime: number;
  avgResponseTime: number;
  checks: {
    total: number;
    successful: number;
    failed: number;
  };
  incidents: number;
}

// Incident types
export interface Incident {
  id: string;
  nestId: string;
  serviceId: string;
  startedAt: number;
  resolvedAt?: number;
  duration?: number;
  type: 'down' | 'degraded' | 'maintenance';
  reason: string;
  affectedChecks: number;
}

// Billing types
export interface BillingRecord {
  id: string;
  nestId: string;
  type: 'subscription' | 'overage';
  amount: string;
  tokenAddress: string;
  txHash: string;
  period: {
    start: number;
    end: number;
  };
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: number;
}

// Audit types
export interface AuditLog {
  id: string;
  nestId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: object;
  ipAddress: string;
  userAgent: string;
  timestamp: number;
}

// API Request/Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication types
export interface AuthToken {
  nestId: string;
  exp: number;
  iat: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  nest: Nest;
}