'use client';

import Header from '../shared/Header';
import WeatherMetrics from '../shared/WeatherMetrics';
import HourlyForecast from '../shared/HourlyForecast';
import DailyForecast from '../shared/DailyForecast';
import DetailPanel from '../shared/DetailPanel';
import MapPanel from '../desktop/MapPanel';
import type { WeatherData, Location, TemperatureUnit, ForecastDay } from '@/types/weather';

interface MobileLayoutProps {
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

export default function MobileLayout({
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
  setShowMap
}: MobileLayoutProps) {
  return (
    <div className="flex flex-col gap-6 md:gap-12 w-full">
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
        onLocationSelect={(coordinates: {
          latitude: number;
          longitude: number;
          city?: string;
          country?: string;
        }) => {
          onLocationSelect({
            ...location,
            coordinates: {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude
            },
            city: coordinates.city || location.city,
            country: coordinates.country || location.country
          });
        }}
      />
    </div>
  );
}
