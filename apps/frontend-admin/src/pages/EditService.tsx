import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  RotateCcw,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

type ServiceType = 'web' | 'tcp' | 'ping' | 'github' | 'uptime-api' | 'keyword' | 'heartbeat' | 'port'
type MonitoringStrategy = 'closest' | 'all-selected' | 'round-robin' | 'failover'

export const EditService: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'web' as ServiceType,
    target: '',
    interval: 60,
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

  const availableRegions = [
    { id: 'eu-west-1', name: 'Europe West (Frankfurt)', flag: '🇩🇪', available: true },
    { id: 'eu-central-1', name: 'Europe Central (Warsaw)', flag: '🇵🇱', available: true },
    { id: 'eu-west-2', name: 'Europe West (London)', flag: '🇬🇧', available: true },
    { id: 'us-east-1', name: 'US East (Virginia)', flag: '🇺🇸', available: true },
    { id: 'us-west-1', name: 'US West (California)', flag: '🇺🇸', available: true },
    { id: 'ca-central-1', name: 'Canada Central (Toronto)', flag: '🇨🇦', available: true },
    { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', flag: '🇸🇬', available: false },
    { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)', flag: '🇯🇵', available: false },
    { id: 'ap-south-1', name: 'Asia Pacific (Mumbai)', flag: '🇮🇳', available: false },
    { id: 'sa-east-1', name: 'South America (São Paulo)', flag: '🇧🇷', available: false },
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

  useEffect(() => {
    fetchWatcher()
  }, [id])

  const fetchWatcher = async () => {
    try {
      const response = await apiFetch('/api/admin/services/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch watcher')
      }

      // Find the specific watcher by ID
      const watcher = data.data?.find((w: any) => w.id === id)
      
      if (!watcher) {
        throw new Error('Watcher not found')
      }

      // Set form data with existing watcher values
      setFormData({
        name: watcher.name || '',
        type: watcher.type || 'web',
        target: watcher.target || '',
        interval: watcher.interval || 60,
        monitoring: {
          regions: watcher.monitoring?.regions || [],
          strategy: watcher.monitoring?.strategy || 'closest',
          minRegions: watcher.monitoring?.minRegions || 1,
          maxRegions: watcher.monitoring?.maxRegions || 1,
        }
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load watcher')
      navigate('/services')
    } finally {
      setLoading(false)
    }
  }

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

    setSaving(true)

    try {
      const response = await apiFetch('/api/admin/services/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id,
          ...formData
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update watcher')
      }
      
      toast.success('🐜 Watcher updated successfully!')
      navigate('/services')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update watcher')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/services')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              ✏️ Edit Watcher
            </h1>
            <p className="text-gray-600">
              Loading watcher configuration...
            </p>
          </div>
        </div>
        <div className="card p-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading watcher details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/services')}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            ✏️ Edit Watcher
          </h1>
          <p className="text-gray-600">
            Modify watcher configuration and colony assignments
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Service Type Selection */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            👁️ Watcher Type
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
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="10"
                  max="3600"
                  step="10"
                  className="flex-1"
                  value={formData.interval}
                  onChange={(e) => setFormData({ ...formData, interval: parseInt(e.target.value) })}
                />
                <div className="flex items-center space-x-2 min-w-0">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {formData.interval}s
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10s (Frequent)</span>
                <span>1h (Rarely)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Colony Selection */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🗺️ Select Monitoring Colonies
          </h3>
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
            disabled={saving}
            className="btn-primary inline-flex items-center"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Update Watcher
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}