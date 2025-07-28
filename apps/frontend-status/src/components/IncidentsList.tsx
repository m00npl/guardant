import React from 'react';
import { AlertCircle, CheckCircle, Eye, Search } from 'lucide-react';
import { Incident } from '../types';
import { formatDateTime, getRelativeTime } from '../utils/api';

interface IncidentsListProps {
  incidents: Incident[];
}

export const IncidentsList: React.FC<IncidentsListProps> = ({ incidents }) => {
  if (incidents.length === 0) {
    return (
      <div className="card p-8 text-center">
        <CheckCircle className="h-12 w-12 text-success-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No incidents to report
        </h3>
        <p className="text-gray-600">
          All systems have been running smoothly. We'll keep you updated if anything changes.
        </p>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-error-600 bg-error-50 border-error-200';
      case 'major':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'minor':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'investigating':
        return <Search className="h-4 w-4" />;
      case 'identified':
        return <Eye className="h-4 w-4" />;
      case 'monitoring':
        return <AlertCircle className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'investigating':
        return 'text-error-600';
      case 'identified':
        return 'text-warning-600';
      case 'monitoring':
        return 'text-blue-600';
      case 'resolved':
        return 'text-success-600';
      default:
        return 'text-gray-600';
    }
  };

  // Group incidents by date
  const groupedIncidents = incidents.reduce((groups, incident) => {
    const date = new Date(incident.startedAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(incident);
    return groups;
  }, {} as Record<string, Incident[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedIncidents)
        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
        .map(([date, dayIncidents]) => (
          <div key={date}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {date === new Date().toDateString() ? 'Today' : date}
            </h3>
            
            <div className="space-y-4">
              {dayIncidents
                .sort((a, b) => b.startedAt - a.startedAt)
                .map((incident) => (
                  <div key={incident.id} className="card p-6">
                    {/* Incident header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
                            {incident.severity.toUpperCase()}
                          </span>
                          <div className={`flex items-center space-x-1 ${getStatusColor(incident.status)}`}>
                            {getStatusIcon(incident.status)}
                            <span className="text-sm font-medium capitalize">
                              {incident.status.replace('_', ' ')}
                            </span>
                          </div>
                          {incident.resolvedAt && (
                            <span className="text-xs text-gray-500">
                              Resolved {getRelativeTime(incident.resolvedAt)}
                            </span>
                          )}
                        </div>
                        
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          {incident.title}
                        </h4>
                        
                        <p className="text-gray-600 mb-3">
                          {incident.description}
                        </p>
                        
                        {/* Affected services */}
                        {incident.affectedServices.length > 0 && (
                          <div className="mb-3">
                            <span className="text-sm font-medium text-gray-700">
                              Affected services: 
                            </span>
                            <span className="text-sm text-gray-600 ml-1">
                              {incident.affectedServices.join(', ')}
                            </span>
                          </div>
                        )}
                        
                        {/* Timing info */}
                        <div className="text-sm text-gray-500">
                          <div>
                            Started: {formatDateTime(incident.startedAt)}
                          </div>
                          {incident.resolvedAt && (
                            <div>
                              Resolved: {formatDateTime(incident.resolvedAt)}
                              <span className="ml-2">
                                (Duration: {Math.round((incident.resolvedAt - incident.startedAt) / 60000)}m)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Incident updates */}
                    {incident.updates.length > 0 && (
                      <div className="border-t border-gray-100 pt-4">
                        <h5 className="font-medium text-gray-900 mb-3">
                          Updates ({incident.updates.length})
                        </h5>
                        <div className="space-y-3">
                          {incident.updates
                            .sort((a, b) => b.timestamp - a.timestamp)
                            .map((update) => (
                              <div key={update.id} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className={`flex items-center space-x-1 ${getStatusColor(update.status)}`}>
                                    {getStatusIcon(update.status)}
                                    <span className="text-sm font-medium capitalize">
                                      {update.status.replace('_', ' ')}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {formatDateTime(update.timestamp)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700">
                                  {update.message}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
    </div>
  );
};