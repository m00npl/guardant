"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformAdminPage = void 0;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const AuthContext_1 = require("../contexts/AuthContext");
const axios_1 = __importDefault(require("axios"));
const lucide_react_1 = require("lucide-react");
const react_hot_toast_1 = require("react-hot-toast");
const API_URL = import.meta.env.VITE_API_URL || '/api/admin';
const PlatformAdminPage = () => {
    const { user } = (0, AuthContext_1.useAuth)();
    const [activeTab, setActiveTab] = (0, react_1.useState)('overview');
    const [stats, setStats] = (0, react_1.useState)(null);
    const [nests, setNests] = (0, react_1.useState)([]);
    const [users, setUsers] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    // Redirect if not platform admin
    if (!user || user.role !== 'platform_admin') {
        return <react_router_dom_1.Navigate to="/admin/dashboard" replace/>;
    }
    (0, react_1.useEffect)(() => {
        loadPlatformData();
    }, [activeTab]);
    const loadPlatformData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'overview') {
                const response = await axios_1.default.post(`${API_URL}/platform/stats`);
                setStats(response.data.data);
            }
            else if (activeTab === 'nests') {
                const response = await axios_1.default.post(`${API_URL}/platform/nests/list`, {
                    page: 1,
                    limit: 50
                });
                setNests(response.data.data);
            }
            else if (activeTab === 'users') {
                const response = await axios_1.default.post(`${API_URL}/platform/users/list`, {
                    page: 1,
                    limit: 50
                });
                setUsers(response.data.data);
            }
        }
        catch (error) {
            react_hot_toast_1.toast.error('Failed to load platform data');
            console.error(error);
        }
        finally {
            setLoading(false);
        }
    };
    const handleUserStatusChange = async (userId, isActive) => {
        try {
            await axios_1.default.post(`${API_URL}/platform/users/${userId}/status`, {
                isActive,
                reason: isActive ? 'Reactivated by platform admin' : 'Deactivated by platform admin'
            });
            react_hot_toast_1.toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
            loadPlatformData();
        }
        catch (error) {
            react_hot_toast_1.toast.error('Failed to update user status');
        }
    };
    const handleNestStatusChange = async (nestId, isActive) => {
        try {
            await axios_1.default.post(`${API_URL}/platform/nests/${nestId}/status`, {
                isActive,
                reason: isActive ? 'Reactivated by platform admin' : 'Deactivated by platform admin'
            });
            react_hot_toast_1.toast.success(`Organization ${isActive ? 'activated' : 'deactivated'} successfully`);
            loadPlatformData();
        }
        catch (error) {
            react_hot_toast_1.toast.error('Failed to update organization status');
        }
    };
    const tabs = [
        { id: 'overview', label: 'Overview', icon: lucide_react_1.Activity },
        { id: 'nests', label: 'Organizations', icon: lucide_react_1.Building2 },
        { id: 'users', label: 'Users', icon: lucide_react_1.Users },
        { id: 'revenue', label: 'Revenue', icon: lucide_react_1.DollarSign },
        { id: 'security', label: 'Security', icon: lucide_react_1.Shield },
        { id: 'settings', label: 'Settings', icon: lucide_react_1.Settings },
    ];
    return (<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <lucide_react_1.Shield className="h-8 w-8 mr-3 text-red-600"/>
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
            return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`
                  py-2 px-1 border-b-2 font-medium text-sm flex items-center
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}>
                <Icon className="h-5 w-5 mr-2"/>
                {tab.label}
              </button>);
        })}
        </nav>
      </div>

      <div className="mt-8">
        {loading ? (<div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>) : (<>
            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (<div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Organizations</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.overview.totalNests}</p>
                      </div>
                      <lucide_react_1.Building2 className="h-8 w-8 text-blue-500"/>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Users</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.overview.totalUsers}</p>
                      </div>
                      <lucide_react_1.Users className="h-8 w-8 text-green-500"/>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Services</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.overview.totalServices}</p>
                      </div>
                      <lucide_react_1.Activity className="h-8 w-8 text-purple-500"/>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">MRR</p>
                        <p className="text-3xl font-bold text-gray-900">${stats.revenue.mrr}</p>
                      </div>
                      <lucide_react_1.DollarSign className="h-8 w-8 text-yellow-500"/>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">New Users (30d)</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.overview.newUsers}</p>
                      </div>
                      <lucide_react_1.TrendingUp className="h-8 w-8 text-indigo-500"/>
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
              </div>)}

            {/* Organizations Tab */}
            {activeTab === 'nests' && (<div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {nests.map((nest) => (<li key={nest.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{nest.name}</p>
                              <p className="text-sm text-gray-500">{nest.subdomain}.guardant.me</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${nest.subscription?.tier === 'unlimited' ? 'bg-purple-100 text-purple-800' :
                        nest.subscription?.tier === 'pro' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'}`}>
                              {nest.subscription?.tier || 'Free'}
                            </span>
                            <button onClick={() => handleNestStatusChange(nest.id, !nest.isActive)} className={`px-3 py-1 text-xs font-medium rounded ${nest.isActive
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
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
                    </li>))}
                </ul>
              </div>)}

            {/* Users Tab */}
            {activeTab === 'users' && (<div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {users.map((user) => (<li key={user.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.role === 'owner' ? 'bg-yellow-100 text-yellow-800' :
                        user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'}`}>
                              {user.role}
                            </span>
                            <button onClick={() => handleUserStatusChange(user.id, !user.isActive)} className={`px-3 py-1 text-xs font-medium rounded ${user.isActive
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
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
                    </li>))}
                </ul>
              </div>)}

            {/* Other tabs - placeholder */}
            {['revenue', 'security', 'settings'].includes(activeTab) && (<div className="bg-white p-8 rounded-lg shadow text-center">
                <lucide_react_1.AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4"/>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
                <p className="text-gray-600">This section is under development</p>
              </div>)}
          </>)}
      </div>
    </div>);
};
exports.PlatformAdminPage = PlatformAdminPage;
//# sourceMappingURL=PlatformAdminPage.js.map