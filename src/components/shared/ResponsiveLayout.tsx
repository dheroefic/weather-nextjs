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
import DesktopLayout from '../desktop/DesktopLayout';
import MobileLayout from '../mobile/MobileLayout';
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
    <MobileLayout
      weatherData={weatherData}
      location={location}
      currentTime={currentTime}
      tempUnit={tempUnit}
      loading={loading}
      convertTemp={convertTemp}
      onTempUnitToggle={onTempUnitToggle}
      formatDate={formatDate}
      formatTime={formatTime}
      getWindRotationDegree={getWindRotationDegree}
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
