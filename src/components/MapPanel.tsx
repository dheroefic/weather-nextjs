'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { TemperatureUnit, WeatherData } from '@/types/weather';
import { getUserLocation, searchLocations, formatSearchResults } from '@/services/geolocationService';
import type { SearchResult } from '@/services/geolocationService';
import 'leaflet/dist/leaflet.css';
import type { LatLngExpression, Map } from 'leaflet';
import L from 'leaflet';
import type { Location } from '@/types/weather';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

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
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19
  },
  controls: {
    zoomControl: false,
    attributionControl: true
  }
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
  onLocationSelect: (coordinates: { latitude: number; longitude: number; city?: string; country?: string }) => void;
}

export default function MapPanel({ 
  isOpen, 
  weatherData, 
  onClose, 
  location, 
  tempUnit, 
  convertTemp,
  mapConfig = {},
  onLocationSelect
}: MapPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRenderMap, setShouldRenderMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([0, 0]);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleLocationSelect = (result: { latitude: number; longitude: number; name?: string; country?: string }) => {
    setMapCenter([result.latitude, result.longitude]);
    if (mapInstance) {
      mapInstance.setView([result.latitude, result.longitude], 13);
    }
    onLocationSelect({
      latitude: result.latitude,
      longitude: result.longitude,
      city: result.name || 'Unknown City',
      country: result.country || 'Unknown Country'
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleCenterToUserLocation = async () => {
    try {
      // First try to get location through browser geolocation API
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        
        const { latitude, longitude } = position.coords;
        setMapCenter([latitude, longitude]);
        if (mapInstance) {
          mapInstance.setView([latitude, longitude], 13);
        }
        
        // Try to get city and country information using reverse geocoding
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await response.json();
          onLocationSelect({
            latitude,
            longitude,
            city: data.city || 'Unknown City',
            country: data.countryName || 'Unknown Country'
          });
        } catch (error) {
          // If reverse geocoding fails, just use coordinates
          onLocationSelect({ latitude, longitude });
        }
      } else {
        // Fallback to IP-based geolocation if browser geolocation is not available
        const response = await getUserLocation();
        if (response.success && response.data) {
          const { latitude, longitude } = response.data;
          setMapCenter([latitude, longitude]);
          if (mapInstance) {
            mapInstance.setView([latitude, longitude], 13);
          }
          onLocationSelect({ latitude, longitude });
        }
      }
    } catch (error) {
      console.error('Error getting user location:', error);
      // Fallback to IP-based geolocation if browser geolocation fails
      const response = await getUserLocation();
      if (response.success && response.data) {
        const { latitude, longitude } = response.data;
        setMapCenter([latitude, longitude]);
        if (mapInstance) {
          mapInstance.setView([latitude, longitude], 13);
        }
        onLocationSelect({ latitude, longitude });
      }
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentMapRef = mapRef.current;
    if (isOpen && location.coordinates) {
      setIsVisible(true);
      setMapCenter([location.coordinates.latitude, location.coordinates.longitude]);
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

  if (!location.coordinates) return null;

  interface WeatherMetric {
    angle: number;
    distance: number;
    icon: string;
    title: string;
    value: string;
  }

  const weatherMetrics = weatherData?.currentWeather ? [
    {
      angle: 0,
      distance: 2000,
      icon: weatherData.currentWeather.icon,
      title: 'Temperature',
      value: `${convertTemp(weatherData.currentWeather.temperature, tempUnit)}°${tempUnit}`
    },
    {
      angle: 120,
      distance: 2000,
      icon: '/icons/weathers/humidity.svg',
      title: 'Humidity',
      value: `${weatherData.currentWeather.humidity}%`
    },
    {
      angle: 240,
      distance: 2000,
      icon: '/icons/weathers/barometer.svg',
      title: 'Pressure',
      value: `${weatherData.currentWeather.pressure} hPa`
    }
  ] as WeatherMetric[] : [];

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ pointerEvents: isVisible ? 'auto' : 'none', zIndex: 99 }}
        onClick={handleClose}
      />
      <div 
        className={`fixed top-0 right-0 h-full w-full md:w-[600px] bg-black/85 backdrop-blur-xl transform transition-all duration-500 ease-in-out ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
        style={{ pointerEvents: isVisible ? 'auto' : 'none', zIndex: 100, backfaceVisibility: 'hidden', willChange: 'transform, opacity' }}
      >
        <div className="relative h-full w-full">
          <div className="absolute top-0 left-0 right-0 z-[1001] p-4 flex flex-row items-center gap-3">
            <button
              onClick={handleClose}
              className="p-2 rounded-lg bg-black/80 hover:bg-black/90 transition-all duration-300 backdrop-blur-xl shadow-lg text-white ring-1 ring-white/20 w-fit flex-shrink-0"
              title="Close panel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                      <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Searching...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-white/60">
                      No results found
                    </div>
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
                  ref={(map) => setMapInstance(map as Map)}
                >
                  <TileLayer
                    url={defaultMapConfig.tileLayer.url}
                    attribution={defaultMapConfig.tileLayer.attribution}
                    maxZoom={defaultMapConfig.tileLayer.maxZoom}
                  />
                  <Marker 
                    position={[location.coordinates.latitude, location.coordinates.longitude]} 
                    icon={L.icon({
                      iconUrl: weatherMetrics[0]?.icon || '/icons/weathers/map-marker.svg',
                      iconSize: [32, 32],
                      iconAnchor: [16, 32],
                      popupAnchor: [0, -32]
                    })}>
                    <Popup>
                      <div className="p-2">
                        <div className="font-semibold mb-2">{location.city}, {location.country}</div>
                        {weatherMetrics.map((metric, index) => (
                          <div key={index} className="flex items-center gap-2 mb-1">
                            <Image src={metric.icon} alt={metric.title} width={20} height={20} className="w-5 h-5" />
                            <span>{metric.value}</span>
                          </div>
                        ))}
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </Suspense>
              <div className="absolute bottom-0 left-0 right-0 z-[1000] p-2 md:p-4 mb-16 md:mb-20">
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
                          <div className="text-sm md:text-lg font-semibold truncate max-w-[150px] md:max-w-none">{location.city}, {location.country}</div>
                          <div className="text-xs md:text-base opacity-80 truncate max-w-[150px] md:max-w-none">{weatherData?.currentWeather.condition}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl md:text-3xl font-bold">
                          {weatherData ? `${convertTemp(weatherData.currentWeather.temperature, tempUnit)}°${tempUnit}` : ''}
                        </div>
                        <div className="text-xs md:text-sm opacity-80 flex items-center justify-end gap-1 md:gap-2">
                          <Image src="/icons/weathers/humidity.svg" alt="Humidity" width={16} height={16} className="w-3 h-3 md:w-4 md:h-4" />
                          <span>{weatherData?.currentWeather.humidity}%</span>
                          <span className="mx-1">•</span>
                          <Image src="/icons/weathers/barometer.svg" alt="Pressure" width={16} height={16} className="w-3 h-3 md:w-4 md:h-4" />
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
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-xs md:text-sm font-medium">Current Location</span>
                      </button>
                      <button
                        onClick={() => {
                          if (mapInstance) {
                            const center = mapInstance.getCenter();
                            onLocationSelect({
                              latitude: center.lat,
                              longitude: center.lng
                            });
                            handleClose();
                          }
                        }}
                        className="flex-1 py-2 md:py-2.5 px-3 md:px-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 backdrop-blur-md text-white/90 hover:text-white border border-white/10 hover:border-white/20 flex items-center justify-center gap-2 group"
                        title="Use the current map center as location"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs md:text-sm font-medium">Set Location</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
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
