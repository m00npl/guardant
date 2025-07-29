import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  Users, 
  Building2, 
  Activity, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  Shield,
  Settings
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '/api/admin';

interface PlatformStats {
  overview: {
    totalNests: number;
    totalUsers: number;
    totalServices: number;
    activeNests: number;
    newUsers: number;
  };
  subscriptions: {
    free: number;
    pro: number;
    unlimited: number;
  };
  revenue: {
    monthly: number;
    annual: number;
    mrr: number;
    arr: number;
  };
}

export const PlatformAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [nests, setNests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect if not platform admin
  if (!user || user.role !== 'platform_admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  useEffect(() => {
    loadPlatformData();
  }, [activeTab]);

  const loadPlatformData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const response = await axios.post(`${API_URL}/platform/stats`);
        setStats(response.data.data);
      } else if (activeTab === 'nests') {
        const response = await axios.post(`${API_URL}/platform/nests/list`, {
          page: 1,
          limit: 50
        });
        setNests(response.data.data);
      } else if (activeTab === 'users') {
        const response = await axios.post(`${API_URL}/platform/users/list`, {
          page: 1,
          limit: 50
        });
        setUsers(response.data.data);
      }
    } catch (error: any) {
      toast.error('Failed to load platform data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserStatusChange = async (userId: string, isActive: boolean) => {
    try {
      await axios.post(`${API_URL}/platform/users/${userId}/status`, {
        isActive,
        reason: isActive ? 'Reactivated by platform admin' : 'Deactivated by platform admin'
      });
      toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
      loadPlatformData();
    } catch (error: any) {
      toast.error('Failed to update user status');
    }
  };

  const handleNestStatusChange = async (nestId: string, isActive: boolean) => {
    try {
      await axios.post(`${API_URL}/platform/nests/${nestId}/status`, {
        isActive,
        reason: isActive ? 'Reactivated by platform admin' : 'Deactivated by platform admin'
      });
      toast.success(`Organization ${isActive ? 'activated' : 'deactivated'} successfully`);
      loadPlatformData();
    } catch (error: any) {
      toast.error('Failed to update organization status');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'nests', label: 'Organizations', icon: Building2 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'revenue', label: 'Revenue', icon: DollarSign },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Shield className="h-8 w-8 mr-3 text-red-600" />
          Platform Administration
        </h1>
        <p className="mt-2 text-gray-600">
          Manage all organizations, users, and platform settings
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm flex items-center
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Organizations</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.overview.totalNests}</p>
                      </div>
                      <Building2 className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Users</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.overview.totalUsers}</p>
                      </div>
                      <Users className="h-8 w-8 text-green-500" />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Services</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.overview.totalServices}</p>
                      </div>
                      <Activity className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">MRR</p>
                        <p className="text-3xl font-bold text-gray-900">${stats.revenue.mrr}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-yellow-500" />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">New Users (30d)</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.overview.newUsers}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-indigo-500" />
                    </div>
                  </div>
                </div>

                {/* Subscription Distribution */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Distribution</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{stats.subscriptions.free}</p>
                      <p className="text-sm text-gray-600">Free</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{stats.subscriptions.pro}</p>
                      <p className="text-sm text-gray-600">Pro</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{stats.subscriptions.unlimited}</p>
                      <p className="text-sm text-gray-600">Unlimited</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Organizations Tab */}
            {activeTab === 'nests' && (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {nests.map((nest) => (
                    <li key={nest.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{nest.name}</p>
                              <p className="text-sm text-gray-500">{nest.subdomain}.guardant.me</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              nest.subscription?.tier === 'unlimited' ? 'bg-purple-100 text-purple-800' :
                              nest.subscription?.tier === 'pro' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {nest.subscription?.tier || 'Free'}
                            </span>
                            <button
                              onClick={() => handleNestStatusChange(nest.id, !nest.isActive)}
                              className={`px-3 py-1 text-xs font-medium rounded ${
                                nest.isActive
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {nest.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          Created: {new Date(nest.createdAt).toLocaleDateString()}
                          {' • '}
                          Services: {nest.stats?.servicesCount || 0}
                          {' • '}
                          Users: {nest.stats?.usersCount || 0}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <li key={user.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              user.role === 'owner' ? 'bg-yellow-100 text-yellow-800' :
                              user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role}
                            </span>
                            <button
                              onClick={() => handleUserStatusChange(user.id, !user.isActive)}
                              className={`px-3 py-1 text-xs font-medium rounded ${
                                user.isActive
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          Last login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                          {' • '}
                          Created: {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Other tabs - placeholder */}
            {['revenue', 'security', 'settings'].includes(activeTab) && (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
                <p className="text-gray-600">This section is under development</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};