import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    L: any;
  }
}

export const Map: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    const initializeMap = () => {
      if (!window.L || !mapContainerRef.current || mapRef.current) return;
      
      const L = window.L;
      
      // Create map instance
      mapRef.current = L.map(mapContainerRef.current, {
        center: [20, 0],
        zoom: 2,
        scrollWheelZoom: true,
        zoomControl: true
      });

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(mapRef.current);
    };

    // Check if Leaflet is already loaded
    if (window.L) {
      initializeMap();
    } else if (!scriptLoadedRef.current) {
      // Load Leaflet script dynamically
      scriptLoadedRef.current = true;
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        initializeMap();
      };
      document.body.appendChild(script);
    }

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Global Colony Map</h1>
      
      <div className="card p-6">
        <div 
          ref={mapContainerRef}
          className="w-full h-[600px] rounded-lg"
          style={{ position: 'relative', zIndex: 0 }}
        />
      </div>
    </div>
  );
};