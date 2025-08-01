import React, { useEffect, useState, useRef } from 'react'
import { apiFetch } from '../utils/api'

interface Colony {
  id: string
  city: string
  country: string
  continent: string
  coordinates: { lat: number; lng: number }
  activeWorkers: number
  status: 'online' | 'offline'
}

interface Connection {
  from: string
  to: string
  active: boolean
}

// Major city coordinates for known locations
const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  'Warsaw': { lat: 52.2297, lng: 21.0122 },
  'Frankfurt': { lat: 50.1109, lng: 8.6821 },
  'Falkenstein': { lat: 50.4775, lng: 12.3704 },
  'New York': { lat: 40.7128, lng: -74.0060 },
  'San Francisco': { lat: 37.7749, lng: -122.4194 },
  'London': { lat: 51.5074, lng: -0.1278 },
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'Tokyo': { lat: 35.6762, lng: 139.6503 },
  'Singapore': { lat: 1.3521, lng: 103.8198 },
  'Sydney': { lat: -33.8688, lng: 151.2093 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'São Paulo': { lat: -23.5505, lng: -46.6333 },
  'Toronto': { lat: 43.6532, lng: -79.3832 },
  'Dubai': { lat: 25.2048, lng: 55.2708 },
  'Seoul': { lat: 37.5665, lng: 126.9780 }
}

export const ColonyMap: React.FC = () => {
  const [colonies, setColonies] = useState<Colony[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    fetchColonies()
    // Simulate connections every few seconds
    const interval = setInterval(() => {
      simulateConnections()
    }, 3000)
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
          const city = region.city || region.name?.split(',')[0] || 'Unknown'
          const coordinates = cityCoordinates[city] || { lat: 0, lng: 0 }
          return {
            id: region.id,
            city: city,
            country: region.country || 'Unknown',
            continent: region.continent || 'Unknown',
            coordinates,
            activeWorkers: region.activeWorkerAnts || 0,
            status: region.available ? 'online' : 'offline'
          }
        }).filter((colony: Colony) => colony.coordinates.lat !== 0) // Only show colonies with known coordinates
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
    
    // Create random connections between online colonies
    const onlineColonies = colonies.filter(c => c.status === 'online')
    if (onlineColonies.length < 2) return
    
    const newConnections: Connection[] = []
    const numberOfConnections = Math.floor(Math.random() * 3) + 1
    
    for (let i = 0; i < numberOfConnections; i++) {
      const from = onlineColonies[Math.floor(Math.random() * onlineColonies.length)]
      const to = onlineColonies[Math.floor(Math.random() * onlineColonies.length)]
      if (from.id !== to.id) {
        newConnections.push({
          from: from.id,
          to: to.id,
          active: true
        })
      }
    }
    
    setConnections(newConnections)
    
    // Clear connections after animation
    setTimeout(() => {
      setConnections([])
    }, 2500)
  }

  const projectCoordinates = (lat: number, lng: number, width: number, height: number) => {
    // Simple equirectangular projection
    const x = (lng + 180) * (width / 360)
    const y = (90 - lat) * (height / 180)
    return { x, y }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const width = 1200
  const height = 600

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-gray-900">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* World map background */}
        <rect width={width} height={height} fill="#111827" />
        
        {/* Simplified world map outline */}
        <g opacity="0.2">
          {/* Continental outlines - simplified */}
          <path
            d="M 300 200 Q 400 180 500 200 Q 550 220 600 200 Q 650 180 700 200 L 700 300 Q 650 320 600 300 Q 550 280 500 300 Q 400 320 300 300 Z"
            fill="none"
            stroke="#4B5563"
            strokeWidth="1"
          />
          <path
            d="M 100 250 Q 150 230 200 250 L 200 350 Q 150 370 100 350 Z"
            fill="none"
            stroke="#4B5563"
            strokeWidth="1"
          />
          <path
            d="M 750 400 Q 800 380 850 400 L 850 450 Q 800 470 750 450 Z"
            fill="none"
            stroke="#4B5563"
            strokeWidth="1"
          />
        </g>

        {/* Grid lines */}
        <g opacity="0.1">
          {[...Array(12)].map((_, i) => (
            <line
              key={`v-${i}`}
              x1={i * 100}
              y1="0"
              x2={i * 100}
              y2={height}
              stroke="#374151"
              strokeWidth="1"
            />
          ))}
          {[...Array(6)].map((_, i) => (
            <line
              key={`h-${i}`}
              x1="0"
              y1={i * 100}
              x2={width}
              y2={i * 100}
              stroke="#374151"
              strokeWidth="1"
            />
          ))}
        </g>

        {/* Connections */}
        <g>
          {connections.map((connection, index) => {
            const fromColony = colonies.find(c => c.id === connection.from)
            const toColony = colonies.find(c => c.id === connection.to)
            if (!fromColony || !toColony) return null

            const from = projectCoordinates(fromColony.coordinates.lat, fromColony.coordinates.lng, width, height)
            const to = projectCoordinates(toColony.coordinates.lat, toColony.coordinates.lng, width, height)

            return (
              <g key={`connection-${index}`}>
                {/* Connection line */}
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="#3B82F6"
                  strokeWidth="2"
                  opacity="0.3"
                  strokeDasharray="5,5"
                />
                {/* Animated packet */}
                <circle r="4" fill="#60A5FA">
                  <animateMotion
                    dur="2s"
                    repeatCount="1"
                    path={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
                  />
                </circle>
              </g>
            )
          })}
        </g>

        {/* Colonies */}
        <g>
          {colonies.map((colony) => {
            const { x, y } = projectCoordinates(colony.coordinates.lat, colony.coordinates.lng, width, height)
            
            return (
              <g key={colony.id} transform={`translate(${x}, ${y})`}>
                {/* Pulse animation for online colonies */}
                {colony.status === 'online' && (
                  <>
                    <circle r="20" fill="#3B82F6" opacity="0.2">
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
                    <circle r="15" fill="#3B82F6" opacity="0.3">
                      <animate
                        attributeName="r"
                        values="15;20;15"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </>
                )}
                
                {/* Colony dot */}
                <circle
                  r="8"
                  fill={colony.status === 'online' ? '#3B82F6' : '#6B7280'}
                  stroke="#1F2937"
                  strokeWidth="2"
                />
                
                {/* Inner dot */}
                <circle
                  r="3"
                  fill={colony.status === 'online' ? '#93C5FD' : '#9CA3AF'}
                />
                
                {/* Colony label */}
                <text
                  x="0"
                  y="-15"
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="600"
                >
                  {colony.city}
                </text>
                
                {/* Worker count */}
                {colony.activeWorkers > 0 && (
                  <text
                    x="0"
                    y="25"
                    textAnchor="middle"
                    fill="#9CA3AF"
                    fontSize="10"
                  >
                    {colony.activeWorkers} workers
                  </text>
                )}
              </g>
            )
          })}
        </g>

        {/* Legend */}
        <g transform="translate(20, 20)">
          <rect x="0" y="0" width="150" height="80" fill="#1F2937" opacity="0.9" rx="5" />
          <text x="10" y="20" fill="white" fontSize="14" fontWeight="600">Colony Status</text>
          <circle cx="20" cy="40" r="6" fill="#3B82F6" />
          <text x="35" y="45" fill="#9CA3AF" fontSize="12">Online</text>
          <circle cx="20" cy="60" r="6" fill="#6B7280" />
          <text x="35" y="65" fill="#9CA3AF" fontSize="12">Offline</text>
        </g>
      </svg>
      
      {/* Info overlay */}
      <div className="absolute bottom-4 right-4 bg-gray-800 bg-opacity-90 rounded-lg p-3">
        <div className="text-xs text-gray-300">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Live monitoring traffic</span>
          </div>
          <div className="mt-1">
            {colonies.filter(c => c.status === 'online').length} active colonies
          </div>
        </div>
      </div>
    </div>
  )
}