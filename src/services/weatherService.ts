import type { ForecastDay } from '@/types/weather';
import { debug } from '@/utils/debug';
import { NearbyLocation } from '@/types/nearbyWeather';

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

function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((degrees % 360) / 22.5));
  return directions[index % 16];
}

const getUVCategory = (uvIndex: number): string => {
  if (uvIndex <= 2) return 'Low';
  if (uvIndex <= 5) return 'Moderate';
  if (uvIndex <= 7) return 'High';
  if (uvIndex <= 10) return 'Very High';
  return 'Extreme';
};

export async function getUserGeolocation(): Promise<GeolocationResponse> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        success: false,
        error: 'Geolocation is not supported by your browser'
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
          console.log(error)
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

const WMO_CODES: { [key: number]: { condition: string; icon: WeatherIcon } } = {
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
  65: { condition: 'Heavy Rain', icon: '/icons/weathers/thunderstorms-rain.svg' },
  66: { condition: 'Light Freezing Rain', icon: '/icons/weathers/sleet.svg' },
  67: { condition: 'Heavy Freezing Rain', icon: '/icons/weathers/sleet.svg' },
  71: { condition: 'Light Snow', icon: '/icons/weathers/partly-cloudy-day-snow.svg' },
  73: { condition: 'Moderate Snow', icon: '/icons/weathers/snow.svg' },
  75: { condition: 'Heavy Snow', icon: '/icons/weathers/snow.svg' },
  77: { condition: 'Snow Grains', icon: '/icons/weathers/snowflake.svg' },
  80: { condition: 'Light Rain Showers', icon: '/icons/weathers/partly-cloudy-day-rain.svg' },
  81: { condition: 'Moderate Rain Showers', icon: '/icons/weathers/rain.svg' },
  82: { condition: 'Heavy Rain Showers', icon: '/icons/weathers/thunderstorms-rain.svg' },
  85: { condition: 'Light Snow Showers', icon: '/icons/weathers/partly-cloudy-day-snow.svg' },
  86: { condition: 'Heavy Snow Showers', icon: '/icons/weathers/snow.svg' },
  95: { condition: 'Thunderstorm', icon: '/icons/weathers/thunderstorms.svg' },
  96: { condition: 'Thunderstorm with Light Hail', icon: '/icons/weathers/thunderstorms-day-rain.svg' },
  99: { condition: 'Thunderstorm with Heavy Hail', icon: '/icons/weathers/thunderstorms-day-rain.svg' }
};

/**
 * A helper function to fetch data from the Open-Meteo API.
 * It converts arrays to comma-separated strings for the query parameters.
 */
interface WeatherApiParams {
  latitude: string | number;
  longitude: string | number;
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


async function fetchWeatherForeacastMultipleLocationApi(
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

  // Filter out current date and map remaining days
  const currentDate = new Date().toISOString().split('T')[0];
  const dailyForecast = response.daily.time
    .filter(date => date > currentDate)
    .map((date, index) => {
      // Get the start hour index for this day
      const dayStartIndex = (response.daily.time.indexOf(date)) * 24;
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

export async function fetchNearbyWeatherData(centerLat: number, centerLng: number): Promise<NearbyLocation[]> {
  const radiusKm = 10;
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));
  const gridSize = 4;

  const points: { latitude: number; longitude: number }[] = [];
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const baseLat = centerLat - latDelta + (2 * latDelta * i) / (gridSize - 1);
      const baseLng = centerLng - lngDelta + (2 * lngDelta * j) / (gridSize - 1);

      const randomLat = (Math.random() - 0.5) * latDelta * 0.3;
      const randomLng = (Math.random() - 0.5) * lngDelta * 0.3;
      points.push({
        latitude: baseLat + randomLat,
        longitude: baseLng + randomLng,
      });
    }
  }

  // Use Open-Meteo Weather API with string coordinates
  const latitudes = points.map(point => point.latitude.toString()).join(',');
  const longitudes = points.map(point => point.longitude.toString()).join(',');
  
  const responses = await fetchWeatherForeacastMultipleLocationApi('https://api.open-meteo.com/v1/forecast', {
    latitude: latitudes,
    longitude: longitudes,
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
  const nearbyLocations: NearbyLocation[] = [];

  // Process each response for each location
  responses.forEach((response, i) => {
    const weatherCode = response.hourly.weathercode[currentIndex];
    const weatherInfo = WMO_CODES[weatherCode] || WMO_CODES[0];

    const nearbyLocation: NearbyLocation = {
      latitude: points[i].latitude,
      longitude: points[i].longitude,
      city: `Point ${i + 1}`,
      country: '',
      weatherData: {
        currentWeather: {
          temperature: response.hourly.temperature_2m[currentIndex],
          humidity: response.hourly.relative_humidity_2m[currentIndex],
          pressure: response.hourly.surface_pressure[currentIndex],
          wind: {
            speed: response.hourly.windspeed_10m[currentIndex],
            direction: getWindDirection(response.hourly.winddirection_10m[currentIndex]),
          },
          icon: weatherInfo.icon,
          condition: weatherInfo.condition,
          precipitation: response.hourly.precipitation_probability[currentIndex],
          uvIndex: {
            value: response.hourly.uv_index[currentIndex],
            category: getUVCategory(response.hourly.uv_index[currentIndex]),
          },
        },
      },
    };
    nearbyLocations.push(nearbyLocation);
  });

  return nearbyLocations;
}

