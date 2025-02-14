'use client';

import Image from 'next/image';
import type { WeatherData, TemperatureUnit } from '@/types/weather';

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

  return (
    <div className="glass-container p-3 md:p-6 mb-4 md:mb-8 rounded-lg md:rounded-2xl backdrop-blur-md bg-white/5">
      <div className="text-base md:text-xl font-semibold mb-4">Hourly Forecast</div>
      {loading ? (
        <LoadingHourlyForecast />
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="inline-flex gap-3">
            {weatherData?.hourlyForecast?.map((hour, index) => (
              <div
                key={index}
                className="p-3 bg-white/5 rounded-lg min-w-[100px] flex flex-col items-center hover:bg-white/10 transition-all duration-300"
              >
                <div className="text-sm mb-2">{new Date(hour.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                <Image
                  src={hour.icon}
                  alt="condition"
                  width={32}
                  height={32}
                  className="weather-icon w-8 h-8 mb-2"
                />
                <div className="text-lg font-semibold">
                  {convertTemp(hour.temp, tempUnit)}°{tempUnit}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}