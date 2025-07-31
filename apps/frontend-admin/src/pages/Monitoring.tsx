import React, { useState, useEffect } from 'react'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  BarChart,
  Loader2
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { apiFetch } from '../utils/api'
import toast from 'react-hot-toast'

interface ServiceStatus {
  id: string
  name: string
  url: string
  status: 'up' | 'down' | 'degraded'
  responseTime: number
  lastChecked: number
  uptime: number
  regions: Array<{
    id: string
    name: string
    status: 'up' | 'down' | 'degraded'
    responseTime: number
  }>
  history: Array<{
    timestamp: number
    status: 'up' | 'down' | 'degraded'
    responseTime: number
  }>
}

interface Alert {
  id: string
  serviceId: string
  serviceName: string
  type: 'down' | 'slow' | 'recovered'
  message: string
  timestamp: number
  acknowledged: boolean
}

export const Monitoring: React.FC = () => {
  const { token } = useAuthStore()
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedService, setSelectedService] = useState<string | null>(null)

  useEffect(() => {
    fetchMonitoringData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchMonitoringData, 10000) // Refresh every 10 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const fetchMonitoringData = async () => {
    try {
      const response = await apiFetch('/api/admin/monitoring/status', {
        method: 'GET'
      })

      if (!response.ok) {
        if (response.status === 404) {
          // API not implemented yet, use sample data
          setSampleData()
          return
        }
        throw new Error('Failed to fetch monitoring data')
      }

      const data = await response.json()
      setServices(data.services || [])
      setAlerts(data.alerts || [])
    } catch (error) {
      console.error('Monitoring API not available, using sample data')
      setSampleData()
    } finally {
      setLoading(false)
    }
  }

  const setSampleData = () => {
    // Sample data for demonstration
    setServices([
      {
        id: '1',
        name: 'Main Website',
        url: 'https://example.com',
        status: 'up',
        responseTime: 245,
        lastChecked: Date.now() - 30000,
        uptime: 99.95,
        regions: [
          { id: 'us-east', name: 'US East', status: 'up', responseTime: 245 },
          { id: 'eu-west', name: 'EU West', status: 'up', responseTime: 312 }
        ],
        history: generateSampleHistory()
      },
      {
        id: '2',
        name: 'API Server',
        url: 'https://api.example.com',
        status: 'degraded',
        responseTime: 1250,
        lastChecked: Date.now() - 45000,
        uptime: 98.5,
        regions: [
          { id: 'us-east', name: 'US East', status: 'degraded', responseTime: 1250 },
          { id: 'eu-west', name: 'EU West', status: 'up', responseTime: 450 }
        ],
        history: generateSampleHistory()
      },
      {
        id: '3',
        name: 'Database',
        url: 'https://db.example.com',
        status: 'down',
        responseTime: 0,
        lastChecked: Date.now() - 120000,
        uptime: 95.2,
        regions: [
          { id: 'us-east', name: 'US East', status: 'down', responseTime: 0 },
          { id: 'eu-west', name: 'EU West', status: 'down', responseTime: 0 }
        ],
        history: generateSampleHistory()
      }
    ])

    setAlerts([
      {
        id: '1',
        serviceId: '3',
        serviceName: 'Database',
        type: 'down',
        message: 'Service is not responding',
        timestamp: Date.now() - 120000,
        acknowledged: false
      },
      {
        id: '2',
        serviceId: '2',
        serviceName: 'API Server',
        type: 'slow',
        message: 'Response time above threshold (>1000ms)',
        timestamp: Date.now() - 300000,
        acknowledged: true
      }
    ])
  }

  const generateSampleHistory = () => {
    const history = []
    for (let i = 0; i < 24; i++) {
      history.push({
        timestamp: Date.now() - (i * 3600000),
        status: Math.random() > 0.95 ? 'down' : Math.random() > 0.9 ? 'degraded' : 'up',
        responseTime: Math.floor(Math.random() * 500) + 100
      })
    }
    return history
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up':
        return <CheckCircle className="h-5 w-5 text-success-500" />
      case 'down':
        return <XCircle className="h-5 w-5 text-error-500" />
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-warning-500" />
      default:
        return <Activity className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up':
        return 'text-success-600 bg-success-50'
      case 'down':
        return 'text-error-600 bg-error-50'
      case 'degraded':
        return 'text-warning-600 bg-warning-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await apiFetch(`/api/admin/monitoring/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      })

      if (response.ok) {
        setAlerts(alerts.map(alert => 
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        ))
        toast.success('Alert acknowledged')
      } else {
        // For demo, just update locally
        setAlerts(alerts.map(alert => 
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        ))
        toast('Alert acknowledgment will be saved when API is ready', {
          icon: '🚧',
          duration: 3000
        })
      }
    } catch (error) {
      // For demo, just update locally
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ))
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const diff = Date.now() - timestamp
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(timestamp).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            📊 Real-time Monitoring
          </h1>
          <p className="mt-2 text-gray-600">
            Monitor your services across all regions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`btn-secondary inline-flex items-center ${autoRefresh ? 'bg-primary-50' : ''}`}
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button
            onClick={fetchMonitoringData}
            className="btn-primary inline-flex items-center"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Refresh Now
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Services</p>
              <p className="text-2xl font-bold text-gray-900">{services.length}</p>
            </div>
            <Activity className="h-8 w-8 text-primary-600" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Operational</p>
              <p className="text-2xl font-bold text-success-600">
                {services.filter(s => s.status === 'up').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-success-600" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Issues</p>
              <p className="text-2xl font-bold text-error-600">
                {services.filter(s => s.status === 'down').length}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-error-600" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-warning-600">
                {alerts.filter(a => !a.acknowledged).length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-warning-600" />
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.filter(a => !a.acknowledged).length > 0 && (
        <div className="card border-warning-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            🚨 Active Alerts
          </h2>
          <div className="space-y-3">
            {alerts.filter(a => !a.acknowledged).map(alert => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-warning-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-warning-600" />
                  <div>
                    <p className="font-medium text-gray-900">{alert.serviceName}</p>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    <p className="text-xs text-gray-500">{formatTimestamp(alert.timestamp)}</p>
                  </div>
                </div>
                <button
                  onClick={() => acknowledgeAlert(alert.id)}
                  className="btn-secondary text-sm"
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services Status */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Services Status</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {services.map(service => (
            <div 
              key={service.id} 
              className="p-6 hover:bg-gray-50 cursor-pointer"
              onClick={() => setSelectedService(selectedService === service.id ? null : service.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(service.status)}
                  <div>
                    <h3 className="font-medium text-gray-900">{service.name}</h3>
                    <p className="text-sm text-gray-600">{service.url}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Response Time</p>
                    <p className="font-medium">
                      {service.responseTime > 0 ? `${service.responseTime}ms` : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Uptime</p>
                    <p className="font-medium">{service.uptime}%</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(service.status)}`}>
                    {service.status.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {selectedService === service.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Regional Status</h4>
                      <div className="space-y-2">
                        {service.regions.map(region => (
                          <div key={region.id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(region.status)}
                              <span className="text-sm">{region.name}</span>
                            </div>
                            <span className="text-sm text-gray-600">
                              {region.responseTime > 0 ? `${region.responseTime}ms` : 'N/A'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">24h History</h4>
                      <div className="flex items-end space-x-1 h-20">
                        {service.history.slice(0, 24).map((point, i) => (
                          <div
                            key={i}
                            className={`flex-1 ${
                              point.status === 'up' ? 'bg-success-500' :
                              point.status === 'down' ? 'bg-error-500' :
                              'bg-warning-500'
                            }`}
                            style={{ height: `${(point.responseTime / 10)}%`, minHeight: '4px' }}
                            title={`${formatTimestamp(point.timestamp)}: ${point.status} (${point.responseTime}ms)`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Last checked: {formatTimestamp(service.lastChecked)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              Real-time monitoring with WebSocket updates and historical graphs coming soon! Currently showing sample data.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}