import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Activity,
  Clock,
  MapPin,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit3,
  Trash2,
  RefreshCw,
  BarChart,
  Globe,
  Server,
  Wifi,
  Github,
  Search,
  Heart,
  Network,
  Loader2
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { apiFetch } from '../utils/api'
import toast from 'react-hot-toast'
import { LatencyBadge } from '../components/LatencyDisplay'

interface ServiceDetail {
  id: string
  name: string
  type: string
  target: string
  interval: number
  isActive: boolean
  monitoring: {
    regions: string[]
    strategy: string
  }
  statistics: {
    uptime: number
    avgResponseTime: number
    totalChecks: number
    failedChecks: number
    lastDowntime?: number
  }
  lastCheck?: {
    status: 'up' | 'down' | 'degraded'
    responseTime: number
    timestamp: number
    error?: string
  }
  history: Array<{
    timestamp: number
    status: 'up' | 'down' | 'degraded'
    responseTime: number
    region: string
  }>
  incidents: Array<{
    id: string
    startTime: number
    endTime?: number
    status: 'ongoing' | 'resolved'
    reason: string
    affectedRegions: string[]
  }>
}

export const ServiceDetail: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { token } = useAuthStore()
  const [service, setService] = useState<ServiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')

  useEffect(() => {
    if (id) {
      fetchServiceDetail()
      // Refresh every 30 seconds
      const interval = setInterval(fetchServiceDetail, 30000)
      return () => clearInterval(interval)
    }
  }, [id])

  const fetchServiceDetail = async () => {
    try {
      const response = await apiFetch(`/api/admin/services/${id}/detail`, {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch service details')
      }

      const data = await response.json()
      setService(data.data)
    } catch (error) {
      console.error('Error fetching service detail:', error)
      // Use sample data if API is not ready
      setSampleData()
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const setSampleData = () => {
    setService({
      id: id || '1',
      name: 'My API Monitor',
      type: 'web',
      target: 'https://api.example.com',
      interval: 60,
      isActive: true,
      monitoring: {
        regions: ['us-east', 'eu-west', 'asia-pacific'],
        strategy: 'all-selected'
      },
      statistics: {
        uptime: 99.95,
        avgResponseTime: 245,
        totalChecks: 1440,
        failedChecks: 1,
        lastDowntime: Date.now() - 86400000
      },
      lastCheck: {
        status: 'up',
        responseTime: 234,
        timestamp: Date.now() - 30000
      },
      history: generateSampleHistory(),
      incidents: [
        {
          id: '1',
          startTime: Date.now() - 86400000,
          endTime: Date.now() - 85800000,
          status: 'resolved',
          reason: 'Connection timeout',
          affectedRegions: ['us-east']
        }
      ]
    })
  }

  const generateSampleHistory = () => {
    const history = []
    const now = Date.now()
    for (let i = 0; i < 48; i++) {
      history.push({
        timestamp: now - (i * 1800000), // Every 30 minutes
        status: Math.random() > 0.02 ? 'up' : 'down' as any,
        responseTime: Math.floor(Math.random() * 300) + 100,
        region: ['us-east', 'eu-west', 'asia-pacific'][Math.floor(Math.random() * 3)]
      })
    }
    return history
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchServiceDetail()
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete the watcher "${service?.name}"?`)) {
      return
    }

    try {
      const response = await apiFetch('/api/admin/services/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id })
      })

      if (!response.ok) {
        throw new Error('Failed to delete watcher')
      }

      toast.success('Watcher deleted successfully')
      navigate('/services')
    } catch (error) {
      toast.error('Failed to delete watcher')
    }
  }

  const getServiceIcon = (type: string) => {
    const icons = {
      web: Globe,
      tcp: Server,
      ping: Wifi,
      github: Github,
      'uptime-api': Activity,
      keyword: Search,
      heartbeat: Heart,
      port: Network,
    }
    return icons[type as keyof typeof icons] || Globe
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000)
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!service) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Service not found</p>
        <Link to="/services" className="btn-primary mt-4 inline-flex items-center">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Services
        </Link>
      </div>
    )
  }

  const IconComponent = getServiceIcon(service.type)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/services')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gray-100 rounded-lg">
              <IconComponent className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>
              <p className="text-gray-600">{service.target}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary inline-flex items-center"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to={`/services/${id}/edit`}
            className="btn-secondary inline-flex items-center"
          >
            <Edit3 className="h-5 w-5 mr-2" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="btn-secondary text-error-600 hover:bg-error-50 inline-flex items-center"
          >
            <Trash2 className="h-5 w-5 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600">Current Status</p>
            <div className={`w-3 h-3 rounded-full ${
              service.lastCheck?.status === 'up' ? 'bg-success-500 animate-pulse' :
              service.lastCheck?.status === 'down' ? 'bg-error-500' :
              'bg-warning-500'
            }`} />
          </div>
          <div className="flex items-center space-x-2">
            {service.lastCheck?.status === 'up' ? 
              <CheckCircle className="h-8 w-8 text-success-500" /> :
              service.lastCheck?.status === 'down' ?
              <XCircle className="h-8 w-8 text-error-500" /> :
              <AlertTriangle className="h-8 w-8 text-warning-500" />
            }
            <div>
              <p className="text-2xl font-bold capitalize">
                {service.lastCheck?.status || 'Unknown'}
              </p>
              <p className="text-sm text-gray-500">
                {service.lastCheck ? formatTimestamp(service.lastCheck.timestamp) : 'Never checked'}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600">Uptime</p>
            <TrendingUp className="h-5 w-5 text-success-600" />
          </div>
          <p className="text-2xl font-bold">{service.statistics.uptime}%</p>
          <p className="text-sm text-gray-500 mt-1">Last 30 days</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-success-500 h-2 rounded-full"
              style={{ width: `${service.statistics.uptime}%` }}
            />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
            <Clock className="h-5 w-5 text-blue-600" />
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-500">Average</p>
              <p className="text-2xl font-bold">{service.statistics.avgResponseTime}ms</p>
            </div>
            {service.lastCheck?.responseTime && (
              <div>
                <p className="text-sm text-gray-500">Current</p>
                <LatencyBadge latency={service.lastCheck.responseTime} />
              </div>
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600">Total Checks</p>
            <Activity className="h-5 w-5 text-primary-600" />
          </div>
          <p className="text-2xl font-bold">{service.statistics.totalChecks}</p>
          <p className="text-sm text-gray-500 mt-1">
            {service.statistics.failedChecks} failed
          </p>
        </div>
      </div>

      {/* Monitoring Configuration */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monitoring Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Check Interval</p>
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-gray-400 mr-2" />
              <span>Every {service.interval} seconds</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Monitoring Strategy</p>
            <div className="flex items-center">
              <BarChart className="h-5 w-5 text-gray-400 mr-2" />
              <span className="capitalize">{service.monitoring.strategy.replace('-', ' ')}</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Active Regions</p>
            <div className="flex items-center">
              <MapPin className="h-5 w-5 text-gray-400 mr-2" />
              <span>{service.monitoring.regions.length} regions</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-600 mb-2">Monitoring from:</p>
          <div className="flex flex-wrap gap-2">
            {service.monitoring.regions.map(region => (
              <span key={region} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                {region}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Response Time Chart */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Response Time History</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedTimeRange('24h')}
              className={`px-3 py-1 text-sm rounded ${
                selectedTimeRange === '24h' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              24h
            </button>
            <button
              onClick={() => setSelectedTimeRange('7d')}
              className={`px-3 py-1 text-sm rounded ${
                selectedTimeRange === '7d' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              7d
            </button>
            <button
              onClick={() => setSelectedTimeRange('30d')}
              className={`px-3 py-1 text-sm rounded ${
                selectedTimeRange === '30d' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              30d
            </button>
          </div>
        </div>
        
        {/* Simple bar chart visualization */}
        <div className="h-64 flex items-end space-x-1">
          {service.history.slice(0, 48).map((point, i) => (
            <div
              key={i}
              className={`flex-1 ${
                point.status === 'up' ? 'bg-success-500' :
                point.status === 'down' ? 'bg-error-500' :
                'bg-warning-500'
              }`}
              style={{ 
                height: `${(point.responseTime / 500) * 100}%`, 
                minHeight: '4px',
                opacity: point.status === 'up' ? 0.8 : 1
              }}
              title={`${formatTimestamp(point.timestamp)}: ${point.status} (${point.responseTime}ms)`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>48 hours ago</span>
          <span>Now</span>
        </div>
      </div>

      {/* Recent Incidents */}
      {service.incidents.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Incidents</h3>
          <div className="space-y-4">
            {service.incidents.map(incident => (
              <div key={incident.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                  incident.status === 'ongoing' ? 'bg-error-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {incident.reason}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      incident.status === 'ongoing' 
                        ? 'bg-error-100 text-error-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {incident.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Started: {new Date(incident.startTime).toLocaleString()}
                    {incident.endTime && (
                      <> • Duration: {Math.round((incident.endTime - incident.startTime) / 60000)} minutes</>
                    )}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Affected regions: {incident.affectedRegions.join(', ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Integration Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              Detailed monitoring data and real-time updates are coming soon! Currently showing sample data.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}