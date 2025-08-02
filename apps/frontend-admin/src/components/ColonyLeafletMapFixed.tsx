import React, { useEffect, useState, useRef } from "react";
import { apiFetch } from "../utils/api";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface Colony {
  id: string;
  city: string;
  country: string;
  continent: string;
  coordinates: [number, number];
  activeWorkers: number;
  status: "online" | "offline";
}

interface Connection {
  from: Colony;
  to: Colony;
  timestamp: number;
}

const cityCoordinates: { [key: string]: [number, number] } = {
  Warsaw: [52.2297, 21.0122],
  Frankfurt: [50.1109, 8.6821],
  London: [51.5074, -0.1278],
  Paris: [48.8566, 2.3522],
  Amsterdam: [52.3676, 4.9041],
  Madrid: [40.4168, -3.7038],
  Rome: [41.9028, 12.4964],
  Tokyo: [35.6762, 139.6503],
  Singapore: [1.3521, 103.8198],
  Sydney: [-33.8688, 151.2093],
  "New York": [40.7128, -74.006],
  "Los Angeles": [34.0522, -118.2437],
  Chicago: [41.8781, -87.6298],
  Toronto: [43.6532, -79.3832],
  "Mexico City": [19.4326, -99.1332],
  "São Paulo": [-23.5505, -46.6333],
  Dubai: [25.2048, 55.2708],
  Mumbai: [19.076, 72.8777],
  Beijing: [39.9042, 116.4074],
  Seoul: [37.5665, 126.978],
  "San Francisco": [37.7749, -122.4194],
  Seattle: [47.6062, -122.3321],
  Boston: [42.3601, -71.0589],
  Miami: [25.7617, -80.1918],
  Atlanta: [33.749, -84.388],
  Dallas: [32.7767, -96.797],
  Houston: [29.7604, -95.3698],
  Phoenix: [33.4484, -112.074],
  "Las Vegas": [36.1699, -115.1398],
};

export const ColonyLeafletMapFixed: React.FC = () => {
  const [colonies, setColonies] = useState<Colony[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapInitialized, setMapInitialized] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Initialize map after the container is mounted
  useEffect(() => {
    const initializeMap = () => {
      if (!mapContainerRef.current || mapRef.current) return;

      try {
        console.log("Initializing map...");
        const map = L.map(mapContainerRef.current).setView([30, 0], 2);
        
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;
        setMapInitialized(true);
        
        // Invalidate size after a short delay
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
        
        console.log("Map initialized successfully");
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    // Use a slight delay to ensure the container is rendered
    const timer = setTimeout(initializeMap, 100);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when colonies change and map is ready
  useEffect(() => {
    if (!mapRef.current || !mapInitialized || colonies.length === 0) return;

    console.log("Updating markers for", colonies.length, "colonies");

    // Clear existing layers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add colony markers
    colonies.forEach((colony) => {
      const marker = L.marker(colony.coordinates).addTo(mapRef.current!);
      
      const popupContent = `
        <div class="text-center p-2">
          <h3 class="font-semibold text-lg mb-1">${colony.city}</h3>
          <p class="text-sm text-gray-600 mb-2">${colony.country}</p>
          <div class="mb-2">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              colony.status === "online"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }">
              ${colony.status === "online" ? "🟢 Online" : "⚫ Offline"}
            </span>
          </div>
          ${colony.activeWorkers > 0 ? `<p class="text-sm"><strong>${colony.activeWorkers}</strong> active workers</p>` : ""}
        </div>
      `;

      marker.bindPopup(popupContent);
    });

    // Add connections
    connections.forEach((connection) => {
      const opacity = Math.max(
        0.1,
        1 - (Date.now() - connection.timestamp) / 3500
      );
      L.polyline(
        [connection.from.coordinates, connection.to.coordinates],
        {
          color: "#3b82f6",
          weight: 2,
          opacity: opacity,
          dashArray: "5, 10",
        }
      ).addTo(mapRef.current!);
    });
  }, [colonies, connections, mapInitialized]);

  // Fetch colonies
  useEffect(() => {
    fetchColonies();
    const interval = setInterval(simulateConnections, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchColonies = async () => {
    try {
      const response = await apiFetch("/api/admin/workers/regions", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const mappedColonies: Colony[] = data.regions.map((region: any) => {
          let city = "Unknown";
          if (region.city) {
            city = region.city;
          } else if (region.name) {
            const match = region.name.match(/\(([^)]+)\)/);
            if (match) {
              city = match[1];
            }
          }

          const coordinates = cityCoordinates[city] || [0, 0];

          return {
            id: region.id || Math.random().toString(),
            city: city,
            country: region.country || "Unknown",
            continent: region.continent || "Unknown",
            coordinates,
            activeWorkers: region.activeWorkerAnts || 0,
            status: region.available ? "online" : "offline",
          };
        });
        setColonies(mappedColonies);
      }
    } catch (error) {
      console.error("Failed to fetch colonies:", error);
      // Use fallback data
      setColonies([
        {
          id: "1",
          city: "Warsaw",
          country: "Poland",
          continent: "Europe",
          coordinates: [52.2297, 21.0122],
          activeWorkers: 5,
          status: "online",
        },
        {
          id: "2",
          city: "Frankfurt",
          country: "Germany",
          continent: "Europe",
          coordinates: [50.1109, 8.6821],
          activeWorkers: 3,
          status: "online",
        },
        {
          id: "3",
          city: "New York",
          country: "USA",
          continent: "North America",
          coordinates: [40.7128, -74.006],
          activeWorkers: 8,
          status: "online",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const simulateConnections = () => {
    if (colonies.length < 2) return;

    const activeColonies = colonies.filter((c) => c.status === "online");
    if (activeColonies.length < 2) return;

    const newConnections: Connection[] = [];
    const numConnections = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < numConnections; i++) {
      const fromIndex = Math.floor(Math.random() * activeColonies.length);
      let toIndex = Math.floor(Math.random() * activeColonies.length);
      while (toIndex === fromIndex) {
        toIndex = Math.floor(Math.random() * activeColonies.length);
      }

      newConnections.push({
        from: activeColonies[fromIndex],
        to: activeColonies[toIndex],
        timestamp: Date.now(),
      });
    }

    setConnections((prev) => [
      ...prev.filter((c) => Date.now() - c.timestamp < 3500),
      ...newConnections,
    ]);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden shadow-lg">
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{ background: "#f0f9ff" }}
      />

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-95 rounded-lg shadow-lg p-4 z-[1000]">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">
          Colony Status
        </h4>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-xs text-gray-600">Active Colony</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span className="text-xs text-gray-600">Inactive Colony</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-0.5 bg-blue-500"></div>
            <span className="text-xs text-gray-600">Active Connection</span>
          </div>
        </div>
      </div>

      {/* Colony Count */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-95 rounded-lg shadow-lg px-4 py-2 z-[1000]">
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-1">
            {colonies.slice(0, 3).map((_, i) => (
              <div
                key={i}
                className="w-6 h-6 bg-primary-500 rounded-full border-2 border-white flex items-center justify-center"
              >
                <span className="text-xs text-white font-semibold">
                  {colonies[i]?.activeWorkers || 0}
                </span>
              </div>
            ))}
            {colonies.length > 3 && (
              <div className="w-6 h-6 bg-gray-400 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-xs text-white font-semibold">
                  +{colonies.length - 3}
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {colonies.length} Colonies
            </p>
            <p className="text-xs text-gray-600">
              {colonies.reduce((sum, c) => sum + c.activeWorkers, 0)} Workers
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};