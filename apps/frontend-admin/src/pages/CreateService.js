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
exports.CreateService = void 0;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const react_hot_toast_1 = __importDefault(require("react-hot-toast"));
const CreateService = () => {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [formData, setFormData] = (0, react_1.useState)({
        name: '',
        type: 'web',
        target: '',
        interval: 60,
        monitoring: {
            regions: [],
            strategy: 'closest',
            minRegions: 1,
            maxRegions: 1,
        }
    });
    const serviceTypes = [
        {
            id: 'web',
            name: 'Web Monitor',
            icon: lucide_react_1.Globe,
            description: 'Monitor HTTP/HTTPS websites and APIs',
            color: 'blue',
            placeholder: 'https://example.com'
        },
        {
            id: 'github',
            name: 'GitHub Repo',
            icon: lucide_react_1.Github,
            description: 'Track repository metrics and issues',
            color: 'purple',
            placeholder: 'owner/repository'
        },
        {
            id: 'ping',
            name: 'Ping Test',
            icon: lucide_react_1.Wifi,
            description: 'ICMP ping for connectivity checks',
            color: 'green',
            placeholder: '8.8.8.8 or example.com'
        },
        {
            id: 'port',
            name: 'Port Scanner',
            icon: lucide_react_1.Network,
            description: 'Monitor TCP/UDP ports',
            color: 'orange',
            placeholder: 'example.com:80'
        },
        {
            id: 'tcp',
            name: 'TCP Check',
            icon: lucide_react_1.Server,
            description: 'TCP socket connectivity test',
            color: 'red',
            placeholder: 'example.com:443'
        },
        {
            id: 'keyword',
            name: 'Keyword Hunt',
            icon: lucide_react_1.Search,
            description: 'Search for keywords in web content',
            color: 'yellow',
            placeholder: 'https://example.com'
        },
        {
            id: 'heartbeat',
            name: 'Heartbeat',
            icon: lucide_react_1.Heart,
            description: 'Monitor periodic application signals',
            color: 'pink',
            placeholder: 'unique-heartbeat-id'
        },
        {
            id: 'uptime-api',
            name: 'Uptime API',
            icon: lucide_react_1.Activity,
            description: 'Monitor uptime API endpoints',
            color: 'indigo',
            placeholder: 'https://api.uptimerobot.com/v2/...'
        },
    ];
    const availableRegions = [
        { id: 'eu-west-1', name: 'Europe West (Frankfurt)', flag: '🇩🇪', available: true },
        { id: 'eu-central-1', name: 'Europe Central (Warsaw)', flag: '🇵🇱', available: true },
        { id: 'eu-west-2', name: 'Europe West (London)', flag: '🇬🇧', available: true },
        { id: 'us-east-1', name: 'US East (Virginia)', flag: '🇺🇸', available: true },
        { id: 'us-west-1', name: 'US West (California)', flag: '🇺🇸', available: true },
        { id: 'ca-central-1', name: 'Canada Central (Toronto)', flag: '🇨🇦', available: true },
        { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', flag: '🇸🇬', available: false },
        { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)', flag: '🇯🇵', available: false },
        { id: 'ap-south-1', name: 'Asia Pacific (Mumbai)', flag: '🇮🇳', available: false },
        { id: 'sa-east-1', name: 'South America (São Paulo)', flag: '🇧🇷', available: false },
    ];
    const strategies = [
        {
            id: 'closest',
            name: 'Closest Colony',
            icon: lucide_react_1.MapPin,
            description: 'Monitor from the geographically closest colony',
            recommended: true,
        },
        {
            id: 'all-selected',
            name: 'All Selected',
            icon: lucide_react_1.Globe,
            description: 'Monitor from all selected colonies simultaneously',
            recommended: false,
        },
        {
            id: 'round-robin',
            name: 'Round Robin',
            icon: lucide_react_1.RotateCcw,
            description: 'Rotate between selected colonies for each check',
            recommended: false,
        },
        {
            id: 'failover',
            name: 'Failover',
            icon: lucide_react_1.Zap,
            description: 'Primary colony with backup colonies for redundancy',
            recommended: false,
        },
    ];
    const selectedServiceType = serviceTypes.find(st => st.id === formData.type);
    const handleRegionToggle = (regionId) => {
        const newRegions = formData.monitoring.regions.includes(regionId)
            ? formData.monitoring.regions.filter(r => r !== regionId)
            : [...formData.monitoring.regions, regionId];
        setFormData({
            ...formData,
            monitoring: {
                ...formData.monitoring,
                regions: newRegions,
                maxRegions: Math.max(newRegions.length, formData.monitoring.maxRegions),
            }
        });
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            react_hot_toast_1.default.error('Watcher name is required');
            return;
        }
        if (!formData.target.trim()) {
            react_hot_toast_1.default.error('Target is required');
            return;
        }
        if (formData.monitoring.regions.length === 0) {
            react_hot_toast_1.default.error('Select at least one colony for monitoring');
            return;
        }
        try {
            // TODO: Replace with actual API call
            console.log('Creating watcher:', formData);
            react_hot_toast_1.default.success('🐜 Watcher deployed successfully!');
            navigate('/services');
        }
        catch (error) {
            react_hot_toast_1.default.error('Failed to deploy watcher');
        }
    };
    return (<div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/services')} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <lucide_react_1.ArrowLeft className="h-5 w-5"/>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            🚀 Deploy New Watcher
          </h1>
          <p className="text-gray-600">
            Configure a new watcher to monitor services across your ant colonies
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Service Type Selection */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            👁️ Choose Watcher Type
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {serviceTypes.map((type) => {
            const IconComponent = type.icon;
            const isSelected = formData.type === type.id;
            return (<button key={type.id} type="button" onClick={() => setFormData({ ...formData, type: type.id })} className={`p-4 rounded-lg border-2 text-left transition-all ${isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                  <div className="flex items-center mb-2">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary-100' : 'bg-gray-100'}`}>
                      <IconComponent className={`h-5 w-5 ${isSelected ? 'text-primary-600' : 'text-gray-600'}`}/>
                    </div>
                    <span className={`ml-2 font-medium ${isSelected ? 'text-primary-900' : 'text-gray-900'}`}>
                      {type.name}
                    </span>
                  </div>
                  <p className={`text-sm ${isSelected ? 'text-primary-700' : 'text-gray-600'}`}>
                    {type.description}
                  </p>
                </button>);
        })}
          </div>
        </div>

        {/* Basic Configuration */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ⚙️ Basic Configuration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Watcher Name
              </label>
              <input type="text" required className="input w-full" placeholder="My API Watcher" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}/>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target
              </label>
              <input type="text" required className="input w-full" placeholder={selectedServiceType?.placeholder} value={formData.target} onChange={(e) => setFormData({ ...formData, target: e.target.value })}/>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check Interval
              </label>
              <div className="flex items-center space-x-4">
                <input type="range" min="10" max="3600" step="10" className="flex-1" value={formData.interval} onChange={(e) => setFormData({ ...formData, interval: parseInt(e.target.value) })}/>
                <div className="flex items-center space-x-2 min-w-0">
                  <lucide_react_1.Clock className="h-4 w-4 text-gray-400"/>
                  <span className="text-sm font-medium text-gray-900">
                    {formData.interval}s
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10s (Frequent)</span>
                <span>1h (Rarely)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Colony Selection */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🗺️ Select Monitoring Colonies
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {availableRegions.map((region) => (<button key={region.id} type="button" disabled={!region.available} onClick={() => handleRegionToggle(region.id)} className={`p-4 rounded-lg border text-left transition-all ${!region.available
                ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                : formData.monitoring.regions.includes(region.id)
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{region.flag}</span>
                    <span className="font-medium text-gray-900">
                      {region.name.split(' (')[0]}
                    </span>
                  </div>
                  {!region.available && (<span className="text-xs text-gray-500">Offline</span>)}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {region.name.split(' (')[1]?.replace(')', '')}
                </p>
              </button>))}
          </div>

          {/* Strategy Selection */}
          <div className="border-t pt-6">
            <h4 className="font-medium text-gray-900 mb-4">Monitoring Strategy</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strategies.map((strategy) => {
            const IconComponent = strategy.icon;
            const isSelected = formData.monitoring.strategy === strategy.id;
            return (<button key={strategy.id} type="button" onClick={() => setFormData({
                    ...formData,
                    monitoring: { ...formData.monitoring, strategy: strategy.id }
                })} className={`p-4 rounded-lg border text-left transition-all ${isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <IconComponent className={`h-5 w-5 ${isSelected ? 'text-primary-600' : 'text-gray-600'}`}/>
                        <span className="font-medium text-gray-900">
                          {strategy.name}
                        </span>
                      </div>
                      {strategy.recommended && (<span className="text-xs bg-success-100 text-success-600 px-2 py-1 rounded">
                          Recommended
                        </span>)}
                    </div>
                    <p className="text-sm text-gray-600">
                      {strategy.description}
                    </p>
                  </button>);
        })}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigate('/services')} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            <lucide_react_1.Save className="h-5 w-5 mr-2"/>
            Deploy Watcher
          </button>
        </div>
      </form>
    </div>);
};
exports.CreateService = CreateService;
//# sourceMappingURL=CreateService.js.map