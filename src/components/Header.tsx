'use client';

import CurrentWeather from '@/components/CurrentWeather';
import type { Location, WeatherData, TemperatureUnit } from '@/types/weather';

interface HeaderProps {
  weatherData: WeatherData | null;
  location: Location;
  currentTime: Date;
  tempUnit: TemperatureUnit;
  loading: boolean;
  onLocationSelect: (location: Location) => void;
  onTempUnitToggle: () => void;
  convertTemp: (temp: number, unit: TemperatureUnit) => number;
  getWindRotationDegree: (direction: string) => number;
  formatDate: (date: Date) => string;
  formatTime: (date: Date) => string;
  handleRefresh: () => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  autoRefreshInterval: number | null;
  handleAutoRefreshChange: (minutes: number | null) => void;
}

export default function Header({
  weatherData,
  location,
  currentTime,
  tempUnit,
  loading,
  onLocationSelect,
  onTempUnitToggle,
  convertTemp,
  getWindRotationDegree,
  formatDate,
  formatTime,
  handleRefresh,
  showSettings,
  setShowSettings,
  autoRefreshInterval,
  handleAutoRefreshChange
}: HeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-8 w-full">
      <CurrentWeather
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
      />
    </div>
  );
}