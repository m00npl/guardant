import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, 
  Eye, 
  Globe, 
  Server, 
  Wifi, 
  Github,
  Search,
  Heart,
  Network,
  Edit3,
  Trash2,
  Activity,
  Clock,
  MapPin
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { apiFetch } from '../utils/api'
import toast from 'react-hot-toast'

export const Services: React.FC = () => {
  const { token } = useAuthStore()
  const [watchers, setWatchers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWatchers()
    // Refresh every 30 seconds to get latest status
    const interval = setInterval(fetchWatchers, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchWatchers = async () => {
    try {
      const response = await apiFetch('/api/admin/services/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch watchers')
      }

      setWatchers(data.data || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load watchers')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteWatcher = async (watcherId: string, watcherName: string) => {
    if (!confirm(`Are you sure you want to delete the watcher "${watcherName}"?`)) {
      return
    }

    try {
      const response = await apiFetch('/api/admin/services/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: watcherId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete watcher')
      }

      toast.success('Watcher deleted successfully')
      // Refresh the list
      fetchWatchers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete watcher')
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

  const getServiceTypeLabel = (type: string) => {
    const labels = {
      web: 'Web Monitor',
      tcp: 'TCP Check',
      ping: 'Ping Test',
      github: 'GitHub Repo',
      'uptime-api': 'Uptime API',
      keyword: 'Keyword Hunt',
      heartbeat: 'Heartbeat',
      port: 'Port Scanner',
    }
    return labels[type as keyof typeof labels] || type
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            👁️ Watcher Management
          </h1>
          <p className="mt-2 text-gray-600">
            Deploy and manage your ant watchers across colonies
          </p>
        </div>
        <Link to="/services/create" className="btn-primary inline-flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Deploy New Watcher
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading watchers...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && watchers.length === 0 && (
        <div className="card p-12 text-center">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Eye className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Watchers Deployed
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Your ant colony is ready, but no watchers are on duty yet. 
            Deploy your first watcher to start monitoring services across the web.
          </p>
          <div className="space-y-4">
            <Link to="/services/create" className="btn-primary inline-flex items-center justify-center">
              <Plus className="h-5 w-5 mr-2" />
              Deploy Your First Watcher
            </Link>
            <div className="text-sm text-gray-500">
              Choose from web monitoring, GitHub repos, ping tests, and more
            </div>
          </div>
        </div>
      )}

      {/* Service Types Info - only show when no watchers */}
      {!loading && watchers.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Globe className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="ml-3 font-semibold text-gray-900">Web Monitor</h3>
          </div>
          <p className="text-sm text-gray-600">
            Monitor HTTP/HTTPS websites and APIs for availability and response time
          </p>
        </div>

        <div className="card p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Github className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="ml-3 font-semibold text-gray-900">GitHub Repo</h3>
          </div>
          <p className="text-sm text-gray-600">
            Track repository metrics, issues, and releases for your projects
          </p>
        </div>

        <div className="card p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Wifi className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="ml-3 font-semibold text-gray-900">Ping Test</h3>
          </div>
          <p className="text-sm text-gray-600">
            ICMP ping monitoring for network connectivity and latency checking
          </p>
        </div>

        <div className="card p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Network className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="ml-3 font-semibold text-gray-900">Port Scanner</h3>
          </div>
          <p className="text-sm text-gray-600">
            Monitor TCP/UDP ports and check service availability on specific ports
          </p>
        </div>
      </div>
      )}

      {/* Services List (when not empty) */}
      {watchers.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Active Watchers ({watchers.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {watchers.map((watcher: any) => {
              const IconComponent = getServiceIcon(watcher.type)
              return (
                <div key={watcher.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <IconComponent className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {watcher.name}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{getServiceTypeLabel(watcher.type)}</span>
                          <span>•</span>
                          <span className="max-w-[200px] truncate" title={watcher.target}>
                            {watcher.target}
                          </span>
                          <span>•</span>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {watcher.interval}s
                          </div>
                          {watcher.lastCheck?.responseTime && (
                            <>
                              <span>•</span>
                              <span className="text-success-600">
                                {watcher.lastCheck.responseTime}ms
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {/* Status */}
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          watcher.lastCheck?.status === 'up' ? 'bg-success-500 animate-pulse' :
                          watcher.lastCheck?.status === 'down' ? 'bg-error-500' :
                          'bg-gray-300'
                        }`} />
                        <span className="text-sm capitalize">
                          {watcher.lastCheck?.status || 'Pending'}
                        </span>
                      </div>
                      
                      {/* Colonies */}
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="h-3 w-3 mr-1" />
                        {watcher.monitoring?.regions?.length || 0} colonies
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/services/${watcher.id}/edit`}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Link>
                        <button 
                          onClick={() => handleDeleteWatcher(watcher.id, watcher.name)}
                          className="p-2 text-gray-400 hover:text-error-600 transition-colors"
                          title="Delete watcher"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}