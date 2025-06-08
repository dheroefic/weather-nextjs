'use client';

import React, { useState, useEffect, useRef } from 'react';
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
      
      React.useEffect(() => {
        if (map) {
          console.log('Map instance captured in EmbeddedMap', map);
          setMapInstance(map);
          
          if (setIsMapReady) {
            const timer = setTimeout(() => {
              console.log('Setting map ready state to true in EmbeddedMap');
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
  const [mapContainerId] = useState(() => `embedded-map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamically import Leaflet on the client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        setLeaflet(L);
      });
    }
  }, []);

  // Set up map event handlers when map is ready
  useEffect(() => {
    if (!mapManager.mapInstance || !leaflet || !mapManager.isMapReady) return;

    const map = mapManager.mapInstance;

    const handleMapClick = async (e: { latlng: { lat: number; lng: number } }) => {
      try {
        console.log('Map clicked at coordinates:', e.latlng);
        await selectLocationFromCoordinates(
          e.latlng.lat,
          e.latlng.lng,
          onLocationSelect
        );
      } catch (error) {
        console.error('Error handling map click:', error);
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [mapManager.mapInstance, mapManager.isMapReady, leaflet, selectLocationFromCoordinates, onLocationSelect]);

  // Update map center when location changes
  useEffect(() => {
    if (mapManager.mapInstance && mapManager.isMapReady && safeCoordinates) {
      console.log('Updating embedded map center to:', safeCoordinates);
      mapManager.mapInstance.setView([safeCoordinates.latitude, safeCoordinates.longitude], 
        mapManager.mapInstance.getZoom());
    }
  }, [mapManager.mapInstance, mapManager.isMapReady, safeCoordinates]);

  const LoadingFallback = () => (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-xl flex items-center justify-center">
      <div className="text-white/70 text-sm">Loading map...</div>
    </div>
  );

  if (!leaflet || !safeCoordinates) {
    return <LoadingFallback />;
  }

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-xl overflow-hidden ${className}`}
    >
      {/* Map container */}
      <div id={mapContainerId} className="w-full h-full relative">
        <MapContainer
          center={[safeCoordinates.latitude, safeCoordinates.longitude]}
          zoom={DEFAULT_EMBEDDED_MAP_CONFIG.defaultZoom}
          minZoom={DEFAULT_EMBEDDED_MAP_CONFIG.minZoom}
          maxZoom={DEFAULT_EMBEDDED_MAP_CONFIG.maxZoom}
          zoomControl={DEFAULT_EMBEDDED_MAP_CONFIG.controls.zoomControl}
          attributionControl={DEFAULT_EMBEDDED_MAP_CONFIG.controls.attributionControl}
          className="w-full h-full rounded-xl"
          style={{ background: 'transparent' }}
        >
          <TileLayer
            url={DEFAULT_EMBEDDED_MAP_CONFIG.tileLayer.url}
            attribution={DEFAULT_EMBEDDED_MAP_CONFIG.tileLayer.attribution}
            maxZoom={DEFAULT_EMBEDDED_MAP_CONFIG.tileLayer.maxZoom}
          />
          
          <SetMapInstance 
            setMapInstance={mapManager.setMapInstance}
            setIsMapReady={mapManager.setIsMapReady}
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
        
        {/* Loading overlay */}
        {!mapManager.isMapReady && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-xl flex items-center justify-center">
            <LoadingFallback />
          </div>
        )}
      </div>

      {/* Expand button */}
      <button
        onClick={onExpandToFullscreen}
        className="absolute top-3 right-3 z-[1000] p-2 bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg hover:bg-black/60 transition-all duration-200 group"
        title="Expand to fullscreen"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-white group-hover:scale-110 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      </button>

      {/* Location overlay */}
      {weatherData && (
        <div className="absolute bottom-3 left-3 z-[1000] glass-container backdrop-blur-md bg-black/40 border border-white/10 rounded-lg p-3 max-w-[200px]">
          <div className="text-white">
            <div className="text-sm font-semibold truncate">{location.city}</div>
            {location.country && (
              <div className="text-xs text-white/70 truncate">{location.country}</div>
            )}
            {weatherData.currentWeather && (
              <div className="text-xs text-white/70 mt-1">
                {Math.round(weatherData.currentWeather.temperature)}°
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
