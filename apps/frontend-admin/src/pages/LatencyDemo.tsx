import React, { useState, useEffect } from 'react'
import { LatencyDisplay, LatencyBadge, LatencyChart } from '../components/LatencyDisplay'
import { RefreshCw, Wifi, Globe, Server } from 'lucide-react'

export const LatencyDemo: React.FC = () => {
  const [currentLatency] = useState(0.5606502670043173)
  const [previousLatency] = useState(0.8234)
  const [historicalData, setHistoricalData] = useState<Array<{ timestamp: number; latency: number }>>([])

  // Generate historical data
  useEffect(() => {
    const data = []
    const now = Date.now()
    for (let i = 30; i >= 0; i--) {
      data.push({
        timestamp: now - (i * 1000),
        latency: 0.5 + Math.random() * 0.5 + (Math.random() > 0.8 ? Math.random() * 2 : 0)
      })
    }
    setHistoricalData(data)
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Network Performance Monitor
        </h1>
        <p className="mt-2 text-gray-600">
          Real-time latency monitoring and analysis
        </p>
      </div>

      {/* Main latency display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LatencyDisplay 
          latency={currentLatency}
          previousLatency={previousLatency}
          location="Warsaw, Poland → Frankfurt, Germany"
        />

        {/* Network overview */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Overview</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Wifi className="h-5 w-5 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Connection Status</p>
                  <p className="text-xs text-gray-500">Direct fiber connection</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-green-600">Optimal</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Globe className="h-5 w-5 text-indigo-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Route Distance</p>
                  <p className="text-xs text-gray-500">Physical distance</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-700">523 km</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Server className="h-5 w-5 text-purple-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Hop Count</p>
                  <p className="text-xs text-gray-500">Network nodes</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-700">3 hops</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Pro tip:</strong> Sub-millisecond latency indicates enterprise-grade network infrastructure with minimal processing overhead.
            </p>
          </div>
        </div>
      </div>

      {/* Different latency examples */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Latency Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Your Connection</p>
            <LatencyBadge latency={0.56} />
            <p className="text-xs text-gray-500 mt-1">Ultra-low latency</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Typical Fiber</p>
            <LatencyBadge latency={5.2} />
            <p className="text-xs text-gray-500 mt-1">Business grade</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Cable Internet</p>
            <LatencyBadge latency={28.5} />
            <p className="text-xs text-gray-500 mt-1">Consumer grade</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Mobile 4G</p>
            <LatencyBadge latency={67.3} />
            <p className="text-xs text-gray-500 mt-1">Wireless network</p>
          </div>
        </div>
      </div>

      {/* Historical chart */}
      <LatencyChart data={historicalData} />

      {/* Technical details */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Analysis</h3>
        <div className="prose prose-sm max-w-none text-gray-600">
          <p>
            A latency of <strong>0.56ms</strong> (560 microseconds) represents exceptional network performance, 
            typically achieved through:
          </p>
          <ul className="mt-2 space-y-1">
            <li>• Direct peering connections between data centers</li>
            <li>• High-performance network equipment with hardware acceleration</li>
            <li>• Optimized routing protocols with minimal processing overhead</li>
            <li>• Geographic proximity with efficient fiber optic paths</li>
          </ul>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">1,785,112</p>
              <p className="text-xs text-gray-500">Packets per second</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">534,936 km/s</p>
              <p className="text-xs text-gray-500">Signal propagation speed</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">99.999%</p>
              <p className="text-xs text-gray-500">Network reliability</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}