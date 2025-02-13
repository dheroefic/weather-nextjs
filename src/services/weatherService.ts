import type { ForecastDay } from '@/types/weather';
import type { ComponentType } from 'react';
import { HeavyRainIcon, PartlyCloudyIcon, FogIcon } from '@/components/icons';

type WeatherIcon = ComponentType<{ className?: string }>;

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
    uvIndex: {
      value: number;
      category: string;
    };
    humidity: number;
    pressure: number;
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
}> {
  const response = await fetchWeatherApi('https://api.open-meteo.com/v1/forecast', {
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
      'temperature_2m_max',
      'temperature_2m_min',
      'weathercode',
      'precipitation_probability_max',
      'uv_index_max'
    ],
    timezone: 'auto'
  });

  const currentIndex = new Date().getHours();
  const currentWeatherCode = response.hourly.weathercode[currentIndex];
  const weatherInfo = WMO_CODES[currentWeatherCode] || WMO_CODES[0];

  const getWindDirection = (degrees: number): string => {
    const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  const getUVCategory = (uvIndex: number): string => {
    if (uvIndex <= 2) return 'Low';
    if (uvIndex <= 5) return 'Moderate';
    if (uvIndex <= 7) return 'High';
    if (uvIndex <= 10) return 'Very High';
    return 'Extreme';
  };

  const hourlyForecast = response.hourly.time.map((time, index) => ({
    time,
    temp: response.hourly.temperature_2m[index],
    icon: WMO_CODES[response.hourly.weathercode[index]]?.icon || WMO_CODES[0].icon,
    precipitation: response.hourly.precipitation_probability[index],
    uvIndex: {
      value: response.hourly.uv_index[index],
      category: getUVCategory(response.hourly.uv_index[index])
    },
    humidity: response.hourly.relative_humidity_2m[index],
    pressure: response.hourly.surface_pressure[index]
  }));

  const dailyForecast = response.daily.time.map((date, index) => {
    // Get the start hour index for this day
    const dayStartIndex = index * 24;
    // Get 24 hours of data for this day
    const dayHourlyData = Array.from({ length: 24 }, (_, hourIndex) => {
      const absoluteIndex = dayStartIndex + hourIndex;
      return {
        time: new Date(response.hourly.time[absoluteIndex]).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        temp: response.hourly.temperature_2m[absoluteIndex],
        icon: WMO_CODES[response.hourly.weathercode[absoluteIndex]]?.icon || WMO_CODES[0].icon,
        precipitation: response.hourly.precipitation_probability[absoluteIndex],
        uvIndex: {
          value: response.hourly.uv_index[absoluteIndex],
          category: getUVCategory(response.hourly.uv_index[absoluteIndex])
        },
        humidity: response.hourly.relative_humidity_2m[absoluteIndex],
        pressure: response.hourly.surface_pressure[absoluteIndex]
      };
    });

    return {
      date,
      condition: WMO_CODES[response.daily.weathercode[index]]?.condition || 'Clear Sky',
      icon: WMO_CODES[response.daily.weathercode[index]]?.icon || WMO_CODES[0].icon,
      temp: {
        min: response.daily.temperature_2m_min[index],
        max: response.daily.temperature_2m_max[index]
      },
      precipitation: response.daily.precipitation_probability_max[index],
      uvIndex: {
        value: response.daily.uv_index_max[index],
        category: getUVCategory(response.daily.uv_index_max[index])
      },
      humidity: response.hourly.relative_humidity_2m[index * 24],
      pressure: response.hourly.surface_pressure[index * 24],
      hourly: dayHourlyData
    };
  });

  return {
    currentWeather: {
      temperature: response.hourly.temperature_2m[currentIndex],
      condition: weatherInfo.condition,
      icon: weatherInfo.icon,
      wind: {
        speed: response.hourly.windspeed_10m[currentIndex],
        direction: getWindDirection(response.hourly.winddirection_10m[currentIndex])
      },
      precipitation: response.hourly.precipitation_probability[currentIndex],
      uvIndex: {
        value: response.hourly.uv_index[currentIndex],
        category: getUVCategory(response.hourly.uv_index[currentIndex])
      },
      humidity: response.hourly.relative_humidity_2m[currentIndex],
      pressure: response.hourly.surface_pressure[currentIndex]
    },
    hourlyForecast,
    dailyForecast
  };
}
