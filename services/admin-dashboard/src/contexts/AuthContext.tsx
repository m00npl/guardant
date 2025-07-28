import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  avatar?: string;
  permissions: string[];
  lastLogin: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  const navigate = useNavigate();

  // API client with auth
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('auth_token');
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      }
    };

    const response = await fetch(`/api/admin${endpoint}`, config);
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid, clear auth state
        localStorage.removeItem('auth_token');
        setState(prev => ({ ...prev, user: null }));
        navigate('/login');
        throw new Error('Authentication expired');
      }
      
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  };

  // Login function
  const login = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || 'Login failed');
      }

      const { user, token } = await response.json();

      // Verify user has admin permissions
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        throw new Error('Access denied. Administrator privileges required.');
      }

      // Store token
      localStorage.setItem('auth_token', token);

      setState({
        user,
        loading: false,
        error: null
      });

      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setState(prev => ({
        ...prev,
        loading: false,
        error: message
      }));
      toast.error(message);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint to invalidate token on server
      await apiCall('/auth/logout', { method: 'POST' });
    } catch (error) {
      // Continue with logout even if server call fails
      console.warn('Logout API call failed:', error);
    }

    // Clear local state
    localStorage.removeItem('auth_token');
    setState({
      user: null,
      loading: false,
      error: null
    });

    toast.success('Logged out successfully');
    navigate('/login');
  };

  // Refresh user data
  const refreshUser = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const user = await apiCall('/auth/me');
      setState(prev => ({
        ...prev,
        user,
        loading: false,
        error: null
      }));
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setState(prev => ({
        ...prev,
        user: null,
        loading: false,
        error: null
      }));
    }
  };

  // Initialize auth state on mount
  useEffect(() => {
    refreshUser();
  }, []);

  // Auto-refresh user data periodically
  useEffect(() => {
    if (!state.user) return;

    const interval = setInterval(() => {
      refreshUser();
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, [state.user]);

  // Handle auth errors globally
  useEffect(() => {
    const handleUnauthorized = (event: CustomEvent) => {
      if (state.user) {
        toast.error('Session expired. Please log in again.');
        logout();
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized as EventListener);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized as EventListener);
    };
  }, [state.user]);

  // Handle browser storage changes (multi-tab logout)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'auth_token' && event.newValue === null && state.user) {
        // Token was removed in another tab
        setState(prev => ({
          ...prev,
          user: null
        }));
        navigate('/login');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [state.user, navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + L = Logout
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'L') {
        event.preventDefault();
        if (state.user) {
          logout();
        }
      }

      // Ctrl/Cmd + Shift + R = Refresh user
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        if (state.user) {
          refreshUser();
          toast.success('User data refreshed');
        }
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => {
      window.removeEventListener('keydown', handleKeyboard);
    };
  }, [state.user]);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};