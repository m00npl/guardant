import React, { useEffect, useState } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  ZoomableGroup
} from 'react-simple-maps'
import { apiFetch } from '../utils/api'

interface Colony {
  id: string
  city: string
  country: string
  continent: string
  coordinates: [number, number]
  activeWorkers: number
  status: 'online' | 'offline'
}

interface Connection {
  from: Colony
  to: Colony
  timestamp: number
}

// Major city coordinates [longitude, latitude]
const cityCoordinates: Record<string, [number, number]> = {
  'Warsaw': [21.0122, 52.2297],
  'Frankfurt': [8.6821, 50.1109],
  'Falkenstein': [12.3704, 50.4775],
  'New York': [-74.0060, 40.7128],
  'San Francisco': [-122.4194, 37.7749],
  'London': [-0.1278, 51.5074],
  'Paris': [2.3522, 48.8566],
  'Tokyo': [139.6503, 35.6762],
  'Singapore': [103.8198, 1.3521],
  'Sydney': [151.2093, -33.8688],
  'Mumbai': [72.8777, 19.0760],
  'São Paulo': [-46.6333, -23.5505],
  'Toronto': [-79.3832, 43.6532],
  'Dubai': [55.2708, 25.2048],
  'Seoul': [126.9780, 37.5665],
  'Berlin': [13.4050, 52.5200],
  'Amsterdam': [4.9041, 52.3676],
  'Stockholm': [18.0686, 59.3293],
  'Moscow': [37.6173, 55.7558],
  'Beijing': [116.4074, 39.9042],
  'Hong Kong': [114.1694, 22.3193],
  'Los Angeles': [-118.2437, 34.0522],
  'Chicago': [-87.6298, 41.8781],
  'Miami': [-80.1918, 25.7617],
  'Seattle': [-122.3321, 47.6062],
  'Boston': [-71.0589, 42.3601],
  'Dallas': [-96.7970, 32.7767],
  'Atlanta': [-84.3880, 33.7490],
  'Denver': [-104.9903, 39.7392],
  'Phoenix': [-112.0740, 33.4484],
  'Las Vegas': [-115.1398, 36.1699]
}

const geoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries-sans-antarctica.json"

export const ColonyWorldMap: React.FC = () => {
  const [colonies, setColonies] = useState<Colony[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredColony, setHoveredColony] = useState<string | null>(null)

  useEffect(() => {
    fetchColonies()
    const interval = setInterval(() => {
      simulateConnections()
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const fetchColonies = async () => {
    try {
      const response = await apiFetch('/api/admin/workers/regions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        const mappedColonies: Colony[] = data.regions.map((region: any) => {
          let city = 'Unknown'
          if (region.city) {
            city = region.city
          } else if (region.name) {
            const match = region.name.match(/\(([^)]+)\)/)
            if (match) {
              city = match[1]
            } else {
              city = region.name.split(',')[0].trim()
            }
          }
          
          let coordinates = cityCoordinates[city]
          if (!coordinates) {
            // Approximate coordinates based on continent
            const continent = region.continent || 'Unknown'
            switch(continent) {
              case 'Europe':
                coordinates = [10 + Math.random() * 20, 45 + Math.random() * 15]
                break
              case 'North America':
                coordinates = [-100 + Math.random() * 40, 35 + Math.random() * 20]
                break
              case 'Asia':
                coordinates = [90 + Math.random() * 40, 20 + Math.random() * 30]
                break
              case 'South America':
                coordinates = [-60 + Math.random() * 20, -15 + Math.random() * 20]
                break
              case 'Africa':
                coordinates = [20 + Math.random() * 20, -10 + Math.random() * 30]
                break
              case 'Australia':
                coordinates = [135 + Math.random() * 15, -25 + Math.random() * 10]
                break
              default:
                coordinates = [0, 0]
            }
          }
          
          return {
            id: region.id,
            city: city,
            country: region.country || 'Unknown',
            continent: region.continent || 'Unknown',
            coordinates,
            activeWorkers: region.activeWorkerAnts || 0,
            status: region.available ? 'online' : 'offline'
          }
        })
        setColonies(mappedColonies)
      }
    } catch (error) {
      console.error('Failed to fetch colonies:', error)
    } finally {
      setLoading(false)
    }
  }

  const simulateConnections = () => {
    if (colonies.length < 2) return
    
    const onlineColonies = colonies.filter(c => c.status === 'online')
    if (onlineColonies.length < 2) return
    
    const newConnections: Connection[] = []
    const numberOfConnections = Math.floor(Math.random() * 3) + 1
    
    for (let i = 0; i < numberOfConnections; i++) {
      const from = onlineColonies[Math.floor(Math.random() * onlineColonies.length)]
      const to = onlineColonies[Math.floor(Math.random() * onlineColonies.length)]
      if (from.id !== to.id) {
        newConnections.push({
          from,
          to,
          timestamp: Date.now()
        })
      }
    }
    
    setConnections(prev => [...prev, ...newConnections])
    
    // Remove old connections
    setTimeout(() => {
      const cutoff = Date.now() - 3500
      setConnections(prev => prev.filter(c => c.timestamp > cutoff))
    }, 3500)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 120,
          center: [0, 20]
        }}
        className="w-full h-full"
      >
        <ZoomableGroup
          zoom={1}
          minZoom={0.8}
          maxZoom={4}
          translateExtent={[[-200, -150], [1200, 600]]}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#e0e7ff"
                  stroke="#c7d2fe"
                  strokeWidth={0.5}
                  style={{
                    default: {
                      fill: "#e0e7ff",
                      outline: "none"
                    },
                    hover: {
                      fill: "#c7d2fe",
                      outline: "none",
                      cursor: "grab"
                    },
                    pressed: {
                      fill: "#a5b4fc",
                      outline: "none"
                    }
                  }}
                />
              ))
            }
          </Geographies>

          {/* Animated connections */}
          {connections.map((connection, index) => {
            const opacity = Math.max(0, 1 - (Date.now() - connection.timestamp) / 3500)
            return (
              <Line
                key={`${connection.from.id}-${connection.to.id}-${connection.timestamp}`}
                from={connection.from.coordinates}
                to={connection.to.coordinates}
                stroke="#3b82f6"
                strokeWidth={2}
                strokeOpacity={opacity * 0.6}
                strokeLinecap="round"
                strokeDasharray="2 4"
                style={{
                  default: { strokeWidth: 2 },
                }}
              />
            )
          })}

          {/* Colony markers */}
          {colonies.map((colony) => (
            <Marker 
              key={colony.id} 
              coordinates={colony.coordinates}
              onMouseEnter={() => setHoveredColony(colony.id)}
              onMouseLeave={() => setHoveredColony(null)}
            >
              <g>
                {/* Pulse effect for online colonies */}
                {colony.status === 'online' && (
                  <>
                    <circle r="20" fill="#3b82f6" opacity="0.2">
                      <animate
                        attributeName="r"
                        values="20;30;20"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.2;0.1;0.2"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle r="15" fill="#3b82f6" opacity="0.3">
                      <animate
                        attributeName="r"
                        values="15;20;15"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </>
                )}
                
                {/* Colony marker */}
                <circle
                  r="8"
                  fill={colony.status === 'online' ? '#3b82f6' : '#9ca3af'}
                  stroke="#ffffff"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                />
                
                {/* Label on hover */}
                {hoveredColony === colony.id && (
                  <g>
                    <rect
                      x="-50"
                      y="-35"
                      width="100"
                      height="24"
                      fill="white"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                      rx="4"
                    />
                    <text
                      textAnchor="middle"
                      y="-18"
                      style={{
                        fontFamily: "system-ui",
                        fontSize: "12px",
                        fontWeight: "600",
                        fill: "#111827"
                      }}
                    >
                      {colony.city}
                    </text>
                    {colony.activeWorkers > 0 && (
                      <text
                        textAnchor="middle"
                        y="-4"
                        style={{
                          fontFamily: "system-ui",
                          fontSize: "10px",
                          fill: "#6b7280"
                        }}
                      >
                        {colony.activeWorkers} workers
                      </text>
                    )}
                  </g>
                )}
              </g>
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-3">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Colony Status</h4>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-xs text-gray-600">Online</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span className="text-xs text-gray-600">Offline</span>
          </div>
        </div>
      </div>

      {/* Info overlay */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-md p-3">
        <div className="text-xs text-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Live monitoring traffic</span>
          </div>
          <div className="mt-1 font-medium">
            {colonies.filter(c => c.status === 'online').length} active colonies
          </div>
          <div className="text-gray-500">
            {colonies.length} total locations
          </div>
        </div>
      </div>
    </div>
  )
}