import React, { useState } from 'react'
import { 
  MapPin, 
  Activity, 
  Zap, 
  Users, 
  Globe,
  Wifi,
  WifiOff,
  Clock,
  TrendingUp
} from 'lucide-react'

export const Regions: React.FC = () => {
  const [selectedContinent, setSelectedContinent] = useState<string>('all')

  // Mock data - in real app this would come from API
  const colonies = [
    {
      id: 'eu-west-1',
      name: 'European Colony (Frankfurt)',
      continent: 'Europe',
      country: 'Germany',
      city: 'Frankfurt',
      flag: '🇩🇪',
      coordinates: { lat: 50.1109, lng: 8.6821 },
      available: true,
      workerAnts: 12,
      activeJobs: 156,
      avgLatency: 45,
      uptime: 99.9,
      lastSeen: '2 minutes ago',
    },
    {
      id: 'eu-central-1',
      name: 'European Colony (Warsaw)',
      continent: 'Europe',
      country: 'Poland',
      city: 'Warsaw',
      flag: '🇵🇱',
      coordinates: { lat: 52.2297, lng: 21.0122 },
      available: true,
      workerAnts: 8,
      activeJobs: 92,
      avgLatency: 38,
      uptime: 99.8,
      lastSeen: '1 minute ago',
    },
    {
      id: 'us-east-1',
      name: 'American Colony (Virginia)',
      continent: 'North America',
      country: 'United States',
      city: 'Ashburn',
      flag: '🇺🇸',
      coordinates: { lat: 39.0458, lng: -77.4874 },
      available: true,
      workerAnts: 24,
      activeJobs: 287,
      avgLatency: 23,
      uptime: 99.95,
      lastSeen: '30 seconds ago',
    },
    {
      id: 'ap-southeast-1',
      name: 'Asian Colony (Singapore)',
      continent: 'Asia',
      country: 'Singapore',
      city: 'Singapore',
      flag: '🇸🇬',
      coordinates: { lat: 1.3521, lng: 103.8198 },
      available: false,
      workerAnts: 0,
      activeJobs: 0,
      avgLatency: 0,
      uptime: 0,
      lastSeen: 'Never',
    },
  ]

  const continents = [
    { id: 'all', name: 'All Colonies', count: colonies.length },
    { id: 'Europe', name: 'Europe', count: colonies.filter(c => c.continent === 'Europe').length },
    { id: 'North America', name: 'North America', count: colonies.filter(c => c.continent === 'North America').length },
    { id: 'Asia', name: 'Asia', count: colonies.filter(c => c.continent === 'Asia').length },
  ]

  const filteredColonies = selectedContinent === 'all' 
    ? colonies 
    : colonies.filter(c => c.continent === selectedContinent)

  const totalWorkerAnts = colonies.reduce((sum, c) => sum + c.workerAnts, 0)
  const totalJobs = colonies.reduce((sum, c) => sum + c.activeJobs, 0)
  const avgUptime = colonies.length > 0 
    ? colonies.reduce((sum, c) => sum + c.uptime, 0) / colonies.length 
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          🗺️ Colony Network
        </h1>
        <p className="mt-2 text-gray-600">
          Monitor your global network of WorkerAnt colonies
        </p>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active WorkerAnts</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalWorkerAnts}
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
              <p className="text-sm font-medium text-gray-600">Active Jobs</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalJobs}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Network Uptime</p>
              <p className="text-2xl font-bold text-gray-900">
                {avgUptime.toFixed(1)}%
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
        {filteredColonies.map((colony) => (
          <div 
            key={colony.id}
            className={`card p-6 transition-all ${
              colony.available 
                ? 'border-l-4 border-l-success-500' 
                : 'border-l-4 border-l-error-500'
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
                    <WifiOff className="h-5 w-5 text-error-500" />
                    <span className="text-sm font-medium text-error-600">
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
                  {colony.workerAnts}
                </div>
              </div>
              <div>
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <Activity className="h-4 w-4 mr-1" />
                  Active Jobs
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {colony.activeJobs}
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
                Last seen: {colony.lastSeen}
              </span>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${
                  colony.available 
                    ? 'bg-success-500 animate-pulse' 
                    : 'bg-error-500'
                }`} />
                <span className="text-xs text-gray-400">
                  {colony.id}
                </span>
              </div>
            </div>

            {/* Progress Bar for Uptime */}
            {colony.available && (
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
                      colony.uptime >= 99 ? 'bg-success-500' :
                      colony.uptime >= 95 ? 'bg-warning-500' :
                      'bg-error-500'
                    }`}
                    style={{ width: `${colony.uptime}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
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