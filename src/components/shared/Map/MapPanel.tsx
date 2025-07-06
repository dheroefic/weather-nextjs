'use client';

import React, { useState, Suspense } from 'react';
import Image from 'next/image';
import type { TemperatureUnit, WeatherData, Location } from '@/types/weather';
import { WMO_CODES } from '@/services/weatherService';
import { useSafeCoordinates, DEFAULT_MAP_CONFIG } from '@/utils/mapUtility';
import { useMapLocationUpdate } from '@/hooks/useMapLocationUpdate';
import { MapCore, WeatherMarker, type MarkerData } from './MapCore';
import { useMapState, useCustomIcon, useMapInvalidation } from './useMapHooks';
import { useSearch } from './useSearch';



export interface MapPanelProps {
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
  variant?: 'desktop' | 'mobile';
  nearbyLocations?: Array<{
    latitude: number;
    longitude: number;
    city?: string;
    weatherData?: WeatherData;
  }>;
}

// Loading fallback component
const LoadingFallback = ({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) => (
  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg">
    <div className="text-white text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
      <div className="text-sm">{variant === 'mobile' ? 'Loading Map...' : 'Loading Full Map...'}</div>
    </div>
  </div>
);

// Weather Legend component
const WeatherLegend = ({ 
  variant = 'desktop',
  isMinimized = false,
  onToggleMinimized
}: { 
  variant?: 'desktop' | 'mobile';
  isMinimized?: boolean;
  onToggleMinimized?: () => void;
}) => {
  const [localMinimized, setLocalMinimized] = useState(isMinimized);

  const toggleMinimized = () => {
    const newState = !localMinimized;
    setLocalMinimized(newState);
    onToggleMinimized?.();
  };

  const baseClasses = variant === 'mobile' 
    ? "absolute bottom-4 left-4 right-4 rounded-lg overflow-hidden z-[1010]"
    : "absolute top-20 right-6 rounded-lg overflow-hidden z-[1010] max-w-sm";

  const containerStyle = {
    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.75) 100%)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
  };

  return (
    <div className={baseClasses} style={containerStyle}>
      <div className="flex items-center justify-between p-2 border-b border-white/10">
        <span className="text-white text-sm font-medium">Weather Conditions</span>
        <button
          onClick={toggleMinimized}
          className="text-white/70 hover:text-white p-1 transition-colors"
          aria-label={localMinimized ? "Expand legend" : "Collapse legend"}
        >
          <svg
            className={`w-4 h-4 transition-transform ${localMinimized ? 'rotate-180' : ''}`}
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
          localMinimized ? 'max-h-0' : variant === 'mobile' ? 'max-h-[200px]' : 'max-h-[300px]'
        }`}
      >
        <div className={`grid gap-2 p-3 ${variant === 'mobile' ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {Object.entries(WMO_CODES).map(([code, { condition, icon }]) => (
            <div key={code} className="flex items-center gap-2">
              <Image src={icon} alt={condition} width={20} height={20} className="w-5 h-5" />
              <span className="text-xs text-white/90">{condition}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Search interface component
const SearchInterface = ({
  searchQuery,
  searchResults,
  isSearching,
  onSearchQueryChange,
  onSearchResultSelect,
  onClose,
  location,
  onLocationSelect
}: {
  searchQuery: string;
  searchResults: Array<{
    name: string;
    country: string;
    latitude: number;
    longitude: number;
  }>;
  isSearching: boolean;
  onSearchQueryChange: (query: string) => void;
  onSearchResultSelect: (result: {
    name: string;
    country: string;
    latitude: number;
    longitude: number;
  }) => void;
  onClose?: () => void;
  location?: { city: string; country: string };
  onLocationSelect?: (coordinates: { latitude: number; longitude: number; city?: string; country?: string }) => void;
}) => {
  return (
    <div className="absolute top-4 left-4 right-4 z-[1020] space-y-4">
      {/* Close Button */}
      <div className="flex justify-start">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-lg transition-all duration-200 backdrop-blur-md text-white border flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.75) 100%)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
          }}
          title="Close map"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-2xl">
        <input
          type="text"
          placeholder="Search location..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="w-full px-4 py-3 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-1 text-base transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.75) 100%)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
          }}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          </div>
        )}
      </div>
      
      {/* Search Results */}
      {searchQuery && (
        <div 
          className="rounded-lg shadow-2xl max-h-60 overflow-y-auto max-w-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.75) 100%)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
          }}
        >
          {isSearching ? (
            <div className="px-4 py-3 text-center text-white/70">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Searching...
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="px-4 py-3 text-center text-white/70">
              No results found
            </div>
          ) : (
            searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => onSearchResultSelect(result)}
                className="w-full px-4 py-3 text-left hover:bg-white/15 transition-all duration-200 border-b border-white/10 last:border-b-0 group"
              >
                <div className="text-white/90 font-medium group-hover:text-white">{result.name}</div>
                <div className="text-white/70 text-sm group-hover:text-white/85">{result.country}</div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Location Display */}
      {location && (
        <div 
          className="rounded-lg p-4 max-w-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.75) 100%)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div className="flex items-center justify-between">
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
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => {
                if (navigator.geolocation && onLocationSelect) {
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
              className="flex-1 py-3 px-4 rounded-lg transition-all duration-200 text-white border flex items-center justify-center gap-2 hover:bg-white/15"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.2)'
              }}
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
                // Set location functionality
                if (onClose) onClose();
              }}
              className="flex-1 py-3 px-4 rounded-lg transition-all duration-200 text-white border flex items-center justify-center gap-2 hover:bg-white/15"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.2)'
              }}
              title="Set location"
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
      )}
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
  variant = 'desktop',
  nearbyLocations = [],
}: MapPanelProps) {
  
  const safeCoordinates = useSafeCoordinates(location);
  const mapState = useMapState();
  const { createCustomIcon } = useCustomIcon(mapState.leaflet, weatherData, variant === 'mobile');
  const search = useSearch({ onLocationSelect });
  const [mapContainerId] = useState(() => `${variant}-map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const previousCoordinatesRef = React.useRef<{ latitude: number; longitude: number } | null>(null);
  const [isFlying, setIsFlying] = React.useState(false);

  // Create validated center coordinates
  const validatedCenter: [number, number] = React.useMemo(() => {
    // Always ensure we have safeCoordinates and they are valid
    if (!safeCoordinates) {
      console.warn('MapPanel: safeCoordinates is null/undefined, using fallback');
      return [-6.2088, 106.8456]; // Jakarta fallback
    }
    
    const { latitude, longitude } = safeCoordinates;
    
    if (typeof latitude === 'number' && 
        typeof longitude === 'number' &&
        !isNaN(latitude) && 
        !isNaN(longitude) &&
        latitude >= -90 && latitude <= 90 &&
        longitude >= -180 && longitude <= 180) {
      return [latitude, longitude];
    }
    
    console.warn('MapPanel: safeCoordinates contain invalid values:', safeCoordinates);
    // Fallback to Jakarta coordinates if safeCoordinates are invalid
    return [-6.2088, 106.8456];
  }, [safeCoordinates]);

  // Map invalidation for responsive behavior
  useMapInvalidation({
    mapInstance: mapState.mapInstance,
    isMapReady: mapState.isMapReady,
    isOpen,
    delay: variant === 'mobile' ? 100 : 150,
  });

  // Handle map location updates when user interacts with map
  const handleLocationUpdate = React.useCallback(async (lat: number, lng: number) => {
    try {
      // Call the location select handler with updated coordinates
      onLocationSelect({
        latitude: lat,
        longitude: lng,
        city: location.city, // Keep existing city info temporarily
        country: location.country, // Keep existing country info temporarily
      });
    } catch (error) {
      console.error('Error updating location from map interaction:', error);
    }
  }, [location, onLocationSelect]);

  // Set up map location update hook
  const { updateLastLocation } = useMapLocationUpdate({
    map: mapState.mapInstance,
    onLocationChange: handleLocationUpdate,
    debounceMs: 800, // Wait 800ms after user stops moving the map
    minDistanceKm: 3, // Only update if moved more than 3km
    enabled: isOpen // Only enabled when map panel is open
  });

  // Handle location changes with smooth animation
  React.useEffect(() => {
    if (mapState.mapInstance && mapState.isMapReady && isOpen) {
      // Create validated coordinates directly in the effect to avoid timing issues
      let validCoords: [number, number];
      
      if (!safeCoordinates) {
        console.warn('MapPanel effect: safeCoordinates is null/undefined, using fallback');
        validCoords = [-6.2088, 106.8456]; // Jakarta fallback
      } else {
        const { latitude, longitude } = safeCoordinates;
        
        if (typeof latitude === 'number' && 
            typeof longitude === 'number' &&
            !isNaN(latitude) && 
            !isNaN(longitude) &&
            latitude >= -90 && latitude <= 90 &&
            longitude >= -180 && longitude <= 180) {
          validCoords = [latitude, longitude];
        } else {
          console.warn('MapPanel effect: safeCoordinates contain invalid values:', safeCoordinates);
          validCoords = [-6.2088, 106.8456]; // Jakarta fallback
        }
      }
      

      const [lat, lng] = validCoords;

      const currentCoords = { 
        latitude: lat, 
        longitude: lng 
      };
      
      // Check if coordinates actually changed
      const previousCoords = previousCoordinatesRef.current;
      const coordinatesChanged = !previousCoords || 
        previousCoords.latitude !== currentCoords.latitude || 
        previousCoords.longitude !== currentCoords.longitude;
      
      if (coordinatesChanged) {
        console.log('MapPanel: Flying to new location:', currentCoords);
        
        // Triple-check that coordinates are actually valid before flying
        if (typeof lat !== 'number' || typeof lng !== 'number' || 
            isNaN(lat) || isNaN(lng) ||
            lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          console.error('MapPanel: CRITICAL - Attempted to fly to invalid coordinates:', validCoords);
          return;
        }
        
        setIsFlying(true);
        
        // Use flyTo for smooth animation to new location with error handling
        try {
          // Final safety check right before flyTo call
          const finalLat = Number(validCoords[0]);
          const finalLng = Number(validCoords[1]);
          
          if (isNaN(finalLat) || isNaN(finalLng) || 
              finalLat < -90 || finalLat > 90 || 
              finalLng < -180 || finalLng > 180) {
            console.error('MapPanel: ABORT - Coordinates became invalid right before flyTo:', {
              originalValidCoords: validCoords,
              finalLat,
              finalLng
            });
            return;
          }
          
          // Create a fresh coordinate array to prevent any reference issues
          const safeCoordinateArray: [number, number] = [finalLat, finalLng];

          
          mapState.mapInstance.flyTo(
            safeCoordinateArray,
            DEFAULT_MAP_CONFIG.defaultZoom,
            {
              duration: 1.5, // 1.5 seconds animation
              easeLinearity: 0.25, // Smooth easing
            }
          );
        } catch (error) {
          console.error('MapPanel: Error during flyTo operation:', error);
          console.error('MapPanel: Attempted coordinates:', validCoords);
          
          // Fallback: try to set view directly without animation
          try {
            const fallbackLat = Number(validCoords[0]);
            const fallbackLng = Number(validCoords[1]);
            
            if (!isNaN(fallbackLat) && !isNaN(fallbackLng)) {
              mapState.mapInstance.setView([fallbackLat, fallbackLng], DEFAULT_MAP_CONFIG.defaultZoom);
            } else {
              console.error('MapPanel: Fallback coordinates also invalid, using Jakarta');
              mapState.mapInstance.setView([-6.2088, 106.8456], DEFAULT_MAP_CONFIG.defaultZoom);
            }
          } catch (fallbackError) {
            console.error('MapPanel: Fallback setView also failed:', fallbackError);
          }
        }
        
        // Set flying state to false after animation completes
        setTimeout(() => {
          setIsFlying(false);
        }, 1500);
        
        // Update the ref to track current coordinates
        previousCoordinatesRef.current = currentCoords;
        
        // Update the map location hook to prevent triggering location update from this programmatic change
        updateLastLocation(currentCoords.latitude, currentCoords.longitude);
      }
    }
  }, [mapState.mapInstance, mapState.isMapReady, safeCoordinates, isOpen, updateLastLocation]);

  // Prepare markers with validated coordinates (moved before early return to fix hooks order)
  const markers: MarkerData[] = React.useMemo(() => {
    const mainMarker = {
      position: validatedCenter,
      icon: createCustomIcon(),
      weatherData,
      location: { city: location.city, country: location.country },
      onClick: () => console.log('Current location marker clicked'),
    };

    const nearbyMarkers = nearbyLocations
      .filter((loc) => 
        typeof loc.latitude === 'number' && 
        typeof loc.longitude === 'number' &&
        !isNaN(loc.latitude) && 
        !isNaN(loc.longitude) &&
        loc.latitude >= -90 && loc.latitude <= 90 &&
        loc.longitude >= -180 && loc.longitude <= 180
      )
      .map((loc) => ({
        position: [loc.latitude, loc.longitude] as [number, number],
        icon: createCustomIcon(loc.weatherData?.currentWeather?.icon),
        weatherData: loc.weatherData,
        location: { city: loc.city || 'Unknown Location', country: undefined },
      }));

    return [mainMarker, ...nearbyMarkers];
  }, [validatedCenter, createCustomIcon, weatherData, location, nearbyLocations]);

  if (!isOpen) {
    return null;
  }

  const containerClasses = variant === 'mobile' 
    ? "fixed inset-0 z-[100] bg-black"
    : "fixed inset-0 z-50 bg-black/95 backdrop-blur-sm";

  const desktopLayout = variant === 'desktop';

  return (
    <div className={containerClasses}>
      {desktopLayout ? (
        // Clean, minimal desktop layout
        <div className="h-full w-full relative">
          {/* Simple top bar with close and search */}
          <div className="absolute top-4 left-4 right-4 z-[1020] flex items-center justify-between gap-4">
            {/* Close button */}
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg transition-all duration-200 backdrop-blur-md text-white border hover:bg-white/10 flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.75) 100%)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)'
              }}
              title="Close map"
            >
              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Search input - simplified */}
            <div className="flex-1 max-w-md relative">
              <input
                type="text"
                placeholder="Search location..."
                value={search.searchQuery}
                onChange={(e) => search.setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg text-white placeholder-white/60 focus:outline-none text-sm transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.75) 100%)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)'
                }}
              />
              {search.isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                </div>
              )}
              
              {/* Search results dropdown */}
              {search.searchQuery && (
                <div 
                  className="absolute top-full left-0 right-0 mt-2 rounded-lg shadow-xl max-h-60 overflow-y-auto z-[1030]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.8) 100%)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)'
                  }}
                >
                  {search.isSearching ? (
                    <div className="px-4 py-3 text-center text-white/70 text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        Searching...
                      </div>
                    </div>
                  ) : search.searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-center text-white/70 text-sm">
                      No results found
                    </div>
                  ) : (
                    search.searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => search.handleSearchResultSelect(result)}
                        className="w-full px-4 py-2.5 text-left hover:bg-white/10 transition-all duration-200 border-b border-white/5 last:border-b-0 group"
                      >
                        <div className="text-white/90 font-medium group-hover:text-white text-sm">{result.name}</div>
                        <div className="text-white/60 text-xs group-hover:text-white/80">{result.country}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Location display - minimal */}
            <div className="flex-shrink-0">
              {location && (
                <div 
                  className="px-4 py-2.5 rounded-lg backdrop-blur-md text-white text-sm font-medium"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.75) 100%)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                >
                  {location.city}, {location.country}
                </div>
              )}
            </div>
          </div>

          {/* Simple bottom actions */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1020]">
            <div 
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg backdrop-blur-md"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.75) 100%)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              <button
                onClick={() => {
                  if (navigator.geolocation && onLocationSelect) {
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
                className="px-3 py-2 rounded-md transition-all duration-200 text-white border text-sm flex items-center gap-2 hover:bg-white/10"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.2)'
                }}
                title="Use your current location"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                My Location
              </button>
              
              <button
                onClick={() => {
                  if (mapState.mapInstance?.getCenter) {
                    const center = mapState.mapInstance.getCenter();
                    onLocationSelect({
                      latitude: center.lat,
                      longitude: center.lng,
                      city: 'Selected Location',
                      country: ''
                    });
                    onClose();
                  }
                }}
                className="px-3 py-2 rounded-md transition-all duration-200 text-white border text-sm flex items-center gap-2 hover:bg-blue-600/20 bg-blue-600/10"
                style={{
                  borderColor: 'rgba(59, 130, 246, 0.5)'
                }}
                title="Use this location"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
                Use This Location
              </button>
            </div>
          </div>

          {/* Map Container */}
          <div className="absolute inset-0">
            {mapState.leaflet ? (
              <div id={mapContainerId} className="h-full w-full relative">
                <Suspense fallback={<LoadingFallback variant={variant} />}>
                  <MapCore
                    center={validatedCenter}
                    zoom={DEFAULT_MAP_CONFIG.defaultZoom}
                    mapConfig={DEFAULT_MAP_CONFIG}
                    setMapInstance={mapState.setMapInstance}
                    setIsMapReady={mapState.setIsMapReady}
                    isMobile={false}
                  >
                    {markers.map((marker, index) => (
                      <WeatherMarker
                        key={`${marker.position[0]}-${marker.position[1]}-${index}`}
                        marker={marker}
                        tempUnit={tempUnit}
                        convertTemp={convertTemp}
                      />
                    ))}
                  </MapCore>
                </Suspense>

                <WeatherLegend variant={variant} />

                {!mapState.isMapReady && (
                  <LoadingFallback variant={variant} />
                )}
              </div>
            ) : (
              <LoadingFallback variant={variant} />
            )}
          </div>
        </div>
      ) : (
        // Mobile layout - using the original SearchInterface component
        <div className="h-full w-full relative">
          <SearchInterface
            searchQuery={search.searchQuery}
            searchResults={search.searchResults}
            isSearching={search.isSearching}
            onSearchQueryChange={search.setSearchQuery}
            onSearchResultSelect={search.handleSearchResultSelect}
            onClose={onClose}
            location={location}
            onLocationSelect={onLocationSelect}
          />

          <div className="absolute inset-0">
            {mapState.leaflet ? (
              <div id={mapContainerId} className="h-full w-full relative">
                <Suspense fallback={<LoadingFallback variant={variant} />}>
                  <MapCore
                    center={validatedCenter}
                    zoom={DEFAULT_MAP_CONFIG.defaultZoom}
                    mapConfig={DEFAULT_MAP_CONFIG}
                    setMapInstance={mapState.setMapInstance}
                    setIsMapReady={mapState.setIsMapReady}
                    isMobile={variant === 'mobile'}
                  >
                    {markers.map((marker, index) => (
                      <WeatherMarker
                        key={`${marker.position[0]}-${marker.position[1]}-${index}`}
                        marker={marker}
                        tempUnit={tempUnit}
                        convertTemp={convertTemp}
                      />
                    ))}
                  </MapCore>
                </Suspense>

                <WeatherLegend variant={variant} />

                {!mapState.isMapReady && (
                  <LoadingFallback variant={variant} />
                )}
              </div>
            ) : (
              <LoadingFallback variant={variant} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
