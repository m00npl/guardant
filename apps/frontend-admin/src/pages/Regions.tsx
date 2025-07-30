import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { 
  MapPin, 
  Activity, 
  Zap, 
  Users, 
  Globe,
  Wifi,
  WifiOff,
  Clock,
  TrendingUp,
  RefreshCw
} from 'lucide-react'

interface Colony {
  id: string
  name: string
  continent: string
  country: string
  city: string
  flag: string
  available: boolean
  workerAnts: number
  activeWorkerAnts: number
  activeJobs: number
  totalPoints: number
  avgLatency: number
  uptime: number
  workers: Array<{
    workerId: string
    isActive: boolean
    lastSeen: number
    points: number
    jobs: number
    owner: string
  }>
}

interface RegionsResponse {
  success: boolean
  regions: Colony[]
  summary: {
    totalRegions: number
    totalWorkers: number
    activeWorkers: number
    totalJobs: number
    totalPoints: number
  }
}

export const Regions: React.FC = () => {
  const { token } = useAuthStore()
  const [selectedContinent, setSelectedContinent] = useState<string>('all')
  const [colonies, setColonies] = useState<Colony[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState({
    totalRegions: 0,
    totalWorkers: 0,
    activeWorkers: 0,
    totalJobs: 0,
    totalPoints: 0,
  })

  const fetchRegions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/workers/regions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch regions')
      }
      
      const data: RegionsResponse = await response.json()
      
      if (data.success) {
        setColonies(data.regions)
        setSummary(data.summary)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load regions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRegions()
    // Refresh every 30 seconds
    const interval = setInterval(fetchRegions, 30000)
    return () => clearInterval(interval)
  }, [token])

  const continents = [
    { id: 'all', name: 'All Colonies', count: colonies.length },
    { id: 'Europe', name: 'Europe', count: colonies.filter(c => c.continent === 'Europe').length },
    { id: 'North America', name: 'North America', count: colonies.filter(c => c.continent === 'North America').length },
    { id: 'Asia', name: 'Asia', count: colonies.filter(c => c.continent === 'Asia').length },
    { id: 'Global', name: 'Global', count: colonies.filter(c => c.continent === 'Global').length },
  ]

  const filteredColonies = selectedContinent === 'all' 
    ? colonies 
    : colonies.filter(c => c.continent === selectedContinent)

  const getTimeSince = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  if (loading && colonies.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            🗺️ Colony Network
          </h1>
          <p className="mt-2 text-gray-600">
            Monitor your global network of WorkerAnt colonies
          </p>
        </div>
        <button
          onClick={fetchRegions}
          className="btn-secondary flex items-center"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <MapPin className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Regions</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totalRegions}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active WorkerAnts</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.activeWorkers}/{summary.totalWorkers}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <Zap className="h-6 w-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Jobs</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totalJobs.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Points</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totalPoints.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Continent Filter */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {continents.map((continent) => (
          <button
            key={continent.id}
            onClick={() => setSelectedContinent(continent.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedContinent === continent.id
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {continent.name} ({continent.count})
          </button>
        ))}
      </div>

      {/* Colonies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredColonies.map((colony) => {
          const lastActiveWorker = colony.workers
            .filter(w => w.isActive)
            .sort((a, b) => b.lastSeen - a.lastSeen)[0]
          
          return (
            <div 
              key={colony.id}
              className={`card p-6 transition-all ${
                colony.available 
                  ? 'border-l-4 border-l-success-500' 
                  : 'border-l-4 border-l-gray-300'
              }`}
            >
              {/* Colony Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{colony.flag}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {colony.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {colony.city}, {colony.country}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {colony.available ? (
                    <>
                      <Wifi className="h-5 w-5 text-success-500" />
                      <span className="text-sm font-medium text-success-600">
                        Online
                      </span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">
                        Offline
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Colony Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="flex items-center text-sm text-gray-600 mb-1">
                    <Users className="h-4 w-4 mr-1" />
                    WorkerAnts
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {colony.activeWorkerAnts}/{colony.workerAnts}
                  </div>
                </div>
                <div>
                  <div className="flex items-center text-sm text-gray-600 mb-1">
                    <Activity className="h-4 w-4 mr-1" />
                    Total Jobs
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {colony.activeJobs.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="flex items-center text-sm text-gray-600 mb-1">
                    <Clock className="h-4 w-4 mr-1" />
                    Avg Latency
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {colony.avgLatency}ms
                  </div>
                </div>
                <div>
                  <div className="flex items-center text-sm text-gray-600 mb-1">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Uptime
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {colony.uptime}%
                  </div>
                </div>
              </div>

              {/* Last Seen */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  Last activity: {lastActiveWorker ? getTimeSince(lastActiveWorker.lastSeen) : 'Never'}
                </span>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${
                    colony.available 
                      ? 'bg-success-500 animate-pulse' 
                      : 'bg-gray-400'
                  }`} />
                  <span className="text-xs text-gray-400">
                    {colony.id}
                  </span>
                </div>
              </div>

              {/* Progress Bar for Uptime */}
              {colony.workerAnts > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">Colony Health</span>
                    <span className="text-xs font-medium text-gray-700">
                      {colony.uptime}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        colony.uptime >= 90 ? 'bg-success-500' :
                        colony.uptime >= 50 ? 'bg-warning-500' :
                        'bg-error-500'
                      }`}
                      style={{ width: `${colony.uptime}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Top Worker */}
              {colony.workers.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Top Worker</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {colony.workers[0].workerId.substring(0, 16)}...
                    </span>
                    <span className="text-sm text-gray-500">
                      {colony.workers[0].points.toLocaleString()} pts
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty State for No Colonies */}
      {filteredColonies.length === 0 && (
        <div className="card p-12 text-center">
          <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Colonies in {selectedContinent}
          </h3>
          <p className="text-gray-600">
            No WorkerAnt colonies are currently active in this region.
          </p>
        </div>
      )}

      {/* Network Map Placeholder */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🌍 Global Colony Map
        </h3>
        <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
          <div className="text-center">
            <Globe className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Interactive map coming soon</p>
            <p className="text-sm text-gray-400">
              Visualize your WorkerAnt colonies across the globe
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}