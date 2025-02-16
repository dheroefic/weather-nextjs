'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { TemperatureUnit, WeatherData } from '@/types/weather';
import {
  getUserGeolocation,
  reverseGeocode,
  searchLocations,
  formatSearchResults,
} from '@/services/geolocationService';
import { fetchNearbyWeatherData } from '@/services/weatherService';
import type { SearchResult } from '@/services/geolocationService';
import 'leaflet/dist/leaflet.css';
import type { LatLngExpression, Map } from 'leaflet';
import * as L from 'leaflet';

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

// A helper component that uses the useMap hook to set the map instance.
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
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
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

export default function MapPanel({
  isOpen,
  weatherData,
  onClose,
  location,
  tempUnit,
  convertTemp,
  onLocationSelect,
}: MapPanelProps) {
  // Create a flag and fallback coordinates
  const hasCoordinates = Boolean(location.coordinates);
  const initialCoordinates = location.coordinates || { latitude: 0, longitude: 0 };

  // All hooks are called unconditionally.
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRenderMap, setShouldRenderMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([
    initialCoordinates.latitude,
    initialCoordinates.longitude,
  ]);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mapInstance, setMapInstance] = useState<Map | null>(null);

  const [nearbyLocations, setNearbyLocations] = useState<NearbyLocation[]>([]);

  // Define callbacks and effects unconditionally.
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

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (searchQuery) {
      searchTimeoutRef.current = setTimeout(() => {
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

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentMapRef = mapRef.current;
    if (isOpen && location.coordinates) {
      setIsVisible(true);
      setMapCenter([
        location.coordinates.latitude,
        location.coordinates.longitude,
      ]);
      timer = setTimeout(() => {
        setShouldRenderMap(true);
      }, 300);
    } else {
      setIsVisible(false);
      timer = setTimeout(() => {
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

  const fetchNearbyData = useCallback(
    async (centerLat: number, centerLng: number) => {
      const locations = await fetchNearbyWeatherData(centerLat, centerLng);
      setNearbyLocations(
        locations.filter((loc): loc is NonNullable<typeof loc> => loc !== null)
      );
    },
    []
  );

  useEffect(() => {
    if (mapInstance && location.coordinates) {
      // Smoothly animate when location changes
      mapInstance.flyTo(
        [location.coordinates.latitude, location.coordinates.longitude],
        defaultMapConfig.defaultZoom,
        {
          duration: 1.5,
          easeLinearity: 0.25,
        }
      );

      const handleMoveEnd = () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
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
  }, [mapInstance, location.coordinates, fetchNearbyData]);

  const handleLocationSelect = (result: {
    latitude: number;
    longitude: number;
    name?: string;
    country?: string;
  }) => {
    setMapCenter([result.latitude, result.longitude]);
    if (mapInstance) {
      mapInstance.flyTo(
        [result.latitude, result.longitude],
        defaultMapConfig.defaultZoom,
        {
          duration: 1.5,
          easeLinearity: 0.25,
        }
      );
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

  const handleCenterToUserLocation = async () => {
    try {
      const geoResponse = await getUserGeolocation();
      if (geoResponse.success && geoResponse.data) {
        const { latitude, longitude } = geoResponse.data;
        setMapCenter([latitude, longitude]);
        if (mapInstance) {
          mapInstance.flyTo(
            [latitude, longitude],
            defaultMapConfig.defaultZoom,
            {
              duration: 1.5,
              easeLinearity: 0.25,
            }
          );
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
          onLocationSelect({ latitude, longitude });
        }
      } else {
        console.error('Geolocation error:', geoResponse.error);
      }
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  // Instead of returning early, always return (all hooks were called above)
  // and conditionally render the UI based on `hasCoordinates`.
  return (
    <>
      {hasCoordinates && (
        <>
          <div
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-500 ${
              isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ pointerEvents: isVisible ? 'auto' : 'none', zIndex: 99 }}
            onClick={handleClose}
          />
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
            <div className="relative h-full w-full">
              {/* Search and Close Area */}
              <div className="absolute top-0 left-0 right-0 z-[1001] p-4 flex flex-row items-center gap-3">
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg bg-black/80 hover:bg-black/90 transition-all duration-300 backdrop-blur-xl shadow-lg text-white ring-1 ring-white/20 w-fit flex-shrink-0"
                  title="Close panel"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search location..."
                    className="w-full p-3 rounded-lg bg-black/80 hover:bg-black/90 transition-all duration-300 backdrop-blur-xl shadow-lg text-white ring-1 ring-white/20 outline-none placeholder-white/50 focus:ring-2 focus:ring-white/40"
                    aria-label="Search locations"
                    disabled={isSearching}
                  />
                  {searchQuery && (
                    <div className="absolute top-full left-0 right-0 mt-2 rounded-lg bg-black/80 backdrop-blur-xl shadow-2xl border border-white/10 max-h-[320px] overflow-y-auto">
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
                              className="w-full p-3 text-left hover:bg-white/10 transition-colors duration-200 focus:outline-none focus:bg-white/20"
                              onClick={() => handleLocationSelect(result)}
                            >
                              <div className="font-medium text-white/90 truncate">{result.name}</div>
                              <div className="text-sm text-white/60 truncate">{result.country}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Weather Card - Positioned Below Search */}
              <div className="absolute top-[80px] left-0 right-0 z-[1000] p-2 md:p-4">
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
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
                        <Marker
                          position={[
                            location.coordinates!.latitude,
                            location.coordinates!.longitude,
                          ]}
                          icon={L.icon({
                            iconUrl:
                              weatherMetrics[0]?.icon || '/icons/weathers/map-marker.svg',
                            iconSize: [32, 32],
                            iconAnchor: [16, 32],
                            popupAnchor: [0, -32],
                          })}
                        />
                        {nearbyLocations.map((loc: NearbyLocation) => (
                          <Marker
                            key={`${loc.latitude}-${loc.longitude}`}
                            position={[loc.latitude, loc.longitude]}
                            icon={new L.Icon({
                              iconUrl:
                                loc.weatherData?.currentWeather.icon ||
                                '/icons/weathers/map-marker.svg',
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
