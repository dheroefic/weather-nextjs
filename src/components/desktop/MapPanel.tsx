import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { TemperatureUnit, WeatherData } from '@/types/weather';
import {
  getUserGeolocation,
  reverseGeocode,
  searchLocations,
  formatSearchResults,
} from '@/services/geolocationService';
import { WMO_CODES } from '@/services/weatherService';
import { fetchNearbyWeatherData } from '@/services/weatherDistribution';
import type { SearchResult } from '@/services/geolocationService';
import 'leaflet/dist/leaflet.css';
import type { LatLngExpression, Map } from 'leaflet';
import type { Location } from '@/types/weather';
import { NearbyLocation } from '@/types/nearbyWeather';

// Dynamically import Map components with SSR disabled.
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// Helper component to capture the map instance via useMap hook
const SetMapInstance = dynamic(
  () => import('react-leaflet').then((mod) => {
    const Component = ({ 
      setMapInstance, 
      setIsMapReady 
    }: { 
      setMapInstance: (map: Map) => void;
      setIsMapReady?: (ready: boolean) => void;
    }) => {
      const map = mod.useMap();
      
      React.useEffect(() => {
        if (map) {
          console.log('Map instance captured in MapPanel', map);
          setMapInstance(map);
          
          // Set ready state after a short delay to ensure map is fully initialized
          if (setIsMapReady) {
            const timer = setTimeout(() => {
              console.log('Setting map ready state to true in MapPanel');
              setIsMapReady(true);
            }, 500); // Increased delay to ensure proper initialization
            
            return () => clearTimeout(timer);
          }
        } else {
          console.log('Map instance is null in MapPanel');
        }
      }, [map, setMapInstance, setIsMapReady]);
      
      return null;
    };
    
    return { default: Component };
  }),
  { ssr: false }
);

interface MapConfig {
  defaultZoom: number;
  minZoom: number;
  maxZoom: number;
  tileLayer: {
    url: string;
    attribution: string;
    maxZoom: number;
  };
  controls: {
    zoomControl: boolean;
    attributionControl: boolean;
  };
}

const defaultMapConfig: MapConfig = {
  defaultZoom: 13,
  minZoom: 3,
  maxZoom: 18,
  tileLayer: {
    url: 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 18,
  },
  controls: {
    zoomControl: false,
    attributionControl: true,
  },
};

interface MapPanelProps {
  isOpen: boolean;
  weatherData: WeatherData | null;
  onClose: () => void;
  location: Location & {
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  tempUnit: TemperatureUnit;
  convertTemp: (temp: number, unit: TemperatureUnit) => number;
  mapConfig?: Partial<MapConfig>;
  onLocationSelect: (coordinates: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  }) => void;
  isFullscreen?: boolean;
}

interface WeatherMetric {
  angle: number;
  distance: number;
  icon: string;
  title: string;
  value: string;
}

// MapLegend component to display the weather icon legend.
const MapLegend = () => {
  const [isMinimized, setIsMinimized] = useState(true);

  return (
    <div
      className={`absolute bottom-4 left-4 z-[1010] transition-all duration-300 ease-in-out ${
        isMinimized ? 'max-h-[120px] w-[180px]' : 'max-h-[80vh] w-[300px]'
      }`}
    >
      <div className="glass-container backdrop-blur-md bg-black/40 border border-white/10 rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <h4 className="text-sm font-bold text-white">Weather Legend</h4>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-black/20 rounded-lg transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 text-white transition-transform duration-300 ${
                isMinimized ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
        <div
          className={`overflow-y-auto transition-all duration-300 ${
            isMinimized ? 'max-h-[60px]' : 'max-h-[calc(80vh-48px)]'
          }`}
        >
          <div className="grid grid-cols-2 gap-2 p-3">
            {Object.entries(WMO_CODES).map(([code, { condition, icon }]) => (
              <div key={code} className="flex items-center gap-2">
                <Image src={icon} alt={condition} width={24} height={24} className="w-6 h-6" />
                <span className="text-xs text-white/90">{condition}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MapPanel({
  isOpen,
  weatherData,
  onClose,
  location,
  tempUnit,
  convertTemp,
  onLocationSelect,
  isFullscreen = false,
}: MapPanelProps) {
  // Dynamically import Leaflet on the client.
  const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null);
  const [mapContainerId] = useState(() => `fullscreen-map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [isDestroying, setIsDestroying] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        setLeaflet(L);
        console.log('Leaflet loaded successfully in MapPanel');
      }).catch((error) => {
        console.error('Error loading Leaflet in MapPanel:', error);
      });
    }
  }, []);

  // Determine if coordinates are available and valid.
  const hasValidCoordinates = Boolean(
    location.coordinates && 
    typeof location.coordinates.latitude === 'number' && 
    typeof location.coordinates.longitude === 'number' &&
    !isNaN(location.coordinates.latitude) && 
    !isNaN(location.coordinates.longitude)
  );
  
  // Safe coordinates with fallback to NYC
  const safeCoordinates = useMemo(() => {
    return hasValidCoordinates 
      ? location.coordinates! 
      : { latitude: 40.7128, longitude: -74.0060 };
  }, [hasValidCoordinates, location.coordinates]);

  // Debug logging to track coordinate handling
  useEffect(() => {
    console.log('MapPanel coordinate check:', {
      hasValidCoordinates,
      rawCoordinates: location.coordinates,
      safeCoordinates,
      locationCity: location.city
    });
  }, [hasValidCoordinates, location.coordinates, safeCoordinates, location.city]);

  // State hooks.
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRenderMap, setShouldRenderMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>(() => {
    // Ensure initial coordinates are always valid
    if (safeCoordinates.latitude >= -90 && safeCoordinates.latitude <= 90 &&
        safeCoordinates.longitude >= -180 && safeCoordinates.longitude <= 180) {
      return [safeCoordinates.latitude, safeCoordinates.longitude];
    } else {
      console.warn('Invalid initial coordinates in MapPanel:', safeCoordinates);
      return [40.7128, -74.0060]; // NYC fallback
    }
  });
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  const [nearbyLocations, setNearbyLocations] = useState<NearbyLocation[]>([]);

  // Timeout refs.
  const searchTimeoutRef = useRef<number | null>(null);
  const debounceTimeoutRef = useRef<number | null>(null);
  const loadingTimeoutRef = useRef<number | null>(null);

  // Backup mechanism to hide loading overlay if map doesn't report ready
  useEffect(() => {
    if (shouldRenderMap && leaflet && !isMapReady) {
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      // Set a backup timeout to hide loading after 3 seconds
      loadingTimeoutRef.current = window.setTimeout(() => {
        console.log('Backup timeout: forcing map ready state to true');
        setIsMapReady(true);
      }, 3000);
    }
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [shouldRenderMap, leaflet, isMapReady]);
  

  // Helper: safely call flyTo if the container is valid.
  const safeFlyTo = useCallback((lat: number, lng: number, zoom: number) => {
    // Validate coordinates before attempting to fly
    if (typeof lat !== 'number' || typeof lng !== 'number' || 
        isNaN(lat) || isNaN(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn('Invalid coordinates provided to safeFlyTo in MapPanel:', { lat, lng });
      return;
    }

    if (mapInstance && mapInstance.getContainer && mapInstance.getContainer()) {
      const container = mapInstance.getContainer();
      if (container && document.body.contains(container)) {
        try {
          mapInstance.flyTo([lat, lng], zoom, {
            duration: 1.5,
            easeLinearity: 0.25,
          });
        } catch (error) {
          console.warn('Error during flyTo:', error);
        }
      } else {
        console.warn('Map container is destroyed or not available. Skipping flyTo.');
      }
    }
  }, [mapInstance]);

  // Callback for handling location search.
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await searchLocations(query);
      if (response.success && response.data) {
        const formattedResults = formatSearchResults(response.data);
        setSearchResults(formattedResults);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search query.
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (searchQuery) {
      searchTimeoutRef.current = window.setTimeout(() => {
        handleSearch(searchQuery);
      }, 500);
    } else {
      setSearchResults([]);
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, handleSearch]);

  // Effect to handle panel open/close and map rendering.
  useEffect(() => {
    let timer: number;
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    if (isOpen && hasValidCoordinates) {
      setIsVisible(true);
      setIsMapReady(false); // Reset map ready state when opening
      // Validate coordinates before setting map center
      if (safeCoordinates.latitude >= -90 && safeCoordinates.latitude <= 90 &&
          safeCoordinates.longitude >= -180 && safeCoordinates.longitude <= 180) {
        setMapCenter([
          safeCoordinates.latitude,
          safeCoordinates.longitude,
        ]);
      } else {
        console.warn('Invalid coordinates when opening MapPanel:', safeCoordinates);
        // Use fallback coordinates
        setMapCenter([40.7128, -74.0060]);
      }
      timer = window.setTimeout(() => {
        setShouldRenderMap(true);
        console.log('Map should render set to true');
      }, 300);
    } else {
      setIsVisible(false);
      setIsMapReady(false); // Reset map ready state when closing
      timer = window.setTimeout(() => {
        setShouldRenderMap(false);
        console.log('Map should render set to false');
      }, 500);
    }
    return () => {
      clearTimeout(timer);
    };
  }, [isOpen, hasValidCoordinates, safeCoordinates]);

  // Update map center when location coordinates change
  useEffect(() => {
    if (hasValidCoordinates && 
        safeCoordinates.latitude >= -90 && safeCoordinates.latitude <= 90 &&
        safeCoordinates.longitude >= -180 && safeCoordinates.longitude <= 180) {
      setMapCenter([safeCoordinates.latitude, safeCoordinates.longitude]);
    } else {
      console.warn('Invalid coordinates detected in MapPanel center update:', safeCoordinates);
    }
  }, [hasValidCoordinates, safeCoordinates]);

  // Effect to handle map lifecycle when shouldRenderMap changes
  useEffect(() => {
    if (!shouldRenderMap && mapInstance) {
      setIsDestroying(true);
      setIsMapReady(false); // Reset map ready state when destroying
      
      // Clear any pending timeouts before cleaning up map
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      
      // Enhanced cleanup for map instance when map container is about to be unmounted
      try {
        const container = mapInstance.getContainer && mapInstance.getContainer();
        if (container) {
          // Remove event listeners first
          if (mapInstance.off) {
            mapInstance.off();
          }            // Force remove all layers
            if (mapInstance.eachLayer) {
              mapInstance.eachLayer((layer: import('leaflet').Layer) => {
                try {
                  if ('remove' in layer && typeof layer.remove === 'function') {
                    layer.remove();
                  }
                } catch (layerError) {
                  console.warn('Error removing layer in MapPanel:', layerError);
                }
              });
            }
          
          // Remove the map instance
          mapInstance.remove();
          
          // Clear container content
          if (container.parentNode) {
            container.innerHTML = '';
          }
        }
      } catch (error) {
        console.warn('Error removing map instance during panel close:', error);
      } finally {
        setMapInstance(null);
        
        // Force garbage collection hint
        if (typeof window !== 'undefined' && 'gc' in window) {
          try {
            (window as unknown as { gc(): void }).gc();
          } catch {
            // gc is not available in production
          }
        }
      }
    }
    
    // Reset other states when map is not rendering
    if (!shouldRenderMap) {
      setNearbyLocations([]);
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
      setIsDestroying(false);
      setIsMapReady(false); // Reset map ready state
    }
  }, [shouldRenderMap, mapInstance]);

  // Effect to handle map invalidation after map becomes visible
  useEffect(() => {
    if (shouldRenderMap && mapInstance) {
      // Invalidate size after map container becomes visible
      const invalidateTimer = setTimeout(() => {
        if (mapInstance && mapInstance.getContainer && mapInstance.getContainer()) {
          try {
            mapInstance.invalidateSize();
          } catch (error) {
            console.warn('Error invalidating map size:', error);
          }
        }
      }, 100);
      
      return () => clearTimeout(invalidateTimer);
    }
  }, [shouldRenderMap, mapInstance]);

  // Component unmount cleanup - final safety net
  useEffect(() => {
    return () => {
      setIsDestroying(true);
      
      // Clear all timeouts
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      // Enhanced cleanup for map instance
      if (mapInstance) {
        try {
          const container = mapInstance.getContainer && mapInstance.getContainer();
          if (container) {
            // Remove event listeners
            if (mapInstance.off) {
              mapInstance.off();
            }
            
            // Force remove all layers
            if (mapInstance.eachLayer) {
              mapInstance.eachLayer((layer: import('leaflet').Layer) => {
                try {
                  if ('remove' in layer && typeof layer.remove === 'function') {
                    layer.remove();
                  }
                } catch (layerError) {
                  console.warn('Error removing layer during unmount:', layerError);
                }
              });
            }
            
            // Remove the map instance
            mapInstance.remove();
            
            // Clear container content
            if (container.parentNode) {
              container.innerHTML = '';
            }
          }
        } catch (error) {
          console.warn('Error removing map instance during unmount:', error);
        } finally {
          setMapInstance(null);
          setIsMapReady(false); // Reset map ready state
          
          // Force garbage collection hint
          if (typeof window !== 'undefined' && 'gc' in window) {
            try {
              (window as unknown as { gc(): void }).gc();
            } catch {
              // gc is not available in production
            }
          }
        }
      }
    };
  }, [mapInstance]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 500);
  };

  // Define weather metrics.
  const weatherMetrics = weatherData?.currentWeather
    ? [
        {
          angle: 0,
          distance: 2000,
          icon: weatherData.currentWeather.icon,
          title: 'Temperature',
          value: `${convertTemp(
            weatherData.currentWeather.temperature,
            tempUnit
          )}°${tempUnit}`,
        },
        {
          angle: 120,
          distance: 2000,
          icon: '/icons/weathers/humidity.svg',
          title: 'Humidity',
          value: `${weatherData.currentWeather.humidity}%`,
        },
        {
          angle: 240,
          distance: 2000,
          icon: '/icons/weathers/barometer.svg',
          title: 'Pressure',
          value: `${weatherData.currentWeather.pressure} hPa`,
        },
      ]
    : ([] as WeatherMetric[]);

  // Callback to fetch nearby weather data.
  const fetchNearbyData = useCallback(
    async (centerLat: number, centerLng: number) => {
      try {
        // Pass the current zoom level to help with distribution calculations
        const currentZoom = mapInstance && mapInstance.getZoom ? mapInstance.getZoom() : defaultMapConfig.defaultZoom;
        const locations = await fetchNearbyWeatherData(centerLat, centerLng, currentZoom);
        setNearbyLocations(
          locations.filter((loc): loc is NonNullable<typeof loc> => loc !== null)
        );
      } catch (error) {
        console.error('Error fetching nearby weather data:', error);
        // Keep previous locations on error to prevent empty map
      }
    },
    [mapInstance]
  );

  // Effect to animate the map and fetch nearby locations on movement.
  useEffect(() => {
    if (mapInstance && mapInstance.getContainer && mapInstance.getContainer() && hasValidCoordinates) {
      // Use safeFlyTo to ensure the container is valid.
      safeFlyTo(
        safeCoordinates.latitude,
        safeCoordinates.longitude,
        defaultMapConfig.defaultZoom
      );

      const handleMoveEnd = () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = window.setTimeout(() => {
          if (mapInstance && mapInstance.getContainer && mapInstance.getContainer()) {
            try {
              const center = mapInstance.getCenter();
              if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
                fetchNearbyData(center.lat, center.lng);
              }
            } catch (error) {
              console.warn('Error getting map center:', error);
            }
          }
        }, 1000);
      };

      try {
        mapInstance.on('moveend', handleMoveEnd);
        mapInstance.on('zoomend', handleMoveEnd);

        fetchNearbyData(
          safeCoordinates.latitude,
          safeCoordinates.longitude
        );
      } catch (error) {
        console.warn('Error setting up map event listeners:', error);
      }

      return () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        if (mapInstance && mapInstance.off) {
          try {
            mapInstance.off('moveend', handleMoveEnd);
            mapInstance.off('zoomend', handleMoveEnd);
          } catch (error) {
            console.warn('Error removing map event listeners:', error);
          }
        }
      };
    }
  }, [mapInstance, hasValidCoordinates, safeCoordinates, fetchNearbyData, safeFlyTo]);

  // Handle location selection from search results.
  const handleLocationSelect = (result: {
    latitude: number;
    longitude: number;
    name?: string;
    country?: string;
  }) => {
    // Validate coordinates before setting map center
    if (typeof result.latitude === 'number' && typeof result.longitude === 'number' &&
        !isNaN(result.latitude) && !isNaN(result.longitude) &&
        result.latitude >= -90 && result.latitude <= 90 &&
        result.longitude >= -180 && result.longitude <= 180) {
      setMapCenter([result.latitude, result.longitude]);
      if (mapInstance && mapInstance.getContainer && mapInstance.getContainer()) {
        safeFlyTo(result.latitude, result.longitude, defaultMapConfig.defaultZoom);
      }
    } else {
      console.warn('Invalid coordinates from search result:', result);
      return;
    }
    onLocationSelect({
      latitude: result.latitude,
      longitude: result.longitude,
      city: result.name || 'Unknown City',
      country: result.country || 'Unknown Country',
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  // Center map on user location.
  const handleCenterToUserLocation = async () => {
    try {
      const geoResponse = await getUserGeolocation();
      if (geoResponse.success && geoResponse.data) {
        const { latitude, longitude } = geoResponse.data;
        // Validate coordinates before setting map center
        if (typeof latitude === 'number' && typeof longitude === 'number' &&
            !isNaN(latitude) && !isNaN(longitude) &&
            latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
          setMapCenter([latitude, longitude]);
          if (mapInstance && mapInstance.getContainer && mapInstance.getContainer()) {
            safeFlyTo(latitude, longitude, defaultMapConfig.defaultZoom);
          }
        } else {
          console.warn('Invalid coordinates from user geolocation:', { latitude, longitude });
          return;
        }

        const locationResponse = await reverseGeocode({ latitude, longitude });
        if (locationResponse.success && locationResponse.data) {
          onLocationSelect({
            latitude,
            longitude,
            city: locationResponse.data.city,
            country: locationResponse.data.country,
          });
        } else {
          onLocationSelect({
            latitude,
            longitude,
            city: latitude.toString(),
            country: longitude.toString(),
          });
        }
      } else {
        console.error('Geolocation error:', geoResponse.error);
      }
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  return (
    <>
      {hasValidCoordinates && (
        <>
          {/* Overlay */}
          <div
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-500 ${
              isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ 
              pointerEvents: isVisible ? 'auto' : 'none', 
              zIndex: isFullscreen ? 9998 : 99 
            }}
            onClick={handleClose}
          />

          {/* Map Panel - positioned relative to main content container */}
          <div
            className={`${
              isFullscreen 
                ? 'fixed inset-0 w-full h-full' 
                : 'absolute top-0 right-0 h-full w-full md:w-[600px]'
            } bg-black/85 backdrop-blur-xl transform transition-all duration-500 ease-in-out ${
              isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
            style={{
              pointerEvents: isVisible ? 'auto' : 'none',
              zIndex: isFullscreen ? 9999 : 100,
              backfaceVisibility: 'hidden',
              willChange: 'transform, opacity',
            }}
          >
            <div className="relative h-full w-full flex flex-col">
              {/* Header Area with Search and Close */}
              <div className={`flex-none p-4 ${isFullscreen ? 'max-w-4xl mx-auto w-full' : ''}`}>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleClose}
                    className="flex-none p-2 rounded-lg glass-container backdrop-blur-md bg-black/40 border border-white/10 hover:bg-black/30 transition-all duration-300 shadow-lg text-white"
                    title="Close panel"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search location..."
                      className="w-full p-3 rounded-lg glass-container backdrop-blur-md bg-black/40 border border-white/10 hover:bg-black/30 transition-all duration-300 shadow-lg text-white outline-none placeholder-white/50 focus:ring-2 focus:ring-white/20"
                      aria-label="Search locations"
                      disabled={isSearching}
                    />
                    {/* Search Results Dropdown */}
                    {searchQuery && (
                      <div className="absolute top-full left-0 right-0 mt-2 rounded-lg glass-container backdrop-blur-md bg-black/40 border border-white/10 shadow-2xl max-h-[320px] overflow-y-auto z-[1003]">
                        {isSearching ? (
                          <div className="p-4 text-center text-white/60 flex items-center justify-center">
                            <svg
                              className="animate-spin h-5 w-5 mr-2"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Searching...
                          </div>
                        ) : searchResults.length === 0 ? (
                          <div className="p-4 text-center text-white/60">No results found</div>
                        ) : (
                          <div className="divide-y divide-white/10">
                            {searchResults.map((result, index) => (
                              <button
                                key={index}
                                className="w-full p-3 text-left hover:bg-black/20 transition-colors duration-200 focus:outline-none focus:bg-black/30 text-white/90"
                                onClick={() => handleLocationSelect(result)}
                              >
                                <div className="font-medium truncate">{result.name}</div>
                                <div className="text-sm text-white/60 truncate">{result.country}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Weather Card */}
              <div className={`flex-none px-4 pb-4 ${isFullscreen ? 'max-w-md mx-auto' : ''}`}>
                <div className="glass-container p-3 md:p-4 rounded-lg md:rounded-xl backdrop-blur-md bg-black/40 shadow-lg border border-white/10">
                  <div className="flex flex-col gap-2 md:gap-4">
                    <div className="flex items-center justify-between gap-2 md:gap-4">
                      <div className="flex items-center gap-2 md:gap-3">
                        {weatherData && (
                          <Image
                            src={weatherData.currentWeather.icon}
                            alt={weatherData.currentWeather.condition}
                            width={48}
                            height={48}
                            className="w-8 h-8 md:w-12 md:h-12 opacity-80"
                          />
                        )}
                        <div>
                          <div className="text-sm md:text-lg font-semibold truncate max-w-[150px] md:max-w-none">
                            {location.city}, {location.country}
                          </div>
                          <div className="text-xs md:text-base opacity-80 truncate max-w-[150px] md:max-w-none">
                            {weatherData?.currentWeather.condition}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl md:text-3xl font-bold">
                          {weatherData
                            ? `${convertTemp(
                                weatherData.currentWeather.temperature,
                                tempUnit
                              )}°${tempUnit}`
                            : ''}
                        </div>
                        <div className="text-xs md:text-sm opacity-80 flex items-center justify-end gap-1 md:gap-2">
                          <Image
                            src="/icons/weathers/humidity.svg"
                            alt="Humidity"
                            width={16}
                            height={16}
                            className="w-3 h-3 md:w-4 md:h-4"
                          />
                          <span>{weatherData?.currentWeather.humidity}%</span>
                          <span className="mx-1">•</span>
                          <Image
                            src="/icons/weathers/barometer.svg"
                            alt="Pressure"
                            width={16}
                            height={16}
                            className="w-3 h-3 md:w-4 md:h-4"
                          />
                          <span>{weatherData?.currentWeather.pressure} hPa</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCenterToUserLocation}
                        className="flex-1 py-2 md:py-2.5 px-3 md:px-4 rounded-xl bg-black/20 hover:bg-black/30 transition-all duration-300 backdrop-blur-md text-white/90 hover:text-white border border-white/10 hover:border-white/20 flex items-center justify-center gap-2 group"
                        title="Use your current location"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 md:h-5 md:w-5 opacity-70 group-hover:opacity-100 transition-opacity"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span className="text-xs md:text-sm font-medium">Current Location</span>
                      </button>
                      <button
                        onClick={() => {
                          if (mapInstance && mapInstance.getCenter && mapInstance.getContainer && mapInstance.getContainer()) {
                            try {
                              const center = mapInstance.getCenter();
                              onLocationSelect({
                                latitude: center.lat,
                                longitude: center.lng,
                              });
                              // Add a small delay to ensure location selection is processed
                              setTimeout(() => {
                                handleClose();
                              }, 100);
                            } catch (error) {
                              console.warn('Error getting map center for location selection:', error);
                              handleClose(); // Still close on error
                            }
                          } else {
                            handleClose(); // Close if map instance is not available
                          }
                        }}
                        className="flex-1 py-2 md:py-2.5 px-3 md:px-4 rounded-xl bg-black/20 hover:bg-black/30 transition-all duration-300 backdrop-blur-md text-white/90 hover:text-white border border-white/10 hover:border-white/20 flex items-center justify-center gap-2 group"
                        title="Use the current map center as location"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 md:h-5 md:w-5 opacity-70 group-hover:opacity-100 transition-opacity"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-xs md:text-sm font-medium">Set Location</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Container */}
              <div className="relative h-full w-full">
                {shouldRenderMap && !isDestroying ? (
                  <>
                    {/* Loading overlay - show while leaflet is loading OR map is not ready */}
                    {(!leaflet || !isMapReady) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-[1000]">
                        <div className="flex flex-col items-center gap-4">
                          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                          <div className="text-white/70 text-sm">
                            {!leaflet ? 'Loading Leaflet...' : 'Loading map...'}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Map container - render when leaflet is loaded */}
                    {leaflet && (
                      <div 
                        className="h-full w-full leaflet-container-custom" 
                        data-map-container-id={mapContainerId}
                      >
                        <Suspense fallback={<LoadingFallback />}>
                          <MapContainer
                            key={mapContainerId}
                            center={mapCenter}
                            zoom={defaultMapConfig.defaultZoom}
                            minZoom={defaultMapConfig.minZoom}
                            maxZoom={defaultMapConfig.maxZoom}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={defaultMapConfig.controls.zoomControl}
                            attributionControl={defaultMapConfig.controls.attributionControl}
                            whenReady={() => {
                              console.log('MapContainer whenReady callback fired');
                            }}
                          >
                            <SetMapInstance setMapInstance={setMapInstance} setIsMapReady={setIsMapReady} />
                            <TileLayer
                              url={defaultMapConfig.tileLayer.url}
                              attribution={defaultMapConfig.tileLayer.attribution}
                              maxZoom={defaultMapConfig.tileLayer.maxZoom}
                            />
                            {leaflet && (
                              <Marker
                                position={[
                                  safeCoordinates.latitude,
                                  safeCoordinates.longitude,
                                ]}
                                icon={leaflet.icon({
                                  iconUrl:
                                    weatherMetrics[0]?.icon ||
                                    '/icons/weathers/not-available.svg',
                                  iconSize: [40, 40], // Slightly larger for the main location marker
                                  iconAnchor: [20, 20],
                                  popupAnchor: [0, -40],
                                  className: 'main-weather-marker',
                                })}
                              >
                                {weatherData && (
                                  <Popup>
                                    <div className="weather-popup">
                                      <div className="flex items-center gap-3 mb-2">
                                        <Image 
                                          src={weatherData.currentWeather.icon}
                                          alt={weatherData.currentWeather.condition}
                                          width={32}
                                          height={32}
                                          className="w-8 h-8 opacity-80"
                                        />
                                        <div>
                                          <div className="font-semibold">
                                            {location.city}, {location.country}
                                          </div>
                                          <div className="text-xs opacity-70">
                                            {weatherData.currentWeather.condition}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold">
                                          {convertTemp(weatherData.currentWeather.temperature, tempUnit)}°{tempUnit}
                                        </span>
                                        <div className="flex items-center gap-2 text-xs">
                                          <div className="flex items-center gap-1">
                                            <Image src="/icons/weathers/humidity.svg" alt="Humidity" width={12} height={12} className="opacity-70" />
                                            <span>{weatherData.currentWeather.humidity}%</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Image src="/icons/weathers/compass.svg" alt="Wind" width={12} height={12} className="opacity-70" />
                                            <span>{weatherData.currentWeather.wind.speed} km/h</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </Popup>
                                )}
                              </Marker>
                            )}
                            {leaflet &&
                              nearbyLocations.map((loc: NearbyLocation) => {
                                // Calculate distance from center to adapt marker size
                                const centerPoint = mapInstance?.getCenter();
                                const distance = centerPoint && mapInstance && mapInstance.distance
                                  ? mapInstance.distance(
                                      centerPoint, 
                                      [loc.latitude, loc.longitude]
                                    ) 
                                  : 0;
                                
                                // Calculate marker size based on distance from center and zoom level
                                // Markers farther from center are slightly smaller
                                const zoom = mapInstance && mapInstance.getZoom ? mapInstance.getZoom() : defaultMapConfig.defaultZoom;
                                const baseSize = Math.min(Math.max(24 + (zoom - 10) * 1.5, 24), 36);
                                const distanceFactor = distance > 0 ? Math.max(0.8, 1 - (distance / 50000) * 0.3) : 1;
                                const iconSize = Math.round(baseSize * distanceFactor);
                                
                                return (
                                  <Marker
                                    key={`${loc.latitude}-${loc.longitude}`}
                                    position={[loc.latitude, loc.longitude]}
                                    icon={new leaflet.Icon({
                                      iconUrl:
                                        loc.weatherData?.currentWeather.icon ||
                                        '/icons/weathers/not-available.svg',
                                      iconSize: [iconSize, iconSize],
                                      iconAnchor: [iconSize/2, iconSize/2],
                                      popupAnchor: [0, -iconSize/2],
                                      className: 'weather-marker',
                                    })}
                                  >
                                    <Popup>
                                      <div className="weather-popup">
                                        <div className="flex items-center gap-3 mb-2">
                                          <Image 
                                            src={loc.weatherData?.currentWeather.icon || '/icons/weathers/not-available.svg'}
                                            alt={loc.weatherData?.currentWeather.condition || 'Weather'}
                                            width={32}
                                            height={32}
                                            className="w-8 h-8 opacity-80"
                                          />
                                          <div>
                                            <div className="font-semibold">
                                              {loc.city}
                                            </div>
                                            <div className="text-xs opacity-70">
                                              {loc.weatherData?.currentWeather.condition}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold">
                                            {convertTemp(loc.weatherData?.currentWeather.temperature || 0, tempUnit)}°{tempUnit}
                                          </span>
                                          <div className="flex items-center gap-2 text-xs">
                                            <div className="flex items-center gap-1">
                                              <Image src="/icons/weathers/humidity.svg" alt="Humidity" width={12} height={12} className="opacity-70" />
                                              <span>{loc.weatherData?.currentWeather.humidity}%</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Image src="/icons/weathers/compass.svg" alt="Wind" width={12} height={12} className="opacity-70" />
                                              <span>{loc.weatherData?.currentWeather.wind.speed} km/h</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </Popup>
                                  </Marker>
                                );
                              })}
                          </MapContainer>
                        </Suspense>
                      </div>
                    )}
                  </>
                ) : (
                  <LoadingFallback />
                )}

                {/* Render the Map Legend */}
                {shouldRenderMap && <MapLegend />}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

const LoadingFallback = () => (
  <div className="h-full w-full flex items-center justify-center bg-black/40 backdrop-blur-md">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      <div className="text-white/70 text-sm">Loading map...</div>
    </div>
  </div>
);
