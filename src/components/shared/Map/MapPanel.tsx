'use client';

import React, { useState, Suspense } from 'react';
import Image from 'next/image';
import type { TemperatureUnit, WeatherData, Location } from '@/types/weather';
import { WMO_CODES } from '@/services/weatherService';
import { useSafeCoordinates, DEFAULT_MAP_CONFIG } from '@/utils/mapUtility';
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
    ? "absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden z-[1010]"
    : "absolute bottom-4 right-4 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden z-[1010] max-w-sm";

  return (
    <div className={baseClasses}>
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
  variant = 'desktop',
  searchQuery,
  searchResults,
  isSearching,
  onSearchQueryChange,
  onSearchResultSelect,
  onClose,
  location,
  onLocationSelect
}: {
  variant?: 'desktop' | 'mobile';
  searchQuery: string;
  searchResults: any[];
  isSearching: boolean;
  onSearchQueryChange: (query: string) => void;
  onSearchResultSelect: (result: any) => void;
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
          className="w-10 h-10 bg-gray-800/90 backdrop-blur-md border border-gray-600/50 rounded-lg hover:bg-gray-700/90 transition-colors flex items-center justify-center"
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
        <div className="bg-gray-800/90 backdrop-blur-md border border-gray-600/50 rounded-lg shadow-lg max-h-60 overflow-y-auto max-w-2xl">
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
                onClick={() => onSearchResultSelect(result)}
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
      {location && (
        <div className="bg-gray-800/90 backdrop-blur-md border border-gray-600/50 rounded-lg p-4 max-w-2xl">
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
                // Set location functionality
                if (onClose) onClose();
              }}
              className="flex-1 py-3 px-4 rounded-lg bg-gray-700/80 hover:bg-gray-700 transition-all duration-200 text-white border border-gray-600/50 hover:border-gray-500 flex items-center justify-center gap-2"
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
      export default function UnifiedMapPanel({
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

  // Map invalidation for responsive behavior
  useMapInvalidation({
    mapInstance: mapState.mapInstance,
    isMapReady: mapState.isMapReady,
    isOpen,
    delay: variant === 'mobile' ? 100 : 150,
  });

  if (!isOpen) {
    return null;
  }

  // Prepare markers
  const markers: MarkerData[] = [
    // Main location marker
    {
      position: [safeCoordinates.latitude, safeCoordinates.longitude],
      icon: createCustomIcon(),
      weatherData,
      location: { city: location.city, country: location.country },
      onClick: () => console.log('Current location marker clicked'),
    },
    // Nearby location markers
    ...nearbyLocations.map((loc, index) => ({
      position: [loc.latitude, loc.longitude] as [number, number],
      icon: createCustomIcon(loc.weatherData?.currentWeather?.icon),
      weatherData: loc.weatherData,
      location: { city: loc.city || 'Unknown Location', country: undefined },
    })),
  ];

  const containerClasses = variant === 'mobile' 
    ? "fixed inset-0 z-[100] bg-black"
    : "fixed inset-0 z-50 bg-black/95 backdrop-blur-sm";

  return (
    <div className={containerClasses}>
      <SearchInterface
        variant={variant}
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
                center={[safeCoordinates.latitude, safeCoordinates.longitude]}
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
  );
}
