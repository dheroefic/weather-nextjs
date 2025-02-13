import type { ComponentType } from 'react';

export type WeatherIcon = ComponentType<{ className?: string }>;

export interface ForecastDay {
  date: string;
  condition: string;
  icon: WeatherIcon;
  temp: {
    min: number;
    max: number;
  };
}
import { HeavyRainIcon, PartlyCloudyIcon, FogIcon } from '@/components/icons';

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    temperature_2m: number[];
    weathercode: number[];
    windspeed_10m: number[];
    winddirection_10m: number[];
    precipitation_probability: number[];
    uv_index: number[];
    relative_humidity_2m: number[];
    surface_pressure: number[];
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weathercode: number[];
    precipitation_probability_max: number[];
    uv_index_max: number[];
  };
}

const WMO_CODES: { [key: number]: { condition: string; icon: WeatherIcon } } = {
  0: { condition: 'Clear Sky', icon: PartlyCloudyIcon },
  1: { condition: 'Partly Cloudy', icon: PartlyCloudyIcon },
  2: { condition: 'Partly Cloudy', icon: PartlyCloudyIcon },
  3: { condition: 'Cloudy', icon: PartlyCloudyIcon },
  45: { condition: 'Fog', icon: FogIcon },
  48: { condition: 'Fog', icon: FogIcon },
  51: { condition: 'Light Rain', icon: HeavyRainIcon },
  53: { condition: 'Rain', icon: HeavyRainIcon },
  55: { condition: 'Heavy Rain', icon: HeavyRainIcon },
  61: { condition: 'Light Rain', icon: HeavyRainIcon },
  63: { condition: 'Rain', icon: HeavyRainIcon },
  65: { condition: 'Heavy Rain', icon: HeavyRainIcon },
  80: { condition: 'Light Rain', icon: HeavyRainIcon },
  81: { condition: 'Rain', icon: HeavyRainIcon },
  82: { condition: 'Heavy Rain', icon: HeavyRainIcon },
};

/**
 * A helper function to fetch data from the Open-Meteo API.
 * It converts arrays to comma-separated strings for the query parameters.
 */
interface WeatherApiParams {
  latitude: number;
  longitude: number;
  hourly: string[];
  daily: string[];
  timezone: string;
}

async function fetchWeatherApi(url: string, params: WeatherApiParams): Promise<OpenMeteoResponse> {
  const queryParams = new URLSearchParams();
  // Add forecast_days parameter to get extended forecast data
  queryParams.append('forecast_days', '14');
  
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      queryParams.append(key, value.join(','));
    } else {
      queryParams.append(key, value.toString());
    }
  });

  const response = await fetch(`${url}?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
}

export async function fetchWeatherData(latitude: number, longitude: number): Promise<{
  currentWeather: {
    temperature: number;
    condition: string;
    icon: WeatherIcon;
    wind: {
      speed: number;
      direction: string;
    };
    precipitation: number;
    uvIndex: number;
    humidity: number;
    pressure: number;
  };
  hourlyForecast: Array<{
    time: string;
    temp: number;
    icon: WeatherIcon;
    precipitation: number;
    uvIndex: number;
    humidity: number;
  }>;
  dailyForecast: ForecastDay[];
}> {
  try {
    const params = {
      latitude,
      longitude,
      hourly: [
        'temperature_2m',
        'weathercode',
        'windspeed_10m',
        'winddirection_10m',
        'precipitation_probability',
        'uv_index',
        'relative_humidity_2m',
        'surface_pressure'
      ],
      daily: [
        'weathercode',
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_probability_max',
        'uv_index_max'
      ],
      timezone: 'auto'
    };

    const response = await fetchWeatherApi("https://api.open-meteo.com/v1/forecast", params);

    if (!response || !response.hourly || !response.daily) {
      throw new Error('Invalid response from Open-Meteo API');
    }

    const { hourly, daily } = response;

    const now = new Date();
    const currentTimeISO = now.toISOString().slice(0, 13);
    const foundIndex = hourly.time.findIndex(time => time.startsWith(currentTimeISO));
    const currentIndex = foundIndex >= 0 ? foundIndex : 0;

    const currentWeather = {
      temperature: Math.round(hourly.temperature_2m[currentIndex]),
      ...getWeatherInfo(hourly.weathercode[currentIndex]),
      wind: {
        speed: Math.round(hourly.windspeed_10m[currentIndex]),
        direction: getWindDirection(hourly.winddirection_10m[currentIndex])
      },
      precipitation: hourly.precipitation_probability[currentIndex],
      uvIndex: Math.round(hourly.uv_index[currentIndex]),
      humidity: Math.round(hourly.relative_humidity_2m[currentIndex]),
      pressure: Math.round(hourly.surface_pressure[currentIndex])
    };

    const hourlyForecast = hourly.time
      .slice(currentIndex, currentIndex + 10)
      .map((time, index) => ({
        time: new Date(time).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }),
        temp: Math.round(hourly.temperature_2m[currentIndex + index]),
        ...getWeatherInfo(hourly.weathercode[currentIndex + index]),
        precipitation: hourly.precipitation_probability[currentIndex + index],
        uvIndex: Math.round(hourly.uv_index[currentIndex + index]),
        humidity: Math.round(hourly.relative_humidity_2m[currentIndex + index])
      }));

    const dailyForecast = daily.time.map((date, index) => ({
      date: new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }),
      ...getWeatherInfo(daily.weathercode[index]),
      temp: {
        min: Math.round(daily.temperature_2m_min[index]),
        max: Math.round(daily.temperature_2m_max[index])
      }
    }));

    return { currentWeather, hourlyForecast, dailyForecast };
  } catch (error) {
    console.error('Error in fetchWeatherData:', error);
    throw new Error('Failed to fetch weather data');
  }
}

function getWeatherInfo(code: number) {
  return WMO_CODES[code] || { condition: 'Unknown', icon: PartlyCloudyIcon };
}

function getWindDirection(degrees: number): string {
  const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}
