import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { apiFetch } from '../utils/api';
import { 
  Users, 
  Building2, 
  Activity, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  Shield,
  Settings,
  Server,
  Pause,
  Play,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

// API URL is handled by apiFetch utility

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
  const { user } = useAuthStore();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [nests, setNests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect if not platform admin
  if (!user || user.role !== 'platform_admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  useEffect(() => {
    loadPlatformData();
  }, [activeTab]);

  const loadPlatformData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const response = await apiFetch('/api/admin/platform/stats', {
          method: 'POST'
        });
        const data = await response.json();
        setStats(data.data);
      } else if (activeTab === 'nests') {
        const response = await apiFetch('/api/admin/platform/nests/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: 1,
            limit: 50
          })
        });
        const data = await response.json();
        setNests(data.data);
      } else if (activeTab === 'users') {
        const response = await apiFetch('/api/admin/platform/users/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: 1,
            limit: 50
          })
        });
        const data = await response.json();
        setUsers(data.data);
      } else if (activeTab === 'workers') {
        const response = await apiFetch('/api/admin/workers/registrations/approved');
        const data = await response.json();
        setWorkers(data.approved || []);
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
      await apiFetch(`/api/admin/platform/users/${userId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive,
          reason: isActive ? 'Reactivated by platform admin' : 'Deactivated by platform admin'
        })
      });
      toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
      loadPlatformData();
    } catch (error: any) {
      toast.error('Failed to update user status');
    }
  };

  const handleNestStatusChange = async (nestId: string, isActive: boolean) => {
    try {
      await apiFetch(`/api/admin/platform/nests/${nestId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive,
          reason: isActive ? 'Reactivated by platform admin' : 'Deactivated by platform admin'
        })
      });
      toast.success(`Organization ${isActive ? 'activated' : 'deactivated'} successfully`);
      loadPlatformData();
    } catch (error: any) {
      toast.error('Failed to update organization status');
    }
  };

  const handleWorkerDelete = async (workerId: string) => {
    if (!confirm('Are you sure you want to delete this worker? This action cannot be undone.')) return;
    
    try {
      await apiFetch(`/api/admin/workers/${workerId}`, {
        method: 'DELETE'
      });
      toast.success('Worker deleted successfully');
      loadPlatformData();
    } catch (error: any) {
      toast.error('Failed to delete worker');
    }
  };

  const handleWorkerSuspend = async (workerId: string) => {
    try {
      await apiFetch(`/api/admin/workers/${workerId}/suspend`, {
        method: 'POST'
      });
      toast.success('Worker suspended successfully');
      loadPlatformData();
    } catch (error: any) {
      toast.error('Failed to suspend worker');
    }
  };

  const handleWorkerResume = async (workerId: string) => {
    try {
      await apiFetch(`/api/admin/workers/${workerId}/resume`, {
        method: 'POST'
      });
      toast.success('Worker resumed successfully');
      loadPlatformData();
    } catch (error: any) {
      toast.error('Failed to resume worker');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedWorkers.length === 0) {
      toast.error('No workers selected');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedWorkers.length} workers? This action cannot be undone.`)) return;
    
    try {
      await apiFetch(`/api/admin/workers/bulk/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerIds: selectedWorkers })
      });
      toast.success(`${selectedWorkers.length} workers deleted successfully`);
      setSelectedWorkers([]);
      loadPlatformData();
    } catch (error: any) {
      toast.error('Failed to delete workers');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'nests', label: 'Organizations', icon: Building2 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'workers', label: 'Worker Colony', icon: Server },
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

            {/* Workers Tab */}
            {activeTab === 'workers' && (
              <div className="space-y-4">
                {/* Bulk Actions */}
                {selectedWorkers.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                    <span className="text-sm text-blue-800">
                      {selectedWorkers.length} worker{selectedWorkers.length > 1 ? 's' : ''} selected
                    </span>
                    <div className="space-x-2">
                      <button
                        onClick={() => setSelectedWorkers([])}
                        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Clear Selection
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete Selected
                      </button>
                    </div>
                  </div>
                )}

                {/* Workers List */}
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {workers.map((worker) => {
                      const isAlive = worker.lastHeartbeat && 
                        (Date.now() - new Date(worker.lastHeartbeat).getTime()) < 60000;
                      
                      return (
                        <li key={worker.workerId}>
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={selectedWorkers.includes(worker.workerId)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedWorkers([...selectedWorkers, worker.workerId]);
                                    } else {
                                      setSelectedWorkers(selectedWorkers.filter(id => id !== worker.workerId));
                                    }
                                  }}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                                />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {worker.workerId}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    Owner: {worker.ownerEmail} • Region: {worker.region}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  worker.isSuspended ? 'bg-yellow-100 text-yellow-800' :
                                  isAlive ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {worker.isSuspended ? 'Suspended' : isAlive ? 'Online' : 'Offline'}
                                </span>
                                
                                {worker.isSuspended ? (
                                  <button
                                    onClick={() => handleWorkerResume(worker.workerId)}
                                    className="p-1 text-green-600 hover:text-green-900"
                                    title="Resume Worker"
                                  >
                                    <Play className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleWorkerSuspend(worker.workerId)}
                                    className="p-1 text-yellow-600 hover:text-yellow-900"
                                    title="Suspend Worker"
                                  >
                                    <Pause className="h-4 w-4" />
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => handleWorkerDelete(worker.workerId)}
                                  className="p-1 text-red-600 hover:text-red-900"
                                  title="Delete Worker"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-gray-500">
                              Version: {worker.version || 'Unknown'}
                              {' • '}
                              Points: {worker.points || 0}
                              {' • '}
                              Approved: {new Date(worker.approvedAt).toLocaleDateString()}
                              {worker.lastHeartbeat && (
                                <>
                                  {' • '}
                                  Last seen: {new Date(worker.lastHeartbeat).toLocaleString()}
                                </>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {workers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No workers found
                    </div>
                  )}
                </div>
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