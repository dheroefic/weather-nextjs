import { WeatherIcon } from './weather';

export interface NearbyWeatherData {
  currentWeather: {
    temperature: number;
    humidity: number;
    pressure: number;
    wind: {
      speed: number;
      direction: string;
    };
    icon: WeatherIcon;
    condition: string;
    precipitation: number;
    uvIndex: {
      value: number;
      category: string;
    };
  };
}

export interface NearbyLocation {
  latitude: number;
  longitude: number;
  weatherData: NearbyWeatherData | null;
  city?: string;
  country?: string;
}