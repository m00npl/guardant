import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Simple colony locations
const colonies = [
  { id: 1, name: 'New York', coordinates: [-74.006, 40.7128] },
  { id: 2, name: 'London', coordinates: [-0.1278, 51.5074] },
  { id: 3, name: 'Tokyo', coordinates: [139.6503, 35.6762] },
  { id: 4, name: 'Sydney', coordinates: [151.2093, -33.8688] },
  { id: 5, name: 'Singapore', coordinates: [103.8198, 1.3521] },
  { id: 6, name: 'San Francisco', coordinates: [-122.4194, 37.7749] },
  { id: 7, name: 'Frankfurt', coordinates: [8.6821, 50.1109] },
  { id: 8, name: 'Toronto', coordinates: [-79.3832, 43.6532] }
];

export default function SimpleColonyMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map without Mapbox API key using OpenStreetMap
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [0, 20],
      zoom: 2
    });

    // Add markers for colonies
    colonies.forEach(colony => {
      new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat(colony.coordinates as [number, number])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(colony.name))
        .addTo(map.current!);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div ref={mapContainer} className="w-full h-[500px] rounded-lg overflow-hidden" />
  );
}