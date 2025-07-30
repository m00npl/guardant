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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceCard = void 0;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const api_1 = require("../utils/api");
const ServiceCard = ({ service }) => {
    const [expanded, setExpanded] = (0, react_1.useState)(false);
    const getServiceIcon = () => {
        switch (service.type) {
            case 'web':
                return <lucide_react_1.Globe className="h-5 w-5"/>;
            case 'tcp':
                return <lucide_react_1.Server className="h-5 w-5"/>;
            case 'ping':
                return <lucide_react_1.Wifi className="h-5 w-5"/>;
            case 'github':
                return <lucide_react_1.Github className="h-5 w-5"/>;
            case 'uptime-api':
                return <lucide_react_1.Activity className="h-5 w-5"/>;
            case 'keyword':
                return <lucide_react_1.Search className="h-5 w-5"/>;
            case 'heartbeat':
                return <lucide_react_1.Heart className="h-5 w-5"/>;
            case 'port':
                return <lucide_react_1.Network className="h-5 w-5"/>;
            default:
                return <lucide_react_1.Server className="h-5 w-5"/>;
        }
    };
    const getStatusEmoji = (status) => {
        switch (status) {
            case 'up':
                return '✅';
            case 'down':
                return '❌';
            case 'degraded':
                return '⚠️';
            case 'maintenance':
                return '🔧';
            default:
                return '❓';
        }
    };
    return (<div className="service-item">
      {/* Main service info */}
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center space-x-4 flex-1">
          <div className="flex items-center space-x-3">
            <div className="text-gray-600">
              {getServiceIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {service.name}
              </h3>
              {service.description && (<p className="text-gray-600 text-sm">
                  {service.description}
                </p>)}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* Status badge */}
          <div className="flex items-center space-x-2">
            <span className="text-lg">
              {getStatusEmoji(service.status)}
            </span>
            <span className={(0, api_1.getStatusBadgeClass)(service.status)}>
              {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
            </span>
          </div>

          {/* Key metrics */}
          <div className="hidden md:flex items-center space-x-6 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {(0, api_1.formatUptime)(service.uptime)}
              </div>
              <div className="text-gray-500">Uptime</div>
            </div>
            
            {service.responseTime && service.type !== 'github' && (<div className="text-center">
                <div className="font-semibold text-gray-900">
                  {(0, api_1.formatResponseTime)(service.responseTime)}
                </div>
                <div className="text-gray-500">Response</div>
              </div>)}
          </div>

          {/* Expand button */}
          <button className="text-gray-400 hover:text-gray-600">
            {expanded ? <lucide_react_1.ChevronDown className="h-5 w-5"/> : <lucide_react_1.ChevronRight className="h-5 w-5"/>}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (<div className="mt-6 border-t border-gray-100 pt-6">
          {/* Mobile metrics (shown on small screens) */}
          <div className="md:hidden grid grid-cols-2 gap-4 mb-6">
            <div className="metric-card">
              <div className="metric-value">
                {(0, api_1.formatUptime)(service.uptime)}
              </div>
              <div className="metric-label">Current Uptime</div>
            </div>
            
            {service.responseTime && service.type !== 'github' && (<div className="metric-card">
                <div className="metric-value">
                  {(0, api_1.formatResponseTime)(service.responseTime)}
                </div>
                <div className="metric-label">Response Time</div>
              </div>)}
          </div>

          {/* Historical metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="metric-card">
              <div className="metric-value">
                {(0, api_1.formatUptime)(service.metrics.uptime24h)}
              </div>
              <div className="metric-label">24h Uptime</div>
            </div>
            
            <div className="metric-card">
              <div className="metric-value">
                {(0, api_1.formatUptime)(service.metrics.uptime7d)}
              </div>
              <div className="metric-label">7d Uptime</div>
            </div>
            
            <div className="metric-card">
              <div className="metric-value">
                {(0, api_1.formatUptime)(service.metrics.uptime30d)}
              </div>
              <div className="metric-label">30d Uptime</div>
            </div>
          </div>

          {/* Response time metrics (exclude GitHub) */}
          {service.type !== 'github' && (service.metrics.avgResponseTime24h || service.metrics.avgResponseTime7d || service.metrics.avgResponseTime30d) && (<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {service.metrics.avgResponseTime24h && (<div className="metric-card">
                  <div className="metric-value">
                    {(0, api_1.formatResponseTime)(service.metrics.avgResponseTime24h)}
                  </div>
                  <div className="metric-label">24h Avg Response</div>
                </div>)}
              
              {service.metrics.avgResponseTime7d && (<div className="metric-card">
                  <div className="metric-value">
                    {(0, api_1.formatResponseTime)(service.metrics.avgResponseTime7d)}
                  </div>
                  <div className="metric-label">7d Avg Response</div>
                </div>)}
              
              {service.metrics.avgResponseTime30d && (<div className="metric-card">
                  <div className="metric-value">
                    {(0, api_1.formatResponseTime)(service.metrics.avgResponseTime30d)}
                  </div>
                  <div className="metric-label">30d Avg Response</div>
                </div>)}
            </div>)}

          {/* Regional status */}
          {service.regions.length > 0 && (<div>
              <h4 className="font-semibold text-gray-900 mb-3">
                🗺️ Regional Status ({service.regions.length} colonies)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {service.regions.map((region) => (<div key={region.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className={`status-dot ${region.status}`}/>
                      <span className="font-medium text-gray-900 text-sm">
                        {region.name}
                      </span>
                    </div>
                    <div className="text-right text-sm">
                      {region.responseTime && service.type !== 'github' && (<div className="font-medium text-gray-900">
                          {(0, api_1.formatResponseTime)(region.responseTime)}
                        </div>)}
                      <div className="text-gray-500 text-xs">
                        {new Date(region.lastCheck).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>))}
              </div>
            </div>)}

          {/* Last check info */}
          <div className="mt-4 text-sm text-gray-500">
            Last checked: {new Date(service.lastCheck).toLocaleString()}
          </div>
        </div>)}
    </div>);
};
exports.ServiceCard = ServiceCard;
//# sourceMappingURL=ServiceCard.js.map