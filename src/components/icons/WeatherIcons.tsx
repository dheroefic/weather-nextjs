'use client';

import Image from 'next/image';
import type { WeatherIcon } from '@/types/weather';

const createWeatherIcon = (iconPath: string): WeatherIcon => {
  const WeatherIcon: WeatherIcon = ({ className = '' }) => (
    <div className={`relative ${className}`}>
      <Image
        src={`/icons/weathers/${iconPath}`}
        alt="Weather condition"
        width={40}
        height={40}
        className="w-full h-full"
      />
    </div>
  );
  return WeatherIcon;
};

// Weather condition icons
export const ClearSkyIcon = createWeatherIcon('clear-day.svg');
export const PartlyCloudyIcon = createWeatherIcon('partly-cloudy-day.svg');
export const CloudyIcon = createWeatherIcon('cloudy.svg');
export const FogIcon = createWeatherIcon('fog.svg');
export const LightRainIcon = createWeatherIcon('partly-cloudy-day-rain.svg');
export const RainIcon = createWeatherIcon('rain.svg');
export const HeavyRainIcon = createWeatherIcon('thunderstorms-rain.svg');