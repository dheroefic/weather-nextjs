'use client';

import Image from 'next/image';
import type { WeatherData } from '@/types/weather';
import { getWindBeaufortIcon, getUVIndexIcon } from '@/services/weatherService';
import React, { memo, useMemo } from 'react';

const getBeaufortScale = (windSpeed: number) => {
  if (windSpeed < 1) return { scale: 0, description: 'Calm' };
  if (windSpeed < 6) return { scale: 1, description: 'Light air' };
  if (windSpeed < 12) return { scale: 2, description: 'Light breeze' };
  if (windSpeed < 20) return { scale: 3, description: 'Gentle breeze' };
  if (windSpeed < 29) return { scale: 4, description: 'Moderate breeze' };
  if (windSpeed < 39) return { scale: 5, description: 'Fresh breeze' };
  if (windSpeed < 50) return { scale: 6, description: 'Strong breeze' };
  if (windSpeed < 62) return { scale: 7, description: 'High wind' };
  if (windSpeed < 75) return { scale: 8, description: 'Gale' };
  if (windSpeed < 89) return { scale: 9, description: 'Strong gale' };
  if (windSpeed < 103) return { scale: 10, description: 'Storm' };
  if (windSpeed < 118) return { scale: 11, description: 'Violent storm' };
  return { scale: 12, description: 'Hurricane' };
};


interface WeatherMetricsProps {
  weatherData: WeatherData | null;
  loading: boolean;
}

const WeatherMetrics = memo(function WeatherMetrics({ weatherData, loading }: WeatherMetricsProps) {
  const LoadingMetric = memo(({ title, width }: { title: string, width: string }) => (
    <div className="p-3 md:p-4 bg-black/10 rounded-lg md:rounded-xl">
      <div className="flex items-center justify-between gap-2 md:gap-3">
        <div>
          <div className="text-xs md:text-sm opacity-70 mb-1">{title}</div>
          <div className={`text-sm md:text-base font-semibold loading-element ${width}`}></div>
        </div>
      </div>
    </div>
  ));
  LoadingMetric.displayName = 'LoadingMetric';

  // Memoize computed values
  const beaufortData = useMemo(() => {
    if (!weatherData?.currentWeather?.wind?.speed) return null;
    return getBeaufortScale(weatherData.currentWeather.wind.speed);
  }, [weatherData?.currentWeather?.wind?.speed]);

  const windIcon = useMemo(() => {
    if (!weatherData?.currentWeather?.wind?.speed) return '';
    return getWindBeaufortIcon(weatherData.currentWeather.wind.speed);
  }, [weatherData?.currentWeather?.wind?.speed]);

  const uvIcon = useMemo(() => {
    if (!weatherData?.currentWeather?.uvIndex?.value) return '';
    return getUVIndexIcon(weatherData.currentWeather.uvIndex.value);
  }, [weatherData?.currentWeather?.uvIndex?.value]);

  if (loading) {
    return (
      <div>
        <div className="text-base md:text-lg font-semibold mb-4 md:mb-6 text-primary">Weather Details</div>
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <LoadingMetric title="Condition" width="w-20" />
          <LoadingMetric title="Precipitation" width="w-12" />
          <LoadingMetric title="UV Index" width="w-16" />
          <LoadingMetric title="Humidity" width="w-12" />
          <LoadingMetric title="Wind" width="w-16" />
          <LoadingMetric title="Pressure" width="w-16" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-base md:text-lg font-semibold mb-4 md:mb-6 text-primary">Weather Details</div>
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="p-3 md:p-4 bg-black/10 rounded-lg md:rounded-xl">
          <div className="flex items-center justify-between gap-2 md:gap-3">
            <div>
              <div className="text-xs md:text-sm opacity-70 mb-1">Weather Condition</div>
              <div className="text-sm md:text-base font-semibold">
                {weatherData ? weatherData.currentWeather.condition : ''}
              </div>
            </div>
            {weatherData && (
              <Image
                src={weatherData.currentWeather.icon}
                alt={weatherData.currentWeather.condition}
                width={40}
                height={40}
                className="w-9 md:w-10 h-9 md:h-10 opacity-80"
              />
            )}
          </div>
        </div>

        <div className="p-3 md:p-4 bg-black/10 rounded-lg md:rounded-xl">
          <div className="flex items-center justify-between gap-2 md:gap-3">
            <div>
              <div className="text-xs md:text-sm opacity-70 mb-1">Precipitation</div>
              <div className="text-sm md:text-base font-semibold">
                {weatherData ? `${weatherData.currentWeather.precipitation}%` : ''}
              </div>
            </div>
            <Image src="/icons/weathers/raindrops.svg" alt="Precipitation" width={40} height={40} className="w-9 md:w-10 h-9 md:h-10 opacity-80" />
          </div>
        </div>

        <div className="p-3 md:p-4 bg-black/10 rounded-lg md:rounded-xl">
          <div className="flex items-center justify-between gap-2 md:gap-3">
            <div>
              <div className="text-xs md:text-sm opacity-70 mb-1">UV Index</div>
              <div className="text-sm md:text-base font-semibold">
                {weatherData ? (
                  <>
                    {weatherData.currentWeather.uvIndex.value} - {weatherData.currentWeather.uvIndex.category}
                  </>
                ) : ''}
              </div>
            </div>
            {uvIcon && (
              <Image
                src={uvIcon}
                alt={`UV Index - ${weatherData?.currentWeather?.uvIndex?.category}`}
                width={40}
                height={40}
                className="w-9 md:w-10 h-9 md:h-10 opacity-80"
              />
            )}
          </div>
        </div>

        <div className="p-3 md:p-4 bg-black/10 rounded-lg md:rounded-xl">
          <div className="flex items-center justify-between gap-2 md:gap-3">
            <div>
              <div className="text-xs md:text-sm opacity-70 mb-1">Humidity</div>
              <div className="text-sm md:text-base font-semibold">
                {weatherData ? `${weatherData.currentWeather.humidity}%` : ''}
              </div>
            </div>
            <Image src="/icons/weathers/humidity.svg" alt="Humidity" width={40} height={40} className="w-9 md:w-10 h-9 md:h-10 opacity-80" />
          </div>
        </div>

        <div className="p-3 md:p-4 bg-black/10 rounded-lg md:rounded-xl">
          <div className="flex items-center justify-between gap-2 md:gap-3">
            <div>
              <div className="text-xs md:text-sm opacity-70 mb-1">Wind (Beaufort)</div>
              <div className="text-sm md:text-base font-semibold">
                {beaufortData ? (
                  <>
                    {beaufortData.scale} - {beaufortData.description}
                  </>
                ) : ''}
              </div>
            </div>
            {windIcon && (
              <Image
                src={windIcon}
                alt="Wind Speed"
                width={40}
                height={40}
                className="w-9 md:w-10 h-9 md:h-10 opacity-80"
              />
            )}
          </div>
        </div>

        <div className="p-3 md:p-4 bg-black/10 rounded-lg md:rounded-xl">
          <div className="flex items-center justify-between gap-2 md:gap-3">
            <div>
              <div className="text-xs md:text-sm opacity-70 mb-1">Pressure</div>
              <div className="text-sm md:text-base font-semibold">
                {weatherData ? `${weatherData.currentWeather.pressure} hPa` : ''}
              </div>
            </div>
            <Image src="/icons/weathers/barometer.svg" alt="Pressure" width={40} height={40} className="w-9 md:w-10 h-9 md:h-10 opacity-80" />
          </div>
        </div>
      </div>
    </div>
  );
});

export default WeatherMetrics;