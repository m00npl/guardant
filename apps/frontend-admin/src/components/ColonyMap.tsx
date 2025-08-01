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
  'Seoul': { lat: 37.5665, lng: 126.9780 },
  'Berlin': { lat: 52.5200, lng: 13.4050 },
  'Amsterdam': { lat: 52.3676, lng: 4.9041 },
  'Stockholm': { lat: 59.3293, lng: 18.0686 },
  'Moscow': { lat: 55.7558, lng: 37.6173 },
  'Beijing': { lat: 39.9042, lng: 116.4074 },
  'Hong Kong': { lat: 22.3193, lng: 114.1694 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'Chicago': { lat: 41.8781, lng: -87.6298 },
  'Miami': { lat: 25.7617, lng: -80.1918 },
  'Seattle': { lat: 47.6062, lng: -122.3321 },
  'Boston': { lat: 42.3601, lng: -71.0589 },
  'Dallas': { lat: 32.7767, lng: -96.7970 },
  'Atlanta': { lat: 33.7490, lng: -84.3880 },
  'Denver': { lat: 39.7392, lng: -104.9903 },
  'Phoenix': { lat: 33.4484, lng: -112.0740 },
  'Las Vegas': { lat: 36.1699, lng: -115.1398 }
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
          // Extract city from the region name
          let city = 'Unknown'
          if (region.city) {
            city = region.city
          } else if (region.name) {
            // Parse city from name like "Europe Central (Warsaw)"
            const match = region.name.match(/\(([^)]+)\)/)
            if (match) {
              city = match[1]
            } else {
              city = region.name.split(',')[0].trim()
            }
          }
          
          // Get coordinates, fallback to approximate locations if not found
          let coordinates = cityCoordinates[city]
          if (!coordinates) {
            // Try to approximate based on continent
            const continent = region.continent || 'Unknown'
            switch(continent) {
              case 'Europe':
                coordinates = { lat: 50 + Math.random() * 10, lng: 10 + Math.random() * 20 }
                break
              case 'North America':
                coordinates = { lat: 40 + Math.random() * 10, lng: -100 + Math.random() * 20 }
                break
              case 'Asia':
                coordinates = { lat: 35 + Math.random() * 20, lng: 100 + Math.random() * 30 }
                break
              case 'South America':
                coordinates = { lat: -15 + Math.random() * 20, lng: -60 + Math.random() * 20 }
                break
              case 'Africa':
                coordinates = { lat: 0 + Math.random() * 30, lng: 20 + Math.random() * 20 }
                break
              case 'Australia':
                coordinates = { lat: -25 + Math.random() * 10, lng: 135 + Math.random() * 15 }
                break
              default:
                coordinates = { lat: 0, lng: 0 }
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
    <div className="relative w-full overflow-hidden rounded-lg bg-gradient-to-b from-blue-50 to-blue-100">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Ocean background */}
        <rect width={width} height={height} fill="#dbeafe" />
        
        {/* World map */}
        <g opacity="0.3">
          {/* Simplified continents */}
          {/* North America */}
          <path
            d="M 150 180 Q 200 160 250 170 L 280 190 L 300 220 L 290 250 L 270 280 L 250 300 L 220 320 L 180 310 L 150 290 L 130 260 L 120 230 L 130 200 Z"
            fill="#86efac"
            stroke="#22c55e"
            strokeWidth="1"
          />
          
          {/* South America */}
          <path
            d="M 230 350 L 250 360 L 260 380 L 270 410 L 265 440 L 255 470 L 240 490 L 220 485 L 210 460 L 205 430 L 210 400 L 220 370 Z"
            fill="#86efac"
            stroke="#22c55e"
            strokeWidth="1"
          />
          
          {/* Europe */}
          <path
            d="M 560 160 L 580 155 L 600 160 L 620 165 L 635 170 L 640 180 L 635 195 L 625 205 L 610 210 L 590 205 L 570 200 L 555 190 L 550 175 L 555 165 Z"
            fill="#86efac"
            stroke="#22c55e"
            strokeWidth="1"
          />
          
          {/* Africa */}
          <path
            d="M 580 250 L 600 240 L 620 245 L 630 260 L 635 280 L 640 310 L 635 340 L 625 370 L 610 390 L 590 395 L 570 385 L 560 360 L 555 330 L 560 300 L 565 270 L 570 255 Z"
            fill="#86efac"
            stroke="#22c55e"
            strokeWidth="1"
          />
          
          {/* Asia */}
          <path
            d="M 680 140 L 750 130 L 820 140 L 880 160 L 920 180 L 940 210 L 930 240 L 900 260 L 850 270 L 800 265 L 750 255 L 700 245 L 670 230 L 660 210 L 665 190 L 670 170 L 675 150 Z"
            fill="#86efac"
            stroke="#22c55e"
            strokeWidth="1"
          />
          
          {/* Australia */}
          <path
            d="M 850 420 L 890 415 L 920 425 L 935 440 L 930 460 L 915 475 L 890 480 L 860 475 L 845 460 L 840 440 L 845 425 Z"
            fill="#86efac"
            stroke="#22c55e"
            strokeWidth="1"
          />
        </g>

        {/* Connections */}
        <g>
          {connections.map((connection, index) => {
            const fromColony = colonies.find(c => c.id === connection.from)
            const toColony = colonies.find(c => c.id === connection.to)
            if (!fromColony || !toColony) return null

            const from = projectCoordinates(fromColony.coordinates.lat, fromColony.coordinates.lng, width, height)
            const to = projectCoordinates(toColony.coordinates.lat, toColony.coordinates.lng, width, height)

            // Calculate control point for curved path
            const midX = (from.x + to.x) / 2
            const midY = (from.y + to.y) / 2
            const distance = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2))
            const curve = Math.min(distance * 0.3, 100)
            const controlX = midX
            const controlY = midY - curve

            return (
              <g key={`connection-${index}`}>
                {/* Connection line */}
                <path
                  d={`M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`}
                  stroke="#3B82F6"
                  strokeWidth="2"
                  opacity="0.4"
                  fill="none"
                  strokeDasharray="5,5"
                />
                {/* Animated packet */}
                <circle r="6" fill="#60A5FA">
                  <animateMotion
                    dur="2s"
                    repeatCount="1"
                    path={`M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`}
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
                    <circle r="25" fill="#3B82F6" opacity="0.2">
                      <animate
                        attributeName="r"
                        values="25;35;25"
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
                    <circle r="18" fill="#3B82F6" opacity="0.3">
                      <animate
                        attributeName="r"
                        values="18;23;18"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </>
                )}
                
                {/* Colony dot with white border for visibility */}
                <circle
                  r="10"
                  fill="white"
                  stroke="#1F2937"
                  strokeWidth="1"
                />
                <circle
                  r="8"
                  fill={colony.status === 'online' ? '#3B82F6' : '#6B7280'}
                />
                
                {/* Inner dot */}
                <circle
                  r="3"
                  fill={colony.status === 'online' ? '#93C5FD' : '#9CA3AF'}
                />
                
                {/* Colony label with background for readability */}
                <rect
                  x={-40}
                  y={-28}
                  width="80"
                  height="16"
                  fill="white"
                  opacity="0.9"
                  rx="2"
                />
                <text
                  x="0"
                  y="-18"
                  textAnchor="middle"
                  fill="#1F2937"
                  fontSize="12"
                  fontWeight="600"
                >
                  {colony.city}
                </text>
                
                {/* Worker count */}
                {colony.activeWorkers > 0 && (
                  <>
                    <rect
                      x={-30}
                      y="18"
                      width="60"
                      height="14"
                      fill="white"
                      opacity="0.9"
                      rx="2"
                    />
                    <text
                      x="0"
                      y="28"
                      textAnchor="middle"
                      fill="#6B7280"
                      fontSize="10"
                    >
                      {colony.activeWorkers} workers
                    </text>
                  </>
                )}
              </g>
            )
          })}
        </g>

        {/* Legend */}
        <g transform="translate(20, 20)">
          <rect x="0" y="0" width="150" height="80" fill="white" opacity="0.95" rx="5" stroke="#e5e7eb" />
          <text x="10" y="20" fill="#1F2937" fontSize="14" fontWeight="600">Colony Status</text>
          <circle cx="20" cy="40" r="6" fill="#3B82F6" />
          <text x="35" y="45" fill="#6B7280" fontSize="12">Online</text>
          <circle cx="20" cy="60" r="6" fill="#6B7280" />
          <text x="35" y="65" fill="#6B7280" fontSize="12">Offline</text>
        </g>
      </svg>
      
      {/* Info overlay */}
      <div className="absolute bottom-4 right-4 bg-white bg-opacity-95 rounded-lg p-3 shadow-lg">
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