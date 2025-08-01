import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { apiFetch } from '../utils/api'
import { 
  ArrowLeft, 
  Globe, 
  Server, 
  Wifi, 
  Github,
  Search,
  Heart,
  Network,
  Activity,
  Save,
  MapPin,
  Zap,
  Clock,
  RotateCcw
} from 'lucide-react'
import toast from 'react-hot-toast'

type ServiceType = 'web' | 'tcp' | 'ping' | 'github' | 'uptime-api' | 'keyword' | 'heartbeat' | 'port'
type MonitoringStrategy = 'closest' | 'all-selected' | 'round-robin' | 'failover'

export const CreateService: React.FC = () => {
  const navigate = useNavigate()
  const { token, nest } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [currentWatcherCount, setCurrentWatcherCount] = useState(0)
  const [availableRegions, setAvailableRegions] = useState<any[]>([])
  const [loadingRegions, setLoadingRegions] = useState(true)
  
  // Minimum interval based on subscription tier
  const minInterval = nest?.subscription.tier === 'free' ? 900 : 30 // 15 minutes for free, 30 seconds for pro/unlimited
  
  // Fetch current watcher count and regions on mount
  React.useEffect(() => {
    fetchWatcherCount()
    fetchAvailableRegions()
  }, [])
  
  const fetchWatcherCount = async () => {
    try {
      const response = await apiFetch('/api/admin/services/count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setCurrentWatcherCount(data.data?.count || 0)
      }
    } catch (error) {
      console.error('Failed to fetch watcher count:', error)
    }
  }
  
  const fetchAvailableRegions = async () => {
    try {
      setLoadingRegions(true)
      const response = await apiFetch('/api/admin/workers/regions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        // Transform the regions to match our expected format
        const regions = data.regions.map((region: any) => ({
          id: region.id,
          name: region.name || region.city || region.id,
          flag: region.flag || '🌍',
          available: region.available,
          workerCount: region.activeWorkerAnts || 0,
          uptime: region.uptime || 0
        }))
        setAvailableRegions(regions)
      }
    } catch (error) {
      console.error('Failed to fetch regions:', error)
      toast.error('Failed to load available regions')
    } finally {
      setLoadingRegions(false)
    }
  }
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'web' as ServiceType,
    target: '',
    interval: nest?.subscription.tier === 'free' ? 900 : 60,
    monitoring: {
      regions: [] as string[],
      strategy: 'closest' as MonitoringStrategy,
      minRegions: 1,
      maxRegions: 1,
    }
  })

  const serviceTypes = [
    {
      id: 'web',
      name: 'Web Monitor',
      icon: Globe,
      description: 'Monitor HTTP/HTTPS websites and APIs',
      color: 'blue',
      placeholder: 'https://example.com'
    },
    {
      id: 'github',
      name: 'GitHub Repo',
      icon: Github,
      description: 'Track repository metrics and issues',
      color: 'purple',
      placeholder: 'owner/repository'
    },
    {
      id: 'ping',
      name: 'Ping Test',
      icon: Wifi,
      description: 'ICMP ping for connectivity checks',
      color: 'green',
      placeholder: '8.8.8.8 or example.com'
    },
    {
      id: 'port',
      name: 'Port Scanner',
      icon: Network,
      description: 'Monitor TCP/UDP ports',
      color: 'orange',
      placeholder: 'example.com:80'
    },
    {
      id: 'tcp',
      name: 'TCP Check',
      icon: Server,
      description: 'TCP socket connectivity test',
      color: 'red',
      placeholder: 'example.com:443'
    },
    {
      id: 'keyword',
      name: 'Keyword Hunt',
      icon: Search,
      description: 'Search for keywords in web content',
      color: 'yellow',
      placeholder: 'https://example.com'
    },
    {
      id: 'heartbeat',
      name: 'Heartbeat',
      icon: Heart,
      description: 'Monitor periodic application signals',
      color: 'pink',
      placeholder: 'unique-heartbeat-id'
    },
    {
      id: 'uptime-api',
      name: 'Uptime API',
      icon: Activity,
      description: 'Monitor uptime API endpoints',
      color: 'indigo',
      placeholder: 'https://api.uptimerobot.com/v2/...'
    },
  ]

  const strategies = [
    {
      id: 'closest',
      name: 'Closest Colony',
      icon: MapPin,
      description: 'Monitor from the geographically closest colony',
      recommended: true,
    },
    {
      id: 'all-selected',
      name: 'All Selected',
      icon: Globe,
      description: 'Monitor from all selected colonies simultaneously',
      recommended: false,
    },
    {
      id: 'round-robin',
      name: 'Round Robin',
      icon: RotateCcw,
      description: 'Rotate between selected colonies for each check',
      recommended: false,
    },
    {
      id: 'failover',
      name: 'Failover',
      icon: Zap,
      description: 'Primary colony with backup colonies for redundancy',
      recommended: false,
    },
  ]

  const selectedServiceType = serviceTypes.find(st => st.id === formData.type)

  const handleRegionToggle = (regionId: string) => {
    const newRegions = formData.monitoring.regions.includes(regionId)
      ? formData.monitoring.regions.filter(r => r !== regionId)
      : [...formData.monitoring.regions, regionId]
    
    setFormData({
      ...formData,
      monitoring: {
        ...formData.monitoring,
        regions: newRegions,
        maxRegions: Math.max(newRegions.length, formData.monitoring.maxRegions),
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Watcher name is required')
      return
    }
    
    if (!formData.target.trim()) {
      toast.error('Target is required')
      return
    }
    
    if (formData.monitoring.regions.length === 0) {
      toast.error('Select at least one colony for monitoring')
      return
    }
    
    // Check subscription limit
    const limit = nest?.subscription.servicesLimit || 3
    if (currentWatcherCount >= limit) {
      toast.error(`You've reached your limit of ${limit} watchers. Upgrade your plan to add more.`)
      return
    }

    try {
      setLoading(true)
      const response = await apiFetch('/api/admin/services/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create watcher')
      }
      
      toast.success('🐜 Watcher deployed successfully!')
      navigate('/services')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deploy watcher')
    } finally {
      setLoading(false)
    }
  }

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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🚀 Deploy New Watcher
            </h1>
            <p className="text-gray-600">
              Configure a new watcher to monitor services across your ant colonies
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">
            Watchers: {currentWatcherCount}/{nest?.subscription.servicesLimit || 3}
          </p>
          {currentWatcherCount >= (nest?.subscription.servicesLimit || 3) && (
            <p className="text-sm text-warning-600 mt-1">
              Limit reached - upgrade to add more
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Service Type Selection */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            👁️ Choose Watcher Type
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {serviceTypes.map((type) => {
              const IconComponent = type.icon
              const isSelected = formData.type === type.id
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.id as ServiceType })}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-primary-100' : 'bg-gray-100'
                    }`}>
                      <IconComponent className={`h-5 w-5 ${
                        isSelected ? 'text-primary-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <span className={`ml-2 font-medium ${
                      isSelected ? 'text-primary-900' : 'text-gray-900'
                    }`}>
                      {type.name}
                    </span>
                  </div>
                  <p className={`text-sm ${
                    isSelected ? 'text-primary-700' : 'text-gray-600'
                  }`}>
                    {type.description}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Basic Configuration */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ⚙️ Basic Configuration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Watcher Name
              </label>
              <input
                type="text"
                required
                className="input w-full"
                placeholder="My API Watcher"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target
              </label>
              <input
                type="text"
                required
                className="input w-full"
                placeholder={selectedServiceType?.placeholder}
                value={formData.target}
                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check Interval
              </label>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">
                    How often should we check your service?
                  </span>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-primary-600" />
                    <span className="text-lg font-semibold text-primary-600">
                      {formData.interval < 60 ? `${formData.interval}s` : `${Math.floor(formData.interval / 60)}m`}
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min={minInterval}
                    max="3600"
                    step={minInterval === 900 ? 300 : 30}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((formData.interval - minInterval) / (3600 - minInterval)) * 100}%, #e5e7eb ${((formData.interval - minInterval) / (3600 - minInterval)) * 100}%, #e5e7eb 100%)`
                    }}
                    value={formData.interval}
                    onChange={(e) => setFormData({ ...formData, interval: parseInt(e.target.value) })}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>{minInterval === 900 ? '15m' : '30s'}</span>
                    <span>5m</span>
                    <span>15m</span>
                    <span>30m</span>
                    <span>1h</span>
                  </div>
                </div>
                {nest?.subscription.tier === 'free' && (
                  <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
                    <p className="text-xs text-amber-700">
                      ⚡ Upgrade to Pro for intervals as low as 30 seconds
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Colony Selection */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🗺️ Select Monitoring Colonies
          </h3>
          {loadingRegions ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : availableRegions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No monitoring colonies available yet.</p>
              <p className="text-sm mt-1">Deploy workers to activate regions.</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {availableRegions.map((region) => (
              <button
                key={region.id}
                type="button"
                disabled={!region.available}
                onClick={() => handleRegionToggle(region.id)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  !region.available
                    ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                    : formData.monitoring.regions.includes(region.id)
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{region.flag}</span>
                    <span className="font-medium text-gray-900">
                      {region.name.split(' (')[0]}
                    </span>
                  </div>
                  {!region.available && (
                    <span className="text-xs text-gray-500">Offline</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {region.name.split(' (')[1]?.replace(')', '')}
                </p>
              </button>
            ))}
          </div>
          )}

          {/* Strategy Selection */}
          <div className="border-t pt-6">
            <h4 className="font-medium text-gray-900 mb-4">Monitoring Strategy</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strategies.map((strategy) => {
                const IconComponent = strategy.icon
                const isSelected = formData.monitoring.strategy === strategy.id
                return (
                  <button
                    key={strategy.id}
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      monitoring: { ...formData.monitoring, strategy: strategy.id as MonitoringStrategy }
                    })}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <IconComponent className={`h-5 w-5 ${
                          isSelected ? 'text-primary-600' : 'text-gray-600'
                        }`} />
                        <span className="font-medium text-gray-900">
                          {strategy.name}
                        </span>
                      </div>
                      {strategy.recommended && (
                        <span className="text-xs bg-success-100 text-success-600 px-2 py-1 rounded">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {strategy.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/services')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary inline-flex items-center"
          >
            <Save className="h-5 w-5 mr-2" />
            Deploy Watcher
          </button>
        </div>
      </form>
    </div>
  )
}