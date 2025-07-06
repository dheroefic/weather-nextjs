'use client';

import { useState, Suspense, useEffect } from 'react';
import Image from 'next/image';
import HourlyForecast from '../shared/HourlyForecast';
import DailyForecast from '../shared/DailyForecast';
import WeatherMetrics from '../shared/WeatherMetrics';
import Footer from '../shared/Footer';
import EmbeddedMap from './EmbeddedMap';
import LocationSelector from '../shared/LocationSelector';
import dynamic from 'next/dynamic';
import MapPanelComponent from '../shared/Map/MapPanel';
import type { WeatherData, Location, TemperatureUnit, ForecastDay } from '@/types/weather';
import { debug } from '@/utils/debug';
import { useNearbyWeather } from '@/hooks/useNearbyWeather';

// Dynamically import MapPanel to avoid SSR issues - for fullscreen map
const MapPanel = dynamic(() => import('../shared/Map/MapPanel'), { ssr: false });

interface DesktopLayoutProps {
  weatherData: WeatherData | null;
  location: Location;
  currentTime: Date;
  tempUnit: TemperatureUnit;
  loading: boolean;
  convertTemp: (temp: number, unit: TemperatureUnit) => number;
  onTempUnitToggle: () => void;
  formatDate: (date: Date) => string;
  formatTime: (date: Date) => string;
  handleRefresh: () => void;
  onLocationSelect: (location: Location) => void;
  selectedDay: ForecastDay | null;
  onDaySelect: (day: ForecastDay | null) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  autoRefreshInterval: number | null;
  handleAutoRefreshChange: (minutes: number | null) => void;
  showMap: boolean;
  setShowMap: (show: boolean) => void;
  forecastPeriod: '4 days' | '8 days' | '14 days';
  onForecastPeriodChange: (period: '4 days' | '8 days' | '14 days') => void;
  imageAttribution: {
    photographerName: string;
    photographerUsername: string;
    photographerUrl: string;
  } | null;
}

export default function DesktopLayout({
  weatherData,
  location,
  currentTime,
  tempUnit,
  loading,
  convertTemp,
  onTempUnitToggle,
  formatDate,
  formatTime,
  handleRefresh,
  onLocationSelect,
  onDaySelect,
  showSettings,
  setShowSettings,
  autoRefreshInterval,
  handleAutoRefreshChange,
  forecastPeriod,
  onForecastPeriodChange,
  imageAttribution
}: DesktopLayoutProps) {
  const [showFullscreenMap, setShowFullscreenMap] = useState(false);
  const [embeddedMapKey, setEmbeddedMapKey] = useState(0);
  const [fullscreenMapKey, setFullscreenMapKey] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [embeddedMapDestroyed, setEmbeddedMapDestroyed] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  
  const currentWeather = weatherData?.currentWeather;
  const dailyForecast = weatherData?.dailyForecast || [];

  // Use nearby weather hook for fullscreen map
  const { nearbyWeatherData, isLoading: nearbyLoading } = useNearbyWeather({
    location,
    weatherData,
    zoomLevel: 13,
    enabled: true
  });

  // Handle panel toggles - only allow one panel open at a time
  const handleSettingsToggle = () => {
    if (showLocationSelector) {
      setShowLocationSelector(false);
    }
    setShowSettings(!showSettings);
  };

  const handleLocationToggle = () => {
    if (showSettings) {
      setShowSettings(false);
    }
    setShowLocationSelector(!showLocationSelector);
  };



  // Handle fullscreen map opening with proper cleanup sequence
  const handleExpandToFullscreen = () => {
    debug.layout('handleExpandToFullscreen called');
    setIsTransitioning(true);
    
    // First, force embedded map unmount by incrementing key
    setEmbeddedMapKey(prev => prev + 1);
    
    // Wait for embedded map to fully cleanup
    setTimeout(() => {
      setEmbeddedMapDestroyed(true);
      // Additional delay to ensure DOM cleanup
      setTimeout(() => {
        debug.layout('Setting showFullscreenMap to true');
        setShowFullscreenMap(true);
        setFullscreenMapKey(prev => prev + 1);
        setIsTransitioning(false);
      }, 200);
    }, 200);
  };

  // Handle fullscreen map closing with proper cleanup sequence  
  const handleCloseFullscreen = () => {
    setIsTransitioning(true);
    setShowFullscreenMap(false);
    
    // Force fullscreen map cleanup
    setFullscreenMapKey(prev => prev + 1);
    
    // Wait for fullscreen map to cleanup before re-enabling embedded map
    setTimeout(() => {
      setEmbeddedMapDestroyed(false);
      setTimeout(() => {
        setEmbeddedMapKey(prev => prev + 1);
        setIsTransitioning(false);
      }, 200);
    }, 200);
  };

  return (
    <>
      <div className="max-w-[2000px] mx-auto px-10 py-10">
        {/* 6-Section Grid Layout */}
        <div className="grid grid-cols-12 gap-8 min-h-screen">
          
          {/* Section 1: Top Left - Time and Current Weather Info */}
          <div className="col-span-12 lg:col-span-6 xl:col-span-6">
            <div className="desktop-main-card h-full">
              <div className="flex flex-col h-full">
                {/* Header Controls */}
                <div className="flex justify-start items-start mb-6">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handleRefresh}
                      className={`desktop-control-button ${loading ? 'animate-spin' : ''}`}
                      disabled={loading}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <div className="relative">
                      <button
                        onClick={(e) => {handleSettingsToggle(); e.stopPropagation();}}
                        className="desktop-control-button"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                      {showSettings && (
                        <div
                          className="absolute top-full left-0 mt-3 min-w-[280px] z-50 rounded-xl shadow-2xl"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.75) 100%)',
                            backdropFilter: 'blur(24px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
                          }}
                        >
                          <div className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-white/80">Temperature Unit</span>
                              <button
                                onClick={onTempUnitToggle}
                                className={`px-3 py-2 text-sm font-semibold rounded-lg border transition-all duration-200 ${
                                  tempUnit === 'C' 
                                    ? 'bg-blue-500/30 border-blue-400/60 text-blue-200' 
                                    : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20'
                                }`}
                              >
                                °{tempUnit === 'C' ? 'C' : 'F'}
                              </button>
                            </div>
                            <div className="space-y-3">
                              <span className="text-sm font-medium text-white/80">Auto-refresh Interval</span>
                              <div className="grid grid-cols-2 gap-2">
                                {[1, 5, 15, null].map((minutes) => (
                                  <button
                                    key={minutes || 'off'}
                                    onClick={() => handleAutoRefreshChange(minutes)}
                                    className={`px-2 py-2 text-xs font-semibold rounded-lg border transition-all duration-200 ${
                                      autoRefreshInterval === minutes
                                        ? 'bg-blue-500/30 border-blue-400/60 text-blue-200'
                                        : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20'
                                    }`}
                                  >
                                    {minutes ? `${minutes}m` : 'Off'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Current Time and Date */}
                <div className="text-center mb-8">
                  <div className="text-5xl lg:text-6xl xl:text-7xl font-light text-primary mb-3 tracking-tight">
                    {formatTime(currentTime)}
                  </div>
                  <div className="text-lg lg:text-xl font-medium text-secondary mb-2">
                    {formatDate(currentTime)}
                  </div>
                  {/* Current Location */}
                  <div className="flex items-center justify-center space-x-2 text-sm font-medium text-tertiary">
                    <LocationSelector
                      currentLocation={location}
                      onLocationSelect={onLocationSelect}
                      isOpen={showLocationSelector}
                      onToggle={handleLocationToggle}
                    />
                  </div>
                </div>

                {/* Current Weather Display */}
                <div className="flex-1 flex flex-col justify-center items-center text-center">
                  {loading ? (
                    <div className="text-center">
                      <div className="h-24 w-24 bg-black/20 rounded-full mb-6 animate-pulse mx-auto"></div>
                      <div className="h-16 w-32 bg-black/20 rounded mb-4 animate-pulse mx-auto"></div>
                      <div className="h-6 w-24 bg-black/20 rounded animate-pulse mx-auto"></div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="text-7xl lg:text-8xl xl:text-9xl font-extralight text-primary mb-4 tracking-tighter">
                        {convertTemp(currentWeather?.temperature || 22, tempUnit)}°
                      </div>
                      <div className="text-xl lg:text-2xl xl:text-3xl font-semibold text-secondary mb-3">
                        {currentWeather?.condition || 'Clear'}
                      </div>
                      <div className="text-lg lg:text-xl font-medium text-tertiary mb-6">
                        Feels like {convertTemp(currentWeather?.temperature || 24, tempUnit)}°
                      </div>
                      {currentWeather?.icon && (
                        <div className="flex justify-center">
                          <Image
                            src={currentWeather.icon}
                            alt={currentWeather.condition || 'Weather condition'}
                            width={96}
                            height={96}
                            className="w-20 h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Top Right - Combined Weather Metrics & Hourly Forecast */}
          <div className="col-span-12 lg:col-span-6 xl:col-span-6">
            <div className="desktop-sidebar-card h-full">
              <div className="flex flex-col h-full">

                {/* Weather Metrics - Top Section */}
                <div className="mb-6">
                  <WeatherMetrics
                    weatherData={weatherData}
                    loading={loading}
                  />
                </div>

                {/* Hourly Forecast - Bottom Section */}
                <div className="flex-1">
                  <HourlyForecast
                    weatherData={weatherData}
                    tempUnit={tempUnit}
                    convertTemp={convertTemp}
                    loading={loading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Bottom - Full Width Map */}
          <div className="col-span-12">
            <div className="desktop-forecast-card h-[400px] overflow-hidden">
              <div className="h-full">
                {!showFullscreenMap && !isTransitioning && !embeddedMapDestroyed && (
                  <EmbeddedMap
                    key={`embedded-map-${embeddedMapKey}`}
                    weatherData={weatherData}
                    location={location}
                    onLocationSelect={onLocationSelect}
                    onExpandToFullscreen={handleExpandToFullscreen}
                    currentWeather={currentWeather}
                    className="h-full"
                  />
                )}
                {(showFullscreenMap || isTransitioning || embeddedMapDestroyed) && (
                  <div className="h-full flex items-center justify-center bg-black/10 rounded-lg">
                    <div className="text-center text-white/60">
                      <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm">
                        {isTransitioning ? 'Transitioning...' : 'Map opened in fullscreen'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Bottom Section - 14-Day Forecast */}
          <div className="col-span-12">
            <div className="desktop-forecast-card">
              <DailyForecast
                dailyForecast={dailyForecast}
                tempUnit={tempUnit}
                convertTemp={convertTemp}
                loading={loading}
                onDaySelect={onDaySelect}
                forecastPeriod={forecastPeriod}
                onForecastPeriodChange={onForecastPeriodChange}
              />
            </div>
          </div>

          {/* Section 5: Footer */}
          <div className="col-span-12">
            <Footer imageAttribution={imageAttribution} />
          </div>

        </div>
      </div>

      {/* Fullscreen Map Panel */}
      {(() => {
        const shouldRender = showFullscreenMap && location.coordinates;
        
        if (!shouldRender) {
          return null;
        }
        
        return (
          <MapPanelComponent
            key={`fullscreen-map-${fullscreenMapKey}`}
            isOpen={showFullscreenMap}
            weatherData={weatherData}
            onClose={handleCloseFullscreen}
            location={location}
            tempUnit={tempUnit}
            convertTemp={convertTemp}
            variant="desktop"
            nearbyLocations={nearbyWeatherData.map(nearby => ({
              latitude: nearby.latitude,
              longitude: nearby.longitude,
              city: nearby.city,
              weatherData: nearby.weatherData ? {
                currentWeather: nearby.weatherData.currentWeather,
                hourlyForecast: [],
                dailyForecast: [],
                alerts: []
              } : undefined
            }))}
            onLocationSelect={(coordinates: {
              latitude: number;
              longitude: number;
              city?: string;
              country?: string;
            }) => {
              onLocationSelect({
                city: coordinates.city || location.city,
                country: coordinates.country || location.country,
                coordinates: {
                  latitude: coordinates.latitude,
                  longitude: coordinates.longitude,
                },
              });
            }}
          />
        );
      })()}
    </>
  );
}
