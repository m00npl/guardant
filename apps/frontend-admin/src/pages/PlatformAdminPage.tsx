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
  Trash2,
  Edit,
  Plus,
  X,
  Check,
  Clock
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
  const [pendingWorkers, setPendingWorkers] = useState<any[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [showPending, setShowPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEditNestModal, setShowEditNestModal] = useState(false);
  const [showCreateNestModal, setShowCreateNestModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [editingNest, setEditingNest] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingWorker, setEditingWorker] = useState<any>(null);
  const [showEditWorkerModal, setShowEditWorkerModal] = useState(false);

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
        // Load stats
        const response = await apiFetch('/api/admin/platform/stats', {
          method: 'POST'
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load stats');
        }
        setStats(data.data);
        
        // Also load pending workers count for overview
        const pendingResponse = await apiFetch('/api/admin/platform/workers/pending', {
          method: 'POST'
        });
        const pendingData = await pendingResponse.json();
        setPendingWorkers(pendingData.data || []);
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
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load nests');
        }
        setNests(data.data || []);
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
        // Get approved workers
        const approvedResponse = await apiFetch('/api/admin/workers/registrations/approved');
        const approvedData = await approvedResponse.json();
        setWorkers(approvedData.approved || []);
        
        // Get pending workers
        const pendingResponse = await apiFetch('/api/admin/platform/workers/pending', {
          method: 'POST'
        });
        const pendingData = await pendingResponse.json();
        setPendingWorkers(pendingData.data || []);
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

  const handleWorkerApprove = async (workerId: string) => {
    try {
      await apiFetch(`/api/admin/platform/workers/${workerId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region: 'auto' })
      });
      toast.success('Worker approved successfully');
      loadPlatformData();
    } catch (error: any) {
      toast.error('Failed to approve worker');
    }
  };

  const handleWorkerReject = async (workerId: string) => {
    if (!confirm('Are you sure you want to reject this worker?')) return;
    
    try {
      await apiFetch(`/api/admin/platform/workers/${workerId}/reject`, {
        method: 'POST'
      });
      toast.success('Worker rejected successfully');
      loadPlatformData();
    } catch (error: any) {
      toast.error('Failed to reject worker');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedWorkers.length} workers? This action cannot be undone.`)) return;
    
    try {
      await apiFetch('/api/admin/workers/bulk/delete', {
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

  const handleCreateNest = async (nestData: any) => {
    try {
      await apiFetch('/api/admin/platform/nests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nestData)
      });
      toast.success('Organization created successfully');
      setShowCreateNestModal(false);
      loadPlatformData();
    } catch (error: any) {
      toast.error('Failed to create organization');
    }
  };

  const handleUpdateNest = async (nestId: string, nestData: any) => {
    try {
      await apiFetch(`/api/admin/platform/nests/${nestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nestData)
      });
      toast.success('Organization updated successfully');
      setShowEditNestModal(false);
      setEditingNest(null);
      loadPlatformData();
    } catch (error: any) {
      toast.error('Failed to update organization');
    }
  };

  const handleDeleteNest = async (nestId: string) => {
    if (!confirm('Are you sure you want to delete this organization? This will also delete all associated services.')) return;
    
    try {
      await apiFetch(`/api/admin/platform/nests/${nestId}`, {
        method: 'DELETE'
      });
      toast.success('Organization deleted successfully');
      loadPlatformData();
    } catch (error: any) {
      toast.error('Failed to delete organization');
    }
  };

  const handleCreateUser = async (userData: any) => {
    try {
      await apiFetch('/api/admin/platform/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      toast.success('User created successfully');
      setShowCreateUserModal(false);
      loadPlatformData();
    } catch (error: any) {
      toast.error('Failed to create user');
    }
  };

  const handleUpdateUser = async (userId: string, userData: any) => {
    try {
      await apiFetch(`/api/admin/platform/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      toast.success('User updated successfully');
      setShowEditUserModal(false);
      setEditingUser(null);
      loadPlatformData();
    } catch (error: any) {
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await apiFetch(`/api/admin/platform/users/${userId}`, {
        method: 'DELETE'
      });
      toast.success('User deleted successfully');
      loadPlatformData();
    } catch (error: any) {
      toast.error('Failed to delete user');
    }
  };

  const handleUpdateWorker = async (workerId: string, workerData: any) => {
    try {
      await apiFetch(`/api/admin/platform/workers/${workerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workerData)
      });
      toast.success('Worker updated successfully');
      setShowEditWorkerModal(false);
      setEditingWorker(null);
      loadPlatformData();
    } catch (error: any) {
      toast.error('Failed to update worker');
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Activity },
    { id: 'nests', name: 'Organizations', icon: Building2 },
    { id: 'users', name: 'Users', icon: Users },
    { id: 'workers', name: 'Worker Colony', icon: Server },
    { id: 'revenue', name: 'Revenue', icon: DollarSign },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Platform Administration</h3>
            <p className="text-sm text-yellow-700 mt-1">
              You have full access to all platform features. Use with caution.
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center py-2 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
                {tab.id === 'workers' && pendingWorkers.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                    {pendingWorkers.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Pending Workers Alert */}
                {pendingWorkers.length > 0 && (
                  <div className="col-span-full bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Clock className="h-8 w-8 text-orange-600 mr-3" />
                        <div>
                          <h3 className="text-lg font-medium text-orange-900">
                            {pendingWorkers.length} Workers Pending Approval
                          </h3>
                          <p className="text-sm text-orange-700 mt-1">
                            New worker registrations are waiting for your approval
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('workers')}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                      >
                        Review Now
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Building2 className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Organizations</dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-gray-900">
                              {stats.overview.totalNests}
                            </div>
                            <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                              {stats.overview.activeNests} active
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Users className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-gray-900">
                              {stats.overview.totalUsers}
                            </div>
                            <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                              +{stats.overview.newUsers} new
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Activity className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Services</dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-gray-900">
                              {stats.overview.totalServices}
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DollarSign className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Monthly Recurring Revenue</dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-gray-900">
                              ${stats.revenue.mrr}
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <TrendingUp className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Annual Recurring Revenue</dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-gray-900">
                              ${stats.revenue.arr}
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Free</dt>
                        <dd className="text-sm font-semibold text-gray-900">{stats.subscriptions.free}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Pro</dt>
                        <dd className="text-sm font-semibold text-gray-900">{stats.subscriptions.pro}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Unlimited</dt>
                        <dd className="text-sm font-semibold text-gray-900">{stats.subscriptions.unlimited}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            )}

            {/* Organizations Tab */}
            {activeTab === 'nests' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Organizations</h2>
                  <button
                    onClick={() => setShowCreateNestModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Organization
                  </button>
                </div>

                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {nests.map((nest) => (
                      <li key={nest.id}>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {nest.name}
                              </p>
                              <span className={`ml-3 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                nest.subscription?.tier === 'unlimited' ? 'bg-purple-100 text-purple-800' :
                                nest.subscription?.tier === 'pro' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {nest.subscription?.tier || 'free'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleNestStatusChange(nest.id, !nest.isActive)}
                                className={`p-1 ${nest.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                                title={nest.isActive ? 'Deactivate' : 'Activate'}
                              >
                                {nest.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingNest(nest);
                                  setShowEditNestModal(true);
                                }}
                                className="p-1 text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteNest(nest.id)}
                                className="p-1 text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 sm:flex sm:justify-between">
                            <div className="sm:flex">
                              <p className="flex items-center text-sm text-gray-500">
                                {nest.subdomain}.guardant.me
                              </p>
                              <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                Owner: {nest.ownerEmail}
                              </p>
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                              <p>
                                Services: {nest.stats?.servicesCount || 0}
                                {' • '}
                                Users: {nest.stats?.usersCount || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                    {nests.length === 0 && (
                      <li className="text-center py-8 text-gray-500">
                        No organizations found
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Users</h2>
                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create User
                  </button>
                </div>

                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <li key={user.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {user.name}
                            </p>
                            <span className={`ml-3 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.role === 'platform_admin' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'owner' ? 'bg-blue-100 text-blue-800' :
                              user.role === 'admin' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleUserStatusChange(user.id, !user.isActive)}
                              className={`p-1 ${user.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                              title={user.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {user.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setShowEditUserModal(true);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-900"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1 text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          {user.email}
                          {user.lastLoginAt && (
                            <> • Last login: {new Date(user.lastLoginAt).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                  {users.length === 0 && (
                    <li className="text-center py-8 text-gray-500">
                      No users found
                    </li>
                  )}
                </ul>
                </div>
              </div>
            )}

            {/* Workers Tab */}
            {activeTab === 'workers' && (
              <div className="space-y-4">
                {/* Tab Switcher */}
                <div className="flex space-x-4 mb-4">
                  <button
                    onClick={() => setShowPending(false)}
                    className={`px-4 py-2 rounded-lg ${!showPending ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    Approved Workers ({workers.length})
                  </button>
                  <button
                    onClick={() => setShowPending(true)}
                    className={`px-4 py-2 rounded-lg ${showPending ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'} ${
                      pendingWorkers.length > 0 ? 'animate-pulse' : ''
                    }`}
                  >
                    Pending Approval ({pendingWorkers.length})
                  </button>
                </div>

                {/* Bulk Actions */}
                {!showPending && selectedWorkers.length > 0 && (
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
                  {!showPending && (
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={workers.length > 0 && selectedWorkers.length === workers.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedWorkers(workers.map(w => w.workerId));
                            } else {
                              setSelectedWorkers([]);
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                        />
                        <span className="text-sm font-medium text-gray-700">Select All</span>
                      </label>
                    </div>
                  )}
                  <ul className="divide-y divide-gray-200">
                    {!showPending && workers.map((worker) => {
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
                                    {worker.displayName || worker.workerId}
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
                                
                                <button
                                  onClick={() => {
                                    setEditingWorker(worker);
                                    setShowEditWorkerModal(true);
                                  }}
                                  className="p-1 text-blue-600 hover:text-blue-900"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                
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
                  
                  {/* Pending Workers */}
                  {showPending && (
                    <>
                      {pendingWorkers.map((worker) => (
                        <li key={worker.workerId}>
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {worker.workerId}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Owner: {worker.ownerEmail} • Region: {worker.region || 'Not specified'}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Registered: {new Date(worker.registeredAt).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleWorkerApprove(worker.workerId)}
                                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleWorkerReject(worker.workerId)}
                                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </>
                  )}
                  
                  {((showPending && pendingWorkers.length === 0) || (!showPending && workers.length === 0)) && (
                    <div className="text-center py-8 text-gray-500">
                      No {showPending ? 'pending' : 'approved'} workers found
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

      {/* Create/Edit Organization Modal */}
      {(showCreateNestModal || showEditNestModal) && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  name: formData.get('name') as string,
                  subdomain: formData.get('subdomain') as string,
                  ownerEmail: formData.get('ownerEmail') as string,
                  tier: formData.get('tier') as string,
                };
                if (editingNest) {
                  handleUpdateNest(editingNest.id, data);
                } else {
                  handleCreateNest(data);
                }
              }}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {editingNest ? 'Edit Organization' : 'Create Organization'}
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Organization Name
                          </label>
                          <input
                            type="text"
                            name="name"
                            id="name"
                            defaultValue={editingNest?.name}
                            required
                            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700">
                            Subdomain
                          </label>
                          <input
                            type="text"
                            name="subdomain"
                            id="subdomain"
                            defaultValue={editingNest?.subdomain}
                            required
                            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label htmlFor="ownerEmail" className="block text-sm font-medium text-gray-700">
                            Owner Email
                          </label>
                          <input
                            type="email"
                            name="ownerEmail"
                            id="ownerEmail"
                            defaultValue={editingNest?.ownerEmail}
                            required
                            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label htmlFor="tier" className="block text-sm font-medium text-gray-700">
                            Subscription Tier
                          </label>
                          <select
                            name="tier"
                            id="tier"
                            defaultValue={editingNest?.subscription?.tier || 'free'}
                            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="unlimited">Unlimited</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {editingNest ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateNestModal(false);
                      setShowEditNestModal(false);
                      setEditingNest(null);
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit User Modal */}
      {(showCreateUserModal || showEditUserModal) && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  name: formData.get('name') as string,
                  email: formData.get('email') as string,
                  password: formData.get('password') as string,
                  role: formData.get('role') as string,
                  nestId: formData.get('nestId') as string,
                };
                if (editingUser) {
                  handleUpdateUser(editingUser.id, data);
                } else {
                  handleCreateUser(data);
                }
              }}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {editingUser ? 'Edit User' : 'Create User'}
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="user-name" className="block text-sm font-medium text-gray-700">
                            Name
                          </label>
                          <input
                            type="text"
                            name="name"
                            id="user-name"
                            defaultValue={editingUser?.name}
                            required
                            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label htmlFor="user-email" className="block text-sm font-medium text-gray-700">
                            Email
                          </label>
                          <input
                            type="email"
                            name="email"
                            id="user-email"
                            defaultValue={editingUser?.email}
                            required
                            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                        {!editingUser && (
                          <div>
                            <label htmlFor="user-password" className="block text-sm font-medium text-gray-700">
                              Password
                            </label>
                            <input
                              type="password"
                              name="password"
                              id="user-password"
                              required
                              className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        )}
                        <div>
                          <label htmlFor="user-role" className="block text-sm font-medium text-gray-700">
                            Role
                          </label>
                          <select
                            name="role"
                            id="user-role"
                            defaultValue={editingUser?.role || 'viewer'}
                            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                            <option value="platform_admin">Platform Admin</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="user-nestId" className="block text-sm font-medium text-gray-700">
                            Organization
                          </label>
                          <select
                            name="nestId"
                            id="user-nestId"
                            defaultValue={editingUser?.nestId}
                            required
                            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="">Select Organization</option>
                            {nests.map((nest) => (
                              <option key={nest.id} value={nest.id}>
                                {nest.name} ({nest.subdomain})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {editingUser ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateUserModal(false);
                      setShowEditUserModal(false);
                      setEditingUser(null);
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Worker Modal */}
      {showEditWorkerModal && editingWorker && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  displayName: formData.get('displayName') as string,
                  region: formData.get('region') as string,
                };
                handleUpdateWorker(editingWorker.workerId, data);
              }}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Edit Worker
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="worker-id" className="block text-sm font-medium text-gray-700">
                            Worker ID
                          </label>
                          <input
                            type="text"
                            id="worker-id"
                            value={editingWorker.workerId}
                            disabled
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md bg-gray-100"
                          />
                        </div>
                        <div>
                          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                            Display Name
                          </label>
                          <input
                            type="text"
                            name="displayName"
                            id="displayName"
                            defaultValue={editingWorker.displayName || ''}
                            placeholder="e.g., My Worker #1"
                            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label htmlFor="region" className="block text-sm font-medium text-gray-700">
                            Region
                          </label>
                          <select
                            name="region"
                            id="region"
                            defaultValue={editingWorker.region || 'auto'}
                            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="auto">Auto-detect</option>
                            <option value="us-east-1">US East (Virginia)</option>
                            <option value="us-west-1">US West (California)</option>
                            <option value="eu-west-1">EU West (Ireland)</option>
                            <option value="eu-central-1">EU Central (Frankfurt)</option>
                            <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                            <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Update
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditWorkerModal(false);
                      setEditingWorker(null);
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};