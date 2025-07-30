"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dashboard = void 0;
const react_1 = __importDefault(require("react"));
const lucide_react_1 = require("lucide-react");
const Dashboard = () => {
    // Mock data - in real app this would come from API
    const stats = {
        totalWatchers: 0,
        activeWatchers: 0,
        incidents: 0,
        avgResponseTime: 0,
        uptime: 100,
        activeColonies: 0,
        busyWorkerAnts: 0,
    };
    return (<div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          🐜 Ant Hill Overview
        </h1>
        <p className="mt-2 text-gray-600">
          Monitor your colony's health and watcher activities
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <lucide_react_1.Eye className="h-6 w-6 text-primary-600"/>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Watchers</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.activeWatchers}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">
              of {stats.totalWatchers} total watchers
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <lucide_react_1.TrendingUp className="h-6 w-6 text-success-600"/>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Colony Uptime</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.uptime}%
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div className="bg-success-500 h-2 rounded-full" style={{ width: `${stats.uptime}%` }}/>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <lucide_react_1.AlertTriangle className="h-6 w-6 text-warning-600"/>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Incidents</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.incidents}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-success-600">
              All watchers operational
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <lucide_react_1.Clock className="h-6 w-6 text-blue-600"/>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Response</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.avgResponseTime || '--'}ms
              </p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">
              Last 24 hours
            </span>
          </div>
        </div>
      </div>

      {/* Colony Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* WorkerAnt Activity */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              🐜 WorkerAnt Activity
            </h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-success-600">Live</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <lucide_react_1.MapPin className="h-4 w-4 text-gray-400 mr-2"/>
                <span className="text-sm font-medium">European Colony</span>
              </div>
              <div className="flex items-center">
                <lucide_react_1.Zap className="h-4 w-4 text-success-500 mr-1"/>
                <span className="text-sm text-gray-600">{stats.busyWorkerAnts} ants busy</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <lucide_react_1.MapPin className="h-4 w-4 text-gray-400 mr-2"/>
                <span className="text-sm font-medium">American Colony</span>
              </div>
              <div className="flex items-center">
                <lucide_react_1.Zap className="h-4 w-4 text-success-500 mr-1"/>
                <span className="text-sm text-gray-600">{stats.busyWorkerAnts} ants busy</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <lucide_react_1.MapPin className="h-4 w-4 text-gray-400 mr-2"/>
                <span className="text-sm font-medium">Asian Colony</span>
              </div>
              <div className="flex items-center">
                <lucide_react_1.Zap className="h-4 w-4 text-success-500 mr-1"/>
                <span className="text-sm text-gray-600">{stats.busyWorkerAnts} ants busy</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              {stats.activeColonies} active colonies monitoring your watchers
            </p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              📡 Recent Activity
            </h3>
          </div>
          
          <div className="space-y-4">
            <div className="text-center py-12">
              <lucide_react_1.Activity className="h-12 w-12 text-gray-300 mx-auto mb-4"/>
              <p className="text-gray-500">No watchers deployed yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Create your first watcher to start monitoring
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🚀 Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="btn-primary text-left p-4 h-auto">
            <div className="flex items-center">
              <lucide_react_1.Eye className="h-5 w-5 mr-3"/>
              <div>
                <div className="font-medium">Deploy First Watcher</div>
                <div className="text-sm opacity-90">Start monitoring a service</div>
              </div>
            </div>
          </button>
          
          <button className="btn-secondary text-left p-4 h-auto">
            <div className="flex items-center">
              <lucide_react_1.MapPin className="h-5 w-5 mr-3"/>
              <div>
                <div className="font-medium">Explore Colonies</div>
                <div className="text-sm opacity-90">See WorkerAnt locations</div>
              </div>
            </div>
          </button>
          
          <button className="btn-secondary text-left p-4 h-auto">
            <div className="flex items-center">
              <lucide_react_1.TrendingUp className="h-5 w-5 mr-3"/>
              <div>
                <div className="font-medium">View Analytics</div>
                <div className="text-sm opacity-90">Detailed performance metrics</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>);
};
exports.Dashboard = Dashboard;
//# sourceMappingURL=Dashboard.js.map