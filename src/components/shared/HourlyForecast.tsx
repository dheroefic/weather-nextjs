'use client';

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import Image from 'next/image';
import { WeatherData, TemperatureUnit } from '@/types/weather';
import { getUVIndexIcon } from '@/services/weatherService';

interface HourlyForecastProps {
  weatherData: WeatherData | null;
  loading: boolean;
  tempUnit: TemperatureUnit;
  convertTemp: (temp: number, unit: TemperatureUnit) => number;
}

const HourlyForecast = memo(function HourlyForecast({
  weatherData,
  loading,
  tempUnit,
  convertTemp
}: HourlyForecastProps) {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [hasAutoExpanded, setHasAutoExpanded] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hourElementsRef = useRef<(HTMLDivElement | null)[]>([]);
  
  const LoadingHourlyForecast = memo(() => (
    <div className="overflow-x-auto pb-4">
      <div className="inline-flex gap-4 md:gap-5">
        {Array.from({ length: 24 }).map((_, index) => (
          <div
            key={index}
            className="p-3 md:p-4 bg-black/10 rounded-lg md:rounded-xl min-w-[110px] md:min-w-[120px] flex flex-col items-center"
          >
            <div className="loading-element w-16 h-4 mb-3"></div>
            <div className="loading-element w-10 h-10 rounded mb-3"></div>
            <div className="loading-element w-12 h-4"></div>
          </div>
        ))}
      </div>
    </div>
  ));
  LoadingHourlyForecast.displayName = 'LoadingHourlyForecast';

  // Memoize filtered hourly forecast data for better performance
  const currentDayHourlyForecast = useMemo(() => {
    if (!weatherData?.hourlyForecast) return [];
    
    return weatherData.hourlyForecast.filter(hour => {
      const hourDate = new Date(hour.time);
      const today = new Date();
      return hourDate.getDate() === today.getDate() &&
             hourDate.getMonth() === today.getMonth() &&
             hourDate.getFullYear() === today.getFullYear();
    });
  }, [weatherData?.hourlyForecast]);

  // Auto-expand the next hour when component first loads
  useEffect(() => {
    if (!loading && !hasAutoExpanded && currentDayHourlyForecast.length > 0) {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0); // Set to next hour exactly
      
      // Find the index of the hour that matches next hour
      const nextHourIndex = currentDayHourlyForecast.findIndex(hour => {
        const hourTime = new Date(hour.time);
        return hourTime.getHours() === nextHour.getHours();
      });
      
      // If we found the next hour, auto-select it
      if (nextHourIndex !== -1) {
        setSelectedHour(nextHourIndex);
      } else if (currentDayHourlyForecast.length > 0) {
        // Fallback: select the first available hour if next hour not found
        setSelectedHour(0);
      }
      
      setHasAutoExpanded(true);
    }
  }, [loading, hasAutoExpanded, currentDayHourlyForecast]);

  // Center the selected hour in the view
  useEffect(() => {
    if (selectedHour !== null && scrollContainerRef.current && hourElementsRef.current[selectedHour]) {
      const scrollContainer = scrollContainerRef.current;
      const selectedElement = hourElementsRef.current[selectedHour];
      
      if (selectedElement) {
        const containerWidth = scrollContainer.clientWidth;
        const elementLeft = selectedElement.offsetLeft;
        const elementWidth = selectedElement.offsetWidth;
        
        // Calculate the scroll position to center the element
        const scrollLeft = elementLeft - (containerWidth / 2) + (elementWidth / 2);
        
        // Smooth scroll to center the selected hour
        scrollContainer.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });
      }
    }
  }, [selectedHour]);

  // Function to handle hour selection and centering
  const handleHourSelect = (index: number) => {
    setSelectedHour(selectedHour === index ? null : index);
  };

  // Memoize selected hour data
  const selectedHourData = useMemo(() => {
    if (selectedHour === null || !currentDayHourlyForecast[selectedHour]) return null;
    return currentDayHourlyForecast[selectedHour];
  }, [selectedHour, currentDayHourlyForecast]);

  return (
    <div className="mb-6 md:mb-8">
      <div className="text-base md:text-xl font-semibold mb-5 md:mb-6 text-primary">Today&apos;s Hourly Forecast</div>
      {loading ? (
        <LoadingHourlyForecast />
      ) : (
        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto pb-4 relative"
        >
          <div className="inline-flex gap-4 md:gap-5">
            {currentDayHourlyForecast?.map((hour, index) => (
              <div
                key={index}
                ref={(el) => {
                  hourElementsRef.current[index] = el;
                }}
                onClick={() => handleHourSelect(index)}
                className={`p-3 md:p-4 bg-black/10 rounded-lg md:rounded-xl min-w-[110px] md:min-w-[120px] flex flex-col items-center transform hover:scale-[1.002] hover:bg-black/20 hover:shadow-lg transition-all duration-300 relative group overflow-hidden cursor-pointer ${selectedHour === index ? 'bg-black/30 shadow-lg scale-[1.002] ring-2 ring-white/20' : ''}`}
              >
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg pointer-events-none"></div>
                <div className="text-xs md:text-sm mb-3">{new Date(hour.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                <Image
                  src={hour.icon}
                  alt="condition"
                  width={36}
                  height={36}
                  className="w-9 h-9 md:w-11 md:h-11 mb-3 opacity-80"
                />
                <div className="text-base md:text-lg font-semibold mb-2">
                  {convertTemp(hour.temp, tempUnit)}°{tempUnit}
                </div>
                <div className="text-[10px] text-white/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Click for details</div>
              </div>
            ))}
          </div>

          {selectedHourData && (
            <div className="mt-6 p-4 md:p-5 bg-black/10 rounded-lg md:rounded-xl sticky left-0">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <div className="text-sm opacity-70 mb-1">Selected Hour</div>
                  <div className="text-lg font-semibold">
                    {new Date(selectedHourData.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}                  
                  </div>
                </div>
                <Image
                  src={selectedHourData.icon}
                  alt="Weather condition"
                  width={52}
                  height={52}
                  className="w-12 md:w-13 h-12 md:h-13 opacity-80"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Image src={selectedHourData.icon} alt="Temperature" width={28} height={28} className="w-7 h-7 opacity-80" />
                  <div>
                    <div className="text-xs opacity-70 mb-1">Temperature</div>
                    <div className="text-base font-semibold">{convertTemp(selectedHourData.temp, tempUnit)}°{tempUnit}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Image src="/icons/weathers/raindrops.svg" alt="Precipitation" width={28} height={28} className="w-7 h-7 opacity-80" />
                  <div>
                    <div className="text-xs opacity-70 mb-1">Precipitation</div>
                    <div className="text-base font-semibold">{selectedHourData.precipitation}%</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Image src={getUVIndexIcon(selectedHourData.uvIndex.value)} alt="UV Index" width={28} height={28} className="w-7 h-7 opacity-80" />
                  <div>
                    <div className="text-xs opacity-70 mb-1">UV Index</div>
                    <div className="text-base font-semibold">{selectedHourData.uvIndex.value} - {selectedHourData.uvIndex.category}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Image src="/icons/weathers/humidity.svg" alt="Humidity" width={28} height={28} className="w-7 h-7 opacity-80" />
                  <div>
                    <div className="text-xs opacity-70 mb-1">Humidity</div>
                    <div className="text-base font-semibold">{selectedHourData.humidity}%</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default HourlyForecast;