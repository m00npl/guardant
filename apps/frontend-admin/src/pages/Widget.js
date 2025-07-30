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
exports.Widget = void 0;
const react_1 = __importStar(require("react"));
const authStore_1 = require("../stores/authStore");
const Widget = () => {
    const { token } = (0, authStore_1.useAuthStore)();
    const [widgetData, setWidgetData] = (0, react_1.useState)(null);
    const [config, setConfig] = (0, react_1.useState)({
        theme: 'light',
        services: [],
        compact: false
    });
    const [previewHtml, setPreviewHtml] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [activeTab, setActiveTab] = (0, react_1.useState)('javascript');
    (0, react_1.useEffect)(() => {
        loadWidgetConfig();
    }, []);
    (0, react_1.useEffect)(() => {
        if (widgetData) {
            generatePreview();
        }
    }, [config, widgetData]);
    const loadWidgetConfig = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:3012/api/widget/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(config)
            });
            if (!response.ok) {
                throw new Error('Failed to load widget configuration');
            }
            const result = await response.json();
            if (result.success) {
                setWidgetData(result.data);
            }
            else {
                setError(result.error || 'Failed to load widget configuration');
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    const generatePreview = async () => {
        if (!widgetData)
            return;
        try {
            const response = await fetch('http://localhost:3012/api/widget/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(config)
            });
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setPreviewHtml(result.data.html);
                }
            }
        }
        catch (err) {
            console.error('Failed to generate preview:', err);
        }
    };
    const updateConfig = (updates) => {
        const newConfig = { ...config, ...updates };
        setConfig(newConfig);
        // Update widget data with new config
        if (widgetData) {
            const baseUrl = 'http://localhost:3002'; // Should come from env
            const queryParams = new URLSearchParams({
                theme: newConfig.theme,
                services: newConfig.services.length > 0 ? newConfig.services.join(',') : 'all',
                compact: newConfig.compact.toString()
            }).toString();
            const embedCode = `<!-- GuardAnt Status Widget -->\n<div data-guardant=\"${widgetData.subdomain}\"></div>\n<script src=\"${baseUrl}/api/status/${widgetData.subdomain}/widget.js?${queryParams}\" async></script>`;
            const iframeCode = `<!-- GuardAnt Status Widget (iframe) -->\n<iframe src=\"https://${widgetData.subdomain}.guardant.me/embed?theme=${newConfig.theme}&compact=${newConfig.compact}\" width=\"100%\" height=\"${newConfig.compact ? '120' : '300'}\" frameborder=\"0\" scrolling=\"no\"></iframe>`;
            setWidgetData({
                ...widgetData,
                config: newConfig,
                embedCode,
                iframeCode,
                widgetUrl: `${baseUrl}/api/status/${widgetData.subdomain}/widget.js?${queryParams}`
            });
        }
    };
    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            // You could add a toast notification here
            alert('Copied to clipboard!');
        }
        catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    };
    if (loading) {
        return (<div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>);
    }
    if (error) {
        return (<div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Error</h3>
        <p className="text-red-600 mt-1">{error}</p>
      </div>);
    }
    if (!widgetData) {
        return (<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-yellow-800 font-medium">No Data</h3>
        <p className="text-yellow-600 mt-1">Widget configuration could not be loaded.</p>
      </div>);
    }
    if (!widgetData.isPublic) {
        return (<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-yellow-800 font-medium">Status Page Private</h3>
        <p className="text-yellow-600 mt-1">
          Your status page must be public to use the embeddable widget. 
          Please update your settings to make it public.
        </p>
      </div>);
    }
    return (<div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Embeddable Widget</h1>
        <p className="mt-1 text-sm text-gray-500">
          Embed your status page on your website or application
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Configuration</h2>
          
          <div className="space-y-4">
            {/* Theme Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <div className="flex gap-3">
                <button onClick={() => updateConfig({ theme: 'light' })} className={`px-3 py-2 text-sm rounded-md border ${config.theme === 'light'
            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  Light
                </button>
                <button onClick={() => updateConfig({ theme: 'dark' })} className={`px-3 py-2 text-sm rounded-md border ${config.theme === 'dark'
            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  Dark
                </button>
              </div>
            </div>

            {/* Compact Mode */}
            <div>
              <label className="flex items-center">
                <input type="checkbox" checked={config.compact} onChange={(e) => updateConfig({ compact: e.target.checked })} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                <span className="ml-2 text-sm text-gray-700">Compact mode</span>
              </label>
            </div>

            {/* Service Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Services to Display
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                <label className="flex items-center">
                  <input type="checkbox" checked={config.services.length === 0} onChange={(e) => {
            if (e.target.checked) {
                updateConfig({ services: [] });
            }
        }} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                  <span className="ml-2 text-sm text-gray-700 font-medium">All Services</span>
                </label>
                {widgetData.availableServices.map((service) => (<label key={service.id} className="flex items-center">
                    <input type="checkbox" checked={config.services.includes(service.id)} onChange={(e) => {
                if (e.target.checked) {
                    updateConfig({
                        services: [...config.services, service.id]
                    });
                }
                else {
                    updateConfig({
                        services: config.services.filter(id => id !== service.id)
                    });
                }
            }} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                    <span className="ml-2 text-sm text-gray-700">{service.name}</span>
                    <span className="ml-1 text-xs text-gray-500">({service.type})</span>
                  </label>))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Preview</h2>
          
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50" style={{ minHeight: '200px' }}>
            {previewHtml ? (<div dangerouslySetInnerHTML={{ __html: previewHtml }}/>) : (<div className="flex items-center justify-center h-32 text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                <span className="ml-2">Generating preview...</span>
              </div>)}
          </div>
        </div>
      </div>

      {/* Embed Code Section */}
      <div className/>\"bg-white rounded-lg border border-gray-200 p-6\">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Embed Code</h2>
          <div className="flex border border-gray-200 rounded-lg p-1">
            <button onClick={() => setActiveTab('javascript')} className={`px-3 py-1 text-sm rounded-md ${activeTab === 'javascript'
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-gray-600 hover:text-gray-900'}`}>
              JavaScript
            </button>
            <button onClick={() => setActiveTab('iframe')} className={`px-3 py-1 text-sm rounded-md ${activeTab === 'iframe'
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-gray-600 hover:text-gray-900'}`}>
              iframe
            </button>
          </div>
        </div>

        <div className="relative">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
            <code>
              {activeTab === 'javascript' ? widgetData.embedCode : widgetData.iframeCode}
            </code>
          </pre>
          <button onClick={() => copyToClipboard(activeTab === 'javascript' ? widgetData.embedCode : widgetData.iframeCode)} className="absolute top-2 right-2 px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600">
            Copy
          </button>
        </div>

        <div className="mt-4 space-y-2 text-sm text-gray-600">
          <h3 className="font-medium text-gray-900">Integration Notes:</h3>
          {activeTab === 'javascript' ? (<ul className="list-disc list-inside space-y-1">
              <li>The widget automatically updates every minute</li>
              <li>Supports real-time status changes</li>
              <li>Lightweight and fast loading</li>
              <li>Responsive design adapts to container width</li>
            </ul>) : (<ul className="list-disc list-inside space-y-1">
              <li>More isolated from your site's CSS</li>
              <li>Fixed height (adjust as needed)</li>  
              <li>May have slower loading times</li>
              <li>Better for content security policy restrictions</li>
            </ul>)}
        </div>
      </div>);
};
exports.Widget = Widget;
div >
;
;
;
";
//# sourceMappingURL=Widget.js.map