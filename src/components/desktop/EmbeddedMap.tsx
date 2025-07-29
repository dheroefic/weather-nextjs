'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { WeatherData, Location } from '@/types/weather';
import type { NearbyLocation } from '@/types/nearbyWeather';
import { useNearbyWeather } from '@/hooks/useNearbyWeather';
import { useMapLocationUpdate } from '@/hooks/useMapLocationUpdate';
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
  currentWeather?: WeatherData['currentWeather'];
  className?: string;
}

export default function EmbeddedMap({
  weatherData,
  location,
  onExpandToFullscreen,
  onLocationSelect,
  currentWeather,
  className = ''
}: EmbeddedMapProps) {
  // Use our new map utility hooks
  const safeCoordinates = useSafeCoordinates(location);
  
  // Create validated center coordinates
  const validatedCenter: [number, number] = React.useMemo(() => {
    // Always ensure we have safeCoordinates and they are valid
    if (!safeCoordinates) {
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
    
    // Fallback to Jakarta coordinates if safeCoordinates are invalid
    return [-6.2088, 106.8456];
  }, [safeCoordinates]);
  
  const { selectLocationFromCoordinates } = useLocationSelection();
  const mapManager = useMapManager(DEFAULT_EMBEDDED_MAP_CONFIG);
  
  // Use nearby weather hook
  const { nearbyWeatherData, isLoading: nearbyLoading } = useNearbyWeather({
    location,
    weatherData: weatherData ?? undefined,
    zoomLevel: 13, // Default zoom for embedded map
    enabled: true
  });

  // Handle map location updates when user interacts with map
  const handleLocationUpdate = useCallback(async (lat: number, lng: number) => {
    try {
      // Immediately update center marker with coordinates as temporary name
      const tempLocationName = `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
      setCenterMarkerLocation({
        city: tempLocationName,
        country: 'Coordinates'
      });

      // Create new location object for the updated coordinates
      const newLocation: Location = {
        city: tempLocationName, // Use temporary coordinate-based name
        country: 'Coordinates',
        coordinates: {
          latitude: lat,
          longitude: lng
        }
      };
      
      // Call the location select handler to update the app state
      onLocationSelect(newLocation);

      // Perform reverse geocoding to get the actual location name (in background)
      try {
        const { getLocationWithFallback } = await import('@/utils/mapLocationUtils');
        const result = await getLocationWithFallback(lat, lng);
        
        // Update both center marker and main location with proper names
        setCenterMarkerLocation({
          city: result.city,
          country: result.country
        });

        onLocationSelect({
          city: result.city,
          country: result.country,
          coordinates: { latitude: lat, longitude: lng },
        });
      } catch (geocodeError) {
        console.warn('Reverse geocoding failed during map interaction:', geocodeError);
        // Keep the coordinate-based naming if geocoding fails
      }
    } catch (error) {
      console.error('Error updating location from map interaction:', error);
    }
  }, [onLocationSelect]);

  // Set up map location update hook
  const { updateLastLocation } = useMapLocationUpdate({
    map: mapManager.mapInstance,
    onLocationChange: handleLocationUpdate,
    debounceMs: 800, // Wait 800ms after user stops moving the map
    minDistanceKm: 3, // Only update if moved more than 3km
    enabled: true // Always enabled for embedded map
  });
  
  // Local state
  const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null);
  const [isLocalMapReady, setIsLocalMapReady] = useState(false);
  const [mapContainerId] = useState(() => `embedded-map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const previousCoordinatesRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const [isFlying, setIsFlying] = useState(false);

  // State to track the current center marker location (for real-time updates)
  const [centerMarkerLocation, setCenterMarkerLocation] = useState({
    city: location.city,
    country: location.country
  });

  // Update center marker location when the main location prop changes
  useEffect(() => {
    setCenterMarkerLocation({
      city: location.city,
      country: location.country
    });
  }, [location.city, location.country]);

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

  // Create custom map marker icon
  const createCustomIcon = useCallback(() => {
    if (!leaflet) return undefined;
    
    try {
      // Use weather icon if available, otherwise use dedicated map marker
      const iconUrl = weatherData?.currentWeather?.icon || '/icons/weathers/map-marker.svg';
      
      return leaflet.icon({
        iconUrl: iconUrl,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
        className: 'desktop-weather-marker',
      });
    } catch (error) {
      console.warn('Error creating custom icon for desktop embedded map:', error);
      // Return fallback icon on error
      try {
        return leaflet.icon({
          iconUrl: '/icons/weathers/not-available.svg',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
          className: 'desktop-weather-marker fallback',
        });
      } catch (fallbackError) {
        console.error('Error creating fallback icon for desktop embedded map:', fallbackError);
        return undefined;
      }
    }
  }, [leaflet, weatherData]);

  // Create nearby weather marker icon
  const createNearbyWeatherIcon = useCallback((nearbyLocation: NearbyLocation) => {
    if (!leaflet || !nearbyLocation.weatherData) return undefined;
    
    try {
      const iconUrl = nearbyLocation.weatherData.currentWeather.icon || '/icons/weathers/not-available.svg';
      
      return leaflet.icon({
        iconUrl: iconUrl,
        iconSize: [24, 24], // Smaller than main marker
        iconAnchor: [12, 24],
        popupAnchor: [0, -24],
        className: 'nearby-weather-marker',
      });
    } catch (error) {
      console.warn('Error creating nearby weather icon:', error);
      try {
        return leaflet.icon({
          iconUrl: '/icons/weathers/not-available.svg',
          iconSize: [24, 24],
          iconAnchor: [12, 24],
          popupAnchor: [0, -24],
          className: 'nearby-weather-marker fallback',
        });
      } catch (fallbackError) {
        console.error('Error creating fallback nearby weather icon:', fallbackError);
        return undefined;
      }
    }
  }, [leaflet]);

  // Stable callback functions to prevent infinite re-renders
  const setMapInstanceStable = useCallback((map: Map) => {
    mapManager.setMapInstance(map);
  }, [mapManager]);

  const setIsMapReadyStable = useCallback((ready: boolean) => {
    setIsLocalMapReady(ready);
    mapManager.setIsMapReady(ready);
  }, [mapManager]);

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

  // Update map center when location changes with smooth animation
  useEffect(() => {
    // Add additional safety checks
    if (!mapManager.mapInstance || !isLocalMapReady || !mapManager.isMapReady) {
      console.log('EmbeddedMap: Skipping flyTo - map not ready:', {
        hasMapInstance: !!mapManager.mapInstance,
        isLocalMapReady,
        isMapManagerReady: mapManager.isMapReady
      });
      return;
    }

    // Verify map instance is actually ready and has flyTo method
    if (!mapManager.mapInstance.flyTo || typeof mapManager.mapInstance.flyTo !== 'function') {
      console.warn('EmbeddedMap: Map instance missing flyTo method');
      return;
    }

    // Create validated coordinates directly in the effect to avoid timing issues
    let validCoords: [number, number];
    
    if (!safeCoordinates) {
      console.warn('EmbeddedMap effect: safeCoordinates is null/undefined, using fallback');
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
        console.warn('EmbeddedMap effect: safeCoordinates contain invalid values:', safeCoordinates);
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

      
      // Triple-check that coordinates are actually valid before flying
      if (typeof lat !== 'number' || typeof lng !== 'number' || 
          isNaN(lat) || isNaN(lng) ||
          lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.error('EmbeddedMap: CRITICAL - Attempted to fly to invalid coordinates:', validCoords);
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
          console.error('EmbeddedMap: ABORT - Coordinates became invalid right before flyTo:', {
            originalValidCoords: validCoords,
            finalLat,
            finalLng
          });
          return;
        }
        
        // Create a fresh coordinate array to prevent any reference issues
        const safeCoordinateArray: [number, number] = [finalLat, finalLng];
        
        mapManager.mapInstance.flyTo(
          safeCoordinateArray, 
          DEFAULT_EMBEDDED_MAP_CONFIG.defaultZoom, // Use default zoom when flying to new location
          {
            duration: 1.5, // 1.5 seconds animation
            easeLinearity: 0.25, // Smooth easing
          }
        );
      } catch (error) {
        console.error('EmbeddedMap: Error during flyTo operation:', error);
        console.error('EmbeddedMap: Attempted coordinates:', validCoords);
        
        // Fallback: try to set view directly without animation
        try {
          const fallbackLat = Number(validCoords[0]);
          const fallbackLng = Number(validCoords[1]);
          
          if (!isNaN(fallbackLat) && !isNaN(fallbackLng)) {
            mapManager.mapInstance.setView([fallbackLat, fallbackLng], DEFAULT_EMBEDDED_MAP_CONFIG.defaultZoom);
          } else {
            console.error('EmbeddedMap: Fallback coordinates also invalid, using Jakarta');
            mapManager.mapInstance.setView([-6.2088, 106.8456], DEFAULT_EMBEDDED_MAP_CONFIG.defaultZoom);
          }
        } catch (fallbackError) {
          console.error('EmbeddedMap: Fallback setView also failed:', fallbackError);
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
  }, [mapManager.mapInstance, isLocalMapReady, mapManager.isMapReady, safeCoordinates, updateLastLocation]);

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
      safeCoordinates: !!safeCoordinates,
      nearbyWeatherCount: nearbyWeatherData.length,
      nearbyLoading
    });
  }, [leaflet, mapManager.mapInstance, mapManager.isMapReady, isLocalMapReady, safeCoordinates, nearbyWeatherData.length, nearbyLoading]);

  if (!leaflet || !safeCoordinates || 
      typeof safeCoordinates.latitude !== 'number' || 
      typeof safeCoordinates.longitude !== 'number' ||
      isNaN(safeCoordinates.latitude) || 
      isNaN(safeCoordinates.longitude)) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center text-white/60">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <p className="text-sm">
            {!leaflet ? 'Loading map...' : 'Invalid location coordinates'}
          </p>
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

      {/* Nearby weather loading indicator */}
      {nearbyLoading && (
        <div className="absolute top-2 right-2 z-[1000] bg-black/60 backdrop-blur-md text-white px-3 py-2 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white/60"></div>
            Loading weather data...
          </div>
        </div>
      )}

      {/* Flying indicator */}
      {isFlying && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-[1000] bg-black/60 backdrop-blur-md text-white px-3 py-2 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <div className="animate-pulse">🧭</div>
            Flying to location...
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="h-full w-full relative overflow-hidden rounded-lg" data-map-container-id={mapContainerId}>
        <style jsx global>{`
          .desktop-weather-marker {
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            border-radius: 50%;
          }
          .nearby-weather-marker {
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
            border-radius: 50%;
            opacity: 0.9;
          }
          .nearby-weather-marker:hover {
            opacity: 1;
            transform: scale(1.1);
            transition: all 0.2s ease;
          }
        `}</style>
        {leaflet && (
          <MapContainer
            key={mapContainerId} // Use stable container ID, not changing timestamp
            center={validatedCenter}
            zoom={DEFAULT_EMBEDDED_MAP_CONFIG.defaultZoom}
            minZoom={DEFAULT_EMBEDDED_MAP_CONFIG.minZoom}
            maxZoom={DEFAULT_EMBEDDED_MAP_CONFIG.maxZoom}
            style={{ height: '100%', width: '100%' }}
            zoomControl={DEFAULT_EMBEDDED_MAP_CONFIG.controls.zoomControl}
            attributionControl={DEFAULT_EMBEDDED_MAP_CONFIG.controls.attributionControl}
            className="leaflet-container-custom"
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
            <Marker 
              position={validatedCenter}
              icon={createCustomIcon()}
            >
              <Popup>
                <div className="text-center">
                  <strong>{centerMarkerLocation.city}</strong>
                  {centerMarkerLocation.country && <div className="text-sm text-gray-600">{centerMarkerLocation.country}</div>}
                  {currentWeather && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-center gap-2">
                        {currentWeather.icon && (
                          <Image
                            src={currentWeather.icon}
                            alt={currentWeather.condition || 'Weather'}
                            width={24}
                            height={24}
                            className="w-6 h-6"
                          />
                        )}
                        <span className="font-semibold">{Math.round(currentWeather.temperature || 0)}°C</span>
                      </div>
                      <div className="text-sm text-gray-600">{currentWeather.condition}</div>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>

            {/* Nearby weather markers */}
            {nearbyWeatherData.slice(1)
              .filter((nearbyLocation) => 
                typeof nearbyLocation.latitude === 'number' && 
                typeof nearbyLocation.longitude === 'number' &&
                !isNaN(nearbyLocation.latitude) && 
                !isNaN(nearbyLocation.longitude) &&
                nearbyLocation.latitude >= -90 && nearbyLocation.latitude <= 90 &&
                nearbyLocation.longitude >= -180 && nearbyLocation.longitude <= 180
              )
              .map((nearbyLocation, index) => (
              nearbyLocation.weatherData && (
                <Marker
                  key={`nearby-${index}-${nearbyLocation.latitude}-${nearbyLocation.longitude}`}
                  position={[nearbyLocation.latitude, nearbyLocation.longitude]}
                  icon={createNearbyWeatherIcon(nearbyLocation)}
                >
                  <Popup>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {nearbyLocation.weatherData.currentWeather.icon && (
                          <Image
                            src={nearbyLocation.weatherData.currentWeather.icon}
                            alt={nearbyLocation.weatherData.currentWeather.condition}
                            width={24}
                            height={24}
                            className="w-6 h-6"
                          />
                        )}
                        <span className="font-semibold">
                          {Math.round(nearbyLocation.weatherData.currentWeather.temperature)}°C
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        {nearbyLocation.weatherData.currentWeather.condition}
                      </div>
                      {nearbyLocation.city && (
                        <div className="text-xs text-gray-500">{nearbyLocation.city}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        Humidity: {nearbyLocation.weatherData.currentWeather.humidity}%
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        )}
      </div>

      {/* Map overlay controls */}
      <div className="absolute top-2 left-2 z-[1000] flex flex-col gap-2">
        <button
          onClick={async () => {
            try {
              const { getUserGeolocation } = await import('@/services/geolocationService');
              const { getLocationWithFallback } = await import('@/utils/mapLocationUtils');
              
              const geoResponse = await getUserGeolocation();
              if (geoResponse.success && geoResponse.data) {
                const { latitude, longitude } = geoResponse.data;
                if (mapManager.mapInstance && mapManager.isMapReady) {
                  mapManager.mapInstance.flyTo([latitude, longitude], DEFAULT_EMBEDDED_MAP_CONFIG.defaultZoom, {
                    duration: 1.5,
                    easeLinearity: 0.25,
                  });
                }

                const result = await getLocationWithFallback(latitude, longitude);
                onLocationSelect({
                  city: result.city,
                  country: result.country,
                  coordinates: { latitude, longitude }
                });
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
            console.log('Fullscreen button clicked!', { isLocalMapReady, hasMapInstance: !!mapManager.mapInstance });
            if (isLocalMapReady && mapManager.mapInstance) {
              // Cleanup current map before transitioning
              console.log('Cleaning up embedded map before expanding to fullscreen');
              mapManager.cleanupMap();
              console.log('Calling onExpandToFullscreen...');
              onExpandToFullscreen();
              console.log('onExpandToFullscreen called successfully');
            } else {
              console.log('Cannot expand - map not ready or no map instance');
            }
          }}
          disabled={!isLocalMapReady}
          className={`p-2 rounded-lg transition-all duration-200 backdrop-blur-md text-white border ${
            isLocalMapReady 
              ? 'bg-black/40 hover:bg-black/60 border-white/10 hover:border-white/20 cursor-pointer'
              : 'bg-black/20 border-white/5 cursor-not-allowed opacity-50'
          }`}
          title={isLocalMapReady ? "Expand to fullscreen" : "Map loading..."}
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
            <Image 
              src={weatherData.currentWeather.icon}
              alt={weatherData.currentWeather.condition}
              width={16}
              height={16}
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
