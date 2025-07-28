import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, TrendingUp } from 'lucide-react';
import { useStatusPage } from '../hooks/useStatusPage';
import { StatusHeader } from '../components/StatusHeader';
import { ServiceCard } from '../components/ServiceCard';
import { IncidentsList } from '../components/IncidentsList';
import { StatusFooter } from '../components/StatusFooter';
import { PageLoadingSpinner } from '../components/LoadingSpinner';
import { PageErrorMessage } from '../components/ErrorMessage';

export const StatusPage: React.FC = () => {
  const { data, loading, error, refetch, lastUpdated } = useStatusPage();

  if (loading) {
    return <PageLoadingSpinner />;
  }

  if (error || !data) {
    return <PageErrorMessage error={error || 'Unknown error'} onRetry={refetch} />;
  }

  // Filter active incidents (not resolved)
  const activeIncidents = data.incidents.filter(incident => incident.status !== 'resolved');
  
  // Get recent incidents (last 7 days)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentIncidents = data.incidents.filter(incident => incident.startedAt > sevenDaysAgo);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <StatusHeader data={data} lastUpdated={lastUpdated} />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Services status */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              🐜 Current Status
            </h2>
            <Link
              to="/history"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              View History
            </Link>
          </div>

          {data.services.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No services configured
              </h3>
              <p className="text-gray-600">
                The colony administrator hasn't set up any watchers yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
        </section>

        {/* Active incidents */}
        {activeIncidents.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              🚨 Active Incidents
            </h2>
            <IncidentsList incidents={activeIncidents} />
          </section>
        )}

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
          
          <IncidentsList incidents={recentIncidents} />
        </section>

        {/* Maintenance windows */}
        {data.maintenance.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              🔧 Scheduled Maintenance
            </h2>
            
            <div className="space-y-4">
              {data.maintenance
                .filter(m => m.status !== 'completed')
                .map((maintenance) => (
                  <div key={maintenance.id} className="card p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                            maintenance.status === 'in-progress' 
                              ? 'text-warning-600 bg-warning-50 border-warning-200'
                              : 'text-blue-600 bg-blue-50 border-blue-200'
                          }`}>
                            {maintenance.status.toUpperCase().replace('-', ' ')}
                          </span>
                          <Clock className="h-4 w-4 text-gray-400" />
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
                        
                        {maintenance.affectedServices.length > 0 && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">
                              Affected services: 
                            </span>
                            <span className="text-sm text-gray-600 ml-1">
                              {maintenance.affectedServices.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

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
      <StatusFooter />
    </div>
  );
};