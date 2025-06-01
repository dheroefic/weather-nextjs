import type { ForecastDay } from '@/types/weather';
import { debug } from '@/utils/debug';
import { getFromCache, setInCache } from './cacheService';
import { performanceMonitor, requestQueue } from '@/utils/performance';

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

// Request deduplication
const pendingRequests = new Map<string, Promise<OpenMeteoResponse>>();

interface GeolocationResponse {
  success: boolean;
  data?: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  };
  error?: string;
}

export function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((degrees % 360) / 22.5));
  return directions[index % 16];
}

export const getUVCategory = (uvIndex: number): string => {
  if (uvIndex <= 2) return 'Low';
  if (uvIndex <= 5) return 'Moderate';
  if (uvIndex <= 7) return 'High';
  if (uvIndex <= 10) return 'Very High';
  return 'Extreme';
};

export async function getUserGeolocation(): Promise<GeolocationResponse> {
  return new Promise((resolve) => {
    // Guard against non-browser environments.
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({
        success: false,
        error: 'Geolocation is not supported in this environment'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&language=en`
          );
          const data = await response.json();
          
          resolve({
            success: true,
            data: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              city: data.features?.[0]?.name || 'Unknown City',
              country: data.features?.[0]?.country || 'Unknown Country'
            }
          });
        } catch (error) {
          console.error(error);
          resolve({
            success: false,
            error: 'Error fetching location details'
          });
        }
      },
      (error) => {
        resolve({
          success: false,
          error: `Geolocation error: ${error.message}`
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  });
}

type WeatherIconPath = string;

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

export function getUVIndexIcon(uvIndex: number): WeatherIconPath {
  if (uvIndex <= 0) return '/icons/weathers/uv-index-1.svg';
  if (uvIndex <= 2) return '/icons/weathers/uv-index-2.svg';
  if (uvIndex <= 3) return '/icons/weathers/uv-index-3.svg';
  if (uvIndex <= 4) return '/icons/weathers/uv-index-4.svg';
  if (uvIndex <= 5) return '/icons/weathers/uv-index-5.svg';
  if (uvIndex <= 6) return '/icons/weathers/uv-index-6.svg';
  if (uvIndex <= 7) return '/icons/weathers/uv-index-7.svg';
  if (uvIndex <= 8) return '/icons/weathers/uv-index-8.svg';
  return '/icons/weathers/uv-index-9.svg';
}

export function getWindBeaufortIcon(windSpeed: number): WeatherIconPath {
  if (windSpeed < 1) return '/icons/weathers/wind-beaufort-0.svg';
  if (windSpeed < 6) return '/icons/weathers/wind-beaufort-1.svg';
  if (windSpeed < 12) return '/icons/weathers/wind-beaufort-2.svg';
  if (windSpeed < 20) return '/icons/weathers/wind-beaufort-3.svg';
  if (windSpeed < 29) return '/icons/weathers/wind-beaufort-4.svg';
  if (windSpeed < 39) return '/icons/weathers/wind-beaufort-5.svg';
  if (windSpeed < 50) return '/icons/weathers/wind-beaufort-6.svg';
  if (windSpeed < 62) return '/icons/weathers/wind-beaufort-7.svg';
  if (windSpeed < 75) return '/icons/weathers/wind-beaufort-8.svg';
  if (windSpeed < 89) return '/icons/weathers/wind-beaufort-9.svg';
  if (windSpeed < 103) return '/icons/weathers/wind-beaufort-10.svg';
  if (windSpeed < 118) return '/icons/weathers/wind-beaufort-11.svg';
  return '/icons/weathers/wind-beaufort-12.svg';
}

type WeatherIcon = string;

const WMO_CODES: { [key: number]: { condition: string; icon: string } } = {
  0: { condition: 'Clear Sky', icon: '/icons/weathers/clear-day.svg' },
  1: { condition: 'Partly Cloudy', icon: '/icons/weathers/partly-cloudy-day.svg' },
  2: { condition: 'Partly Cloudy', icon: '/icons/weathers/partly-cloudy-day.svg' },
  3: { condition: 'Overcast', icon: '/icons/weathers/overcast.svg' },
  45: { condition: 'Foggy', icon: '/icons/weathers/fog.svg' },
  48: { condition: 'Freezing Fog', icon: '/icons/weathers/fog.svg' },
  51: { condition: 'Light Drizzle', icon: '/icons/weathers/drizzle.svg' },
  53: { condition: 'Moderate Drizzle', icon: '/icons/weathers/partly-cloudy-day-drizzle.svg' },
  55: { condition: 'Heavy Drizzle', icon: '/icons/weathers/rain.svg' },
  56: { condition: 'Light Freezing Drizzle', icon: '/icons/weathers/sleet.svg' },
  57: { condition: 'Heavy Freezing Drizzle', icon: '/icons/weathers/sleet.svg' },
  61: { condition: 'Light Rain', icon: '/icons/weathers/partly-cloudy-day-rain.svg' },
  63: { condition: 'Moderate Rain', icon: '/icons/weathers/rain.svg' },
  65: { condition: 'Heavy Rain', icon: '/icons/weathers/thunderstorms-day-rain.svg' },
  66: { condition: 'Light Freezing Rain', icon: '/icons/weathers/sleet.svg' },
  67: { condition: 'Heavy Freezing Rain', icon: '/icons/weathers/sleet.svg' },
  71: { condition: 'Light Snow', icon: '/icons/weathers/partly-cloudy-day-snow.svg' },
  73: { condition: 'Moderate Snow', icon: '/icons/weathers/snow.svg' },
  75: { condition: 'Heavy Snow', icon: '/icons/weathers/snow.svg' },
  77: { condition: 'Snow Grains', icon: '/icons/weathers/snowflake.svg' },
  80: { condition: 'Light Rain Showers', icon: '/icons/weathers/partly-cloudy-day-rain.svg' },
  81: { condition: 'Moderate Rain Showers', icon: '/icons/weathers/rain.svg' },
  82: { condition: 'Heavy Rain Showers', icon: '/icons/weathers/thunderstorms-day-rain.svg' },
  85: { condition: 'Light Snow Showers', icon: '/icons/weathers/partly-cloudy-day-snow.svg' },
  86: { condition: 'Heavy Snow Showers', icon: '/icons/weathers/snow.svg' },
  95: { condition: 'Thunderstorm', icon: '/icons/weathers/thunderstorms.svg' },
  96: { condition: 'Thunderstorm with Light Hail', icon: '/icons/weathers/thunderstorms-day-rain.svg' },
  99: { condition: 'Thunderstorm with Heavy Hail', icon: '/icons/weathers/thunderstorms-day-rain.svg' }
};

export { WMO_CODES };

interface WeatherApiParams {
  latitude: string | number;
  longitude: string | number;
  hourly: string[];
  daily: string[];
  timezone: string;
}

async function fetchWeatherApi(url: string, params: WeatherApiParams): Promise<OpenMeteoResponse> {
  const queryParams = new URLSearchParams();
  // Add extended forecast days
  queryParams.append('forecast_days', '14');
  
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      queryParams.append(key, value.join(','));
    } else {
      queryParams.append(key, value.toString());
    }
  });

  const requestUrl = `${url}?${queryParams.toString()}`;
  
  // Request deduplication
  if (pendingRequests.has(requestUrl)) {
    debug.api('Using pending request for:', requestUrl);
    return pendingRequests.get(requestUrl)!;
  }

  debug.api('Fetching weather data from:', requestUrl);

  const requestPromise = requestQueue.add(async () => {
    return performanceMonitor.measureAsync<OpenMeteoResponse>(`weather-api-${requestUrl}`, async () => {
      try {
        const response = await fetch(requestUrl, {
          next: { revalidate: 600 }, // 10 minutes cache
        });
        
        if (!response.ok) {
          debug.api('Weather API request failed:', { status: response.status, statusText: response.statusText });
          throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
        }

        const data: OpenMeteoResponse = await response.json();
        debug.api('Weather API response received');
        return data;
      } finally {
        pendingRequests.delete(requestUrl);
      }
    });
  }) as Promise<OpenMeteoResponse>;

  pendingRequests.set(requestUrl, requestPromise);
  return requestPromise;
}

export async function fetchWeatherForeacastMultipleLocationApi(
  url: string,
  params: WeatherApiParams
): Promise<OpenMeteoResponse[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('forecast_days', '1');
  
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      queryParams.append(key, value.join(','));
    } else {
      queryParams.append(key, value.toString());
    }
  });

  const requestUrl = `${url}?${queryParams.toString()}`;
  debug.api('Fetching weather data from:', requestUrl);

  const response = await fetch(requestUrl);
  if (!response.ok) {
    debug.api('Weather API request failed:', { status: response.status, statusText: response.statusText });
    throw new Error('Network response was not ok');
  }

  const data = await response.json();
  debug.api('Weather API response:', data);
  return data;
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
  // Create cache key based on coordinates (rounded to reduce cache misses)
  const cacheKey = `weather_${Math.round(latitude * 100) / 100}_${Math.round(longitude * 100) / 100}`;
  
  // Try to get from cache first
  const cachedData = getFromCache<{
    currentWeather: {
      temperature: number;
      condition: string;
      icon: WeatherIcon;
      wind: { speed: number; direction: string; };
      precipitation: number;
      uvIndex: { value: number; category: string; };
      humidity: number;
      pressure: number;
    };
    hourlyForecast: Array<{
      time: string;
      temp: number;
      icon: WeatherIcon;
      precipitation: number;
      uvIndex: { value: number; category: string; };
      humidity: number;
      pressure: number;
    }>;
    dailyForecast: ForecastDay[];
  }>(cacheKey, true);
  if (cachedData) {
    debug.api('Using cached weather data');
    return cachedData;
  }

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

  const hourlyForecast = response.hourly.time.map((time, index) => ({
    time,
    temp: Math.round(response.hourly.temperature_2m[index]),
    icon: WMO_CODES[response.hourly.weathercode[index]]?.icon || WMO_CODES[0].icon,
    precipitation: Math.round(response.hourly.precipitation_probability[index]),
    uvIndex: {
      value: Math.round(response.hourly.uv_index[index] * 10) / 10,
      category: getUVCategory(response.hourly.uv_index[index])
    },
    humidity: Math.round(response.hourly.relative_humidity_2m[index]),
    pressure: Math.round(response.hourly.surface_pressure[index])
  }));

  const currentDate = new Date().toISOString().split('T')[0];
  const dailyForecast = response.daily.time
    .filter(date => date > currentDate)
    .map((date, index) => {
      const dayStartIndex = (response.daily.time.indexOf(date)) * 24;
      const dayHourlyData = Array.from({ length: 24 }, (_, hourIndex) => {
        const absoluteIndex = dayStartIndex + hourIndex;
        return {
          time: new Date(response.hourly.time[absoluteIndex]).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          temp: Math.round(response.hourly.temperature_2m[absoluteIndex]),
          icon: WMO_CODES[response.hourly.weathercode[absoluteIndex]]?.icon || WMO_CODES[0].icon,
          precipitation: Math.round(response.hourly.precipitation_probability[absoluteIndex]),
          uvIndex: {
            value: Math.round(response.hourly.uv_index[absoluteIndex] * 10) / 10,
            category: getUVCategory(response.hourly.uv_index[absoluteIndex])
          },
          humidity: Math.round(response.hourly.relative_humidity_2m[absoluteIndex]),
          pressure: Math.round(response.hourly.surface_pressure[absoluteIndex])
        };
      });

      return {
        date,
        condition: WMO_CODES[response.daily.weathercode[index]]?.condition || 'Clear Sky',
        icon: WMO_CODES[response.daily.weathercode[index]]?.icon || WMO_CODES[0].icon,
        temp: {
          min: Math.round(response.daily.temperature_2m_min[index]),
          max: Math.round(response.daily.temperature_2m_max[index])
        },
        precipitation: Math.round(response.daily.precipitation_probability_max[index]),
        uvIndex: {
          value: Math.round(response.daily.uv_index_max[index] * 10) / 10,
          category: getUVCategory(response.daily.uv_index_max[index])
        },
        humidity: Math.round(response.hourly.relative_humidity_2m[index * 24]),
        pressure: Math.round(response.hourly.surface_pressure[index * 24]),
        hourly: dayHourlyData
      };
    });

  const weatherData = {
    currentWeather: {
      temperature: Math.round(response.hourly.temperature_2m[currentIndex]),
      condition: weatherInfo.condition,
      icon: weatherInfo.icon,
      wind: {
        speed: Math.round(response.hourly.windspeed_10m[currentIndex]),
        direction: getWindDirection(response.hourly.winddirection_10m[currentIndex])
      },
      precipitation: Math.round(response.hourly.precipitation_probability[currentIndex]),
      uvIndex: {
        value: Math.round(response.hourly.uv_index[currentIndex] * 10) / 10,
        category: getUVCategory(response.hourly.uv_index[currentIndex])
      },
      humidity: Math.round(response.hourly.relative_humidity_2m[currentIndex]),
      pressure: Math.round(response.hourly.surface_pressure[currentIndex])
    },
    hourlyForecast,
    dailyForecast
  };

  // Cache the result
  setInCache(cacheKey, weatherData);
  
  return weatherData;
}
