"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusPage = void 0;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const useStatusPage_1 = require("../hooks/useStatusPage");
const StatusHeader_1 = require("../components/StatusHeader");
const ServiceCard_1 = require("../components/ServiceCard");
const IncidentsList_1 = require("../components/IncidentsList");
const StatusFooter_1 = require("../components/StatusFooter");
const LoadingSpinner_1 = require("../components/LoadingSpinner");
const ErrorMessage_1 = require("../components/ErrorMessage");
const StatusPage = () => {
    const { data, loading, error, refetch, lastUpdated } = (0, useStatusPage_1.useStatusPage)();
    if (loading) {
        return <LoadingSpinner_1.PageLoadingSpinner />;
    }
    if (error || !data) {
        return <ErrorMessage_1.PageErrorMessage error={error || 'Unknown error'} onRetry={refetch}/>;
    }
    // Filter active incidents (not resolved)
    const activeIncidents = data.incidents.filter(incident => incident.status !== 'resolved');
    // Get recent incidents (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentIncidents = data.incidents.filter(incident => incident.startedAt > sevenDaysAgo);
    return (<div className="min-h-screen bg-gray-50">
      {/* Header */}
      <StatusHeader_1.StatusHeader data={data} lastUpdated={lastUpdated}/>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Services status */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              🐜 Current Status
            </h2>
            <react_router_dom_1.Link to="/history" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              <lucide_react_1.TrendingUp className="h-4 w-4 mr-2"/>
              View History
            </react_router_dom_1.Link>
          </div>

          {data.services.length === 0 ? (<div className="card p-8 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No services configured
              </h3>
              <p className="text-gray-600">
                The colony administrator hasn't set up any watchers yet.
              </p>
            </div>) : (<div className="space-y-4">
              {data.services.map((service) => (<ServiceCard_1.ServiceCard key={service.id} service={service}/>))}
            </div>)}
        </section>

        {/* Active incidents */}
        {activeIncidents.length > 0 && (<section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              🚨 Active Incidents
            </h2>
            <IncidentsList_1.IncidentsList incidents={activeIncidents}/>
          </section>)}

        {/* Recent incidents */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              📊 Recent Incidents
            </h2>
            <span className="text-sm text-gray-500">
              Last 7 days
            </span>
          </div>
          
          <IncidentsList_1.IncidentsList incidents={recentIncidents}/>
        </section>

        {/* Maintenance windows */}
        {data.maintenance.length > 0 && (<section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              🔧 Scheduled Maintenance
            </h2>
            
            <div className="space-y-4">
              {data.maintenance
                .filter(m => m.status !== 'completed')
                .map((maintenance) => (<div key={maintenance.id} className="card p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${maintenance.status === 'in-progress'
                    ? 'text-warning-600 bg-warning-50 border-warning-200'
                    : 'text-blue-600 bg-blue-50 border-blue-200'}`}>
                            {maintenance.status.toUpperCase().replace('-', ' ')}
                          </span>
                          <lucide_react_1.Clock className="h-4 w-4 text-gray-400"/>
                          <span className="text-sm text-gray-600">
                            {new Date(maintenance.scheduledStart).toLocaleString()} - {new Date(maintenance.scheduledEnd).toLocaleString()}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {maintenance.title}
                        </h3>
                        
                        <p className="text-gray-600 mb-3">
                          {maintenance.description}
                        </p>
                        
                        {maintenance.affectedServices.length > 0 && (<div>
                            <span className="text-sm font-medium text-gray-700">
                              Affected services: 
                            </span>
                            <span className="text-sm text-gray-600 ml-1">
                              {maintenance.affectedServices.join(', ')}
                            </span>
                          </div>)}
                      </div>
                    </div>
                  </div>))}
            </div>
          </section>)}

        {/* Status overview stats */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            📈 Colony Overview
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-6">
              <div className="flex items-center">
                <div className="text-3xl mr-4">🐜</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {data.services.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Watchers</div>
                </div>
              </div>
            </div>
            
            <div className="card p-6">
              <div className="flex items-center">
                <div className="text-3xl mr-4">✅</div>
                <div>
                  <div className="text-2xl font-bold text-success-600">
                    {data.services.filter(s => s.status === 'up').length}
                  </div>
                  <div className="text-sm text-gray-600">Operational</div>
                </div>
              </div>
            </div>
            
            <div className="card p-6">
              <div className="flex items-center">
                <div className="text-3xl mr-4">🗺️</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {new Set(data.services.flatMap(s => s.regions.map(r => r.id))).size}
                  </div>
                  <div className="text-sm text-gray-600">Active Colonies</div>
                </div>
              </div>
            </div>
            
            <div className="card p-6">
              <div className="flex items-center">
                <div className="text-3xl mr-4">
                  {data.services.length > 0 && data.services.every(s => s.status === 'up') ? '🎉' : '⚠️'}
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {data.services.length > 0
            ? Math.round(data.services.reduce((acc, s) => acc + s.uptime, 0) / data.services.length)
            : 0}%
                  </div>
                  <div className="text-sm text-gray-600">Avg Uptime</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <StatusFooter_1.StatusFooter />
    </div>);
};
exports.StatusPage = StatusPage;
//# sourceMappingURL=StatusPage.js.map