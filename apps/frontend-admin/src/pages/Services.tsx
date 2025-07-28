import React from 'react'
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

export const Services: React.FC = () => {
  // Mock data - in real app this would come from API
  const watchers = [
    // Empty for now - will be populated from API
  ]

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
        <Link to="/services/create" className="btn-primary">
          <Plus className="h-5 w-5 mr-2" />
          Deploy New Watcher
        </Link>
      </div>

      {/* Empty State */}
      {watchers.length === 0 && (
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
            <Link to="/services/create" className="btn-primary">
              <Plus className="h-5 w-5 mr-2" />
              Deploy Your First Watcher
            </Link>
            <div className="text-sm text-gray-500">
              Choose from web monitoring, GitHub repos, ping tests, and more
            </div>
          </div>
        </div>
      )}

      {/* Service Types Info */}
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
                          <span>{watcher.target}</span>
                          <span>•</span>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {watcher.interval}s interval
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {/* Status */}
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          watcher.lastStatus === 'up' ? 'bg-success-500' :
                          watcher.lastStatus === 'down' ? 'bg-error-500' :
                          'bg-warning-500'
                        }`} />
                        <span className="text-sm capitalize">
                          {watcher.lastStatus || 'unknown'}
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
                        <button className="p-2 text-gray-400 hover:text-error-600 transition-colors">
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