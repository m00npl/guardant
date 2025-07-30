"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_query_1 = require("@tanstack/react-query");
const framer_motion_1 = require("framer-motion");
const lucide_react_1 = require("lucide-react");
// Components
const StatsCard_1 = __importDefault(require("../../components/ui/StatsCard"));
const Chart_1 = __importDefault(require("../../components/ui/Chart"));
const StatusIndicator_1 = __importDefault(require("../../components/ui/StatusIndicator"));
const LoadingSpinner_1 = __importDefault(require("../../components/ui/LoadingSpinner"));
const ErrorMessage_1 = __importDefault(require("../../components/ui/ErrorMessage"));
// Hooks
const AuthContext_1 = require("../../contexts/AuthContext");
const OverviewPage = () => {
    const { user } = (0, AuthContext_1.useAuth)();
    // Fetch system overview data
    const { data: overview, isLoading, error, refetch } = (0, react_query_1.useQuery)({
        queryKey: ['system-overview'],
        queryFn: async () => {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/admin/overview', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch system overview');
            }
            return response.json();
        },
        refetchInterval: 30000, // Refresh every 30 seconds
        staleTime: 15000 // Data is fresh for 15 seconds
    });
    if (isLoading) {
        return (<div className="flex items-center justify-center h-64">
        <LoadingSpinner_1.default size="lg"/>
      </div>);
    }
    if (error) {
        return (<ErrorMessage_1.default title="Failed to load system overview" message="Unable to fetch system data. Please try again." onRetry={() => refetch()}/>);
    }
    if (!overview) {
        return null;
    }
    const { statistics, systemHealth, recentActivity, performanceMetrics, alerts } = overview;
    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };
    const getSystemHealthColor = (status) => {
        switch (status) {
            case 'healthy': return 'text-green-600';
            case 'degraded': return 'text-yellow-600';
            case 'critical': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };
    const getAlertSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };
    return (<framer_motion_1.motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
      {/* Welcome Header */}
      <framer_motion_1.motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Welcome back, {user?.name}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Here's what's happening with your GuardAnt infrastructure
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <StatusIndicator_1.default status={systemHealth.overall}/>
            <span className={`text-sm font-medium ${getSystemHealthColor(systemHealth.overall)}`}>
              System {systemHealth.overall}
            </span>
          </div>
        </div>
      </framer_motion_1.motion.div>

      {/* Key Statistics */}
      <framer_motion_1.motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard_1.default title="Total Nests" value={statistics.totalNests.toString()} change="+12%" trend="up" icon={lucide_react_1.Users} color="blue"/>
        <StatsCard_1.default title="Monitored Services" value={statistics.totalServices.toString()} change="+8%" trend="up" icon={lucide_react_1.Server} color="green"/>
        <StatsCard_1.default title="Active Alerts" value={statistics.activeAlerts.toString()} change={statistics.activeAlerts > 0 ? "-5%" : "0%"} trend={statistics.activeAlerts > 0 ? "down" : "neutral"} icon={lucide_react_1.AlertTriangle} color={statistics.activeAlerts > 0 ? "red" : "gray"}/>
        <StatsCard_1.default title="System Uptime" value={`${statistics.systemUptime.toFixed(2)}%`} change="+0.1%" trend="up" icon={lucide_react_1.TrendingUp} color="purple"/>
      </framer_motion_1.motion.div>

      {/* Performance Overview */}
      <framer_motion_1.motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Request Volume (24h)
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <lucide_react_1.Clock className="w-4 h-4"/>
                <span>{statistics.avgResponseTime}ms avg</span>
              </div>
              <div className="flex items-center space-x-1">
                <lucide_react_1.Activity className="w-4 h-4"/>
                <span>{statistics.totalRequests24h.toLocaleString()} requests</span>
              </div>
            </div>
          </div>
          <Chart_1.default type="area" data={performanceMetrics.requestVolume} xKey="timestamp" yKey="requests" height={300}/>
        </div>

        <div className="space-y-6">
          {/* Resource Usage */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Resource Usage
            </h3>
            <div className="space-y-4">
              {Object.entries(performanceMetrics.resourceUsage).map(([resource, usage]) => {
            const getResourceIcon = (resource) => {
                switch (resource) {
                    case 'cpu': return lucide_react_1.Zap;
                    case 'memory': return lucide_react_1.Database;
                    case 'disk': return lucide_react_1.Server;
                    case 'network': return lucide_react_1.Globe;
                    default: return lucide_react_1.Activity;
                }
            };
            const Icon = getResourceIcon(resource);
            const getUsageColor = (usage) => {
                if (usage >= 80)
                    return 'text-red-600 bg-red-100';
                if (usage >= 60)
                    return 'text-yellow-600 bg-yellow-100';
                return 'text-green-600 bg-green-100';
            };
            return (<div key={resource} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4 text-gray-500"/>
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {resource}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className={`h-2 rounded-full ${getUsageColor(usage).includes('red') ? 'bg-red-500' :
                    getUsageColor(usage).includes('yellow') ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${usage}%` }}/>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${getUsageColor(usage)}`}>
                        {usage}%
                      </span>
                    </div>
                  </div>);
        })}
            </div>
          </div>

          {/* Error Rate */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Error Rate (24h)
            </h3>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {statistics.errorRate24h.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {statistics.errorRate24h < 1 ? 'Excellent' :
            statistics.errorRate24h < 5 ? 'Good' : 'Needs attention'}
              </div>
            </div>
          </div>
        </div>
      </framer_motion_1.motion.div>

      {/* System Health & Recent Activity */}
      <framer_motion_1.motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            System Health
          </h3>
          <div className="space-y-4">
            {systemHealth.services.map((service, index) => (<div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <StatusIndicator_1.default status={service.status} size="sm"/>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {service.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {service.uptime.toFixed(2)}% uptime
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {service.responseTime}ms
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    response time
                  </div>
                </div>
              </div>))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {recentActivity.slice(0, 6).map((activity) => {
            const getActivityIcon = (type) => {
                switch (type) {
                    case 'deployment': return lucide_react_1.GitBranch;
                    case 'alert': return lucide_react_1.AlertTriangle;
                    case 'user_action': return lucide_react_1.Users;
                    case 'system_event': return lucide_react_1.Activity;
                    default: return lucide_react_1.Activity;
                }
            };
            const getSeverityColor = (severity) => {
                switch (severity) {
                    case 'error': return 'text-red-600';
                    case 'warning': return 'text-yellow-600';
                    default: return 'text-gray-600';
                }
            };
            const Icon = getActivityIcon(activity.type);
            return (<div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <Icon className={`w-4 h-4 mt-0.5 ${getSeverityColor(activity.severity)}`}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {activity.message}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>);
        })}
          </div>
        </div>
      </framer_motion_1.motion.div>

      {/* Active Alerts */}
      {alerts.length > 0 && (<framer_motion_1.motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Active Alerts
            </h3>
            <button className="text-sm text-blue-600 hover:text-blue-500">
              View all alerts
            </button>
          </div>
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (<div key={alert.id} className={`p-4 rounded-lg border ${getAlertSeverityColor(alert.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {alert.title}
                      </span>
                      {!alert.acknowledged && (<span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                          Unacknowledged
                        </span>)}
                    </div>
                    <div className="text-sm mt-1">
                      {alert.description}
                    </div>
                    <div className="text-xs mt-2 opacity-75">
                      {alert.source} • {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="ml-4">
                    <button className="text-xs bg-white bg-opacity-50 hover:bg-opacity-75 px-2 py-1 rounded transition-colors">
                      Acknowledge
                    </button>
                  </div>
                </div>
              </div>))}
          </div>
        </framer_motion_1.motion.div>)}
    </framer_motion_1.motion.div>);
};
exports.default = OverviewPage;
//# sourceMappingURL=OverviewPage.js.map