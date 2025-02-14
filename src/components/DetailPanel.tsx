'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Image from 'next/image';
import type { ForecastDay, TemperatureUnit, WeatherData } from '@/types/weather';
import { PrecipitationIcon, HumidityIcon } from '@/components/icons';
import { getUVIndexIcon } from '@/services/weatherService';

const LoadingFallback = () => (
  <div className="animate-pulse">
    <div className="h-8 w-48 bg-white/10 rounded mb-4"></div>
    <div className="h-24 bg-white/10 rounded mb-6"></div>
    <div className="grid grid-cols-2 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 bg-white/10 rounded"></div>
      ))}
    </div>
    <div className="h-8 w-32 bg-white/10 rounded mb-4"></div>
    <div className="flex gap-3 overflow-x-auto pb-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-32 w-24 bg-white/10 rounded flex-shrink-0"></div>
      ))}
    </div>
  </div>
);

interface DetailPanelProps {
  selectedDay: ForecastDay | null;
  weatherData: WeatherData | null;
  tempUnit: TemperatureUnit;
  convertTemp: (temp: number, unit: TemperatureUnit) => number;
  onClose: () => void;
  onDaySelect: (day: ForecastDay) => void;
}

export default function DetailPanel({
  selectedDay,
  weatherData,
  tempUnit,
  convertTemp,
  onClose,
  onDaySelect
}: DetailPanelProps) {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDay) {
      setIsVisible(true);
      setSlideDirection(null);
    } else {
      setIsVisible(false);
    }
  }, [selectedDay]);

  useEffect(() => {
    if (selectedDay && panelRef.current) {
      requestAnimationFrame(() => {
        if (panelRef.current) {
          panelRef.current.scrollTop = 0;
          setSelectedHour(null);
        }
      });
    }
  }, [selectedDay]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 500); // Wait for animation to complete
  };

  const handlePrevDay = () => {
    const currentIndex = weatherData?.dailyForecast?.findIndex(day => day.date === selectedDay?.date) ?? -1;
    if (currentIndex > 0 && weatherData?.dailyForecast) {
      setSlideDirection('right');
      setTimeout(() => {
        onDaySelect(weatherData.dailyForecast[currentIndex - 1]);
        setSlideDirection(null);
      }, 250);
    }
  };

  const handleNextDay = () => {
    const currentIndex = weatherData?.dailyForecast?.findIndex(day => day.date === selectedDay?.date) ?? -1;
    if (currentIndex < (weatherData?.dailyForecast?.length ?? 0) - 1 && weatherData?.dailyForecast) {
      setSlideDirection('left');
      setTimeout(() => {
        onDaySelect(weatherData.dailyForecast[currentIndex + 1]);
        setSlideDirection(null);
      }, 250);
    }
  };

  if (!selectedDay) return null;

  const hourlyData = selectedDay.hourly?.map((hour, index) => ({
    ...hour,
    isSelected: selectedHour === index
  }));

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ pointerEvents: isVisible ? 'auto' : 'none', zIndex: 99 }}
        onClick={handleClose}
      />
      <div 
        className={`fixed top-0 right-0 h-full w-full md:w-[400px] bg-black/85 backdrop-blur-xl transform transition-all duration-500 ease-in-out ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
        style={{ pointerEvents: isVisible ? 'auto' : 'none', zIndex: 100, backfaceVisibility: 'hidden', willChange: 'transform, opacity' }}
      >
        <div ref={panelRef} className="relative h-full p-3 md:p-6 overflow-y-auto">
          <button 
            onClick={handleClose}
            className="absolute top-3 md:top-6 right-3 md:right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
            aria-label="Close panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="mt-8 md:mt-12">
            <Suspense fallback={<LoadingFallback />}>
              <div 
                className={`transition-transform duration-300 ease-in-out ${slideDirection === 'left' ? '-translate-x-full opacity-0' : slideDirection === 'right' ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}
              >
              </div>
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-semibold">
                  {new Date(selectedDay.date).toLocaleDateString('en-US', { 
                    month: 'short',
                    day: 'numeric',
                    weekday: 'short',
                    year: 'numeric'
                  })}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevDay}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!weatherData?.dailyForecast?.some(day => new Date(day.date) < new Date(selectedDay.date))}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={handleNextDay}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!weatherData?.dailyForecast?.some(day => new Date(day.date) > new Date(selectedDay.date))}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="glass-container p-2.5 md:p-3 rounded-lg md:rounded-xl backdrop-blur-md bg-white/5 mb-4 md:mb-6">
                <div className="flex items-center gap-4">
                  <Image
                    src={selectedDay.icon}
                    alt={selectedDay.condition}
                    width={56}
                    height={56}
                    className="weather-icon w-12 md:w-14 h-12 md:h-14 opacity-80"
                  />
                  <div>
                    <div className="text-base md:text-lg font-semibold">{selectedDay.condition}</div>
                    <div className="text-xl md:text-2xl font-bold">
                      {convertTemp(selectedDay.temp.min, tempUnit)}° - {convertTemp(selectedDay.temp.max, tempUnit)}°{tempUnit}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="p-2.5 md:p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs md:text-sm opacity-70">Precipitation</div>
                      <div className="text-base md:text-lg font-semibold">
                        {selectedDay.precipitation}%
                      </div>
                    </div>
                    <Image src="/icons/weathers/raindrops.svg" alt="Precipitation" width={56} height={56} className="w-12 md:w-14 h-12 md:h-14 opacity-80" />
                  </div>
                </div>

                <div className="p-2.5 md:p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs md:text-sm opacity-70">UV Index</div>
                      <div className="text-base md:text-lg font-semibold">
                        {selectedDay.uvIndex.value} - {selectedDay.uvIndex.category}
                      </div>
                    </div>
                    <Image
                      src={getUVIndexIcon(selectedDay.uvIndex.value)}
                      alt={`UV Index - ${selectedDay.uvIndex.category}`}
                      width={56}
                      height={56}
                      className="w-12 md:w-14 h-12 md:h-14 opacity-80"
                    />
                  </div>
                </div>

                <div className="p-2.5 md:p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs md:text-sm opacity-70">Humidity</div>
                      <div className="text-base md:text-lg font-semibold">
                        {selectedDay.humidity}%
                      </div>
                    </div>
                    <Image src="/icons/weathers/humidity.svg" alt="Humidity" width={56} height={56} className="w-12 md:w-14 h-12 md:h-14 opacity-80" />
                  </div>
                </div>

                <div className="p-2.5 md:p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs md:text-sm opacity-70">Pressure</div>
                      <div className="text-base md:text-lg font-semibold">
                        {selectedDay.pressure} hPa
                      </div>
                    </div>
                    <Image src="/icons/weathers/barometer.svg" alt="Pressure" width={56} height={56} className="w-12 md:w-14 h-12 md:h-14 opacity-80" />
                  </div>
                </div>
              </div>

              <div className="mb-4 md:mb-6">
                <h3 className="text-base md:text-xl font-semibold mb-4">Hourly Forecast</h3>
                <div className="overflow-x-auto pb-4">
                  <div className="inline-flex gap-3">
                    {hourlyData?.map((hour, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedHour(index)}
                        className={`p-2.5 md:p-3 bg-white/5 rounded-lg cursor-pointer transition-all duration-300 min-w-[100px] flex flex-col items-center ${hour.isSelected ? 'bg-white/20 shadow-lg' : 'hover:bg-white/10'}`}
                      >
                        <div className="text-xs md:text-sm mb-2">{hour.time}</div>
                        <div className="flex items-center justify-center mb-2">
                          <Image
                            src={hour.icon}
                            alt="Weather condition"
                            width={32}
                            height={32}
                            className="weather-icon w-8 h-8"
                          />
                        </div>
                        <div className="text-base md:text-lg font-semibold">
                          {convertTemp(hour.temp, tempUnit)}°{tempUnit}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedHour !== null && hourlyData && (
                  <div className="mt-4 p-2.5 md:p-3 bg-white/5 rounded-lg backdrop-blur-sm transition-all duration-300">
                    <div className="text-base md:text-lg font-semibold mb-3">{hourlyData[selectedHour].time}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <PrecipitationIcon className="w-4 h-4 opacity-70" />
                        <span className="text-xs md:text-sm">{hourlyData[selectedHour].precipitation}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HumidityIcon className="w-4 h-4 opacity-70" />
                        <span className="text-xs md:text-sm">{hourlyData[selectedHour].humidity}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}