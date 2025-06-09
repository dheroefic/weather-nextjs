'use client';

import { lazy, Suspense } from 'react';
import Image from 'next/image';
import ResponsiveLayout from '@/components/shared/ResponsiveLayout';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import PerformanceDashboard from '@/components/shared/PerformanceDashboard';
import { isDesktopLayoutEnabled } from '@/utils/featureFlags';
import { useWeatherData } from '../hooks/useWeatherData';
import { useAppUtils } from '../utils';

// Lazy load heavy components
const Footer = lazy(() => import('@/components/shared/Footer'));

export default function WeatherApp() {
  const {
    // State
    currentTime,
    location,
    forecastPeriod,
    weatherData,
    tempUnit,
    loading,
    selectedDay,
    autoRefreshInterval,
    showSettings,
    backgroundImage,
    showMap,
    showPerfDashboard,
    imageAttribution,
    
    // Actions
    setLocation,
    setForecastPeriod,
    setSelectedDay,
    setShowSettings,
    setShowMap,
    setShowPerfDashboard,
    setBackgroundImage,
    convertTemp,
    toggleTempUnit,
    handleRefresh,
    handleAutoRefreshChange
  } = useWeatherData();

  const { formatDate, formatTime, getWindRotationDegree } = useAppUtils();

  const currentWeather = weatherData?.currentWeather.condition || 'Loading...';

  return (
    <ErrorBoundary>
      <div className="min-h-screen w-full relative">
        {/* Background Image */}
        <div className="fixed inset-0 z-0">
          <Image
            src={backgroundImage || '/background-weather/a-default.jpg'}
            alt={`Weather background showing ${currentWeather}`}
            fill
            priority
            quality={75}
            sizes="100vw"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyDzK5shm3SistN6zEE1cZr+mMNIaI/F8jksV/bSKMqW8ByJR8PTEvI/"
            style={{
              objectFit: 'cover',
              filter: 'blur(8px)',
              transform: 'scale(1.1)'
            }}
            onError={() => {
              setBackgroundImage('/background-weather/a-default.jpg');
            }}
          />
        </div>
        
        {/* Unified Content Container */}
        <div className="relative z-10 min-h-screen w-full flex flex-col text-white">
          {/* Desktop Layout - Full screen blended */}
          {isDesktopLayoutEnabled() ? (
            <div className="hidden lg:flex flex-col min-h-screen w-full p-8">
              <div className="flex-1">
                <ResponsiveLayout
                  weatherData={weatherData}
                  location={location}
                  currentTime={currentTime}
                  tempUnit={tempUnit}
                  loading={loading}
                  convertTemp={convertTemp}
                  onTempUnitToggle={toggleTempUnit}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  getWindRotationDegree={getWindRotationDegree}
                  handleRefresh={handleRefresh}
                  onLocationSelect={setLocation}
                  selectedDay={selectedDay}
                  onDaySelect={setSelectedDay}
                  forecastPeriod={forecastPeriod}
                  onForecastPeriodChange={setForecastPeriod}
                  showSettings={showSettings}
                  setShowSettings={setShowSettings}
                  autoRefreshInterval={autoRefreshInterval}
                  handleAutoRefreshChange={handleAutoRefreshChange}
                  showMap={showMap}
                  setShowMap={setShowMap}
                  imageAttribution={imageAttribution}
                />
              </div>
            </div>
          ) : null}

          {/* Mobile/Tablet Layout - Container with backdrop */}
          <div className={`
            ${isDesktopLayoutEnabled() ? 'lg:hidden' : 'flex'}
            flex-col min-h-screen w-full
            ${!isDesktopLayoutEnabled() ? 'justify-center items-center p-6' : 'p-6'}
          `}>
            <div className={`
              ${!isDesktopLayoutEnabled() 
                ? 'w-full max-w-4xl bg-black/20 backdrop-blur-lg rounded-3xl overflow-hidden my-10 flex flex-col' 
                : 'w-full bg-black/20 backdrop-blur-lg overflow-hidden flex flex-col min-h-screen'
              }
              text-white p-6 md:p-8
            `}>
              <div className="flex-1">
                <ResponsiveLayout
                  weatherData={weatherData}
                  location={location}
                  currentTime={currentTime}
                  tempUnit={tempUnit}
                  loading={loading}
                  convertTemp={convertTemp}
                  onTempUnitToggle={toggleTempUnit}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  getWindRotationDegree={getWindRotationDegree}
                  handleRefresh={handleRefresh}
                  onLocationSelect={setLocation}
                  selectedDay={selectedDay}
                  onDaySelect={setSelectedDay}
                  forecastPeriod={forecastPeriod}
                  onForecastPeriodChange={setForecastPeriod}
                  showSettings={showSettings}
                  setShowSettings={setShowSettings}
                  autoRefreshInterval={autoRefreshInterval}
                  handleAutoRefreshChange={handleAutoRefreshChange}
                  showMap={showMap}
                  setShowMap={setShowMap}
                  imageAttribution={imageAttribution}
                />
              </div>
              
              {/* Mobile/Tablet Footer */}
              <Suspense fallback={<div className="animate-pulse h-8 bg-white/10 rounded mt-4"></div>}>
                <Footer imageAttribution={imageAttribution} />
              </Suspense>
            </div>
          </div>
        </div>

        <PerformanceDashboard
          isVisible={showPerfDashboard}
          onToggle={() => setShowPerfDashboard(!showPerfDashboard)}
        />
      </div>
    </ErrorBoundary>
  );
}
