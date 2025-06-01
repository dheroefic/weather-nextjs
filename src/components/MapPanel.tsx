import React, { useState, useEffect, useRef, useCallback, Suspense, memo, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { TemperatureUnit, WeatherData } from '@/types/weather';
import {
  getUserGeolocation,
  reverseGeocode,
  searchLocations,
  formatSearchResults,
} from '@/services/geolocationService';
import { fetchNearbyWeatherData, WMO_CODES } from '@/services/weatherService';
import type { SearchResult } from '@/services/geolocationService';
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

// Helper component to capture the map instance via useMap.
import { useMap } from 'react-leaflet';
const SetMapInstance = ({ setMapInstance }: { setMapInstance: (map: Map) => void }) => {
  const map = useMap();
  useEffect(() => {
    setMapInstance(map);
  }, [map, setMapInstance]);
  return null;
};

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
  mapConfig?: Partial<MapConfig>;
  onLocationSelect: (coordinates: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  }) => void;
}

interface WeatherMetric {
  angle: number;
  distance: number;
  icon: string;
  title: string;
  value: string;
}

// MapLegend component to display the weather icon legend.
const MapLegend = () => {
  const [isMinimized, setIsMinimized] = useState(true);

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
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
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
  // Dynamically import Leaflet on the client.
  const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null);
  useEffect(() => {
    import('leaflet').then((L) => setLeaflet(L));
  }, []);

  // Determine if coordinates are available.
  const hasCoordinates = Boolean(location.coordinates);
  const initialCoordinates = location.coordinates || { latitude: 0, longitude: 0 };

  // State hooks.
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRenderMap, setShouldRenderMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([
    initialCoordinates.latitude,
    initialCoordinates.longitude,
  ]);
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  const [nearbyLocations, setNearbyLocations] = useState<NearbyLocation[]>([]);

  // Timeout refs.
  const searchTimeoutRef = useRef<number | null>(null);
  const debounceTimeoutRef = useRef<number | null>(null);
  
  // Optional ref for the map container.
  const mapRef = useRef<HTMLDivElement | null>(null);

  // Helper: safely call flyTo if the container is valid.
  const safeFlyTo = useCallback((lat: number, lng: number, zoom: number) => {
    if (mapInstance) {
      const container = mapInstance.getContainer();
      if (container && document.body.contains(container)) {
        mapInstance.flyTo([lat, lng], zoom, {
          duration: 1.5,
          easeLinearity: 0.25,
        });
      } else {
        console.warn('Map container is destroyed or not available. Skipping flyTo.');
      }
    }
  }, [mapInstance]);

  // Callback for handling location search.
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

  // Debounce search query.
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

  // Effect to handle panel open/close and map rendering.
  useEffect(() => {
    let timer: number;
    const currentMapRef = mapRef.current;
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    if (isOpen && location.coordinates) {
      setIsVisible(true);
      setMapCenter([
        location.coordinates.latitude,
        location.coordinates.longitude,
      ]);
      timer = window.setTimeout(() => {
        setShouldRenderMap(true);
      }, 300);
    } else {
      setIsVisible(false);
      timer = window.setTimeout(() => {
        setShouldRenderMap(false);
        if (currentMapRef && mapInstance) {
          mapInstance.remove();
          setMapInstance(null);
        }
      }, 500);
    }
    return () => {
      clearTimeout(timer);
      if (currentMapRef && mapInstance) {
        mapInstance.remove();
        setMapInstance(null);
      }
    };
  }, [isOpen, location.coordinates, mapInstance]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 500);
  };

  // Define weather metrics.
  const weatherMetrics = weatherData?.currentWeather
    ? [
        {
          angle: 0,
          distance: 2000,
          icon: weatherData.currentWeather.icon,
          title: 'Temperature',
          value: `${convertTemp(
            weatherData.currentWeather.temperature,
            tempUnit
          )}°${tempUnit}`,
        },
        {
          angle: 120,
          distance: 2000,
          icon: '/icons/weathers/humidity.svg',
          title: 'Humidity',
          value: `${weatherData.currentWeather.humidity}%`,
        },
        {
          angle: 240,
          distance: 2000,
          icon: '/icons/weathers/barometer.svg',
          title: 'Pressure',
          value: `${weatherData.currentWeather.pressure} hPa`,
        },
      ]
    : ([] as WeatherMetric[]);

  // Callback to fetch nearby weather data.
  const fetchNearbyData = useCallback(
    async (centerLat: number, centerLng: number) => {
      const locations = await fetchNearbyWeatherData(centerLat, centerLng);
      setNearbyLocations(
        locations.filter((loc): loc is NonNullable<typeof loc> => loc !== null)
      );
    },
    []
  );

  // Effect to animate the map and fetch nearby locations on movement.
  useEffect(() => {
    if (mapInstance && location.coordinates) {
      // Use safeFlyTo to ensure the container is valid.
      safeFlyTo(
        location.coordinates.latitude,
        location.coordinates.longitude,
        defaultMapConfig.defaultZoom
      );

      const handleMoveEnd = () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = window.setTimeout(() => {
          const center = mapInstance.getCenter();
          fetchNearbyData(center.lat, center.lng);
        }, 1000);
      };

      mapInstance.on('moveend', handleMoveEnd);
      mapInstance.on('zoomend', handleMoveEnd);

      fetchNearbyData(
        location.coordinates.latitude,
        location.coordinates.longitude
      );

      return () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        mapInstance.off('moveend', handleMoveEnd);
        mapInstance.off('zoomend', handleMoveEnd);
      };
    }
  }, [mapInstance, location.coordinates, fetchNearbyData, safeFlyTo]);

  // Handle location selection from search results.
  const handleLocationSelect = (result: {
    latitude: number;
    longitude: number;
    name?: string;
    country?: string;
  }) => {
    setMapCenter([result.latitude, result.longitude]);
    if (mapInstance) {
      safeFlyTo(result.latitude, result.longitude, defaultMapConfig.defaultZoom);
    }
    onLocationSelect({
      latitude: result.latitude,
      longitude: result.longitude,
      city: result.name || 'Unknown City',
      country: result.country || 'Unknown Country',
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  // Center map on user location.
  const handleCenterToUserLocation = async () => {
    try {
      const geoResponse = await getUserGeolocation();
      if (geoResponse.success && geoResponse.data) {
        const { latitude, longitude } = geoResponse.data;
        setMapCenter([latitude, longitude]);
        if (mapInstance) {
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
        console.error('Geolocation error:', geoResponse.error);
      }
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  return (
    <>
      {hasCoordinates && (
        <>
          {/* Overlay */}
          <div
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-500 ${
              isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ pointerEvents: isVisible ? 'auto' : 'none', zIndex: 99 }}
            onClick={handleClose}
          />

          {/* Map Panel */}
          <div
            className={`fixed top-0 right-0 h-full w-full md:w-[600px] bg-black/85 backdrop-blur-xl transform transition-all duration-500 ease-in-out ${
              isVisible ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{
              pointerEvents: isVisible ? 'auto' : 'none',
              zIndex: 100,
              backfaceVisibility: 'hidden',
              willChange: 'transform, opacity',
            }}
          >
            <div className="relative h-full w-full flex flex-col">
              {/* Header Area with Search and Close */}
              <div className="flex-none p-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleClose}
                    className="flex-none p-2 rounded-lg glass-container backdrop-blur-md bg-black/40 border border-white/10 hover:bg-white/10 transition-all duration-300 shadow-lg text-white"
                    title="Close panel"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search location..."
                      className="w-full p-3 rounded-lg glass-container backdrop-blur-md bg-black/40 border border-white/10 hover:bg-white/10 transition-all duration-300 shadow-lg text-white outline-none placeholder-white/50 focus:ring-2 focus:ring-white/20"
                      aria-label="Search locations"
                      disabled={isSearching}
                    />
                    {/* Search Results Dropdown */}
                    {searchQuery && (
                      <div className="absolute top-full left-0 right-0 mt-2 rounded-lg glass-container backdrop-blur-md bg-black/40 border border-white/10 shadow-2xl max-h-[320px] overflow-y-auto z-[1003]">
                        {isSearching ? (
                          <div className="p-4 text-center text-white/60 flex items-center justify-center">
                            <svg
                              className="animate-spin h-5 w-5 mr-2"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Searching...
                          </div>
                        ) : searchResults.length === 0 ? (
                          <div className="p-4 text-center text-white/60">No results found</div>
                        ) : (
                          <div className="divide-y divide-white/10">
                            {searchResults.map((result, index) => (
                              <button
                                key={index}
                                className="w-full p-3 text-left hover:bg-white/10 transition-colors duration-200 focus:outline-none focus:bg-white/20 text-white/90"
                                onClick={() => handleLocationSelect(result)}
                              >
                                <div className="font-medium truncate">{result.name}</div>
                                <div className="text-sm text-white/60 truncate">{result.country}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Weather Card */}
              <div className="flex-none px-4 pb-4">
                <div className="glass-container p-3 md:p-4 rounded-lg md:rounded-xl backdrop-blur-md bg-black/40 shadow-lg border border-white/10">
                  <div className="flex flex-col gap-2 md:gap-4">
                    <div className="flex items-center justify-between gap-2 md:gap-4">
                      <div className="flex items-center gap-2 md:gap-3">
                        {weatherData && (
                          <Image
                            src={weatherData.currentWeather.icon}
                            alt={weatherData.currentWeather.condition}
                            width={48}
                            height={48}
                            className="w-8 h-8 md:w-12 md:h-12 opacity-80"
                          />
                        )}
                        <div>
                          <div className="text-sm md:text-lg font-semibold truncate max-w-[150px] md:max-w-none">
                            {location.city}, {location.country}
                          </div>
                          <div className="text-xs md:text-base opacity-80 truncate max-w-[150px] md:max-w-none">
                            {weatherData?.currentWeather.condition}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl md:text-3xl font-bold">
                          {weatherData
                            ? `${convertTemp(
                                weatherData.currentWeather.temperature,
                                tempUnit
                              )}°${tempUnit}`
                            : ''}
                        </div>
                        <div className="text-xs md:text-sm opacity-80 flex items-center justify-end gap-1 md:gap-2">
                          <Image
                            src="/icons/weathers/humidity.svg"
                            alt="Humidity"
                            width={16}
                            height={16}
                            className="w-3 h-3 md:w-4 md:h-4"
                          />
                          <span>{weatherData?.currentWeather.humidity}%</span>
                          <span className="mx-1">•</span>
                          <Image
                            src="/icons/weathers/barometer.svg"
                            alt="Pressure"
                            width={16}
                            height={16}
                            className="w-3 h-3 md:w-4 md:h-4"
                          />
                          <span>{weatherData?.currentWeather.pressure} hPa</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCenterToUserLocation}
                        className="flex-1 py-2 md:py-2.5 px-3 md:px-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 backdrop-blur-md text-white/90 hover:text-white border border-white/10 hover:border-white/20 flex items-center justify-center gap-2 group"
                        title="Use your current location"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 md:h-5 md:w-5 opacity-70 group-hover:opacity-100 transition-opacity"
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
                        <span className="text-xs md:text-sm font-medium">Current Location</span>
                      </button>
                      <button
                        onClick={() => {
                          if (mapInstance) {
                            const center = mapInstance.getCenter();
                            onLocationSelect({
                              latitude: center.lat,
                              longitude: center.lng,
                            });
                            handleClose();
                          }
                        }}
                        className="flex-1 py-2 md:py-2.5 px-3 md:px-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 backdrop-blur-md text-white/90 hover:text-white border border-white/10 hover:border-white/20 flex items-center justify-center gap-2 group"
                        title="Use the current map center as location"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 md:h-5 md:w-5 opacity-70 group-hover:opacity-100 transition-opacity"
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
                        <span className="text-xs md:text-sm font-medium">Set Location</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Container */}
              <div className="relative h-full w-full">
                {shouldRenderMap && (
                  <div className="h-full w-full leaflet-container-custom">
                    <Suspense fallback={<LoadingFallback />}>
                      <MapContainer
                        center={mapCenter}
                        zoom={defaultMapConfig.defaultZoom}
                        minZoom={defaultMapConfig.minZoom}
                        maxZoom={defaultMapConfig.maxZoom}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={defaultMapConfig.controls.zoomControl}
                        attributionControl={defaultMapConfig.controls.attributionControl}
                      >
                        <SetMapInstance setMapInstance={setMapInstance} />
                        <TileLayer
                          url={defaultMapConfig.tileLayer.url}
                          attribution={defaultMapConfig.tileLayer.attribution}
                          maxZoom={defaultMapConfig.tileLayer.maxZoom}
                        />
                        {leaflet && (
                          <Marker
                            position={[
                              location.coordinates!.latitude,
                              location.coordinates!.longitude,
                            ]}
                            icon={leaflet.icon({
                              iconUrl:
                                weatherMetrics[0]?.icon ||
                                '/icons/weathers/not-available.svg',
                              iconSize: [32, 32],
                              iconAnchor: [16, 32],
                              popupAnchor: [0, -32],
                            })}
                          />
                        )}
                        {leaflet &&
                          nearbyLocations.map((loc: NearbyLocation) => (
                            <Marker
                              key={`${loc.latitude}-${loc.longitude}`}
                              position={[loc.latitude, loc.longitude]}
                              icon={new leaflet.Icon({
                                iconUrl:
                                  loc.weatherData?.currentWeather.icon ||
                                  '/icons/weathers/not-available.svg',
                                iconSize: [32, 32],
                                iconAnchor: [16, 16],
                                popupAnchor: [0, -16],
                                className: 'weather-marker',
                              })}
                            />
                          ))}
                      </MapContainer>
                    </Suspense>
                  </div>
                )}

                {/* Render the Map Legend */}
                {shouldRenderMap && <MapLegend />}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

const LoadingFallback = () => (
  <div className="h-full w-full flex items-center justify-center bg-black/40 backdrop-blur-md">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      <div className="text-white/70 text-sm">Loading map...</div>
    </div>
  </div>
);
