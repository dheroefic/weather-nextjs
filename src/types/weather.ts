import type { ComponentType } from 'react';

export type WeatherIcon = ComponentType<{ className?: string }>;

export type TemperatureUnit = 'C' | 'F';

export interface Location {
  city: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface ForecastDay {
  date: string;
  condition: string;
  icon: WeatherIcon;
  temp: {
    min: number;
    max: number;
  };
  precipitation: number;
  uvIndex: {
    value: number;
    category: string;
  };
  humidity: number;
  pressure: number;
  hourly: Array<{
    time: string;
    temp: number;
    icon: WeatherIcon;
    precipitation: number;
    uvIndex: {
      value: number;
      category: string;
    };
    humidity: number;
    pressure: number;
  }>;
}

export interface WeatherData {
  currentWeather: {
    precipitation: number;
    uvIndex: {
      value: number;
      category: string;
    };
    humidity: number;
    pressure: number;
    temperature: number;
    condition: string;
    icon: WeatherIcon;
    wind: {
      direction: string;
      speed: number;
    };
  };
  hourlyForecast: Array<{
    time: string;
    temp: number;
    icon: WeatherIcon;
    precipitation: number;
    uvIndex: {
      value: number;
      category: string;
    };
    humidity: number;
    pressure: number;
  }>;
  dailyForecast: ForecastDay[];
}