'use client';

import { PrecipitationIcon, UVIndexIcon, HumidityIcon, PressureIcon } from '@/components/icons';
import type { WeatherData } from '@/types/weather';

interface WeatherMetricsProps {
  weatherData: WeatherData | null;
  loading: boolean;
}

export default function WeatherMetrics({ weatherData, loading }: WeatherMetricsProps) {
  return (
    <div className="glass-container p-4 md:p-6 mb-6 md:mb-8 rounded-xl md:rounded-2xl backdrop-blur-md bg-white/5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm opacity-70">Precipitation</div>
              <div className={`text-lg font-semibold ${loading ? 'loading-element w-16' : ''}}`}>
                {weatherData ? `${weatherData.currentWeather.precipitation}%` : ''}
              </div>
            </div>
            <PrecipitationIcon className="w-5 h-5 opacity-70" />
          </div>
        </div>

        <div className="p-3 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm opacity-70">UV Index</div>
              <div className={`text-lg font-semibold ${loading ? 'loading-element w-32' : ''}}`}>
                {weatherData ? (
                  <>
                    {weatherData.currentWeather.uvIndex.value} - {weatherData.currentWeather.uvIndex.category}
                  </>
                ) : ''}
              </div>
            </div>
            <UVIndexIcon className="w-5 h-5 opacity-70" />
          </div>
        </div>

        <div className="p-3 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm opacity-70">Humidity</div>
              <div className={`text-lg font-semibold ${loading ? 'loading-element w-16' : ''}}`}>
                {weatherData ? `${weatherData.currentWeather.humidity}%` : ''}
              </div>
            </div>
            <HumidityIcon className="w-5 h-5 opacity-70" />
          </div>
        </div>

        <div className="p-3 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm opacity-70">Pressure</div>
              <div className={`text-lg font-semibold ${loading ? 'loading-element w-24' : ''}}`}>
                {weatherData ? `${weatherData.currentWeather.pressure} hPa` : ''}
              </div>
            </div>
            <PressureIcon className="w-5 h-5 opacity-70" />
          </div>
        </div>
      </div>
    </div>
  );
}