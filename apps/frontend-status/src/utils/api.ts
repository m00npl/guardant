import type { ApiResponse, StatusPageData, HistoricalData } from '../types';

// Get subdomain from current hostname
export const getSubdomain = (): string => {
  const hostname = window.location.hostname;
  
  // Handle localhost development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // In development, get subdomain from URL parameter or default to 'demo'
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('nest') || 'demo';
  }
  
  // Extract subdomain from hostname (e.g., 'mycompany.guardant.me' -> 'mycompany')
  const parts = hostname.split('.');
  if (parts.length >= 3 && parts[1] === 'guardant' && parts[2] === 'me') {
    return parts[0];
  }
  
  // Handle custom domains - we'll need to query the API to find the nest
  return '';
};

// API base URL - in production this would be the public API
const API_BASE_URL = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:3002';

class StatusPageAPI {
  private subdomain: string;
  
  constructor() {
    this.subdomain = getSubdomain();
  }
  
  /**
   * Fetch status page data for the current subdomain/nest
   */
  async getStatusPage(): Promise<StatusPageData> {
    // Use GET endpoint with subdomain in URL (more RESTful)
    const url = `${API_BASE_URL}/api/status/${this.subdomain}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result: ApiResponse<StatusPageData> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch status page data');
      }
      
      return result.data!;
    } catch (error) {
      console.error('Failed to fetch status page:', error);
      throw error;
    }
  }
  
  /**
   * Fetch historical data for a specific service
   */
  async getHistoricalData(serviceId: string, period: '24h' | '7d' | '30d' | '90d'): Promise<HistoricalData> {
    const url = `${API_BASE_URL}/api/status/history`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subdomain: this.subdomain,
          serviceId,
          period
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result: ApiResponse<HistoricalData> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch historical data');
      }
      
      return result.data!;
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      throw error;
    }
  }
  
  /**
   * Subscribe to real-time updates via Server-Sent Events
   */
  subscribeToUpdates(onUpdate: (data: Partial<StatusPageData>) => void): EventSource {
    const url = `${API_BASE_URL}/api/status/${this.subdomain}/events`;
    const eventSource = new EventSource(url);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onUpdate(data);
      } catch (error) {
        console.error('Failed to parse SSE data:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
    };
    
    return eventSource;
  }
}

// Export singleton instance
export const statusAPI = new StatusPageAPI();

// Utility functions
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'up':
      return 'text-success-600';
    case 'down':
      return 'text-error-600';
    case 'degraded':
      return 'text-warning-600';
    case 'maintenance':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
};

export const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'up':
      return 'status-badge up';
    case 'down':
      return 'status-badge down';
    case 'degraded':
      return 'status-badge degraded';
    case 'maintenance':
      return 'bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 rounded-full text-sm font-medium border';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200 px-3 py-1 rounded-full text-sm font-medium border';
  }
};

export const formatUptime = (uptime: number): string => {
  return `${uptime.toFixed(2)}%`;
};

export const formatResponseTime = (responseTime: number | undefined): string => {
  if (!responseTime) return 'N/A';
  if (responseTime < 1000) return `${responseTime}ms`;
  return `${(responseTime / 1000).toFixed(1)}s`;
};

export const getRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export const formatDateTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};