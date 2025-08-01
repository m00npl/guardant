import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet'
import { LatLngExpression } from 'leaflet'
import { apiFetch } from '../utils/api'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in Leaflet
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

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

// Major city coordinates [latitude, longitude]
const cityCoordinates: Record<string, [number, number]> = {
  'Warsaw': [52.2297, 21.0122],
  'Frankfurt': [50.1109, 8.6821],
  'Falkenstein': [50.4775, 12.3704],
  'New York': [40.7128, -74.0060],
  'San Francisco': [37.7749, -122.4194],
  'London': [51.5074, -0.1278],
  'Paris': [48.8566, 2.3522],
  'Tokyo': [35.6762, 139.6503],
  'Singapore': [1.3521, 103.8198],
  'Sydney': [-33.8688, 151.2093],
  'Mumbai': [19.0760, 72.8777],
  'São Paulo': [-23.5505, -46.6333],
  'Toronto': [43.6532, -79.3832],
  'Dubai': [25.2048, 55.2708],
  'Seoul': [37.5665, 126.9780],
  'Berlin': [52.5200, 13.4050],
  'Amsterdam': [52.3676, 4.9041],
  'Stockholm': [59.3293, 18.0686],
  'Moscow': [55.7558, 37.6173],
  'Beijing': [39.9042, 116.4074],
  'Hong Kong': [22.3193, 114.1694],
  'Los Angeles': [34.0522, -118.2437],
  'Chicago': [41.8781, -87.6298],
  'Miami': [25.7617, -80.1918],
  'Seattle': [47.6062, -122.3321],
  'Boston': [42.3601, -71.0589],
  'Dallas': [32.7767, -96.7970],
  'Atlanta': [33.7490, -84.3880],
  'Denver': [39.7392, -104.9903],
  'Phoenix': [33.4484, -112.0740],
  'Las Vegas': [36.1699, -115.1398]
}

export const ColonyLeafletMap: React.FC = () => {
  const [colonies, setColonies] = useState<Colony[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)

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
                coordinates = [45 + Math.random() * 15, 10 + Math.random() * 20]
                break
              case 'North America':
                coordinates = [35 + Math.random() * 20, -100 + Math.random() * 40]
                break
              case 'Asia':
                coordinates = [20 + Math.random() * 30, 90 + Math.random() * 40]
                break
              case 'South America':
                coordinates = [-15 + Math.random() * 20, -60 + Math.random() * 20]
                break
              case 'Africa':
                coordinates = [-10 + Math.random() * 30, 20 + Math.random() * 20]
                break
              case 'Australia':
                coordinates = [-25 + Math.random() * 10, 135 + Math.random() * 15]
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

  const center: LatLngExpression = [30, 0] // Center on Europe/Africa

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden">
      <MapContainer 
        center={center} 
        zoom={2} 
        className="w-full h-full"
        style={{ background: '#f0f9ff' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Animated connections */}
        {connections.map((connection, index) => {
          const opacity = Math.max(0.1, 1 - (Date.now() - connection.timestamp) / 3500)
          return (
            <Polyline
              key={`${connection.from.id}-${connection.to.id}-${connection.timestamp}`}
              positions={[connection.from.coordinates, connection.to.coordinates]}
              color="#3b82f6"
              weight={2}
              opacity={opacity}
              dashArray="5, 10"
            />
          )
        })}

        {/* Colony markers */}
        {colonies.map((colony) => (
          <React.Fragment key={colony.id}>
            {/* Pulsing circle for online colonies */}
            {colony.status === 'online' && (
              <>
                <CircleMarker
                  center={colony.coordinates}
                  radius={30}
                  fillColor="#3b82f6"
                  fillOpacity={0.1}
                  stroke={false}
                  className="animate-pulse"
                />
                <CircleMarker
                  center={colony.coordinates}
                  radius={20}
                  fillColor="#3b82f6"
                  fillOpacity={0.2}
                  stroke={false}
                  className="animate-pulse"
                />
              </>
            )}
            
            {/* Main colony marker */}
            <CircleMarker
              center={colony.coordinates}
              radius={10}
              fillColor={colony.status === 'online' ? '#3b82f6' : '#9ca3af'}
              fillOpacity={1}
              color="white"
              weight={3}
            >
              <Popup>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{colony.city}</h3>
                  <p className="text-sm text-gray-600">{colony.country}</p>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      colony.status === 'online' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {colony.status === 'online' ? '🟢 Online' : '⚫ Offline'}
                    </span>
                  </div>
                  {colony.activeWorkers > 0 && (
                    <p className="mt-2 text-sm">
                      <strong>{colony.activeWorkers}</strong> active workers
                    </p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          </React.Fragment>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Colony Status</h4>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-xs text-gray-600">Online Colony</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span className="text-xs text-gray-600">Offline Colony</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-0.5 bg-blue-500" style={{ borderTop: '2px dashed #3b82f6' }}></div>
            <span className="text-xs text-gray-600">Active Traffic</span>
          </div>
        </div>
      </div>

      {/* Info overlay */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
        <div className="text-sm text-gray-700">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="font-medium">Live Network Status</span>
          </div>
          <div className="space-y-1 text-xs">
            <div>
              <span className="font-semibold text-blue-600">
                {colonies.filter(c => c.status === 'online').length}
              </span>
              <span className="text-gray-500"> active colonies</span>
            </div>
            <div>
              <span className="font-semibold text-gray-600">
                {colonies.length}
              </span>
              <span className="text-gray-500"> total locations</span>
            </div>
            <div>
              <span className="font-semibold text-green-600">
                {colonies.reduce((sum, c) => sum + c.activeWorkers, 0)}
              </span>
              <span className="text-gray-500"> workers online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}