'use client';

export type WeatherIconType = string;

const createWeatherIcon = (iconPath: string): WeatherIconType => `/icons/weathers/${iconPath}`;

// Weather condition icons
export const ClearSkyIcon = createWeatherIcon('clear-day.svg');
export const PartlyCloudyIcon = createWeatherIcon('partly-cloudy-day.svg');
export const CloudyIcon = createWeatherIcon('cloudy.svg');
export const FogIcon = createWeatherIcon('fog.svg');
export const LightRainIcon = createWeatherIcon('partly-cloudy-day-rain.svg');
export const RainIcon = createWeatherIcon('rain.svg');
export const HeavyRainIcon = createWeatherIcon('thunderstorms-rain.svg');

// UV Index icons
export const UVIndex1Icon = createWeatherIcon('uv-index-1.svg');
export const UVIndex2Icon = createWeatherIcon('uv-index-2.svg');
export const UVIndex3Icon = createWeatherIcon('uv-index-3.svg');
export const UVIndex4Icon = createWeatherIcon('uv-index-4.svg');
export const UVIndex5Icon = createWeatherIcon('uv-index-5.svg');
export const UVIndex6Icon = createWeatherIcon('uv-index-6.svg');
export const UVIndex7Icon = createWeatherIcon('uv-index-7.svg');
export const UVIndex8Icon = createWeatherIcon('uv-index-8.svg');
export const UVIndex9Icon = createWeatherIcon('uv-index-9.svg');

// Wind Beaufort scale icons
export const WindBeaufort0Icon = createWeatherIcon('wind-beaufort-0.svg');
export const WindBeaufort1Icon = createWeatherIcon('wind-beaufort-1.svg');
export const WindBeaufort2Icon = createWeatherIcon('wind-beaufort-2.svg');
export const WindBeaufort3Icon = createWeatherIcon('wind-beaufort-3.svg');
export const WindBeaufort4Icon = createWeatherIcon('wind-beaufort-4.svg');
export const WindBeaufort5Icon = createWeatherIcon('wind-beaufort-5.svg');
export const WindBeaufort6Icon = createWeatherIcon('wind-beaufort-6.svg');
export const WindBeaufort7Icon = createWeatherIcon('wind-beaufort-7.svg');
export const WindBeaufort8Icon = createWeatherIcon('wind-beaufort-8.svg');
export const WindBeaufort9Icon = createWeatherIcon('wind-beaufort-9.svg');
export const WindBeaufort10Icon = createWeatherIcon('wind-beaufort-10.svg');
export const WindBeaufort11Icon = createWeatherIcon('wind-beaufort-11.svg');
export const WindBeaufort12Icon = createWeatherIcon('wind-beaufort-12.svg');