'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { WeatherData, Location } from '@/types/weather';
import {
  useMapManager,
  useLocationSelection,
  useSafeCoordinates,
  DEFAULT_EMBEDDED_MAP_CONFIG
} from '@/utils/mapUtility';
import 'leaflet/dist/leaflet.css';
import type { Map } from 'leaflet';

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

// Helper component to capture the map instance
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
      const hasSetInstance = React.useRef(false);
      
      React.useEffect(() => {
        if (map && !hasSetInstance.current) {
          console.log('Map instance captured in EmbeddedMap', map);
          setMapInstance(map);
          hasSetInstance.current = true;
          
          if (setIsMapReady) {
            const timer = setTimeout(() => {
              console.log('Setting map ready state to true in EmbeddedMap');
              setIsMapReady(true);
            }, 500); // Increased timeout to ensure map is fully loaded
            
            return () => clearTimeout(timer);
          }
        }
      }, [map]); // Remove function dependencies to prevent infinite re-renders
      
      return null;
    };
    
    return { default: Component };
  }),
  { ssr: false }
);

interface EmbeddedMapProps {
  weatherData: WeatherData | null;
  location: Location;
  onExpandToFullscreen: () => void;
  onLocationSelect: (location: Location) => void;
  className?: string;
}

export default function EmbeddedMap({
  weatherData,
  location,
  onExpandToFullscreen,
  onLocationSelect,
  className = ''
}: EmbeddedMapProps) {
  // Use our new map utility hooks
  const safeCoordinates = useSafeCoordinates(location);
  const { selectLocationFromCoordinates } = useLocationSelection();
  const mapManager = useMapManager(DEFAULT_EMBEDDED_MAP_CONFIG);
  
  // Local state
  const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null);
  const [isLocalMapReady, setIsLocalMapReady] = useState(false);
  const [mapContainerId] = useState(() => `embedded-map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      setIsLocalMapReady(false);
      // Cleanup will be handled by useMapManager hook
    };
  }, []); // Empty dependency array to prevent infinite re-renders

  // Dynamically import Leaflet on the client
  useEffect(() => {
    if (typeof window !== 'undefined' && mountedRef.current) {
      setIsLocalMapReady(false); // Reset ready state when starting to load
      import('leaflet').then((L) => {
        if (mountedRef.current) {
          setLeaflet(L);
        }
      });
    }
  }, []);

  // Set up map event handlers when map is ready - use refs to avoid dependency issues
  const selectLocationFromCoordinatesRef = useRef(selectLocationFromCoordinates);
  const onLocationSelectRef = useRef(onLocationSelect);
  
  // Update refs when functions change
  useEffect(() => {
    selectLocationFromCoordinatesRef.current = selectLocationFromCoordinates;
    onLocationSelectRef.current = onLocationSelect;
  }, [selectLocationFromCoordinates, onLocationSelect]);

  // Stable callback functions to prevent infinite re-renders
  const setMapInstanceStable = useCallback((map: Map) => {
    console.log('setMapInstanceStable called with map:', map);
    mapManager.setMapInstance(map);
  }, [mapManager.setMapInstance]);

  const setIsMapReadyStable = useCallback((ready: boolean) => {
    console.log('setIsMapReadyStable called with ready:', ready);
    setIsLocalMapReady(ready);
    mapManager.setIsMapReady(ready);
  }, [mapManager.setIsMapReady]);

  useEffect(() => {
    if (!mapManager.mapInstance || !leaflet || !isLocalMapReady) return;

    const map = mapManager.mapInstance;

    const handleMapClick = async (e: { latlng: { lat: number; lng: number } }) => {
      try {
        console.log('Map clicked at coordinates:', e.latlng);
        // Use ref to avoid dependency issues
        // const location = await selectLocationFromCoordinatesRef.current(e.latlng.lat, e.latlng.lng);
        // if (location) {
        //   onLocationSelectRef.current(location);
        // }
      } catch (error) {
        console.error('Error handling map click:', error);
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [mapManager.mapInstance, isLocalMapReady, leaflet]); // Use local ready state

  // Update map center when location changes
  useEffect(() => {
    if (mapManager.mapInstance && isLocalMapReady && safeCoordinates) {
      console.log('Updating embedded map center to:', safeCoordinates);
      mapManager.mapInstance.setView([safeCoordinates.latitude, safeCoordinates.longitude], 
        mapManager.mapInstance.getZoom());
    }
  }, [mapManager.mapInstance, isLocalMapReady, safeCoordinates]);

  const LoadingFallback = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg z-[500]">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/60"></div>
        <div className="text-white/70 text-sm">
          {!leaflet 
            ? 'Loading Leaflet...' 
            : !mapManager.mapInstance 
              ? 'Initializing map...'
              : !isLocalMapReady
                ? 'Finalizing map...'
                : 'Loading map...'
          }
        </div>
      </div>
    </div>
  );

  // Debug logging to understand loading state
  useEffect(() => {
    console.log('EmbeddedMap state:', {
      leaflet: !!leaflet,
      mapInstance: !!mapManager.mapInstance,
      isMapReady: mapManager.isMapReady,
      isLocalMapReady,
      safeCoordinates: !!safeCoordinates
    });
  }, [leaflet, mapManager.mapInstance, mapManager.isMapReady, isLocalMapReady, safeCoordinates]);

  if (!leaflet || !safeCoordinates) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center text-white/60">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <p className="text-sm">Location not available</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`h-full relative ${className}`}
    >
      {/* Loading overlay - show until both leaflet is loaded AND map is ready */}
      {(!leaflet || !isLocalMapReady) && <LoadingFallback />}

      {/* Map Container */}
      <div className="h-full w-full relative overflow-hidden rounded-lg" data-map-container-id={mapContainerId}>
        {leaflet && (
          <MapContainer
            key={mapContainerId} // Use stable container ID, not changing timestamp
            center={[safeCoordinates.latitude, safeCoordinates.longitude]}
            zoom={DEFAULT_EMBEDDED_MAP_CONFIG.defaultZoom}
            minZoom={DEFAULT_EMBEDDED_MAP_CONFIG.minZoom}
            maxZoom={DEFAULT_EMBEDDED_MAP_CONFIG.maxZoom}
            style={{ height: '100%', width: '100%' }}
            zoomControl={DEFAULT_EMBEDDED_MAP_CONFIG.controls.zoomControl}
            attributionControl={DEFAULT_EMBEDDED_MAP_CONFIG.controls.attributionControl}
            whenReady={() => {
              console.log('EmbeddedMap MapContainer ready - setting local map ready state');
              setIsLocalMapReady(true);
            }}
          >
            <TileLayer
              url={DEFAULT_EMBEDDED_MAP_CONFIG.tileLayer.url}
              attribution={DEFAULT_EMBEDDED_MAP_CONFIG.tileLayer.attribution}
              maxZoom={DEFAULT_EMBEDDED_MAP_CONFIG.tileLayer.maxZoom}
            />
            
            <SetMapInstance 
              setMapInstance={setMapInstanceStable}
              setIsMapReady={setIsMapReadyStable}
            />
            
            {/* Current location marker */}
            <Marker position={[safeCoordinates.latitude, safeCoordinates.longitude]}>
              <Popup>
                <div className="text-center">
                  <strong>{location.city}</strong>
                  {location.country && <div className="text-sm text-gray-600">{location.country}</div>}
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        )}
      </div>

      {/* Map overlay controls */}
      <div className="absolute top-2 left-2 z-[1000] flex flex-col gap-2">
        <button
          onClick={async () => {
            try {
              const { getUserGeolocation, reverseGeocode } = await import('@/services/geolocationService');
              const geoResponse = await getUserGeolocation();
              if (geoResponse.success && geoResponse.data) {
                const { latitude, longitude } = geoResponse.data;
                if (mapManager.mapInstance && mapManager.isMapReady) {
                  mapManager.mapInstance.flyTo([latitude, longitude], DEFAULT_EMBEDDED_MAP_CONFIG.defaultZoom, {
                    duration: 1.5,
                    easeLinearity: 0.25,
                  });
                }

                const locationResponse = await reverseGeocode({ latitude, longitude });
                if (locationResponse.success && locationResponse.data) {
                  onLocationSelect({
                    city: locationResponse.data.city,
                    country: locationResponse.data.country,
                    coordinates: { latitude, longitude }
                  });
                } else {
                  onLocationSelect({
                    city: latitude.toString(),
                    country: longitude.toString(),
                    coordinates: { latitude, longitude }
                  });
                }
              }
            } catch (error) {
              console.error('Error getting user location:', error);
            }
          }}
          className="p-2 rounded-lg bg-black/40 hover:bg-black/60 transition-all duration-200 backdrop-blur-md text-white border border-white/10 hover:border-white/20"
          title="Center on current location"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Expand to fullscreen button */}
      <div className="absolute top-2 right-2 z-[1000]">
        <button
          onClick={() => {
            if (mapManager.isMapReady && mapManager.mapInstance) {
              // Cleanup current map before transitioning
              console.log('Cleaning up embedded map before expanding to fullscreen');
              mapManager.cleanupMap();
              onExpandToFullscreen();
            }
          }}
          disabled={!mapManager.isMapReady}
          className={`p-2 rounded-lg transition-all duration-200 backdrop-blur-md text-white border ${
            mapManager.isMapReady 
              ? 'bg-black/40 hover:bg-black/60 border-white/10 hover:border-white/20 cursor-pointer'
              : 'bg-black/20 border-white/5 cursor-not-allowed opacity-50'
          }`}
          title={mapManager.isMapReady ? "Expand to fullscreen" : "Map loading..."}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      {/* Current weather info overlay */}
      {weatherData && weatherData.currentWeather && (
        <div className="absolute bottom-4 left-4 z-[1000] p-2 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
          <div className="flex items-center gap-2 text-white text-xs">
            <img 
              src={weatherData.currentWeather.icon}
              alt={weatherData.currentWeather.condition}
              className="w-4 h-4"
            />
            <span>{Math.round(weatherData.currentWeather.temperature)}°</span>
            <span className="opacity-60">•</span>
            <span className="opacity-80">{weatherData.currentWeather.condition}</span>
          </div>
        </div>
      )}
    </div>
  );
}
