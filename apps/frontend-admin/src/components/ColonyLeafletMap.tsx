import React, { useEffect, useState, useRef } from "react";
import { apiFetch } from "../utils/api";
import "leaflet/dist/leaflet.css";

// Fix for Leaflet icons in React - this needs to be done before any Leaflet usage
import L from "leaflet";

// Fix for default icon issue in react-leaflet
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

// Major city coordinates [latitude, longitude]
const cityCoordinates: Record<string, [number, number]> = {
  Warsaw: [52.2297, 21.0122],
  Frankfurt: [50.1109, 8.6821],
  Falkenstein: [50.4775, 12.3704],
  "New York": [40.7128, -74.006],
  "San Francisco": [37.7749, -122.4194],
  London: [51.5074, -0.1278],
  Paris: [48.8566, 2.3522],
  Tokyo: [35.6762, 139.6503],
  Singapore: [1.3521, 103.8198],
  Sydney: [-33.8688, 151.2093],
  Mumbai: [19.076, 72.8777],
  "São Paulo": [-23.5505, -46.6333],
  Toronto: [43.6532, -79.3832],
  Dubai: [25.2048, 55.2708],
  Seoul: [37.5665, 126.978],
  Berlin: [52.52, 13.405],
  Amsterdam: [52.3676, 4.9041],
  Stockholm: [59.3293, 18.0686],
  Moscow: [55.7558, 37.6173],
  Beijing: [39.9042, 116.4074],
  "Hong Kong": [22.3193, 114.1694],
  "Los Angeles": [34.0522, -118.2437],
  Chicago: [41.8781, -87.6298],
  Miami: [25.7617, -80.1918],
  Seattle: [47.6062, -122.3321],
  Boston: [42.3601, -71.0589],
  Dallas: [32.7767, -96.797],
  Atlanta: [33.749, -84.388],
  Denver: [39.7392, -104.9903],
  Phoenix: [33.4484, -112.074],
  "Las Vegas": [36.1699, -115.1398],
};

export const ColonyLeafletMap: React.FC = () => {
  const [colonies, setColonies] = useState<Colony[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  console.log("ColonyLeafletMap component rendering");

  // Check if Leaflet is available immediately
  useEffect(() => {
    console.log("Component mounted, checking Leaflet availability...");
    console.log("typeof L:", typeof L);
    console.log("L object:", L);

    if (typeof L === "undefined") {
      console.error("Leaflet is not available on component mount");
    } else {
      console.log("Leaflet is available on component mount");
    }
  }, []);

  useEffect(() => {
    fetchColonies();
    const interval = setInterval(() => {
      simulateConnections();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Update markers when colonies change
  useEffect(() => {
    console.log("Colonies changed effect triggered");
    console.log("Colonies count:", colonies.length);
    console.log("Map ref:", mapRef.current);

    if (!mapRef.current || colonies.length === 0) {
      console.log("Map not ready or no colonies:", {
        mapReady: !!mapRef.current,
        coloniesCount: colonies.length,
      });
      return;
    }

    console.log("Updating markers for", colonies.length, "colonies");

    // Clear existing markers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add colony markers
    colonies.forEach((colony) => {
      console.log("Adding marker for", colony.city, "at", colony.coordinates);
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
      const polyline = L.polyline(
        [connection.from.coordinates, connection.to.coordinates],
        {
          color: "#3b82f6",
          weight: 2,
          opacity: opacity,
          dashArray: "5, 10",
        }
      ).addTo(mapRef.current!);
    });

    console.log("Markers updated successfully");
  }, [colonies, connections]);

  // Map initialization effect
  useEffect(() => {
    console.log("Map initialization effect triggered");
    console.log("Container ref:", mapContainerRef.current);
    console.log("Map ref:", mapRef.current);

    // Check if DOM element exists
    const domElement = document.getElementById("map-container");
    console.log("DOM element by ID:", domElement);

    if (!mapContainerRef.current || mapRef.current) {
      console.log(
        "Map initialization skipped - container not ready or map already exists"
      );
      return;
    }

    // Wait for container to be ready
    const checkContainer = () => {
      if (!mapContainerRef.current) {
        console.log("Container still not ready, retrying...");
        console.log("Container ref current:", mapContainerRef.current);
        console.log(
          "DOM element by ID:",
          document.getElementById("map-container")
        );
        setTimeout(checkContainer, 50);
        return;
      }

      console.log("Container is ready:", mapContainerRef.current);
      console.log("Container dimensions:", {
        width: mapContainerRef.current.offsetWidth,
        height: mapContainerRef.current.offsetHeight,
      });

      // Check if container has proper dimensions
      if (
        mapContainerRef.current.offsetWidth === 0 ||
        mapContainerRef.current.offsetHeight === 0
      ) {
        console.log("Container has zero dimensions, retrying...");
        setTimeout(checkContainer, 50);
        return;
      }

      // Check if Leaflet is available
      if (typeof L === "undefined") {
        console.error("Leaflet is not available");
        return;
      }

      console.log("Leaflet is available:", typeof L);
      console.log("Container element:", mapContainerRef.current);

      try {
        console.log("Initializing Leaflet map...");

        // Create map instance
        const mapInstance = L.map(mapContainerRef.current).setView([30, 0], 2);

        // Add tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(mapInstance);

        mapRef.current = mapInstance;

        console.log("Map initialized successfully");
        console.log("Map instance:", mapInstance);

        // Force a resize after mount and when tiles load
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
            console.log("Map size invalidated");
          }
        }, 100);

        // Also invalidate size when tiles start loading
        mapInstance.on("loading", () => {
          console.log("Map tiles loading...");
        });

        mapInstance.on("load", () => {
          console.log("Map tiles loaded");
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        });
      } catch (error) {
        console.error("Error initializing map:", error);
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
      }
    };

    // Start checking for container
    checkContainer();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const fetchColonies = async () => {
    try {
      console.log("Fetching colonies from API...");
      const response = await apiFetch("/api/admin/workers/regions", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("API response status:", response.status);
      console.log("API response ok:", response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log("API data received:", data);

        const mappedColonies: Colony[] = data.regions.map((region: any) => {
          let city = "Unknown";
          if (region.city) {
            city = region.city;
          } else if (region.name) {
            const match = region.name.match(/\(([^)]+)\)/);
            if (match) {
              city = match[1];
            } else {
              city = region.name.split(",")[0].trim();
            }
          }

          let coordinates = cityCoordinates[city];
          if (!coordinates) {
            // Approximate coordinates based on continent
            const continent = region.continent || "Unknown";
            switch (continent) {
              case "Europe":
                coordinates = [
                  45 + Math.random() * 15,
                  10 + Math.random() * 20,
                ];
                break;
              case "North America":
                coordinates = [
                  35 + Math.random() * 20,
                  -100 + Math.random() * 40,
                ];
                break;
              case "Asia":
                coordinates = [
                  20 + Math.random() * 30,
                  90 + Math.random() * 40,
                ];
                break;
              case "South America":
                coordinates = [
                  -15 + Math.random() * 20,
                  -60 + Math.random() * 20,
                ];
                break;
              case "Africa":
                coordinates = [
                  -10 + Math.random() * 30,
                  20 + Math.random() * 20,
                ];
                break;
              case "Australia":
                coordinates = [
                  -25 + Math.random() * 10,
                  135 + Math.random() * 15,
                ];
                break;
              default:
                coordinates = [0, 0];
            }
          }

          return {
            id: region.id,
            city: city,
            country: region.country || "Unknown",
            continent: region.continent || "Unknown",
            coordinates,
            activeWorkers: region.activeWorkerAnts || 0,
            status: region.available ? "online" : "offline",
          };
        });
        console.log("Mapped colonies:", mappedColonies);
        setColonies(mappedColonies);
      } else {
        // Fallback data if API fails
        console.log("API failed, using fallback data");
        const fallbackColonies: Colony[] = [
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
          {
            id: "4",
            city: "Tokyo",
            country: "Japan",
            continent: "Asia",
            coordinates: [35.6762, 139.6503],
            activeWorkers: 4,
            status: "online",
          },
          {
            id: "5",
            city: "Sydney",
            country: "Australia",
            continent: "Australia",
            coordinates: [-33.8688, 151.2093],
            activeWorkers: 2,
            status: "offline",
          },
          {
            id: "6",
            city: "São Paulo",
            country: "Brazil",
            continent: "South America",
            coordinates: [-23.5505, -46.6333],
            activeWorkers: 1,
            status: "online",
          },
        ];
        setColonies(fallbackColonies);
      }
    } catch (error) {
      console.error("Failed to fetch colonies:", error);
      // Use fallback data on error
      const fallbackColonies: Colony[] = [
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
        {
          id: "4",
          city: "Tokyo",
          country: "Japan",
          continent: "Asia",
          coordinates: [35.6762, 139.6503],
          activeWorkers: 4,
          status: "online",
        },
        {
          id: "5",
          city: "Sydney",
          country: "Australia",
          continent: "Australia",
          coordinates: [-33.8688, 151.2093],
          activeWorkers: 2,
          status: "offline",
        },
        {
          id: "6",
          city: "São Paulo",
          country: "Brazil",
          continent: "South America",
          coordinates: [-23.5505, -46.6333],
          activeWorkers: 1,
          status: "online",
        },
      ];
      setColonies(fallbackColonies);
    } finally {
      setLoading(false);
    }
  };

  const simulateConnections = () => {
    if (colonies.length < 2) return;

    const onlineColonies = colonies.filter((c) => c.status === "online");
    if (onlineColonies.length < 2) return;

    const newConnections: Connection[] = [];
    const numberOfConnections = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < numberOfConnections; i++) {
      const from =
        onlineColonies[Math.floor(Math.random() * onlineColonies.length)];
      const to =
        onlineColonies[Math.floor(Math.random() * onlineColonies.length)];
      if (from.id !== to.id) {
        newConnections.push({
          from,
          to,
          timestamp: Date.now(),
        });
      }
    }

    setConnections((prev) => [...prev, ...newConnections]);

    // Remove old connections
    setTimeout(() => {
      const cutoff = Date.now() - 3500;
      setConnections((prev) => prev.filter((c) => c.timestamp > cutoff));
    }, 3500);
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
        style={{
          background: "#f0f9ff",
          minHeight: "600px",
          height: "600px",
          width: "100%",
          position: "relative",
          zIndex: 1,
        }}
        id="map-container"
      >
        {/* Debug info */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            background: "rgba(255,255,255,0.8)",
            padding: "5px",
            fontSize: "12px",
            zIndex: 1000,
          }}
        >
          Map Container Ready
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-95 rounded-lg shadow-lg p-4 z-[1000]">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">
          Colony Status
        </h4>
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
            <div
              className="w-8 h-0.5 bg-blue-500"
              style={{ borderTop: "2px dashed #3b82f6" }}
            ></div>
            <span className="text-xs text-gray-600">Active Traffic</span>
          </div>
        </div>
      </div>

      {/* Info overlay */}
      <div className="absolute bottom-4 right-4 bg-white bg-opacity-95 rounded-lg shadow-lg p-4 z-[1000]">
        <div className="text-sm text-gray-700">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="font-medium">Live Network Status</span>
          </div>
          <div className="space-y-1 text-xs">
            <div>
              <span className="font-semibold text-blue-600">
                {colonies.filter((c) => c.status === "online").length}
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

      <style>{`
        .leaflet-container {
          font-family: inherit;
          height: 100% !important;
          width: 100% !important;
          min-height: 600px !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
        .leaflet-popup-content {
          margin: 0;
        }
        .leaflet-control-zoom {
          z-index: 1000 !important;
        }
        .leaflet-control-attribution {
          z-index: 1000 !important;
        }
      `}</style>
    </div>
  );
};
