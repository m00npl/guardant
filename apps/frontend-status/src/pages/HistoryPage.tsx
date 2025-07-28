import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, TrendingUp } from 'lucide-react';
import { useStatusPage } from '../hooks/useStatusPage';
import { StatusFooter } from '../components/StatusFooter';
import { PageLoadingSpinner } from '../components/LoadingSpinner';
import { PageErrorMessage } from '../components/ErrorMessage';
import { formatUptime } from '../utils/api';

export const HistoryPage: React.FC = () => {
  const { serviceId } = useParams();
  const { data, loading, error, refetch } = useStatusPage();
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d' | '90d'>('7d');

  if (loading) {
    return <PageLoadingSpinner />;
  }

  if (error || !data) {
    return <PageErrorMessage error={error || 'Unknown error'} onRetry={refetch} />;
  }

  // Filter services if serviceId is provided
  const services = serviceId 
    ? data.services.filter(s => s.id === serviceId)
    : data.services;

  const periods = [
    { key: '24h' as const, label: '24 Hours' },
    { key: '7d' as const, label: '7 Days' },
    { key: '30d' as const, label: '30 Days' },
    { key: '90d' as const, label: '90 Days' },
  ];

  const getUptimeForPeriod = (service: any, period: string) => {
    switch (period) {
      case '24h':
        return service.metrics.uptime24h;
      case '7d':
        return service.metrics.uptime7d;
      case '30d':
        return service.metrics.uptime30d;
      default:
        return service.metrics.uptime30d; // Fallback for 90d
    }
  };

  const getAvgResponseTimeForPeriod = (service: any, period: string) => {
    switch (period) {
      case '24h':
        return service.metrics.avgResponseTime24h;
      case '7d':
        return service.metrics.avgResponseTime7d;
      case '30d':
        return service.metrics.avgResponseTime30d;
      default:
        return service.metrics.avgResponseTime30d; // Fallback for 90d
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link
              to="/"
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Status
            </Link>
          </div>

          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">🐜</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {serviceId ? `${services[0]?.name} History` : `${data.nest.name} History`}
              </h1>
              <p className="text-gray-600">
                Historical performance and incident data
              </p>
            </div>
          </div>

          {/* Period selector */}
          <div className="flex items-center space-x-1 p-1 bg-gray-100 rounded-lg w-fit">
            {periods.map((period) => (
              <button
                key={period.key}
                onClick={() => setSelectedPeriod(period.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedPeriod === period.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary stats */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            📊 Summary ({periods.find(p => p.key === selectedPeriod)?.label})
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-success-600 mr-4" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {services.length > 0 
                      ? formatUptime(services.reduce((acc, s) => acc + getUptimeForPeriod(s, selectedPeriod), 0) / services.length)
                      : '0%'}
                  </div>
                  <div className="text-sm text-gray-600">Average Uptime</div>
                </div>
              </div>
            </div>
            
            <div className="card p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-blue-600 mr-4" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {data.incidents.filter(i => {
                      const cutoff = selectedPeriod === '24h' ? Date.now() - 24 * 60 * 60 * 1000 :
                                   selectedPeriod === '7d' ? Date.now() - 7 * 24 * 60 * 60 * 1000 :
                                   selectedPeriod === '30d' ? Date.now() - 30 * 24 * 60 * 60 * 1000 :
                                   Date.now() - 90 * 24 * 60 * 60 * 1000;
                      return i.startedAt > cutoff;
                    }).length}
                  </div>
                  <div className="text-sm text-gray-600">Incidents</div>
                </div>
              </div>
            </div>
            
            <div className="card p-6">
              <div className="flex items-center">
                <div className="text-3xl mr-4">⚡</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {services.length > 0 
                      ? Math.round(services.filter(s => getAvgResponseTimeForPeriod(s, selectedPeriod)).reduce((acc, s) => {
                          const responseTime = getAvgResponseTimeForPeriod(s, selectedPeriod);
                          return acc + (responseTime || 0);
                        }, 0) / services.filter(s => getAvgResponseTimeForPeriod(s, selectedPeriod)).length) || 0
                      : 0}ms
                  </div>
                  <div className="text-sm text-gray-600">Avg Response Time</div>
                </div>
              </div>
            </div>
            
            <div className="card p-6">
              <div className="flex items-center">
                <div className="text-3xl mr-4">🐜</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {services.length}
                  </div>
                  <div className="text-sm text-gray-600">Monitored Services</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Service-specific history */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            🔍 Service Details
          </h2>
          
          <div className="space-y-6">
            {services.map((service) => (
              <div key={service.id} className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className={`status-dot ${service.status}`} />
                    <h3 className="text-xl font-semibold text-gray-900">
                      {service.name}
                    </h3>
                    <span className="text-sm text-gray-500">
                      ({service.type})
                    </span>
                  </div>
                </div>

                {/* Historical metrics grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-success-600">
                      {formatUptime(getUptimeForPeriod(service, selectedPeriod))}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Uptime
                    </div>
                  </div>
                  
                  {service.type !== 'github' && getAvgResponseTimeForPeriod(service, selectedPeriod) && (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {getAvgResponseTimeForPeriod(service, selectedPeriod)}ms
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Avg Response Time
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {service.regions.length}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Monitoring Regions
                    </div>
                  </div>
                </div>

                {/* Regional breakdown */}
                {service.regions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Regional Performance
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {service.regions.map((region) => (
                        <div key={region.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className={`status-dot ${region.status}`} />
                              <span className="font-medium text-gray-900 text-sm">
                                {region.name}
                              </span>
                            </div>
                            {region.responseTime && service.type !== 'github' && (
                              <span className="text-sm text-gray-600">
                                {region.responseTime}ms
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Historical incidents */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            📋 Incident History ({periods.find(p => p.key === selectedPeriod)?.label})
          </h2>
          
          {(() => {
            const cutoff = selectedPeriod === '24h' ? Date.now() - 24 * 60 * 60 * 1000 :
                         selectedPeriod === '7d' ? Date.now() - 7 * 24 * 60 * 60 * 1000 :
                         selectedPeriod === '30d' ? Date.now() - 30 * 24 * 60 * 60 * 1000 :
                         Date.now() - 90 * 24 * 60 * 60 * 1000;
            
            const periodIncidents = data.incidents.filter(i => i.startedAt > cutoff);
            
            if (periodIncidents.length === 0) {
              return (
                <div className="card p-8 text-center">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No incidents in this period
                  </h3>
                  <p className="text-gray-600">
                    All services have been running smoothly during the selected time period.
                  </p>
                </div>
              );
            }
            
            return (
              <div className="space-y-4">
                {periodIncidents.map((incident) => (
                  <div key={incident.id} className="card p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                            incident.severity === 'critical' ? 'text-error-600 bg-error-50 border-error-200' :
                            incident.severity === 'major' ? 'text-warning-600 bg-warning-50 border-warning-200' :
                            'text-blue-600 bg-blue-50 border-blue-200'
                          }`}>
                            {incident.severity.toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            incident.status === 'resolved' ? 'text-success-600 bg-success-50' :
                            'text-warning-600 bg-warning-50'
                          }`}>
                            {incident.status.toUpperCase().replace('_', ' ')}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {incident.title}
                        </h3>
                        
                        <p className="text-gray-600 mb-3">
                          {incident.description}
                        </p>
                        
                        <div className="text-sm text-gray-500">
                          <div>
                            Started: {new Date(incident.startedAt).toLocaleString()}
                          </div>
                          {incident.resolvedAt && (
                            <div>
                              Duration: {Math.round((incident.resolvedAt - incident.startedAt) / 60000)} minutes
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>
      </main>

      {/* Footer */}
      <StatusFooter />
    </div>
  );
};