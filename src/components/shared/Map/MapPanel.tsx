'use client';

import React, { useState, Suspense } from 'react';
import { createPortal } from 'react-dom';
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
  isLoadingData?: boolean;
  onWeatherDataRefresh?: () => void; // Add callback for triggering weather refresh
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

// Compact Mobile Weather Legend
const MobileWeatherLegend = ({ 
  onToggleMinimized
}: { 
  onToggleMinimized?: () => void;
}) => {
  const [localMinimized, setLocalMinimized] = useState(false); // Start expanded to show all conditions

  const toggleMinimized = () => {
    const newState = !localMinimized;
    setLocalMinimized(newState);
    onToggleMinimized?.();
  };

  return (
    <div 
      className="fixed rounded-xl overflow-hidden z-[1015] transition-all duration-300"
      style={{
        bottom: '140px',
        right: '16px',
        maxWidth: '200px',
        maxHeight: localMinimized ? '36px' : '400px',
        background: 'rgba(0, 0, 0, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(15px)',
      }}
    >
      {/* Compact Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={toggleMinimized}
      >
        <span className="text-white font-medium text-xs">Weather Conditions</span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 text-white/60 ${localMinimized ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded Content - Show all conditions */}
      {!localMinimized && (
        <div className="overflow-y-auto max-h-[350px]">
          <div className="grid grid-cols-1 gap-1 p-3 pt-0">
            {Object.entries(WMO_CODES).map(([code, { condition, icon }]) => (
              <div key={code} className="flex items-center space-x-2 py-1">
                <Image 
                  src={icon} 
                  alt={condition} 
                  width={16} 
                  height={16} 
                  className="flex-shrink-0" 
                />
                <span className="text-white/80 text-xs leading-tight">
                  {condition}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Beautiful Mobile Header with better spacing
const MobileHeader = ({
  searchQuery,
  isSearching,
  onSearchQueryChange,
  onClose,
  location
}: {
  searchQuery: string;
  isSearching: boolean;
  onSearchQueryChange: (query: string) => void;
  onClose?: () => void;
  location?: { city: string; country: string };
}) => {
  return (
    <div className="absolute inset-x-0 top-0 z-[1020]">
      <div 
        className="px-4 pt-8 pb-3"
        style={{
          background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.8) 70%, rgba(0, 0, 0, 0.4) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Compact header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <h1 className="text-white text-xl font-light">Weather Map</h1>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <svg 
              className="w-5 h-5 text-white/80" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Compact search bar */}
        <div className="relative">
          <div
            className="relative overflow-hidden rounded-xl"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(15px)',
            }}
          >
            <div className="flex items-center px-4 py-3">
              <svg className="w-4 h-4 text-white/60 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search location..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-white/50 focus:outline-none text-sm font-light"
                style={{ caretColor: 'white' }}
              />
              {isSearching && (
                <div className="ml-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Compact current location */}
        {location && (
          <div 
            className="mt-2 rounded-lg p-2"
            style={{
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              backdropFilter: 'blur(15px)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{
                    background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)'
                  }}
                ></div>
                <div>
                  <div className="text-white text-xs font-medium">{location.city}</div>
                  <div className="text-white/60 text-xs">{location.country}</div>
                </div>
              </div>
              <svg className="w-3 h-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Mobile Search Results (separate component for better organization)
const MobileSearchResults = ({
  searchQuery,
  searchResults,
  isSearching,
  onSearchResultSelect
}: {
  searchQuery: string;
  searchResults: Array<{
    name: string;
    country: string;
    latitude: number;
    longitude: number;
  }>;
  isSearching: boolean;
  onSearchResultSelect: (result: {
    name: string;
    country: string;
    latitude: number;
    longitude: number;
  }) => void;
}) => {
  if (!searchQuery) return null;

  return (
    <div className="absolute inset-x-0 z-[1025]" style={{ top: '130px' }}>
      <div 
        className="mx-4 rounded-xl shadow-lg max-h-48 overflow-y-auto"
        style={{
          background: 'rgba(0, 0, 0, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6)'
        }}
      >
        {isSearching ? (
          <div className="px-4 py-3 text-center">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
              <span className="text-white/70 text-sm">Searching...</span>
            </div>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="px-4 py-3 text-center">
            <div className="text-white/60 text-sm">No locations found</div>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => onSearchResultSelect(result)}
                className="w-full px-4 py-3 text-left transition-all duration-200 hover:bg-white/10"
              >
                <div className="text-white text-sm font-medium">{result.name}</div>
                <div className="text-white/60 text-xs">{result.country}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Compact Mobile Bottom Actions
const MobileBottomActions = ({ 
  onLocationSelect,
  onUseLocation,
  onLoadingStateChange,
  variant = 'mobile'
}: { 
  onLocationSelect?: (coordinates: { latitude: number; longitude: number; city?: string; country?: string }) => void;
  onUseLocation?: () => void;
  onLoadingStateChange?: (isLoading: boolean) => void;
  variant?: 'mobile' | 'desktop';
}) => {
  const isDesktop = variant === 'desktop';
  
  return (
    <div 
      className="absolute z-[1020]" 
      style={{ 
        bottom: '50px', 
        left: isDesktop ? '50%' : '16px', 
        right: isDesktop ? 'auto' : '16px',
        transform: isDesktop ? 'translateX(-50%)' : 'none'
      }}
    >
      <div 
        className="px-4 py-4"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.75) 100%)',
          backdropFilter: 'blur(15px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          minWidth: isDesktop ? '400px' : 'auto',
        }}
      >
        <div className="flex space-x-3">
          <button
            onClick={async () => {
              if (navigator.geolocation && onLocationSelect) {
                // Show loading
                if (onLoadingStateChange) {
                  onLoadingStateChange(true);
                }
                
                navigator.geolocation.getCurrentPosition(
                  async (position) => {
                    const { latitude, longitude } = position.coords;
                    try {
                      const { getLocationWithFallback } = await import('@/utils/mapLocationUtils');
                      const result = await getLocationWithFallback(latitude, longitude);
                      onLocationSelect({
                        latitude,
                        longitude,
                        city: result.city,
                        country: result.country
                      });
                    } catch (error) {
                      console.error('Error reverse geocoding location:', error);
                      // Fallback to coordinates as strings
                      onLocationSelect({
                        latitude,
                        longitude,
                        city: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                        country: ''
                      });
                    } finally {
                      // Hide loading
                      if (onLoadingStateChange) {
                        setTimeout(() => onLoadingStateChange(false), 1000);
                      }
                    }
                  },
                  (error) => {
                    console.error('Error getting current location:', error);
                    // Hide loading on error
                    if (onLoadingStateChange) {
                      onLoadingStateChange(false);
                    }
                  }
                );
              }
            }}
            className="flex-1 py-3 px-4 rounded-xl transition-all duration-200"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="flex items-center justify-center space-x-2">
              <svg 
                className="w-4 h-4 text-white/80" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span className="text-white text-sm font-medium">My Location</span>
            </div>
          </button>
          
          {onUseLocation && (
            <button
              onClick={onUseLocation}
              className="flex-1 py-3 px-4 rounded-xl transition-all duration-200 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 hover:border-white/20"
            >
              <div className="flex items-center justify-center space-x-2">
                <svg 
                  className="w-4 h-4 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-white text-sm font-medium">Use This Location</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Loading Indicator Component
const MapLoadingIndicator = ({ 
  isVisible, 
  variant, 
  isMapInteractionLoading = false,
  isDataLoading = false 
}: { 
  isVisible: boolean; 
  variant: 'desktop' | 'mobile';
  isMapInteractionLoading?: boolean;
  isDataLoading?: boolean;
}) => {
  // Debug logging
  React.useEffect(() => {
    console.log('MapLoadingIndicator - isVisible:', isVisible, 'variant:', variant, 'mapInteraction:', isMapInteractionLoading, 'dataLoading:', isDataLoading);
  }, [isVisible, variant, isMapInteractionLoading, isDataLoading]);

  if (!isVisible) return null;
  
  // Determine what's loading and show appropriate message
  let loadingMessage = 'Loading weather data';
  if (isMapInteractionLoading && isDataLoading) {
    loadingMessage = 'Updating location & weather';
  } else if (isMapInteractionLoading) {
    loadingMessage = 'Finding location name';
  } else if (isDataLoading) {
    loadingMessage = 'Loading weather data';
  }
  
  return (
    <div 
      className={`absolute top-20 left-6 z-[1010] transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
      style={{
        pointerEvents: 'none', // Don't interfere with map interactions
      }}
    >
      <div 
        className="flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-md border shadow-lg"
        style={{
          background: 'rgba(0, 0, 0, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Animated loading spinner */}
        <div className="relative">
          <div 
            className="w-4 h-4 rounded-full border-2 animate-spin"
            style={{
              borderColor: 'rgba(59, 130, 246, 0.3)',
              borderTopColor: '#3b82f6',
              animationDuration: '1s',
            }}
          />
          <div 
            className="absolute inset-0 w-4 h-4 rounded-full border-2 animate-pulse"
            style={{
              borderColor: 'transparent',
              borderTopColor: 'rgba(139, 92, 246, 0.4)',
              animationDelay: '0.5s',
            }}
          />
        </div>
        
        {/* Loading text with subtle animation */}
        <div className="flex items-center gap-1">
          <span className="text-white text-sm font-medium">{loadingMessage}</span>
          <div className="flex gap-0.5">
            <div 
              className="w-1 h-1 bg-white/60 rounded-full animate-bounce"
              style={{ animationDelay: '0s', animationDuration: '1.4s' }}
            />
            <div 
              className="w-1 h-1 bg-white/60 rounded-full animate-bounce"
              style={{ animationDelay: '0.2s', animationDuration: '1.4s' }}
            />
            <div 
              className="w-1 h-1 bg-white/60 rounded-full animate-bounce"
              style={{ animationDelay: '0.4s', animationDuration: '1.4s' }}
            />
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
  variant = 'desktop',
  nearbyLocations = [],
  isLoadingData = false,
  onWeatherDataRefresh
}: MapPanelProps) {
  
  // Debug logging for loading states
  React.useEffect(() => {
    console.log('MapPanel - isLoadingData:', isLoadingData, 'variant:', variant, 'isOpen:', isOpen);
  }, [isLoadingData, variant, isOpen]);

  const safeCoordinates = useSafeCoordinates(location);
  const mapState = useMapState();
  const { createCustomIcon } = useCustomIcon(mapState.leaflet, weatherData, variant === 'mobile');
  const search = useSearch({ onLocationSelect });
  const [mapContainerId] = useState(() => `${variant}-map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const previousCoordinatesRef = React.useRef<{ latitude: number; longitude: number } | null>(null);
  const [isMapInteractionLoading, setIsMapInteractionLoading] = React.useState(false);

  // Debug logging for search loading
  React.useEffect(() => {
    console.log('MapPanel - search.isSearching:', search.isSearching);
  }, [search.isSearching]);

  // Calculate final loading state
  const isLoading = isLoadingData || search.isSearching || isMapInteractionLoading;

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

  // State to track the current center marker location (for real-time updates)
  const [centerMarkerLocation, setCenterMarkerLocation] = React.useState({
    city: location.city,
    country: location.country
  });

  // State to track if map center has changed (to show "Use This Location" button)
  const [hasMapCenterChanged, setHasMapCenterChanged] = React.useState(false);
  const [currentMapCenter, setCurrentMapCenter] = React.useState<{ lat: number; lng: number } | null>(null);

  // Update center marker location when the main location prop changes
  React.useEffect(() => {
    setCenterMarkerLocation({
      city: location.city,
      country: location.country
    });
  }, [location.city, location.country]);

  // Reset "Use This Location" button when location changes programmatically
  React.useEffect(() => {
    setHasMapCenterChanged(false);
  }, [location?.coordinates?.latitude, location?.coordinates?.longitude]);

  // Map invalidation for responsive behavior
  useMapInvalidation({
    mapInstance: mapState.mapInstance,
    isMapReady: mapState.isMapReady,
    isOpen,
    delay: variant === 'mobile' ? 100 : 150,
  });

  // Handle map location updates when user interacts with map
  const handleLocationUpdate = React.useCallback(async (lat: number, lng: number) => {
    // Prevent multiple simultaneous geocoding requests
    if (isMapInteractionLoading) {
      console.log('MapPanel: Geocoding already in progress, skipping...');
      return;
    }

    console.log('MapPanel: Starting location update for:', { lat, lng });
    
    try {
      // Immediately update center marker with coordinates as temporary name
      const tempLocationName = `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
      setCenterMarkerLocation({
        city: tempLocationName,
        country: 'Coordinates'
      });

      // Update the main location via callback
      onLocationSelect({
        latitude: lat,
        longitude: lng,
        city: tempLocationName,
        country: 'Coordinates',
      });

      // Trigger weather data refresh if callback is provided
      if (onWeatherDataRefresh) {
        onWeatherDataRefresh();
      }

      // Perform reverse geocoding to get the actual location name (in background)
      try {
        console.log('MapPanel: Starting reverse geocoding...');
        const { reverseGeocode } = await import('@/services/geolocationService');
        const geocodeResult = await reverseGeocode({ latitude: lat, longitude: lng });
        
        console.log('MapPanel: Geocoding result:', geocodeResult);
        
        if (geocodeResult.success && geocodeResult.data) {
          // Update both center marker and main location with proper names
          console.log('MapPanel: Updating with geocoded location:', geocodeResult.data);
          setCenterMarkerLocation({
            city: geocodeResult.data.city,
            country: geocodeResult.data.country
          });
          onLocationSelect({
            latitude: lat,
            longitude: lng,
            city: geocodeResult.data.city,
            country: geocodeResult.data.country,
          });
        } else {
          console.log('MapPanel: Geocoding failed, keeping coordinate fallback');
          // Keep the coordinate-based naming if geocoding fails
        }
      } catch (geocodeError) {
        console.warn('Reverse geocoding failed during map interaction:', geocodeError);
        // Keep the coordinate-based naming if geocoding fails
      }
    } catch (error) {
      console.error('Error updating location from map interaction:', error);
      // Final fallback
      const fallbackName = `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
      setCenterMarkerLocation({
        city: fallbackName,
        country: 'Unknown Region'
      });
      onLocationSelect({
        latitude: lat,
        longitude: lng,
        city: fallbackName,
        country: 'Unknown Region',
      });
    }
  }, [onLocationSelect, onWeatherDataRefresh, isMapInteractionLoading]);

  // Handle "Use This Location" button click
  const handleUseThisLocation = React.useCallback(async () => {
    if (!currentMapCenter) return;
    
    console.log('MapPanel: User clicked "Use This Location" for:', currentMapCenter);
    
    // Hide the button immediately
    setHasMapCenterChanged(false);
    
    // Update the location using the current map center
    await handleLocationUpdate(currentMapCenter.lat, currentMapCenter.lng);
  }, [currentMapCenter, handleLocationUpdate]);

  // Set up map location update hook - DISABLED to prevent aggressive location updates
  // Location will only be updated when user clicks "Use This Location" button
  const { updateLastLocation } = useMapLocationUpdate({
    map: mapState.mapInstance,
    onLocationChange: handleLocationUpdate,
    onLoadingStateChange: setIsMapInteractionLoading,
    debounceMs: 800, // Wait 800ms after user stops moving the map
    minDistanceKm: 3, // Only update if moved more than 3km
    enabled: false // DISABLED - only update on explicit user action
  });

  // Track map movement to show "Use This Location" button
  React.useEffect(() => {
    if (!mapState.mapInstance || !mapState.isMapReady || !isOpen) return;

    const map = mapState.mapInstance;

    const handleMapMove = () => {
      if (!mapState.mapInstance) return;
      
      const center = mapState.mapInstance.getCenter();
      const newCenter = { lat: center.lat, lng: center.lng };
      
      // Check if the center has significantly changed from the current location
      if (location?.coordinates) {
        const currentLat = location.coordinates.latitude;
        const currentLng = location.coordinates.longitude;
        
        // Calculate distance (simple euclidean distance check)
        const distance = Math.sqrt(
          Math.pow(newCenter.lat - currentLat, 2) + 
          Math.pow(newCenter.lng - currentLng, 2)
        );
        
        // If moved more than ~0.01 degrees (roughly 1km), show the button
        if (distance > 0.01) {
          setHasMapCenterChanged(true);
          setCurrentMapCenter(newCenter);
        }
      } else {
        // If no current location, any movement shows the button
        setHasMapCenterChanged(true);
        setCurrentMapCenter(newCenter);
      }
    };

    map.on('moveend', handleMapMove);
    map.on('zoomend', handleMapMove);

    return () => {
      map.off('moveend', handleMapMove);
      map.off('zoomend', handleMapMove);
    };
  }, [mapState.mapInstance, mapState.isMapReady, isOpen, location?.coordinates]);

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
        

        
        // Update the ref to track current coordinates
        previousCoordinatesRef.current = currentCoords;
        
        // Update the map location hook to prevent triggering location update from this programmatic change
        updateLastLocation(currentCoords.latitude, currentCoords.longitude);
      }
    }
  }, [mapState.mapInstance, mapState.isMapReady, safeCoordinates, isOpen, updateLastLocation]);

  // Prevent body scroll on mobile when map is open
  React.useEffect(() => {
    if (variant === 'mobile' && isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      
      // Prevent scrolling
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.height = '100vh';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore scrolling
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.style.overflow = '';
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [variant, isOpen]);

  // Prepare markers with validated coordinates (moved before early return to fix hooks order)
  const markers: MarkerData[] = React.useMemo(() => {
    const mainMarker = {
      position: validatedCenter,
      icon: createCustomIcon(),
      weatherData,
      location: { city: centerMarkerLocation.city, country: centerMarkerLocation.country },
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
  }, [validatedCenter, createCustomIcon, weatherData, centerMarkerLocation, nearbyLocations]);

  if (!isOpen) {
    return null;
  }

  const containerClasses = variant === 'mobile' 
    ? "mobile-map-fullscreen bg-black overflow-hidden"
    : "fixed inset-0 z-50 bg-black/95 backdrop-blur-sm";

  const desktopLayout = variant === 'desktop';

  const mapContent = (
    <div className={containerClasses}>
      {desktopLayout ? (
        // Desktop layout using mobile design components for consistency
        <div 
          className="w-full h-full relative"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh'
          }}
        >
          {/* Use Mobile Header for desktop as well */}
          <MobileHeader
            searchQuery={search.searchQuery}
            isSearching={search.isSearching}
            onSearchQueryChange={search.setSearchQuery}
            onClose={onClose}
            location={centerMarkerLocation}
          />

          {/* Mobile Search Results for desktop */}
          <MobileSearchResults
            searchQuery={search.searchQuery}
            searchResults={search.searchResults}
            isSearching={search.isSearching}
            onSearchResultSelect={search.handleSearchResultSelect}
          />

          {/* Mobile Weather Legend for desktop */}
          <MobileWeatherLegend />

          {/* Enhanced Loading Indicator */}
          <MapLoadingIndicator 
            isVisible={isLoading} 
            variant={variant} 
            isMapInteractionLoading={isMapInteractionLoading}
            isDataLoading={isLoadingData}
          />

          {/* Mobile Bottom Actions for desktop */}
          <MobileBottomActions 
            variant={variant}
            onLocationSelect={onLocationSelect} 
            onLoadingStateChange={setIsMapInteractionLoading}
            onUseLocation={hasMapCenterChanged ? handleUseThisLocation : undefined} // Only show when map has moved
          />

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
        // Mobile layout - Clean and spacious
        <div 
          className="w-full h-full relative"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh'
          }}
        >
          {/* Compact Mobile Header */}
          <MobileHeader
            searchQuery={search.searchQuery}
            isSearching={search.isSearching}
            onSearchQueryChange={search.setSearchQuery}
            onClose={onClose}
            location={centerMarkerLocation}
          />

          {/* Search Results (positioned separately) */}
          <MobileSearchResults
            searchQuery={search.searchQuery}
            searchResults={search.searchResults}
            isSearching={search.isSearching}
            onSearchResultSelect={search.handleSearchResultSelect}
          />

          {/* Enhanced Loading Indicator */}
          <MapLoadingIndicator 
            isVisible={isLoading} 
            variant={variant} 
            isMapInteractionLoading={isMapInteractionLoading}
            isDataLoading={isLoadingData}
          />

          {/* Compact Bottom Actions */}
          <MobileBottomActions 
            variant={variant}
            onLocationSelect={onLocationSelect} 
            onLoadingStateChange={setIsMapInteractionLoading}
            onUseLocation={hasMapCenterChanged ? handleUseThisLocation : undefined} // Only show when map has moved
          />

          {/* Map Container - Full Screen */}
          <div 
            className="absolute inset-0"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh'
            }}
          >
            {mapState.leaflet ? (
              <div 
                id={mapContainerId} 
                className="h-full w-full relative"
                style={{
                  width: '100vw',
                  height: '100vh'
                }}
              >
                <Suspense fallback={<LoadingFallback variant={variant} />}>
                  <MapCore
                    center={validatedCenter}
                    zoom={DEFAULT_MAP_CONFIG.defaultZoom}
                    mapConfig={DEFAULT_MAP_CONFIG}
                    setMapInstance={mapState.setMapInstance}
                    setIsMapReady={mapState.setIsMapReady}
                    isMobile={variant === 'mobile'}
                    style={{ 
                      height: '100vh', 
                      width: '100vw',
                      position: 'absolute',
                      top: 0,
                      left: 0
                    }}
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

                {!mapState.isMapReady && (
                  <LoadingFallback variant={variant} />
                )}
              </div>
            ) : (
              <LoadingFallback variant={variant} />
            )}
          </div>

          {/* Compact Weather Legend */}
          <MobileWeatherLegend />
        </div>
      )}
    </div>
  );

  // For mobile, render with portal to bypass all parent containers
  if (variant === 'mobile' && typeof document !== 'undefined') {
    return createPortal(mapContent, document.body);
  }

  // For desktop, render normally
  return mapContent;
}
