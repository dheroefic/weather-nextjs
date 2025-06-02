'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import LocationSelector from './LocationSelector';
import type { WeatherData, Location, TemperatureUnit, ForecastDay } from '@/types/weather';

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
  selectedDay,
  onDaySelect,
  showSettings,
  setShowSettings,
  autoRefreshInterval,
  handleAutoRefreshChange,
  showMap,
  setShowMap
}: DesktopLayoutProps) {
  const currentWeather = weatherData?.currentWeather;
  const hourlyForecast = weatherData?.hourlyForecast?.slice(0, 12) || []; // Show 12 hours instead of 4
  const dailyForecast = weatherData?.dailyForecast?.slice(0, 14) || []; // Show 14 days for ultra-wide

  // State for hourly forecast modal
  const [selectedHour, setSelectedHour] = useState<{
    time: string;
    temp: number;
    icon: string;
    precipitation: number;
    uvIndex: { value: number; category: string };
    humidity: number;
    pressure: number;
  } | null>(null);

  return (
    <>
      <div className="max-w-[2000px] mx-auto px-6 py-6 desktop-layout-container">
        <div className="grid grid-cols-12 gap-6">
          {/* Main Weather Card */}
          <div className="col-span-12 lg:col-span-6">
            <div className="desktop-main-card rounded-3xl p-8 h-full min-h-[500px]">
              <div className="flex flex-col h-full">
                {/* Header with controls */}
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleRefresh}
                      className={`p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 ${loading ? 'animate-spin' : ''}`}
                      disabled={loading}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <div className="relative">
                      <button
                        onClick={(e) => {setShowSettings(!showSettings); e.stopPropagation();}}
                        className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                      {showSettings && (
                        <div
                          className="absolute top-full right-0 mt-2 p-4 bg-black/80 rounded-2xl backdrop-blur-md border border-white/20 z-50 min-w-[250px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-white">Temperature</span>
                              <button
                                onClick={onTempUnitToggle}
                                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white text-sm"
                              >
                                °{tempUnit === 'C' ? 'C' : 'F'}
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-white">Map</span>
                              <button
                                onClick={() => setShowMap(!showMap)}
                                className={`px-3 py-1 rounded-lg transition-all text-sm ${
                                  showMap ? 'bg-blue-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                                }`}
                              >
                                {showMap ? 'Hide' : 'Show'}
                              </button>
                            </div>
                            <div className="space-y-2">
                              <span className="text-sm text-white">Auto-refresh</span>
                              <div className="grid grid-cols-2 gap-2">
                                {[1, 5, 15, null].map((minutes) => (
                                  <button
                                    key={minutes || 'off'}
                                    onClick={() => handleAutoRefreshChange(minutes)}
                                    className={`px-2 py-1 rounded text-xs transition-all ${
                                      autoRefreshInterval === minutes
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white/10 hover:bg-white/20 text-white'
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
                  <button
                    onClick={onTempUnitToggle}
                    className="text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-light text-white/80 hover:text-white transition-colors"
                  >
                    °{tempUnit === 'C' ? 'C' : 'F'}
                  </button>
                </div>

                {/* Current Time and Date */}
                <div className="text-center mb-8">
                  <div className="text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-light text-white mb-2">
                    {formatTime(currentTime)}
                  </div>
                  <div className="text-lg text-white/80">
                    {formatDate(currentTime)}
                  </div>
                </div>

                {/* Temperature Display */}
                <div className="flex-1 flex flex-col justify-center items-center mb-8">
                  {loading ? (
                    <div className="text-center">
                      <div className="h-32 w-32 bg-white/10 rounded-full mb-6 animate-pulse"></div>
                      <div className="h-16 w-32 bg-white/10 rounded mb-4 animate-pulse"></div>
                      <div className="h-6 w-24 bg-white/10 rounded animate-pulse"></div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-8xl lg:text-9xl xl:text-[10rem] 2xl:text-[12rem] font-light text-white mb-4">
                        {convertTemp(currentWeather?.temperature || 22, tempUnit)}°
                      </div>
                      <div className="text-xl lg:text-2xl text-white/80 mb-2">
                        {currentWeather?.condition || 'Clear'}
                      </div>
                      <div className="text-lg text-white/60">
                        Temperature {convertTemp(currentWeather?.temperature || 24, tempUnit)}°
                      </div>
                      {currentWeather?.icon && (
                        <div className="mt-6">
                          <Image
                            src={currentWeather.icon}
                            alt={currentWeather.condition || 'Weather condition'}
                            width={96}
                            height={96}
                            className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 2xl:w-32 2xl:h-32"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Location Selector at bottom */}
                <div className="mt-auto">
                  <Suspense fallback={<div className="h-12 bg-white/10 rounded-2xl animate-pulse"></div>}>
                    <LocationSelector
                      currentLocation={location}
                      onLocationSelect={onLocationSelect}
                    />
                  </Suspense>
                </div>
              </div>
            </div>
          </div>

          {/* Hourly Forecast Panel with Vertical Expansion */}
          <div className="col-span-12 lg:col-span-6">
            <div className="desktop-sidebar-card rounded-3xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Today's Hourly Forecast</h3>
              
              {/* Hourly forecast scroll area */}
              <div className="min-h-[400px]">
                {loading ? (
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="text-center flex-shrink-0 min-w-[80px]">
                        <div className="h-4 w-12 bg-white/10 rounded mb-2 mx-auto animate-pulse"></div>
                        <div className="h-12 w-12 bg-white/10 rounded-lg mb-2 mx-auto animate-pulse"></div>
                        <div className="h-4 w-8 bg-white/10 rounded mx-auto animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    {hourlyForecast.map((hour, index) => (
                      <div 
                        key={index} 
                        className={`text-center flex-shrink-0 min-w-[80px] p-3 rounded-xl transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                          selectedHour?.time === hour.time 
                            ? 'bg-white/20 border-2 border-white/30' 
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                        onClick={() => setSelectedHour(selectedHour?.time === hour.time ? null : hour)}
                      >
                        <div className="text-sm text-white/70 mb-2">
                          {new Date(hour.time).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          })}
                        </div>
                        <div className="flex justify-center mb-2">
                          <Image
                            src={hour.icon}
                            alt="Weather condition"
                            width={48}
                            height={48}
                            className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 xl:w-14 xl:h-14"
                          />
                        </div>
                        <div className="text-lg font-semibold text-white">
                          {convertTemp(hour.temp, tempUnit)}°
                        </div>
                        <div className="text-xs text-white/60 mt-1">
                          {hour.precipitation}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vertical expansion for selected hour details */}
              <div className={`overflow-hidden transition-all duration-500 ease-out ${
                selectedHour ? 'max-h-96 opacity-100 mt-6' : 'max-h-0 opacity-0'
              }`}>
                {selectedHour && (
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-lg font-semibold text-white">Hour Details</h4>
                      <button
                        onClick={() => setSelectedHour(null)}
                        className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="text-center mb-4">
                      <div className="text-xl font-bold text-white mb-2">
                        {new Date(selectedHour.time).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: false 
                        })}
                      </div>
                      <div className="flex justify-center mb-3">
                        <Image
                          src={selectedHour.icon}
                          alt="Weather condition"
                          width={48}
                          height={48}
                          className="w-12 h-12"
                        />
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {convertTemp(selectedHour.temp, tempUnit)}°
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center mb-1">
                          <svg className="w-4 h-4 text-blue-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                          </svg>
                          <span className="text-xs text-white/70">Precipitation</span>
                        </div>
                        <div className="text-lg font-bold text-blue-400">{selectedHour.precipitation}%</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center mb-1">
                          <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-white/70">UV Index</span>
                        </div>
                        <div className="text-lg font-bold text-yellow-400">{selectedHour.uvIndex.value}</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center mb-1">
                          <svg className="w-4 h-4 text-blue-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 3.636a1 1 0 010 1.414 7 7 0 000 9.9 1 1 0 11-1.414 1.414 9 9 0 010-12.728 1 1 0 011.414 0zm9.9 0a1 1 0 011.414 0 9 9 0 010 12.728 1 1 0 11-1.414-1.414 7 7 0 000-9.9 1 1 0 010-1.414zM7.879 6.464a1 1 0 010 1.414 3 3 0 000 4.243 1 1 0 11-1.415 1.414 5 5 0 010-7.071 1 1 0 011.415 0zm4.242 0a1 1 0 011.415 0 5 5 0 010 7.072 1 1 0 01-1.415-1.415 3 3 0 000-4.242 1 1 0 010-1.415zM10 9a1 1 0 011 1v.01a1 1 0 11-2 0V10a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-white/70">Humidity</span>
                        </div>
                        <div className="text-lg font-bold text-blue-400">{selectedHour.humidity}%</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center mb-1">
                          <svg className="w-4 h-4 text-green-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 10a7 7 0 1114 0 7 7 0 01-14 0zm7-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-white/70">Pressure</span>
                        </div>
                        <div className="text-lg font-bold text-green-400">{selectedHour.pressure} hPa</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Bottom Weather Metrics Panel */}
          <div className="col-span-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* UV Index */}
              <div className="desktop-metric-card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-white/70">UV Index</span>
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-white">
                  {loading ? <div className="h-8 w-12 bg-white/10 rounded animate-pulse"></div> : currentWeather?.uvIndex?.value || '1.2'}
                </div>
                <div className="text-xs text-white/60 mt-1">Low</div>
              </div>

              {/* Wind */}
              <div className="desktop-metric-card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-white/70">Wind</span>
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-white">
                  {loading ? <div className="h-8 w-16 bg-white/10 rounded animate-pulse"></div> : `${currentWeather?.wind?.speed || 2}`}
                </div>
                <div className="text-xs text-white/60 mt-1">
                  {currentWeather?.wind?.direction || 'Light breeze'}
                </div>
              </div>

              {/* Humidity */}
              <div className="desktop-metric-card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-white/70">Humidity</span>
                  <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 3.636a1 1 0 010 1.414 7 7 0 000 9.9 1 1 0 11-1.414 1.414 9 9 0 010-12.728 1 1 0 011.414 0zm9.9 0a1 1 0 011.414 0 9 9 0 010 12.728 1 1 0 11-1.414-1.414 7 7 0 000-9.9 1 1 0 010-1.414zM7.879 6.464a1 1 0 010 1.414 3 3 0 000 4.243 1 1 0 11-1.415 1.414 5 5 0 010-7.071 1 1 0 011.415 0zm4.242 0a1 1 0 011.415 0 5 5 0 010 7.072 1 1 0 01-1.415-1.415 3 3 0 000-4.242 1 1 0 010-1.415zM10 9a1 1 0 011 1v.01a1 1 0 11-2 0V10a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-white">
                  {loading ? <div className="h-8 w-12 bg-white/10 rounded animate-pulse"></div> : `${currentWeather?.humidity || 63}%`}
                </div>
                <div className="text-xs text-white/60 mt-1">Normal</div>
              </div>

              {/* Pressure */}
              <div className="desktop-metric-card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-white/70">Pressure</span>
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 10a7 7 0 1114 0 7 7 0 01-14 0zm7-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-white">
                  {loading ? <div className="h-8 w-16 bg-white/10 rounded animate-pulse"></div> : `${currentWeather?.pressure || 1013}`}
                </div>
                <div className="text-xs text-white/60 mt-1">hPa</div>
              </div>
            </div>
          </div>

          {/* Daily Forecast - Full Width */}
          <div className="col-span-12 mt-6">
            <div className="glass-container rounded-3xl p-6 backdrop-blur-md bg-white/10 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-6">14-Day Forecast</h3>
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10 2xl:grid-cols-14 gap-4">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div key={i} className="glass-container rounded-2xl p-4 bg-white/5">
                      <div className="h-4 w-16 bg-white/10 rounded mb-3 animate-pulse"></div>
                      <div className="h-16 w-16 bg-white/10 rounded-lg mb-3 mx-auto animate-pulse"></div>
                      <div className="h-4 w-12 bg-white/10 rounded mb-2 mx-auto animate-pulse"></div>
                      <div className="h-3 w-8 bg-white/10 rounded mx-auto animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10 2xl:grid-cols-14 gap-4">
                  {dailyForecast.map((day, index) => (
                    <div 
                      key={index}
                      className="glass-container rounded-2xl p-4 bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer transform hover:scale-105"
                      onClick={() => onDaySelect(day)}
                    >
                      <div className="text-center">
                        <div className="text-sm text-white/70 mb-3">
                          {index === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex justify-center mb-3">
                          <Image
                            src={day.icon}
                            alt={day.condition}
                            width={64}
                            height={64}
                            className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 xl:w-16 xl:h-16"
                          />
                        </div>
                        <div className="text-lg font-semibold text-white mb-1">
                          {convertTemp(day.temp.max, tempUnit)}°
                        </div>
                        <div className="text-sm text-white/60">
                          {convertTemp(day.temp.min, tempUnit)}°
                        </div>
                        <div className="text-xs text-white/50 mt-2">
                          {day.condition}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
