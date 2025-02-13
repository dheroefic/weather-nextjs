'use client';

import { useState, useEffect, ReactNode } from 'react';
import { HeavyRainIcon, PartlyCloudyIcon, FogIcon, WindIcon, PrecipitationIcon, UVIndexIcon, HumidityIcon, PressureIcon } from '@/components/icons';
import LocationSelector from '@/components/LocationSelector';
import { fetchWeatherData } from '@/services/weatherService';
import './weather-backgrounds.css';

import type { WeatherIcon } from '@/services/weatherService';
type TemperatureUnit = 'C' | 'F';

interface Location {
  city: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface ForecastDay {
  date: string;
  condition: string;
  icon: WeatherIcon;
  temp: {
    min: number;
    max: number;
  };
}

interface WeatherData {
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
  }>;
  dailyForecast: ForecastDay[];
}


  export default function WeatherApp() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [location, setLocation] = useState<Location>({ city: 'Loading...', country: '' });
  const [forecastPeriod, setForecastPeriod] = useState<'4 days' | '8 days' | '14 days'>('4 days');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [tempUnit, setTempUnit] = useState<TemperatureUnit>('C');
  const [loading, setLoading] = useState(true);

  const convertTemp = (temp: number, unit: TemperatureUnit): number => {
    if (unit === 'F') {
      return Math.round((temp * 9/5) + 32);
    }
    return temp;
  };

  const toggleTempUnit = () => {
    setTempUnit(prev => prev === 'C' ? 'F' : 'C');
  };


  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!location.coordinates) {
          setLoading(false);
          return;
        }
        
        const data = await fetchWeatherData(
          location.coordinates.latitude,
          location.coordinates.longitude
        );

        if (data && data.currentWeather && data.hourlyForecast && data.dailyForecast) {
          setWeatherData(data);
        } else {
          console.error('Invalid weather data structure received');
          setWeatherData(null);
        }
      } catch (error) {
        console.error('Error fetching weather data:', error);
        setWeatherData(null);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchData();
  }, [location.coordinates]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const defaultLocation = {
      city: 'Jakarta',
      country: 'Indonesia',
      coordinates: {
        latitude: -6.2088,
        longitude: 106.8456
      }
    };

    if (navigator.geolocation) {
      timeoutId = setTimeout(() => {
        setLocation(defaultLocation);
      }, 5000);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(timeoutId);
          try {
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
            );
            const data = await response.json();
            setLocation({
              city: data.city || 'Unknown City',
              country: data.countryName || 'Unknown Country',
              coordinates: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              }
            });
          } catch (error) {
            console.error('Error fetching location:', error);
            setLocation(defaultLocation);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          clearTimeout(timeoutId);
          setLocation(defaultLocation);
        }
      );
    } else {
      setLocation(defaultLocation);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getWindRotationDegree = (direction: string): number => {
    const directions = {
      'North': 0,
      'Northeast': 45,
      'East': 90,
      'Southeast': 135,
      'South': 180,
      'Southwest': 225,
      'West': 270,
      'Northwest': 315
    };
    return directions[direction as keyof typeof directions] || 0;
  };

  const getWeatherClass = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'heavy rain':
      case 'rain':
      case 'light rain':
        return 'weather-heavy-rain';
      case 'partly cloudy':
        return 'weather-partly-cloudy';
      case 'cloudy':
        return 'weather-cloudy';
      case 'fog':
        return 'weather-fog';
      case 'clear sky':
        return 'weather-sunny';
      default:
        return 'weather-default';
    }
  };

  const currentWeather = weatherData?.currentWeather.condition || 'Loading...';
  const weatherClass = getWeatherClass(currentWeather);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-0 md:p-4 relative">
      <div className={`weather-background ${weatherClass}`} />
      <div className="w-full h-full min-h-screen md:h-auto md:min-h-0 md:max-w-3xl bg-black/20 backdrop-blur-lg md:rounded-3xl overflow-hidden text-white p-3 md:p-8 relative">
        <div className="flex flex-col gap-4 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-8">
            <div>
              <div className="flex items-center gap-3">
                <div className="text-5xl md:text-6xl font-bold temperature-display">
                  {weatherData ? convertTemp(weatherData.currentWeather.temperature, tempUnit) : '--'}°{tempUnit}
                </div>
                <button
                  onClick={toggleTempUnit}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-sm font-medium backdrop-blur-sm"
                >
                  °{tempUnit === 'C' ? 'F' : 'C'}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <WindIcon
                  className={`w-5 h-5 transform transition-transform duration-300 ${loading ? 'loading-element' : ''}`}
                  style={{
                    transform: weatherData
                      ? `rotate(${getWindRotationDegree(weatherData.currentWeather.wind.direction)}deg)`
                      : 'rotate(0deg)',
                    animation: weatherData
                      ? `float ${Math.max(5 - weatherData.currentWeather.wind.speed / 10, 1)}s ease-in-out infinite`
                      : 'none'
                  }}
                />
                <span className={`text-base ${loading ? 'loading-element' : ''}`}>
                  {weatherData ? `${weatherData.currentWeather.wind.direction}, ${weatherData.currentWeather.wind.speed} km/h` : '--'}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-start md:items-end">
              <div className="text-base md:text-xl font-medium opacity-90">{formatDate(currentTime)}</div>
              <div className="text-2xl md:text-3xl font-bold">{formatTime(currentTime)}</div>
              <div className="mt-2">
                <LocationSelector
                  currentLocation={location}
                  onLocationSelect={setLocation}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-container p-4 md:p-6 mb-6 md:mb-8 rounded-xl md:rounded-2xl backdrop-blur-md bg-white/5">
          <div className={`text-2xl md:text-4xl mb-3 md:mb-4 font-bold ${loading ? 'loading-element' : ''} flex items-center gap-3`}>
            {weatherData ? (
              <>
                {weatherData.currentWeather.condition}
                <weatherData.currentWeather.icon className="weather-icon w-8 h-8 md:w-10 md:h-10" />
              </>
            ) : 'Loading...'}
          </div>
          <div className={`text-sm md:text-lg text-white/80 ${loading ? 'loading-element' : ''} flex items-center gap-2`}>
            {weatherData ? (
              <>
                {weatherData.currentWeather.condition} with a temperature of {convertTemp(weatherData.currentWeather.temperature, tempUnit)}°{tempUnit}. {weatherData.currentWeather.wind.speed > 20 ? 'Strong' : 'Light to moderate'} {weatherData.currentWeather.wind.direction} winds at {weatherData.currentWeather.wind.speed} km/h.
              </>
            ) : 'Fetching weather information...'}
          </div>
        </div>

        <div className="glass-container p-4 md:p-6 mb-6 md:mb-8 rounded-xl md:rounded-2xl backdrop-blur-md bg-white/5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-white/5 rounded-lg group relative cursor-help">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm opacity-70">Precipitation</div>
                  <div className={`text-lg font-semibold ${loading ? 'loading-element w-16' : ''}`}>
                    {weatherData ? `${weatherData.currentWeather.precipitation}%` : ''}
                  </div>
                </div>
                <PrecipitationIcon className="w-5 h-5 opacity-70" />
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/80 backdrop-blur-sm rounded-lg text-sm w-64 invisible group-hover:visible transition-all duration-200 z-10">
                Precipitation probability indicates the chance of rain or snow. A higher percentage means more likely precipitation, helping you plan outdoor activities.
              </div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg group relative cursor-help">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm opacity-70">UV Index</div>
                  <div className={`text-lg font-semibold ${loading ? 'loading-element w-32' : ''}`}>
                    {weatherData ? (
                      <>
                        {weatherData.currentWeather.uvIndex.value} - {weatherData.currentWeather.uvIndex.category}
                      </>
                    ) : ''}
                  </div>
                </div>
                <UVIndexIcon className="w-5 h-5 opacity-70" />
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/80 backdrop-blur-sm rounded-lg text-sm w-64 invisible group-hover:visible transition-all duration-200 z-10">
                UV Index measures sun exposure intensity (0-11+). Low (0-2), Moderate (3-5), High (6-7), Very High (8-10), Extreme (11+). Higher values require more sun protection.
              </div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg group relative cursor-help">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm opacity-70">Humidity</div>
                  <div className={`text-lg font-semibold ${loading ? 'loading-element w-16' : ''}`}>
                    {weatherData ? `${weatherData.currentWeather.humidity}%` : ''}
                  </div>
                </div>
                <HumidityIcon className="w-5 h-5 opacity-70" />
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/80 backdrop-blur-sm rounded-lg text-sm w-64 invisible group-hover:visible transition-all duration-200 z-10">
                Relative humidity shows the amount of moisture in the air. 30-50% is comfortable, while higher values can make it feel warmer and more uncomfortable.
              </div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg group relative cursor-help">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm opacity-70">Pressure</div>
                  <div className={`text-lg font-semibold ${loading ? 'loading-element w-24' : ''}`}>
                    {weatherData ? `${weatherData.currentWeather.pressure} hPa` : ''}
                  </div>
                </div>
                <PressureIcon className="w-5 h-5 opacity-70" />
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/80 backdrop-blur-sm rounded-lg text-sm w-64 invisible group-hover:visible transition-all duration-200 z-10">
                Atmospheric pressure in hectopascals (hPa). Normal is ~1013 hPa. Lower pressure often means unsettled weather, while higher pressure typically indicates stable conditions.
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-3 md:gap-0">
          <div className={`text-base md:text-xl font-semibold ${loading ? 'loading-pulse' : ''}`}>Daily Weather Outlook</div>
          <div className="flex flex-wrap md:flex-nowrap gap-2 md:gap-3">
            <button
              onClick={() => setForecastPeriod('4 days')}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm transition-all duration-300 ${forecastPeriod === '4 days' ? 'bg-white/20 shadow-lg' : 'bg-white/5 hover:bg-white/10'}`}
            >
              4 days
            </button>
            <button
              onClick={() => setForecastPeriod('8 days')}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm transition-all duration-300 ${forecastPeriod === '8 days' ? 'bg-white/20 shadow-lg' : 'bg-white/5 hover:bg-white/10'}`}
            >
              8 days
            </button>
            <button
              onClick={() => setForecastPeriod('14 days')}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm transition-all duration-300 ${forecastPeriod === '14 days' ? 'bg-white/20 shadow-lg' : 'bg-white/5 hover:bg-white/10'}`}
            >
              14 days
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-grid grid-flow-col auto-cols-[minmax(200px,1fr)] gap-3 md:gap-4 pb-4">
            {loading ? (
              Array.from({ length: forecastPeriod === '4 days' ? 4 : forecastPeriod === '8 days' ? 8 : 14 }).map((_, index) => (
                <div key={index} className="p-3 md:p-4 bg-white/5 rounded-xl min-w-[200px]">
                  <div className="loading-element w-24 h-4 mb-2"></div>
                  <div className="loading-element w-10 h-10 mb-2"></div>
                  <div className="loading-element w-32 h-4 mt-2"></div>
                  <div className="loading-element w-24 h-4 mt-2"></div>
                </div>
              ))
            ) : (
              weatherData?.dailyForecast.slice(0, forecastPeriod === '4 days' ? 4 : forecastPeriod === '8 days' ? 8 : 14).map((day, index) => {
                const Icon = day.icon;
                return (
                  <div key={index} className="p-3 md:p-4 bg-white/5 rounded-xl min-w-[200px]">
                    <div className="text-xs md:text-sm mb-2">{day.date}</div>
                    <Icon className="weather-icon" />
                    <div className="text-xs md:text-sm mt-2">{day.condition}</div>
                    <div className="text-xs md:text-sm">
                      {convertTemp(day.temp.min, tempUnit)}° - {convertTemp(day.temp.max, tempUnit)}°{tempUnit}
                    </div>
                  </div>
                );
              }) || []
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

