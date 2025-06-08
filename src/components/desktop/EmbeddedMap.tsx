'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { TemperatureUnit, WeatherData } from '@/types/weather';
import {
  getUserGeolocation,
  reverseGeocode,
} from '@/services/geolocationService';
import { fetchNearbyWeatherData } from '@/services/weatherDistribution';
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
    const Component = ({ setMapInstance, setIsMapReady }: { 
      setMapInstance: (map: Map) => void;
      setIsMapReady: (ready: boolean) => void;
    }) => {
      const map = mod.useMap();
      
      React.useEffect(() => {
        if (map) {
          console.log('EmbeddedMap: Map instance captured, setting up map...');
          // Set map instance immediately
          setMapInstance(map);
          
          // Set ready state after a short delay to ensure map is fully initialized
          const timer = setTimeout(() => {
            console.log('EmbeddedMap: Setting map ready to true');
            setIsMapReady(true);
          }, 500);
          
          return () => {
            clearTimeout(timer);
            // Don't set map instance to null here as it might be needed for cleanup
          };
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
  defaultZoom: 10,
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
    attributionControl: false,
  },
};

interface EmbeddedMapProps {
  weatherData: WeatherData | null;
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
  onExpandToFullscreen: () => void;
  className?: string;
}

export default function EmbeddedMap({
  weatherData,
  location,
  tempUnit,
  convertTemp,
  onLocationSelect,
  onExpandToFullscreen,
  className = '',
}: EmbeddedMapProps) {
  // Determine if coordinates are available and valid
  const hasValidCoordinates = Boolean(
    location.coordinates && 
    typeof location.coordinates.latitude === 'number' && 
    typeof location.coordinates.longitude === 'number' &&
    !isNaN(location.coordinates.latitude) && 
    !isNaN(location.coordinates.longitude)
  );
  
  // Safe coordinates with fallback to NYC
  const safeCoordinates = hasValidCoordinates 
    ? location.coordinates! 
    : { latitude: 40.7128, longitude: -74.0060 };

  // Debug logging to track coordinate handling
  useEffect(() => {
    console.log('EmbeddedMap coordinate check:', {
      hasValidCoordinates,
      rawCoordinates: location.coordinates,
      safeCoordinates,
      locationCity: location.city
    });
  }, [hasValidCoordinates, location.coordinates, safeCoordinates, location.city]);

  const [leaflet, setLeaflet] = useState<any>(null);
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  const [nearbyLocations, setNearbyLocations] = useState<NearbyLocation[]>([]);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>(() => {
    // Ensure initial coordinates are always valid
    if (safeCoordinates.latitude >= -90 && safeCoordinates.latitude <= 90 &&
        safeCoordinates.longitude >= -180 && safeCoordinates.longitude <= 180) {
      return [safeCoordinates.latitude, safeCoordinates.longitude];
    } else {
      console.warn('Invalid initial coordinates in EmbeddedMap:', safeCoordinates);
      return [40.7128, -74.0060]; // NYC fallback
    }
  });
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapContainerId] = useState(() => `embedded-map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [isDestroying, setIsDestroying] = useState(false);
  const loadingTimeoutRef = useRef<number | null>(null);

  const debounceTimeoutRef = useRef<number | null>(null);

  // Load Leaflet dynamically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => setLeaflet(L));
    }
  }, []);

  // Backup timeout to ensure map doesn't stay in loading state
  useEffect(() => {
    if (leaflet && !isMapReady) {
      console.log('EmbeddedMap: Setting backup timeout for map ready state...');
      loadingTimeoutRef.current = window.setTimeout(() => {
        console.log('EmbeddedMap: Backup timeout triggered, forcing map ready state');
        setIsMapReady(true);
      }, 3000);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [leaflet, isMapReady]);

  // Reset destroying state when component mounts/remounts
  useEffect(() => {
    setIsDestroying(false);
    setIsMapReady(false);
  }, []);

  // Enhanced cleanup effect - ensure map instance is properly cleaned up
  useEffect(() => {
    return () => {
      setIsDestroying(true);
      
      // Clear timeout on unmount
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      
      // Clear loading timeout on unmount
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      
      // Clean up map instance with more thorough checks
      if (mapInstance) {
        try {
          // Check if container still exists and is attached to DOM
          const container = mapInstance.getContainer && mapInstance.getContainer();
          if (container) {
            // Remove all event listeners first
            if (mapInstance.off) {
              mapInstance.off();
            }
            
            // Force remove all layers
            if (mapInstance.eachLayer) {
              mapInstance.eachLayer((layer: any) => {
                try {
                  if (layer.remove) {
                    layer.remove();
                  }
                } catch (layerError) {
                  console.warn('Error removing layer:', layerError);
                }
              });
            }
            
            // Remove the map instance
            mapInstance.remove();
            
            // Clear the container's innerHTML as final cleanup
            if (container.parentNode) {
              container.innerHTML = '';
            }
          }
        } catch (error) {
          console.warn('Error cleaning up embedded map instance:', error);
        } finally {
          // Always reset state
          setMapInstance(null);
          setIsMapReady(false);
          setNearbyLocations([]);
          
          // Force garbage collection hint
          if (typeof window !== 'undefined' && (window as any).gc) {
            try {
              (window as any).gc();
            } catch (e) {
              // gc is not available in production
            }
          }
        }
      }
    };
  }, [mapInstance]);

  // Fetch nearby weather data
  const fetchNearbyData = useCallback(async (lat: number, lng: number) => {
    // Validate coordinates before fetching
    if (typeof lat !== 'number' || typeof lng !== 'number' || 
        isNaN(lat) || isNaN(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn('Invalid coordinates provided to fetchNearbyData:', { lat, lng });
      return;
    }

    try {
      const currentZoom = mapInstance && mapInstance.getZoom ? mapInstance.getZoom() : defaultMapConfig.defaultZoom;
      const nearbyData = await fetchNearbyWeatherData(lat, lng, currentZoom);
      setNearbyLocations(nearbyData.slice(0, 10)); // Limit to 10 locations for performance
    } catch (error) {
      console.warn('Error fetching nearby weather data:', error);
    }
  }, [mapInstance]);

  // Safe fly to function
  const safeFlyTo = useCallback((lat: number, lng: number, zoom: number) => {
    // Validate coordinates before attempting to fly
    if (typeof lat !== 'number' || typeof lng !== 'number' || 
        isNaN(lat) || isNaN(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn('Invalid coordinates provided to safeFlyTo:', { lat, lng });
      return;
    }

    if (mapInstance && mapInstance.getContainer && mapInstance.getContainer()) {
      try {
        mapInstance.flyTo([lat, lng], zoom, {
          duration: 1.5,
          easeLinearity: 0.25,
        });
      } catch (error) {
        console.warn('Error flying to location:', error);
      }
    }
  }, [mapInstance]);

  // Update map center when location changes
  useEffect(() => {
    if (hasValidCoordinates && safeCoordinates) {
      const { latitude, longitude } = safeCoordinates;
      
      // Double-check coordinates are valid
      if (typeof latitude === 'number' && typeof longitude === 'number' && 
          !isNaN(latitude) && !isNaN(longitude) &&
          latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
        
        const newCenter: LatLngExpression = [latitude, longitude];
        setMapCenter(newCenter);
        
        if (mapInstance && mapInstance.getContainer && mapInstance.getContainer()) {
          safeFlyTo(latitude, longitude, defaultMapConfig.defaultZoom);
          fetchNearbyData(latitude, longitude);
        }
      } else {
        console.warn('Invalid coordinates detected in EmbeddedMap center update:', { latitude, longitude });
      }
    }
  }, [location.coordinates, mapInstance, safeFlyTo, fetchNearbyData, hasValidCoordinates]);

  // Handle map events
  useEffect(() => {
    if (mapInstance && mapInstance.getContainer && mapInstance.getContainer() && hasValidCoordinates) {
      const handleMoveEnd = () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = window.setTimeout(() => {
          if (mapInstance && mapInstance.getContainer && mapInstance.getContainer()) {
            try {
              const center = mapInstance.getCenter();
              if (center && typeof center.lat === 'number' && typeof center.lng === 'number' &&
                  !isNaN(center.lat) && !isNaN(center.lng)) {
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
  }, [mapInstance, hasValidCoordinates, fetchNearbyData]);

  // Center map on user location
  const handleCenterToUserLocation = async () => {
    try {
      const geoResponse = await getUserGeolocation();
      if (geoResponse.success && geoResponse.data) {
        const { latitude, longitude } = geoResponse.data;
        // Validate coordinates before using them
        if (typeof latitude === 'number' && typeof longitude === 'number' && 
            !isNaN(latitude) && !isNaN(longitude) &&
            latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
          setMapCenter([latitude, longitude]);
          if (mapInstance && mapInstance.getContainer && mapInstance.getContainer()) {
            safeFlyTo(latitude, longitude, defaultMapConfig.defaultZoom);
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
          console.error('Invalid coordinates received from geolocation:', { latitude, longitude });
        }
      } else {
        console.error('Geolocation error:', geoResponse.error);
      }
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  if (!hasValidCoordinates) {
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
    <div className={`h-full relative ${className}`}>
      {/* Loading overlay - only show if leaflet is not loaded OR map is not ready */}
      {(!leaflet || !isMapReady) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg z-[500]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/60"></div>
            <div className="text-white/70 text-sm">
              {!leaflet ? 'Loading Leaflet...' : 'Loading map...'}
            </div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="h-full w-full relative overflow-hidden rounded-lg" data-map-container-id={mapContainerId}>
        {!isDestroying && leaflet && (
          <MapContainer
            key={mapContainerId}
            center={mapCenter}
            zoom={defaultMapConfig.defaultZoom}
            minZoom={defaultMapConfig.minZoom}
            maxZoom={defaultMapConfig.maxZoom}
            style={{ height: '100%', width: '100%' }}
            zoomControl={defaultMapConfig.controls.zoomControl}
            attributionControl={defaultMapConfig.controls.attributionControl}
          >
            <SetMapInstance setMapInstance={setMapInstance} setIsMapReady={setIsMapReady} />
            <TileLayer
              url={defaultMapConfig.tileLayer.url}
              attribution={defaultMapConfig.tileLayer.attribution}
              maxZoom={defaultMapConfig.tileLayer.maxZoom}
            />
            
            {/* Main location marker */}
            {leaflet && (
              <Marker
                position={[
                  safeCoordinates.latitude,
                  safeCoordinates.longitude,
                ]}
                icon={leaflet.icon({
                  iconUrl: weatherData?.currentWeather?.icon || '/icons/weathers/not-available.svg',
                  iconSize: [32, 32],
                  iconAnchor: [16, 32],
                  popupAnchor: [0, -32],
                  className: 'main-weather-marker',
                })}
              >
                {weatherData && (
                  <Popup>
                    <div className="weather-popup text-center">
                      <div className="flex items-center gap-2 mb-2">
                        <Image 
                          src={weatherData.currentWeather.icon}
                          alt={weatherData.currentWeather.condition}
                          width={24}
                          height={24}
                          className="w-6 h-6"
                        />
                        <div>
                          <div className="font-semibold text-sm">
                            {location.city}, {location.country}
                          </div>
                          <div className="text-xs opacity-80">
                            {convertTemp(weatherData.currentWeather.temperature, tempUnit)}°{tempUnit}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Popup>
                )}
              </Marker>
            )}

            {/* Nearby location markers */}
            {leaflet && nearbyLocations.map((loc) => {
              const iconSize = 20;
              return (
                <Marker
                  key={`${loc.latitude}-${loc.longitude}`}
                  position={[loc.latitude, loc.longitude]}
                  icon={new leaflet.Icon({
                    iconUrl: loc.weatherData?.currentWeather.icon || '/icons/weathers/not-available.svg',
                    iconSize: [iconSize, iconSize],
                    iconAnchor: [iconSize/2, iconSize/2],
                    popupAnchor: [0, -iconSize/2],
                    className: 'weather-marker',
                  })}
                >
                  <Popup>
                    <div className="weather-popup text-center">
                      <div className="flex items-center gap-2">
                        <Image 
                          src={loc.weatherData?.currentWeather.icon || '/icons/weathers/not-available.svg'}
                          alt={loc.weatherData?.currentWeather.condition || 'Weather'}
                          width={20}
                          height={20}
                          className="w-5 h-5"
                        />
                        <div className="text-left">
                          <div className="font-semibold text-xs">{loc.city}</div>
                          <div className="text-xs opacity-80">
                            {loc.weatherData ? convertTemp(loc.weatherData.currentWeather.temperature, tempUnit) : '--'}°{tempUnit}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Map overlay controls */}
      <div className="absolute top-2 left-2 z-[1000] flex flex-col gap-2">
        <button
          onClick={handleCenterToUserLocation}
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
            if (isMapReady && mapInstance) {
              onExpandToFullscreen();
            }
          }}
          disabled={!isMapReady}
          className={`p-2 rounded-lg transition-all duration-200 backdrop-blur-md text-white border ${
            isMapReady 
              ? 'bg-black/40 hover:bg-black/60 border-white/10 hover:border-white/20 cursor-pointer'
              : 'bg-black/20 border-white/5 cursor-not-allowed opacity-50'
          }`}
          title={isMapReady ? "Expand to fullscreen" : "Map loading..."}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      {/* Current weather info overlay */}
      {weatherData && (
        <div className="absolute bottom-2 left-2 z-[1000] p-2 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
          <div className="flex items-center gap-2 text-white text-xs">
            <Image 
              src={weatherData.currentWeather.icon}
              alt={weatherData.currentWeather.condition}
              width={16}
              height={16}
              className="w-4 h-4"
            />
            <span>{convertTemp(weatherData.currentWeather.temperature, tempUnit)}°{tempUnit}</span>
            <span className="opacity-60">•</span>
            <span className="opacity-80">{weatherData.currentWeather.condition}</span>
          </div>
        </div>
      )}
    </div>
  );
}
