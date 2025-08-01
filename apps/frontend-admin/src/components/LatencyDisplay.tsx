import React from 'react'
import { Activity, Zap, TrendingDown, TrendingUp } from 'lucide-react'

interface LatencyDisplayProps {
  latency: number
  previousLatency?: number
  location?: string
}

export const LatencyDisplay: React.FC<LatencyDisplayProps> = ({ 
  latency, 
  previousLatency,
  location 
}) => {
  // Convert to milliseconds with proper precision
  const latencyMs = latency.toFixed(2)
  
  // Determine quality based on latency
  const getQuality = (ms: number) => {
    if (ms < 1) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }
    if (ms < 10) return { label: 'Great', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' }
    if (ms < 50) return { label: 'Good', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' }
    if (ms < 100) return { label: 'Fair', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' }
    return { label: 'Poor', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
  }
  
  const quality = getQuality(latency)
  const isImproved = previousLatency && latency < previousLatency
  const change = previousLatency ? ((previousLatency - latency) / previousLatency * 100).toFixed(1) : null
  
  // Visual representation of latency
  const getLatencyBars = () => {
    const maxBars = 5
    const activeBars = Math.max(1, Math.min(maxBars, Math.ceil((100 - latency) / 20)))
    return Array.from({ length: maxBars }, (_, i) => i < activeBars)
  }

  return (
    <div className={`rounded-xl p-6 ${quality.bg} ${quality.border} border-2 transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Network Latency</h3>
          {location && (
            <p className="text-xs text-gray-500">{location}</p>
          )}
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${quality.bg} ${quality.color}`}>
          {quality.label}
        </div>
      </div>

      {/* Main latency display */}
      <div className="flex items-baseline mb-4">
        <span className={`text-4xl font-bold ${quality.color}`}>
          {latencyMs}
        </span>
        <span className="text-lg font-medium text-gray-500 ml-1">ms</span>
        
        {/* Trend indicator */}
        {previousLatency && (
          <div className="ml-4 flex items-center">
            {isImproved ? (
              <TrendingDown className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingUp className="h-5 w-5 text-red-500" />
            )}
            <span className={`text-sm font-medium ml-1 ${isImproved ? 'text-green-600' : 'text-red-600'}`}>
              {change}%
            </span>
          </div>
        )}
      </div>

      {/* Visual bars */}
      <div className="flex items-center space-x-2 mb-4">
        <Activity className="h-4 w-4 text-gray-400" />
        <div className="flex space-x-1">
          {getLatencyBars().map((active, index) => (
            <div
              key={index}
              className={`h-3 w-3 rounded-sm transition-all duration-300 ${
                active ? quality.color.replace('text-', 'bg-') : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <Zap className={`h-4 w-4 ${quality.color}`} />
      </div>

      {/* Additional metrics */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200">
        <div className="text-center">
          <p className="text-xs text-gray-500">Response</p>
          <p className="text-sm font-semibold text-gray-900">
            {latency < 1 ? '< 1ms' : `~${Math.ceil(latency)}ms`}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Percentile</p>
          <p className="text-sm font-semibold text-gray-900">
            {latency < 1 ? 'P99' : latency < 10 ? 'P95' : latency < 50 ? 'P90' : 'P50'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">SLA</p>
          <p className="text-sm font-semibold text-gray-900">
            {latency < 100 ? '✓ Met' : '✗ Exceeded'}
          </p>
        </div>
      </div>

      {/* Microsecond display for ultra-low latency */}
      {latency < 1 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Equivalent to <span className="font-semibold">{(latency * 1000).toFixed(0)}μs</span> (microseconds)
          </p>
        </div>
      )}
    </div>
  )
}

// Minimal version for inline display
export const LatencyBadge: React.FC<{ latency: number }> = ({ latency }) => {
  const quality = latency < 1 ? 'excellent' : 
                  latency < 10 ? 'great' : 
                  latency < 50 ? 'good' : 
                  latency < 100 ? 'fair' : 'poor'
  
  const colorClasses = {
    excellent: 'bg-green-100 text-green-800 ring-green-600/20',
    great: 'bg-blue-100 text-blue-800 ring-blue-600/20',
    good: 'bg-yellow-100 text-yellow-800 ring-yellow-600/20',
    fair: 'bg-orange-100 text-orange-800 ring-orange-600/20',
    poor: 'bg-red-100 text-red-800 ring-red-600/20'
  }

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${colorClasses[quality]}`}>
      <Activity className="h-3 w-3 mr-1" />
      {latency.toFixed(2)}ms
    </span>
  )
}

// Chart version for historical data
export const LatencyChart: React.FC<{ data: Array<{ timestamp: number; latency: number }> }> = ({ data }) => {
  const maxLatency = Math.max(...data.map(d => d.latency))
  const scale = 100 / maxLatency

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Latency History</h4>
      <div className="relative h-32">
        <div className="absolute inset-0 flex items-end space-x-1">
          {data.slice(-30).map((point, index) => {
            const height = point.latency * scale
            const quality = point.latency < 1 ? 'bg-green-500' :
                          point.latency < 10 ? 'bg-blue-500' :
                          point.latency < 50 ? 'bg-yellow-500' :
                          point.latency < 100 ? 'bg-orange-500' : 'bg-red-500'
            
            return (
              <div
                key={index}
                className={`flex-1 ${quality} rounded-t opacity-80 hover:opacity-100 transition-opacity`}
                style={{ height: `${height}%` }}
                title={`${point.latency.toFixed(2)}ms`}
              />
            )
          })}
        </div>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
          <span>{maxLatency.toFixed(1)}ms</span>
          <span>{(maxLatency / 2).toFixed(1)}ms</span>
          <span>0ms</span>
        </div>
      </div>
      <div className="mt-2 flex justify-between text-xs text-gray-500">
        <span>30s ago</span>
        <span>Now</span>
      </div>
    </div>
  )
}