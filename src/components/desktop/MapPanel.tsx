import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { TemperatureUnit, WeatherData } from '@/types/weather';
import {
  searchLocations,
  formatSearchResults,
} from '@/services/geolocationService';
import { WMO_CODES } from '@/services/weatherService';
import type { SearchResult } from '@/services/geolocationService';
import 'leaflet/dist/leaflet.css';
import type { Map } from 'leaflet';
import type { Location } from '@/types/weather';
import { 
  useMapManager, 
  useLocationSelection, 
  useSafeCoordinates,
  DEFAULT_MAP_CONFIG
} from '@/utils/mapUtility';

// Dynamically import Map components with SSR disabled
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
          
          if (setIsMapReady) {
            const timer = setTimeout(() => {
              console.log('Setting map ready state to true in MapPanel');
              setIsMapReady(true);
            }, 200);
            
            return () => clearTimeout(timer);
          }
        }
      }, [map, setMapInstance, setIsMapReady]);
      
      return null;
    };
    
    return { default: Component };
  }),
  { ssr: false }
);

interface MapPanelConfig {
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

const defaultMapConfig: MapPanelConfig = {
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
  mapConfig?: Partial<MapPanelConfig>;
  onLocationSelect: (coordinates: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  }) => void;
  isFullscreen?: boolean;
}

// MapLegend component to display the weather icon legend
const MapLegend = () => {
  const [isMinimized, setIsMinimized] = useState(false);

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
}: MapPanelProps) {
  // Use our new map utility hooks
  const safeCoordinates = useSafeCoordinates(location);
  const { selectLocationFromCoordinates } = useLocationSelection();
  const mapManager = useMapManager(DEFAULT_MAP_CONFIG);
  
  // Dynamically import Leaflet on the client
  const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null);
  const [mapContainerId] = useState(() => `fullscreen-map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  
  // Dynamic leaflet import for desktop
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        const L = await import('leaflet');
        if (mountedRef.current) {
          setLeaflet(L);
          console.log('Leaflet loaded successfully in MapPanel');
        }
      } catch (error) {
        console.error('Error loading leaflet for desktop:', error);
      }
    };
    
    if (typeof window !== 'undefined' && !leaflet) {
      loadLeaflet();
    }
  }, [leaflet]);

  // Create custom map marker icon
  const createCustomIcon = useCallback((weatherIcon?: string) => {
    console.log('createCustomIcon called:', { leaflet: !!leaflet, weatherIcon, weatherData: !!weatherData });
    
    if (!leaflet) {
      console.log('Leaflet not loaded yet, returning undefined');
      return undefined;
    }
    
    try {
      // Use provided weather icon, or weather data icon, or dedicated map marker
      const iconUrl = weatherIcon || weatherData?.currentWeather?.icon || '/icons/weathers/map-marker.svg';
      console.log('Creating icon with URL:', iconUrl);
      
      const customIcon = leaflet.icon({
        iconUrl: iconUrl,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
        className: 'weather-marker',
      });
      
      console.log('Custom icon created successfully:', customIcon);
      return customIcon;
    } catch (error) {
      console.warn('Error creating custom icon for desktop map:', error);
      // Return fallback icon on error
      try {
        return leaflet.icon({
          iconUrl: '/icons/weathers/not-available.svg',
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40],
          className: 'weather-marker fallback',
        });
      } catch (fallbackError) {
        console.error('Error creating fallback icon for desktop map:', fallbackError);
        return undefined;
      }
    }
  }, [leaflet, weatherData]);

  // State hooks
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRenderMap, setShouldRenderMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Timeout refs
  const searchTimeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Debug logging to track map panel state
  useEffect(() => {
    console.log('MapPanel state debug:', {
      isOpen,
      isVisible,
      shouldRenderMap,
      leaflet: !!leaflet,
      isMapReady: mapManager.isMapReady,
      isDestroying: mapManager.isDestroying,
      safeCoordinates
    });
  }, [isOpen, isVisible, shouldRenderMap, leaflet, mapManager.isMapReady, mapManager.isDestroying, safeCoordinates]);

  // Callback for handling location search
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

  // Debounce search query
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

  // Effect to handle panel open/close and map rendering
  useEffect(() => {
    console.log('MapPanel useEffect triggered - isOpen:', isOpen, 'safeCoordinates:', safeCoordinates);
    let timer: number;
    
    if (isOpen) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      console.log('Setting isVisible to true');
      setIsVisible(true);
      // Update map center using safe coordinates
      mapManager.updateMapCenter(safeCoordinates.latitude, safeCoordinates.longitude, false);
      
      timer = window.setTimeout(() => {
        console.log('Setting shouldRenderMap to true');
        setShouldRenderMap(true);
        console.log('Map should render set to true');
      }, 300);
    } else {
      // Only set shouldRenderMap to false when closing, but keep isVisible true
      // until the opacity animation completes
      console.log('Panel closing - setting shouldRenderMap to false');
      timer = window.setTimeout(() => {
        console.log('Setting shouldRenderMap to false');
        setShouldRenderMap(false);
        // Delay setting isVisible to false to allow for opacity animation
        setTimeout(() => {
          console.log('Setting isVisible to false after animation');
          setIsVisible(false);
        }, 500);
      }, 100);
    }
    return () => {
      clearTimeout(timer);
    };
  }, [isOpen, safeCoordinates, mapManager]);

  // Update map center when location coordinates change
  useEffect(() => {
    if (shouldRenderMap && mapManager.mapInstance) {
      mapManager.updateMapCenter(safeCoordinates.latitude, safeCoordinates.longitude, true);
    }
  }, [safeCoordinates, shouldRenderMap, mapManager]);

  // Map click handler disabled - no longer placing markers on click
  // const handleMapClick = useCallback((e: { latlng: { lat: number; lng: number } }) => {
  //   const { lat, lng } = e.latlng;
  //   onLocationSelect({
  //     latitude: lat,
  //     longitude: lng,
  //     city: `${lat.toFixed(4)}`,
  //     country: `${lng.toFixed(4)}`
  //   });
  //   selectLocationFromCoordinates(lat, lng).catch(console.error);
  // }, [selectLocationFromCoordinates, onLocationSelect]);

  // Handle search result selection
  const handleSearchResultSelect = useCallback(async (result: SearchResult) => {
    try {
      // Transform to the expected format
      onLocationSelect({
        latitude: result.latitude,
        longitude: result.longitude,
        city: result.name,
        country: result.country
      });
      await selectLocationFromCoordinates(result.latitude, result.longitude);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error selecting location:', error);
    }
  }, [selectLocationFromCoordinates, onLocationSelect]);

  // Effect to handle map invalidation when it becomes visible
  useEffect(() => {
    if (shouldRenderMap && mapManager.mapInstance && mapManager.isMapReady) {
      const timer = setTimeout(() => {
        if (mapManager.mapInstance && mapManager.mapInstance.getContainer && mapManager.mapInstance.getContainer()) {
          try {
            mapManager.mapInstance.invalidateSize();
            console.log('Map size invalidated');
          } catch (error) {
            console.warn('Error invalidating map size:', error);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldRenderMap, mapManager.mapInstance, mapManager.isMapReady, mapManager]);
  
  // Loading fallback component
  const LoadingFallback = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
        <div className="text-sm">Loading Map...</div>
      </div>
    </div>
  );

  console.log('MapPanel render - isVisible:', isVisible, 'isOpen:', isOpen, 'shouldRenderMap:', shouldRenderMap);
  
  if (!isVisible) {
    console.log('MapPanel early return - not visible');
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black transition-opacity duration-500 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1020] bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Close map"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-white">Weather Map</h2>
          </div>
          
          {/* Search */}
          <div className="relative max-w-md w-full mx-4">
            <input
              type="text"
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              </div>
            )}
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg shadow-lg max-h-60 overflow-y-auto z-[1030]">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchResultSelect(result)}
                    className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0"
                  >
                    <div className="text-white font-medium">{result.name}</div>
                    <div className="text-white/70 text-sm">{result.country}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="text-white text-sm">
            {location.city}, {location.country}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="absolute inset-0 top-16">
        {shouldRenderMap && leaflet ? (
          <div id={mapContainerId} className="h-full w-full relative">
            <Suspense fallback={<LoadingFallback />}>
              <MapContainer
                center={mapManager.mapCenter}
                zoom={defaultMapConfig.defaultZoom}
                style={{ height: '100%', width: '100%' }}
                zoomControl={defaultMapConfig.controls.zoomControl}
                attributionControl={defaultMapConfig.controls.attributionControl}
                className="z-[1000]"
                // Note: eventHandlers will be set via map instance
              >
                <TileLayer
                  url={defaultMapConfig.tileLayer.url}
                  attribution={defaultMapConfig.tileLayer.attribution}
                  maxZoom={defaultMapConfig.tileLayer.maxZoom}
                />
                
                <SetMapInstance 
                  setMapInstance={mapManager.setMapInstance} 
                  setIsMapReady={mapManager.setIsMapReady}
                />

                {/* Current Location Marker */}
                <Marker
                  position={[safeCoordinates.latitude, safeCoordinates.longitude]}
                  icon={createCustomIcon()}
                  eventHandlers={{
                    click: () => {
                      console.log('Current location marker clicked');
                    },
                  }}
                >
                  <Popup>
                    <div className="text-center">
                      <div className="font-bold">{location.city}</div>
                      <div className="text-sm text-gray-600">{location.country}</div>
                      {weatherData && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2 justify-center">
                            <Image
                              src={weatherData.currentWeather.icon}
                              alt={weatherData.currentWeather.condition}
                              width={32}
                              height={32}
                            />
                            <span className="font-bold">
                              {Math.round(convertTemp(weatherData.currentWeather.temperature, tempUnit))}°{tempUnit}
                            </span>
                          </div>
                          <div className="text-sm mt-1">{weatherData.currentWeather.condition}</div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>

                {/* Nearby Location Markers */}
                {mapManager.nearbyLocations.map((loc, index) => (
                  <Marker
                    key={`${loc.latitude}-${loc.longitude}-${index}`}
                    position={[loc.latitude, loc.longitude]}
                    icon={createCustomIcon(loc.weatherData?.currentWeather?.icon)}
                  >
                    <Popup>
                      <div className="text-center">
                        <div className="font-bold">{loc.city || 'Unknown Location'}</div>
                        {loc.weatherData && (
                          <div className="flex items-center gap-2 justify-center mt-2">
                            <Image
                              src={loc.weatherData.currentWeather.icon}
                              alt={loc.weatherData.currentWeather.condition}
                              width={24}
                              height={24}
                            />
                            <span>{Math.round(convertTemp(loc.weatherData.currentWeather.temperature, tempUnit))}°{tempUnit}</span>
                          </div>
                        )}
                        {loc.weatherData && (
                          <div className="text-sm">{loc.weatherData.currentWeather.condition}</div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </Suspense>

            {/* Map Legend */}
            <MapLegend />

            {/* Map not ready overlay */}
            {!mapManager.isMapReady && (
              <LoadingFallback />
            )}
          </div>
        ) : (
          <LoadingFallback />
        )}
      </div>
    </div>
  );
}
