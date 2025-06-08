'use client';

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

// Simple map instance capture component optimized for mobile
const SetMapInstance = dynamic(
  () => import('react-leaflet').then((mod) => {
    const Component = ({ 
      setMapInstance, 
      setIsMapReady 
    }: { 
      setMapInstance: (map: Map) => void;
      setIsMapReady: (ready: boolean) => void;
    }) => {
      const map = mod.useMap();
      
      React.useEffect(() => {
        if (map) {
          console.log('Mobile map instance captured');
          setMapInstance(map);
          
          // Set ready state immediately for mobile to avoid delays
          setIsMapReady(true);
        }
      }, [map, setMapInstance, setIsMapReady]);
      
      return null;
    };
    
    return { default: Component };
  }),
  { ssr: false }
);

interface MobileMapPanelProps {
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
  onLocationSelect: (coordinates: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  }) => void;
}

// Mobile-optimized loading component
const MobileLoadingFallback = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg">
    <div className="text-white text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
      <div className="text-sm">Loading Map...</div>
    </div>
  </div>
);

// Mobile Weather Legend component
const MobileMapLegend = () => {
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <div
      className={`absolute bottom-4 left-4 z-[1010] transition-all duration-300 ease-in-out ${
        isMinimized ? 'max-h-[120px] w-[180px]' : 'max-h-[60vh] w-[280px]'
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
            isMinimized ? 'max-h-[60px]' : 'max-h-[calc(60vh-48px)]'
          }`}
        >
          <div className="grid grid-cols-2 gap-2 p-3">
            {Object.entries(WMO_CODES).map(([code, { condition, icon }]) => (
              <div key={code} className="flex items-center gap-2">
                <Image src={icon} alt={condition} width={20} height={20} className="w-5 h-5" />
                <span className="text-xs text-white/90">{condition}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MobileMapPanel({
  isOpen,
  weatherData,
  onClose,
  location,
  tempUnit,
  convertTemp,
  onLocationSelect,
}: MobileMapPanelProps) {
  // Use safe coordinates hook
  const safeCoordinates = useSafeCoordinates(location);
  
  // Simple state management optimized for mobile
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapContainerId] = useState(() => `mobile-map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null);
  
  // Refs for cleanup
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

  // Dynamic leaflet import for mobile
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        const L = await import('leaflet');
        if (mountedRef.current) {
          setLeaflet(L);
        }
      } catch (error) {
        console.error('Error loading leaflet for mobile:', error);
      }
    };
    
    if (isOpen && !leaflet) {
      loadLeaflet();
    }
  }, [isOpen, leaflet]);

  // Create custom map marker icon
  const createCustomIcon = useCallback(() => {
    if (!leaflet) return undefined;
    
    try {
      // Use weather icon if available, otherwise use dedicated map marker
      const iconUrl = weatherData?.currentWeather?.icon || '/icons/weathers/map-marker.svg';
      
      return leaflet.icon({
        iconUrl: iconUrl,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
        className: 'mobile-weather-marker',
      });
    } catch (error) {
      console.warn('Error creating custom icon for mobile map:', error);
      // Return fallback icon on error
      try {
        return leaflet.icon({
          iconUrl: '/icons/weathers/not-available.svg',
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40],
          className: 'mobile-weather-marker fallback',
        });
      } catch (fallbackError) {
        console.error('Error creating fallback icon for mobile map:', fallbackError);
        return undefined;
      }
    }
  }, [leaflet, weatherData]);

  // Search functionality with debouncing
  const handleSearch = useCallback(async (query: string) => {
    if (!mountedRef.current) return;
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await searchLocations(query);
      if (mountedRef.current && response.success && response.data) {
        const formattedResults = formatSearchResults(response.data);
        setSearchResults(formattedResults);
      } else if (mountedRef.current) {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
      if (mountedRef.current) {
        setSearchResults([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsSearching(false);
      }
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

  // Map click handler disabled - no longer placing markers on click
  // const handleMapClick = useCallback((e: { latlng: { lat: number; lng: number } }) => {
  //   const { lat, lng } = e.latlng;
  //   onLocationSelect({
  //     latitude: lat,
  //     longitude: lng,
  //     city: `${lat.toFixed(4)}`,
  //     country: `${lng.toFixed(4)}`
  //   });
  // }, [onLocationSelect]);

  // Handle search result selection
  const handleSearchResultSelect = useCallback((result: SearchResult) => {
    onLocationSelect({
      latitude: result.latitude,
      longitude: result.longitude,
      city: result.name,
      country: result.country
    });
    setSearchQuery('');
    setSearchResults([]);
  }, [onLocationSelect]);

  // Map click handler disabled to prevent marker placement on click
  // useEffect(() => {
  //   if (mapInstance && isMapReady) {
  //     const handleClick = (e: { latlng: { lat: number; lng: number } }) => {
  //       handleMapClick(e);
  //     };
  //     
  //     mapInstance.on('click', handleClick);
  //     
  //     return () => {
  //       if (mapInstance) {
  //         mapInstance.off('click', handleClick);
  //       }
  //     };
  //   }
  // }, [mapInstance, isMapReady, handleMapClick]);

  // Mobile-optimized map invalidation
  useEffect(() => {
    if (isOpen && mapInstance && isMapReady) {
      const timer = setTimeout(() => {
        if (mapInstance && mapInstance.getContainer && mapInstance.getContainer()) {
          try {
            mapInstance.invalidateSize();
            console.log('Mobile map size invalidated');
          } catch (error) {
            console.warn('Error invalidating mobile map size:', error);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mapInstance, isMapReady]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* Header Interface - Matching attachment layout */}
      <div className="absolute top-4 left-4 right-4 z-[1020] space-y-3">
        {/* Close Button */}
        <div className="flex justify-start">
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-800/90 backdrop-blur-md border border-gray-600/50 rounded-lg hover:bg-gray-700/90 transition-colors flex items-center justify-center"
            title="Close map"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Search Input Row */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800/90 backdrop-blur-md border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 text-base"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            </div>
          )}
        </div>
        
        {/* Search Results */}
        {searchQuery && (
          <div className="bg-gray-800/90 backdrop-blur-md border border-gray-600/50 rounded-lg overflow-hidden">
            {isSearching ? (
              <div className="px-4 py-3 text-center text-gray-400">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Searching...
                </div>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-3 text-center text-gray-400">
                No results found
              </div>
            ) : (
              searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleSearchResultSelect(result)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-700/50 transition-colors border-b border-gray-600/30 last:border-b-0"
                >
                  <div className="text-white font-medium">{result.name}</div>
                  <div className="text-gray-400 text-sm">{result.country}</div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Location Display */}
        <div className="bg-gray-800/90 backdrop-blur-md border border-gray-600/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-white text-lg font-semibold">
              {location.city}, {location.country}
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <div className="flex items-center gap-1">
                <span className="text-blue-400 text-lg">💧</span>
                <span className="text-sm">%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-400">•</span>
                <span className="text-sm">⊙</span>
                <span className="text-sm">hPa</span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      const { latitude, longitude } = position.coords;
                      onLocationSelect({
                        latitude,
                        longitude,
                        city: 'Current Location',
                        country: ''
                      });
                    },
                    (error) => {
                      console.error('Error getting current location:', error);
                    }
                  );
                }
              }}
              className="flex-1 py-3 px-4 rounded-lg bg-gray-700/80 hover:bg-gray-700 transition-all duration-200 text-white border border-gray-600/50 hover:border-gray-500 flex items-center justify-center gap-2"
              title="Use your current location"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-white/80"
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
              <span className="text-sm font-medium">Current Location</span>
            </button>
            <button
              onClick={() => {
                if (mapInstance && mapInstance.getCenter && mapInstance.getContainer && mapInstance.getContainer()) {
                  try {
                    const center = mapInstance.getCenter();
                    onLocationSelect({
                      latitude: center.lat,
                      longitude: center.lng,
                      city: `${center.lat.toFixed(4)}`,
                      country: `${center.lng.toFixed(4)}`
                    });
                    onClose();
                  } catch (error) {
                    console.warn('Error getting map center for location selection:', error);
                  }
                }
              }}
              className="flex-1 py-3 px-4 rounded-lg bg-gray-700/80 hover:bg-gray-700 transition-all duration-200 text-white border border-gray-600/50 hover:border-gray-500 flex items-center justify-center gap-2"
              title="Set this location"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-white/80"
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
              <span className="text-sm font-medium">Set Location</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Map Container */}
      <div className="absolute inset-0">
        {leaflet ? (
          <div id={mapContainerId} className="h-full w-full relative">
            <Suspense fallback={<MobileLoadingFallback />}>
            <MapContainer
              center={[safeCoordinates.latitude, safeCoordinates.longitude]}
              zoom={DEFAULT_MAP_CONFIG.defaultZoom}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              attributionControl={true}
              className="z-[1000]"
              // Mobile-optimized settings
              touchZoom={true}
              doubleClickZoom={true}
              scrollWheelZoom={true}
              boxZoom={false}
              keyboard={false}
              dragging={true}
            >
              <TileLayer
                url={DEFAULT_MAP_CONFIG.tileLayer.url}
                attribution={DEFAULT_MAP_CONFIG.tileLayer.attribution}
                maxZoom={DEFAULT_MAP_CONFIG.tileLayer.maxZoom}
              />
              
              <SetMapInstance 
                setMapInstance={setMapInstance} 
                setIsMapReady={setIsMapReady}
              />

              {/* Current Location Marker */}
              <Marker
                position={[safeCoordinates.latitude, safeCoordinates.longitude]}
                icon={createCustomIcon()}
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
            </MapContainer>
          </Suspense>

          {/* Mobile Weather Legend */}
          <MobileMapLegend />

          {/* Mobile Map not ready overlay */}
          {!isMapReady && (
            <MobileLoadingFallback />
          )}
        </div>
        ) : (
          <MobileLoadingFallback />
        )}
      </div>
    </div>
  );
}
