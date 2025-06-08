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
  onClose
}: {
  variant?: 'desktop' | 'mobile';
  searchQuery: string;
  searchResults: any[];
  isSearching: boolean;
  onSearchQueryChange: (query: string) => void;
  onSearchResultSelect: (result: any) => void;
  onClose?: () => void;
}) => {
  if (variant === 'mobile') {
    return (
      <div className="absolute top-0 left-0 right-0 z-[1020] bg-black/90 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
            aria-label="Close map"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
        
        {searchResults.length > 0 && (
          <div className="max-h-[200px] overflow-y-auto bg-black/95 border-t border-white/10">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => onSearchResultSelect(result)}
                className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0"
              >
                <div className="text-white text-sm font-medium">{result.name}</div>
                <div className="text-white/60 text-xs">{result.country}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Desktop search interface
  return (
    <div className="absolute top-4 left-4 right-4 z-[1020]">
      <div className="max-w-md">
        <div className="relative">
          <input
            type="text"
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full bg-black/80 backdrop-blur-md border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        
        {searchResults.length > 0 && (
          <div className="mt-2 max-h-[300px] overflow-y-auto bg-black/90 backdrop-blur-md border border-white/20 rounded-lg">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => onSearchResultSelect(result)}
                className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0"
              >
                <div className="text-white text-sm font-medium">{result.name}</div>
                <div className="text-white/60 text-xs">{result.country}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onClose}
        className="absolute top-3 right-4 text-white/70 hover:text-white transition-colors bg-black/60 backdrop-blur-sm rounded-full p-2"
        aria-label="Close map"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
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

  const mapContainerClasses = variant === 'mobile'
    ? "absolute inset-0 top-44"
    : "absolute inset-0 top-16";

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
      />

      <div className={mapContainerClasses}>
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
