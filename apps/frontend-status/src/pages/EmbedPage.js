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
exports.EmbedPage = void 0;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const StatusHeader_1 = require("../components/StatusHeader");
const ServiceCard_1 = require("../components/ServiceCard");
const LoadingSpinner_1 = require("../components/LoadingSpinner");
const ErrorMessage_1 = require("../components/ErrorMessage");
const useStatusPage_1 = require("../hooks/useStatusPage");
const EmbedPage = () => {
    const [searchParams] = (0, react_router_dom_1.useSearchParams)();
    const theme = searchParams.get('theme') || 'light';
    const compact = searchParams.get('compact') === 'true';
    const services = searchParams.get('services')?.split(',') || [];
    const { data, loading, error } = (0, useStatusPage_1.useStatusPage)();
    const [filteredData, setFilteredData] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (data) {
            let filteredServices = data.services;
            // Filter services if specific ones are requested
            if (services.length > 0 && services[0] !== 'all') {
                filteredServices = data.services.filter(service => services.includes(service.id));
            }
            setFilteredData({
                ...data,
                services: filteredServices
            });
        }
    }, [data, services]);
    // Apply theme to body for embed
    (0, react_1.useEffect)(() => {
        const originalTheme = document.body.className;
        document.body.className = `embed-theme-${theme}`;
        // Add embed-specific styles
        const style = document.createElement('style');
        style.textContent = `
      body.embed-theme-light {
        background: #ffffff;
        color: #111827;
        margin: 0;
        padding: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      body.embed-theme-dark {
        background: #1f2937;
        color: #f9fafb;
        margin: 0;
        padding: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .embed-container {
        max-width: 100%;
        overflow: hidden;
      }
      
      .embed-compact .service-card {
        padding: 6px 0;
        border-bottom: 1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'};
      }
      
      .embed-compact .service-card:last-child {
        border-bottom: none;
      }
      
      .embed-header {
        margin-bottom: ${compact ? '8px' : '16px'};
        padding-bottom: ${compact ? '6px' : '12px'};
        border-bottom: ${compact ? '1px' : '2px'} solid ${theme === 'dark' ? '#374151' : '#e5e7eb'};
      }
      
      .embed-footer {
        margin-top: ${compact ? '8px' : '12px'};
        padding-top: ${compact ? '6px' : '12px'};
        border-top: 1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'};
        text-align: center;
      }
      
      .embed-footer a {
        color: #6366f1;
        text-decoration: none;
        font-size: ${compact ? '11px' : '12px'};
      }
      
      .embed-footer a:hover {
        text-decoration: underline;
      }
    `;
        document.head.appendChild(style);
        return () => {
            document.body.className = originalTheme;
            document.head.removeChild(style);
        };
    }, [theme, compact]);
    if (loading) {
        return (<div className="embed-container">
        <LoadingSpinner_1.LoadingSpinner />
      </div>);
    }
    if (error) {
        return (<div className="embed-container">
        <ErrorMessage_1.ErrorMessage message={error}/>
      </div>);
    }
    if (!filteredData) {
        return (<div className="embed-container">
        <ErrorMessage_1.ErrorMessage message="No status data available"/>
      </div>);
    }
    const overallStatus = filteredData.services.length > 0
        ? filteredData.services.every(s => s.status === 'up')
            ? 'up'
            : filteredData.services.some(s => s.status === 'down')
                ? 'down'
                : 'degraded'
        : 'unknown';
    const getOverallStatusText = (status) => {
        switch (status) {
            case 'up': return 'All Systems Operational';
            case 'down': return 'Some Systems Down';
            case 'degraded': return 'Degraded Performance';
            default: return 'Status Unknown';
        }
    };
    if (compact) {
        return (<div className="embed-container embed-compact">
        <div className="embed-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: overallStatus === 'up' ? '#10b981' :
                    overallStatus === 'down' ? '#ef4444' :
                        overallStatus === 'degraded' ? '#f59e0b' : '#6b7280'
            }}/>
          <span style={{ fontWeight: 500, fontSize: '13px' }}>
            {filteredData.nest.name}
          </span>
          <span style={{
                color: overallStatus === 'up' ? '#10b981' :
                    overallStatus === 'down' ? '#ef4444' :
                        overallStatus === 'degraded' ? '#f59e0b' : '#6b7280',
                fontSize: '12px'
            }}>
            {getOverallStatusText(overallStatus)}
          </span>
        </div>
        
        <div style={{ fontSize: '11px', opacity: 0.7 }}>
          {filteredData.services.length} services monitored
        </div>
        
        <div className="embed-footer">
          <a href={`https://${filteredData.nest.subdomain}.guardant.me`} target="_parent">
            View full status page →
          </a>
        </div>
      </div>);
    }
    return (<div className="embed-container">
      <div className="embed-header">
        <StatusHeader_1.StatusHeader nest={filteredData.nest} overallStatus={overallStatus} lastUpdated={filteredData.lastUpdated} compact={true}/>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '4px' : '8px' }}>
        {filteredData.services.map((service) => (<ServiceCard_1.ServiceCard key={service.id} service={service} compact={compact}/>))}
      </div>
      
      {filteredData.services.length === 0 && (<div style={{
                textAlign: 'center',
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                fontSize: '14px',
                margin: '20px 0'
            }}>
          No services configured
        </div>)}
      
      <div className="embed-footer">
        <a href={`https://${filteredData.nest.subdomain}.guardant.me`} target="_parent">
          View full status page →
        </a>
      </div>
    </div>);
};
exports.EmbedPage = EmbedPage;
//# sourceMappingURL=EmbedPage.js.map