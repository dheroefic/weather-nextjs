'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { WeatherData, TemperatureUnit } from '@/types/weather';
import { getUVIndexIcon } from '@/services/weatherService';

interface HourlyForecastProps {
  weatherData: WeatherData | null;
  loading: boolean;
  tempUnit: TemperatureUnit;
  convertTemp: (temp: number, unit: TemperatureUnit) => number;
}

export default function HourlyForecast({
  weatherData,
  loading,
  tempUnit,
  convertTemp
}: HourlyForecastProps) {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const LoadingHourlyForecast = () => (
    <div className="overflow-x-auto pb-4">
      <div className="inline-flex gap-3">
        {Array.from({ length: 24 }).map((_, index) => (
          <div
            key={index}
            className="p-3 bg-white/5 rounded-lg min-w-[100px] flex flex-col items-center"
          >
            <div className="loading-element w-16 h-4 mb-2"></div>
            <div className="loading-element w-8 h-8 mb-2 rounded-lg"></div>
            <div className="loading-element w-12 h-4"></div>
          </div>
        ))}
      </div>
    </div>
  );

  // Filter hourly forecast data for the current day
  const currentDayHourlyForecast = weatherData?.hourlyForecast?.filter(hour => {
    const hourDate = new Date(hour.time);
    const today = new Date();
    return hourDate.getDate() === today.getDate() &&
           hourDate.getMonth() === today.getMonth() &&
           hourDate.getFullYear() === today.getFullYear();
  });

  return (
    <div className="glass-container p-3 md:p-6 mb-4 md:mb-8 rounded-lg md:rounded-2xl backdrop-blur-md bg-white/5">
      <div className="text-base md:text-xl font-semibold mb-4">Today&apos;s Hourly Forecast</div>
      {loading ? (
        <LoadingHourlyForecast />
      ) : (
        <div className="overflow-x-auto pb-4 relative">
          <div className="inline-flex gap-3">
            {currentDayHourlyForecast?.map((hour, index) => (
              <div
                key={index}
                onClick={() => setSelectedHour(selectedHour === index ? null : index)}
                className={`p-2.5 md:p-3 bg-white/5 rounded-lg min-w-[100px] flex flex-col items-center transform hover:scale-[1.002] hover:bg-white/10 hover:shadow-lg transition-all duration-300 relative group overflow-hidden ${selectedHour === index ? 'bg-white/20 shadow-lg scale-[1.002] ring-2 ring-white/20' : ''}`}
              >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg pointer-events-none"></div>
                <div className="text-xs md:text-sm mb-2">{new Date(hour.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                <Image
                  src={hour.icon}
                  alt="condition"
                  width={32}
                  height={32}
                  className="w-8 h-8 md:w-10 md:h-10 mb-2 opacity-80"
                />
                <div className="text-base md:text-lg font-semibold">
                  {convertTemp(hour.temp, tempUnit)}°{tempUnit}
                </div>
                <div className="text-[10px] text-white/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap mt-1">Click for details</div>
              </div>
            ))}
          </div>

          {selectedHour !== null && currentDayHourlyForecast && (
            <div className="mt-4 p-3 bg-white/5 rounded-lg sticky left-0">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <div className="text-sm opacity-70">Selected Hour</div>
                  <div className="text-lg font-semibold">
                    {new Date(currentDayHourlyForecast[selectedHour].time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}                  
                  </div>
                </div>
                <Image
                  src={currentDayHourlyForecast[selectedHour].icon}
                  alt="Weather condition"
                  width={48}
                  height={48}
                  className="w-12 h-12 opacity-80"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Image src={currentDayHourlyForecast[selectedHour].icon} alt="Temperature" width={24} height={24} className="w-6 h-6 opacity-80" />
                  <div>
                    <div className="text-xs opacity-70">Temperature</div>
                    <div className="text-base font-semibold">{convertTemp(currentDayHourlyForecast[selectedHour].temp, tempUnit)}°{tempUnit}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Image src="/icons/weathers/raindrops.svg" alt="Precipitation" width={24} height={24} className="w-6 h-6 opacity-80" />
                  <div>
                    <div className="text-xs opacity-70">Precipitation</div>
                    <div className="text-base font-semibold">{currentDayHourlyForecast[selectedHour].precipitation}%</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Image src={getUVIndexIcon(currentDayHourlyForecast[selectedHour].uvIndex.value)} alt="UV Index" width={24} height={24} className="w-6 h-6 opacity-80" />
                  <div>
                    <div className="text-xs opacity-70">UV Index</div>
                    <div className="text-base font-semibold">{currentDayHourlyForecast[selectedHour].uvIndex.value} - {currentDayHourlyForecast[selectedHour].uvIndex.category}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Image src="/icons/weathers/humidity.svg" alt="Humidity" width={24} height={24} className="w-6 h-6 opacity-80" />
                  <div>
                    <div className="text-xs opacity-70">Humidity</div>
                    <div className="text-base font-semibold">{currentDayHourlyForecast[selectedHour].humidity}%</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}