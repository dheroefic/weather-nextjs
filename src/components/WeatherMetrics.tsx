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
    <div className="p-2.5 md:p-3 bg-white/5 rounded-lg">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs md:text-sm opacity-70">{title}</div>
          <div className={`text-base md:text-lg font-semibold loading-element ${width}`}></div>
        </div>
        <div className="w-12 md:w-14 h-12 md:h-14 loading-element rounded-lg"></div>
      </div>
    </div>
  ));

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
      <div className="glass-container p-3 md:p-6 mb-4 md:mb-8 rounded-lg md:rounded-2xl backdrop-blur-md bg-white/5">
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <LoadingMetric title="Weather Condition" width="w-32" />
          <LoadingMetric title="Precipitation" width="w-16" />
          <LoadingMetric title="UV Index" width="w-32" />
          <LoadingMetric title="Humidity" width="w-16" />
          <LoadingMetric title="Wind (Beaufort)" width="w-24" />
          <LoadingMetric title="Pressure" width="w-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-container p-3 md:p-6 mb-4 md:mb-8 rounded-lg md:rounded-2xl backdrop-blur-md bg-white/5">
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="p-2.5 md:p-3 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs md:text-sm opacity-70">Weather Condition</div>
              <div className="text-base md:text-lg font-semibold">
                {weatherData ? weatherData.currentWeather.condition : ''}
              </div>
            </div>
            {weatherData && (
              <Image
                src={weatherData.currentWeather.icon}
                alt={weatherData.currentWeather.condition}
                width={56}
                height={56}
                className="w-12 md:w-14 h-12 md:h-14 opacity-80"
              />
            )}
          </div>
        </div>

        <div className="p-2.5 md:p-3 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs md:text-sm opacity-70">Precipitation</div>
              <div className="text-base md:text-lg font-semibold">
                {weatherData ? `${weatherData.currentWeather.precipitation}%` : ''}
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
                width={56}
                height={56}
                className="w-12 md:w-14 h-12 md:h-14 opacity-80"
              />
            )}
          </div>
        </div>

        <div className="p-2.5 md:p-3 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs md:text-sm opacity-70">Humidity</div>
              <div className="text-base md:text-lg font-semibold">
                {weatherData ? `${weatherData.currentWeather.humidity}%` : ''}
              </div>
            </div>
            <Image src="/icons/weathers/humidity.svg" alt="Humidity" width={56} height={56} className="w-12 md:w-14 h-12 md:h-14 opacity-80" />
          </div>
        </div>

        <div className="p-2.5 md:p-3 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs md:text-sm opacity-70">Wind (Beaufort)</div>
              <div className="text-base md:text-lg font-semibold">
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
                width={56}
                height={56}
                className="w-12 md:w-14 h-12 md:h-14 opacity-80"
              />
            )}
          </div>
        </div>

        <div className="p-2.5 md:p-3 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs md:text-sm opacity-70">Pressure</div>
              <div className="text-base md:text-lg font-semibold">
                {weatherData ? `${weatherData.currentWeather.pressure} hPa` : ''}
              </div>
            </div>
            <Image src="/icons/weathers/barometer.svg" alt="Pressure" width={56} height={56} className="w-12 md:w-14 h-12 md:h-14 opacity-80" />
          </div>
        </div>
      </div>
    </div>
  );
});

export default WeatherMetrics;