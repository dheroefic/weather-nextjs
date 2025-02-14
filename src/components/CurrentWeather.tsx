'use client';

import { WindIcon } from '@/components/icons';
import LocationSelector from '@/components/LocationSelector';
import type { Location } from '@/types/weather';
import type { WeatherData } from '@/types/weather';
import type { TemperatureUnit } from '@/types/weather';

interface CurrentWeatherProps {
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

export default function CurrentWeather({
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
}: CurrentWeatherProps) {
  return (
    <div className="flex flex-col gap-4 md:gap-6 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-8 w-full">
        <div className="flex flex-col items-start space-y-3 w-full md:w-auto">
          <div className="flex flex-col space-y-2">
            {loading ? (
              <>
                <div className="text-lg md:text-2xl font-medium opacity-90 loading-element w-48"></div>
                <div className="text-3xl md:text-4xl font-bold loading-element w-24"></div>
              </>
            ) : (
              <>
                <div className="text-lg md:text-2xl font-medium opacity-90">{formatDate(currentTime)}</div>
                <div className="text-3xl md:text-4xl font-bold">{formatTime(currentTime)}</div>
              </>
            )}
          </div>
          <div className="w-full md:w-auto mt-3">
            <div className="flex items-center gap-2">
              <LocationSelector
                currentLocation={location}
                onLocationSelect={onLocationSelect}
              />
              <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1">
                <button
                  onClick={handleRefresh}
                  className={`p-2 rounded-lg hover:bg-white/20 transition-all duration-300 ${loading ? 'animate-spin' : ''}`}
                  disabled={loading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <div className="relative">
                  <button
                    onClick={(e) => {setShowSettings(!showSettings); e.stopPropagation();}}
                    className="p-2 rounded-lg hover:bg-white/20 transition-all duration-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  {showSettings && (
                    <div 
                      className="absolute right-0 mt-2 w-48 rounded-lg bg-black/80 backdrop-blur-xl shadow-lg z-[9999] border border-white/10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-2">
                        <div className="text-sm font-medium mb-1.5 px-2">Auto Refresh</div>
                        <div className="space-y-1">
                          {[
                            { label: 'Off', value: null },
                            { label: '5 minutes', value: 5 },
                            { label: '10 minutes', value: 10 },
                            { label: '15 minutes', value: 15 },
                            { label: '30 minutes', value: 30 }
                          ].map((option) => (
                            <button
                              key={option.label}
                              onClick={() => handleAutoRefreshChange(option.value)}
                              className={`w-full px-2 py-1 text-left text-sm rounded hover:bg-white/10 transition-colors duration-200 ${autoRefreshInterval === option.value ? 'bg-white/20' : ''}`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end space-y-3 w-full md:w-auto">
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="text-5xl md:text-7xl font-bold temperature-display loading-element w-32"></div>
            ) : (
              <div className="text-5xl md:text-7xl font-bold temperature-display">
                {weatherData ? convertTemp(weatherData.currentWeather.temperature, tempUnit) : '--'}°{tempUnit}
              </div>
            )}
            <button
              onClick={onTempUnitToggle}
              className="px-3 py-1.5 rounded-lg bg-black/40 hover:bg-white/20 transition-all duration-300 text-base font-medium backdrop-blur-sm self-start mt-2"
            >
              °{tempUnit === 'C' ? 'F' : 'C'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <WindIcon className="w-8 h-8" style={{ transform: `rotate(${weatherData ? getWindRotationDegree(weatherData.currentWeather.wind.direction) : 0}deg)` }} />
            {loading ? (
              <span className="text-lg loading-element w-20"></span>
            ) : (
              <span className="text-lg">{weatherData ? `${weatherData.currentWeather.wind.speed} km/h` : '--'}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}