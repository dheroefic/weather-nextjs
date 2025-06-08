'use client';

/**
 * ResponsiveLayout - Adaptive layout component
 * 
 * This component automatically switches between mobile and desktop layouts based on:
 * 1. Screen size (>= 1024px for desktop)
 * 2. Environment variable NEXT_PUBLIC_ENABLE_DESKTOP_LAYOUT
 * 
 * To disable desktop layout entirely, set NEXT_PUBLIC_ENABLE_DESKTOP_LAYOUT=false
 * in your .env.local file
 */

import { useState, useEffect } from 'react';
import { isDesktopLayoutEnabled } from '@/utils/featureFlags';
import DesktopLayout from './DesktopLayout';
import Header from './Header';
import WeatherMetrics from './WeatherMetrics';
import HourlyForecast from './HourlyForecast';
import DailyForecast from './DailyForecast';
import DetailPanel from './DetailPanel';
import MapPanel from './MapPanel';
import type { WeatherData, Location, TemperatureUnit, ForecastDay } from '@/types/weather';

interface ResponsiveLayoutProps {
  weatherData: WeatherData | null;
  location: Location;
  currentTime: Date;
  tempUnit: TemperatureUnit;
  loading: boolean;
  convertTemp: (temp: number, unit: TemperatureUnit) => number;
  onTempUnitToggle: () => void;
  formatDate: (date: Date) => string;
  formatTime: (date: Date) => string;
  getWindRotationDegree: (direction: string) => number;
  handleRefresh: () => void;
  onLocationSelect: (location: Location) => void;
  selectedDay: ForecastDay | null;
  onDaySelect: (day: ForecastDay | null) => void;
  forecastPeriod: '4 days' | '8 days' | '14 days';
  onForecastPeriodChange: (period: '4 days' | '8 days' | '14 days') => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  autoRefreshInterval: number | null;
  handleAutoRefreshChange: (minutes: number | null) => void;
  showMap: boolean;
  setShowMap: (show: boolean) => void;
  imageAttribution: {
    photographerName: string;
    photographerUsername: string;
    photographerUrl: string;
  } | null;
}

export default function ResponsiveLayout({
  weatherData,
  location,
  currentTime,
  tempUnit,
  loading,
  convertTemp,
  onTempUnitToggle,
  formatDate,
  formatTime,
  getWindRotationDegree,
  handleRefresh,
  onLocationSelect,
  selectedDay,
  onDaySelect,
  forecastPeriod,
  onForecastPeriodChange,
  showSettings,
  setShowSettings,
  autoRefreshInterval,
  handleAutoRefreshChange,
  showMap,
  setShowMap,
  imageAttribution
}: ResponsiveLayoutProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  
  // Check if desktop layout is enabled via environment variable
  const desktopLayoutEnabled = isDesktopLayoutEnabled();

  useEffect(() => {
    const checkScreenSize = () => {
      // Only set desktop if both screen size is large enough AND desktop layout is enabled
      setIsDesktop(window.innerWidth >= 1024 && desktopLayoutEnabled);
    };

    // Check initial size
    checkScreenSize();

    // Add resize listener with debounce for better performance
    let timeoutId: number;
    const debouncedCheckScreenSize = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(checkScreenSize, 100);
    };

    window.addEventListener('resize', debouncedCheckScreenSize);
    return () => {
      window.removeEventListener('resize', debouncedCheckScreenSize);
      clearTimeout(timeoutId);
    };
  }, [desktopLayoutEnabled]);

  // Desktop Layout - only if feature flag is enabled
  if (isDesktop && desktopLayoutEnabled) {
    return (
      <DesktopLayout
        weatherData={weatherData}
        location={location}
        currentTime={currentTime}
        tempUnit={tempUnit}
        loading={loading}
        convertTemp={convertTemp}
        onTempUnitToggle={onTempUnitToggle}
        formatDate={formatDate}
        formatTime={formatTime}
        handleRefresh={handleRefresh}
        onLocationSelect={onLocationSelect}
        selectedDay={selectedDay}
        onDaySelect={onDaySelect}
        forecastPeriod={forecastPeriod}
        onForecastPeriodChange={onForecastPeriodChange}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        autoRefreshInterval={autoRefreshInterval}
        handleAutoRefreshChange={handleAutoRefreshChange}
        showMap={showMap}
        setShowMap={setShowMap}
        imageAttribution={imageAttribution}
      />
    );
  }

  // Mobile Layout (existing layout)
  return (
    <div className="flex flex-col gap-4 md:gap-8 w-full">
      <Header
        weatherData={weatherData}
        location={location}
        currentTime={currentTime}
        tempUnit={tempUnit}
        loading={loading}
        onLocationSelect={onLocationSelect}
        onTempUnitToggle={onTempUnitToggle}
        convertTemp={convertTemp}
        getWindRotationDegree={getWindRotationDegree}
        formatDate={formatDate}
        formatTime={formatTime}
        handleRefresh={handleRefresh}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        autoRefreshInterval={autoRefreshInterval}
        handleAutoRefreshChange={handleAutoRefreshChange}
        showMap={showMap}
        setShowMap={setShowMap}
      />

      <WeatherMetrics weatherData={weatherData} loading={loading} />

      <HourlyForecast
        weatherData={weatherData}
        loading={loading}
        tempUnit={tempUnit}
        convertTemp={convertTemp}
      />

      <DailyForecast
        forecastPeriod={forecastPeriod}
        loading={loading}
        dailyForecast={weatherData?.dailyForecast}
        tempUnit={tempUnit}
        convertTemp={convertTemp}
        onForecastPeriodChange={onForecastPeriodChange}
        onDaySelect={onDaySelect}
      />

      <DetailPanel
        selectedDay={selectedDay}
        weatherData={weatherData}
        tempUnit={tempUnit}
        convertTemp={convertTemp}
        onClose={() => onDaySelect(null)}
        onDaySelect={onDaySelect}
      />

      {/* MapPanel */}
      <MapPanel
        isOpen={showMap}
        weatherData={weatherData}
        onClose={() => setShowMap(false)}
        location={location}
        tempUnit={tempUnit}
        convertTemp={convertTemp}
        onLocationSelect={(coordinates) => {
          onLocationSelect({
            ...location,
            coordinates,
            city: coordinates.city || location.city,
            country: coordinates.country || location.country
          });
        }}
      />
    </div>
  );
}
