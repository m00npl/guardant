"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusHeader = void 0;
const react_1 = __importDefault(require("react"));
const StatusHeader = ({ data, lastUpdated }) => {
    const getOverallStatus = () => {
        const services = data.services;
        if (services.length === 0)
            return { status: 'unknown', message: 'No services configured' };
        const downServices = services.filter(s => s.status === 'down').length;
        const degradedServices = services.filter(s => s.status === 'degraded').length;
        const maintenanceServices = services.filter(s => s.status === 'maintenance').length;
        if (downServices > 0) {
            return {
                status: 'down',
                message: `${downServices} service${downServices === 1 ? '' : 's'} experiencing issues`
            };
        }
        if (degradedServices > 0) {
            return {
                status: 'degraded',
                message: `${degradedServices} service${degradedServices === 1 ? '' : 's'} degraded`
            };
        }
        if (maintenanceServices > 0) {
            return {
                status: 'maintenance',
                message: `${maintenanceServices} service${maintenanceServices === 1 ? '' : 's'} under maintenance`
            };
        }
        return {
            status: 'up',
            message: 'All systems operational'
        };
    };
    const overallStatus = getOverallStatus();
    const getStatusIcon = () => {
        switch (overallStatus.status) {
            case 'up':
                return '✅';
            case 'degraded':
                return '⚠️';
            case 'down':
                return '❌';
            case 'maintenance':
                return '🔧';
            default:
                return '❓';
        }
    };
    const getStatusColor = () => {
        switch (overallStatus.status) {
            case 'up':
                return 'text-success-600';
            case 'degraded':
                return 'text-warning-600';
            case 'down':
                return 'text-error-600';
            case 'maintenance':
                return 'text-blue-600';
            default:
                return 'text-gray-600';
        }
    };
    return (<div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with logo and nest info */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            {/* Logo placeholder - will use actual ant.svg */}
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">🐜</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {data.nest.name}
              </h1>
              <p className="text-gray-600">
                Service Status Dashboard
              </p>
            </div>
          </div>
          
          {/* Last updated */}
          {lastUpdated && (<div className="text-right text-sm text-gray-500">
              <div>Last updated</div>
              <div className="font-medium">
                {new Date(lastUpdated).toLocaleTimeString()}
              </div>
            </div>)}
        </div>

        {/* Overall status */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center space-x-4">
            <div className="text-4xl">
              {getStatusIcon()}
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${getStatusColor()}`}>
                {overallStatus.message}
              </h2>
              <p className="text-gray-600 mt-1">
                Monitoring {data.services.length} service{data.services.length === 1 ? '' : 's'} 
                from {new Set(data.services.flatMap(s => s.regions.map(r => r.name))).size} region{new Set(data.services.flatMap(s => s.regions.map(r => r.name))).size === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </div>

        {/* Active incidents banner */}
        {data.incidents.filter(i => i.status !== 'resolved').length > 0 && (<div className="mt-6">
            <div className="incident-banner">
              <div className="flex items-center">
                <div className="text-error-600 text-xl mr-3">⚠️</div>
                <div>
                  <h3 className="font-semibold text-error-900">
                    Active Incidents
                  </h3>
                  <p className="text-error-700 text-sm">
                    {data.incidents.filter(i => i.status !== 'resolved').length} ongoing incident
                    {data.incidents.filter(i => i.status !== 'resolved').length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            </div>
          </div>)}

        {/* Maintenance banner */}
        {data.maintenance.filter(m => m.status !== 'completed').length > 0 && (<div className="mt-6">
            <div className="maintenance-banner">
              <div className="flex items-center">
                <div className="text-warning-600 text-xl mr-3">🔧</div>
                <div>
                  <h3 className="font-semibold text-warning-900">
                    Scheduled Maintenance
                  </h3>
                  <p className="text-warning-700 text-sm">
                    {data.maintenance.filter(m => m.status !== 'completed').length} scheduled maintenance window
                    {data.maintenance.filter(m => m.status !== 'completed').length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            </div>
          </div>)}
      </div>
    </div>);
};
exports.StatusHeader = StatusHeader;
//# sourceMappingURL=StatusHeader.js.map