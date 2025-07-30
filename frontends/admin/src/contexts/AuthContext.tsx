import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  subdomain: string;
  name: string;
  role?: 'platform_admin' | 'owner' | 'admin' | 'editor' | 'viewer';
  subscription: {
    tier: 'free' | 'pro' | 'unlimited';
    servicesLimit: number;
    validUntil: number;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, subdomain: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = import.meta.env.VITE_API_URL || '/api/admin';

// Don't set baseURL, use relative paths
// axios.defaults.baseURL = API_URL;

// Add request interceptor to add auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      delete axios.defaults.headers.common['Authorization'];
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  // Check session periodically
  useEffect(() => {
    if (!user) return;

    const checkSession = async () => {
      try {
        // Make a lightweight request to check if session is still valid
        await axios.get(`${API_URL}/auth/check`);
      } catch (error: any) {
        if (error.response?.status === 401) {
          // Session expired - logout and redirect
          toast.error('Your session has expired. Please log in again.');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userData');
          setUser(null);
          window.location.href = '/admin/login';
        }
      }
    };

    // Check session every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    
    // Also check when window regains focus after being inactive
    const handleFocus = () => {
      checkSession();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await axios.post(`${API_URL}/nest/profile`);
      // The response contains the nest data, but we need to get user data
      // The user data should be already available from login
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      if (userData && userData.id) {
        setUser(userData);
      }
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { tokens, user, nest } = response.data.data;
      
      localStorage.setItem('token', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      // Store user data with nest information
      const userData = {
        ...user,
        subdomain: nest.subdomain,
        name: nest.name,
        subscription: nest.subscription
      };
      localStorage.setItem('userData', JSON.stringify(userData));
      
      setUser(userData);
      toast.success('Welcome back!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed');
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, subdomain: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        email,
        password,
        name,
        subdomain
      });
      
      const { tokens, user, nest } = response.data.data;
      
      localStorage.setItem('token', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      // Store user data with nest information
      const userData = {
        ...user,
        subdomain: nest.subdomain,
        name: nest.name,
        subscription: nest.subscription
      };
      localStorage.setItem('userData', JSON.stringify(userData));
      
      setUser(userData);
      toast.success('Account created successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Registration failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');

      const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      const { token } = response.data.data;
      
      localStorage.setItem('token', token);
    } catch (error) {
      await logout();
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};