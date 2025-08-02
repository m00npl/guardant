import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

// Colony locations
const colonies = [
  { id: 1, name: 'New York', position: [40.7128, -74.006] as [number, number] },
  { id: 2, name: 'London', position: [51.5074, -0.1278] as [number, number] },
  { id: 3, name: 'Tokyo', position: [35.6762, 139.6503] as [number, number] },
  { id: 4, name: 'Sydney', position: [-33.8688, 151.2093] as [number, number] },
  { id: 5, name: 'Singapore', position: [1.3521, 103.8198] as [number, number] },
  { id: 6, name: 'San Francisco', position: [37.7749, -122.4194] as [number, number] },
  { id: 7, name: 'Frankfurt', position: [50.1109, 8.6821] as [number, number] },
  { id: 8, name: 'Toronto', position: [43.6532, -79.3832] as [number, number] }
];

export default function SimpleLeafletMap() {
  return (
    <MapContainer 
      center={[20, 0]} 
      zoom={2} 
      className="w-full h-[500px] rounded-lg"
      style={{ background: '#1e293b' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {colonies.map((colony) => (
        <Marker key={colony.id} position={colony.position}>
          <Popup>
            <strong>{colony.name}</strong>
            <br />
            Colony #{colony.id}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}