'use client';

import { useState, useEffect } from 'react';
import { HeavyRainIcon, PartlyCloudyIcon, FogIcon, WindIcon } from '@/components/icons';
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

// Default forecast data for loading state
const defaultForecastData = {
  '3 days': [
    { date: 'Friday, April 21', condition: 'Heavy Rain', icon: HeavyRainIcon, temp: { min: 9, max: 16 } },
    { date: 'Saturday, April 22', condition: 'Partly Cloudy', icon: PartlyCloudyIcon, temp: { min: 9, max: 16 } },
    { date: 'Sunday, April 23', condition: 'Fog', icon: FogIcon, temp: { min: 9, max: 16 } },
  ],
  '7 days': [
    { date: 'Friday, April 21', condition: 'Heavy Rain', icon: HeavyRainIcon, temp: { min: 9, max: 16 } },
    { date: 'Saturday, April 22', condition: 'Partly Cloudy', icon: PartlyCloudyIcon, temp: { min: 9, max: 16 } },
    { date: 'Sunday, April 23', condition: 'Fog', icon: FogIcon, temp: { min: 9, max: 16 } },
    { date: 'Monday, April 24', condition: 'Partly Cloudy', icon: PartlyCloudyIcon, temp: { min: 9, max: 16 } },
    { date: 'Tuesday, April 25', condition: 'Rain', icon: HeavyRainIcon, temp: { min: 9, max: 16 } },
    { date: 'Wednesday, April 26', condition: 'Heavy Rain', icon: HeavyRainIcon, temp: { min: 8, max: 15 } },
    { date: 'Thursday, April 27', condition: 'Fog', icon: FogIcon, temp: { min: 10, max: 17 } },
  ],
  '14 days': [
      // First 14 days
      { date: 'Friday, April 21', condition: 'Heavy Rain', icon: HeavyRainIcon, temp: { min: 9, max: 16 } },
      { date: 'Saturday, April 22', condition: 'Partly Cloudy', icon: PartlyCloudyIcon, temp: { min: 9, max: 16 } },
      { date: 'Sunday, April 23', condition: 'Fog', icon: FogIcon, temp: { min: 9, max: 16 } },
      { date: 'Monday, April 24', condition: 'Partly Cloudy', icon: PartlyCloudyIcon, temp: { min: 9, max: 16 } },
      { date: 'Tuesday, April 25', condition: 'Rain', icon: HeavyRainIcon, temp: { min: 9, max: 16 } },
      { date: 'Wednesday, April 26', condition: 'Heavy Rain', icon: HeavyRainIcon, temp: { min: 8, max: 15 } },
      { date: 'Thursday, April 27', condition: 'Fog', icon: FogIcon, temp: { min: 10, max: 17 } },
      { date: 'Friday, April 28', condition: 'Partly Cloudy', icon: PartlyCloudyIcon, temp: { min: 11, max: 18 } },
      { date: 'Saturday, April 29', condition: 'Rain', icon: HeavyRainIcon, temp: { min: 9, max: 16 } },
      { date: 'Sunday, April 30', condition: 'Partly Cloudy', icon: PartlyCloudyIcon, temp: { min: 10, max: 17 } },
      { date: 'Monday, May 1', condition: 'Heavy Rain', icon: HeavyRainIcon, temp: { min: 8, max: 15 } },
      { date: 'Tuesday, May 2', condition: 'Fog', icon: FogIcon, temp: { min: 9, max: 16 } },
      { date: 'Wednesday, May 3', condition: 'Partly Cloudy', icon: PartlyCloudyIcon, temp: { min: 10, max: 17 } },
      { date: 'Thursday, May 4', condition: 'Rain', icon: HeavyRainIcon, temp: { min: 9, max: 16 } },
      // Additional 16 days
      { date: 'Friday, May 5', condition: 'Partly Cloudy', icon: PartlyCloudyIcon, temp: { min: 10, max: 17 } },
      { date: 'Saturday, May 6', condition: 'Heavy Rain', icon: HeavyRainIcon, temp: { min: 8, max: 15 } },
      { date: 'Sunday, May 7', condition: 'Fog', icon: FogIcon, temp: { min: 9, max: 16 } },
      { date: 'Monday, May 8', condition: 'Partly Cloudy', icon: PartlyCloudyIcon, temp: { min: 11, max: 18 } },
      { date: 'Tuesday, May 9', condition: 'Rain', icon: HeavyRainIcon, temp: { min: 9, max: 16 } },
      { date: 'Wednesday, May 10', condition: 'Heavy Rain', icon: HeavyRainIcon, temp: { min: 8, max: 15 } },
      { date: 'Thursday, May 11', condition: 'Fog', icon: FogIcon, temp: { min: 10, max: 17 } },
      { date: 'Friday, May 12', condition: 'Partly Cloudy', icon: PartlyCloudyIcon, temp: { min: 11, max: 18 } },
      { date: 'Saturday, May 13', condition: 'Rain', icon: HeavyRainIcon, temp: { min: 9, max: 16 } },
      { date: 'Sunday, May 14', condition: 'Partly Cloudy', icon: PartlyCloudyIcon, temp: { min: 10, max: 17 } },
      { date: 'Monday, May 15', condition: 'Heavy Rain', icon: HeavyRainIcon, temp: { min: 8, max: 15 } },
      { date: 'Tuesday, May 16', condition: 'Fog', icon: FogIcon, temp: { min: 9, max: 16 } },
      { date: 'Wednesday, May 17', condition: 'Partly Cloudy', icon: PartlyCloudyIcon, temp: { min: 10, max: 17 } },
      { date: 'Thursday, May 18', condition: 'Rain', icon: HeavyRainIcon, temp: { min: 9, max: 16 } },
      { date: 'Friday, May 19', condition: 'Heavy Rain', icon: HeavyRainIcon, temp: { min: 8, max: 15 } },
      { date: 'Saturday, May 20', condition: 'Fog', icon: FogIcon, temp: { min: 10, max: 17 } },
    ]
  };

  export default function WeatherApp() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [location, setLocation] = useState<Location>({ city: 'Loading...', country: '' });
  const [forecastPeriod, setForecastPeriod] = useState<'3 days' | '7 days' | '14 days'>('3 days');
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

  const handleClipboardAction = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback to a user-friendly message
      alert('Unable to copy to clipboard. Please copy manually.');
    }
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

  const getWeatherClass = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'heavy rain':
      case 'rain':
        return 'weather-heavy-rain';
      case 'partly cloudy':
        return 'weather-partly-cloudy';
      case 'cloudy':
        return 'weather-cloudy';
      case 'fog':
        return 'weather-fog';
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
                <div className="text-5xl md:text-6xl font-bold">
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
                <WindIcon />
                <span className="text-base">{weatherData ? `${weatherData.currentWeather.wind.direction}, ${weatherData.currentWeather.wind.speed} km/h` : '--'}</span>
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
          <div className={`text-2xl md:text-4xl mb-3 md:mb-4 font-bold ${loading ? 'loading-pulse' : ''}`}>
            {weatherData ? weatherData.currentWeather.condition : 'Loading...'}
          </div>
          <div className={`text-sm md:text-lg text-white/80 ${loading ? 'loading-shimmer' : ''}`}>
            {weatherData ? `Current weather conditions in ${location.city}` : 'Fetching weather information...'}
          </div>
        </div>

        <div className="glass-container p-4 md:p-6 mb-6 md:mb-8 rounded-xl md:rounded-2xl backdrop-blur-md bg-white/5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-3 md:gap-0">
            <div className={`text-base md:text-xl font-semibold ${loading ? 'loading-pulse' : ''}`}>The Next Days Forecast</div>
            <div className="flex flex-wrap md:flex-nowrap gap-2 md:gap-3">
              <button
                onClick={() => setForecastPeriod('3 days')}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm transition-all duration-300 ${forecastPeriod === '3 days' ? 'bg-white/20 shadow-lg' : 'bg-white/5 hover:bg-white/10'}`}
              >
                3 days
              </button>
              <button
                onClick={() => setForecastPeriod('7 days')}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm transition-all duration-300 ${forecastPeriod === '7 days' ? 'bg-white/20 shadow-lg' : 'bg-white/5 hover:bg-white/10'}`}
              >
                7 days
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
            <div className="flex gap-3 md:gap-4 pb-4 min-w-max">
              {weatherData?.dailyForecast.slice(0, forecastPeriod === '3 days' ? 3 : forecastPeriod === '7 days' ? 7 : 14).map((day, index) => {
                const Icon = day.icon;
                return (
                  <div key={index} className="flex-shrink-0 w-[160px] p-3 md:p-4 bg-white/5 rounded-xl">
                    <div className="text-xs md:text-sm mb-2">{day.date}</div>
                    <Icon />
                    <div className="text-xs md:text-sm mt-2">{day.condition}</div>
                    <div className="text-xs md:text-sm">
                      {convertTemp(day.temp.min, tempUnit)}° - {convertTemp(day.temp.max, tempUnit)}°{tempUnit}
                    </div>
                  </div>
                );
              }) || []}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto glass-container mb-2">
          <div className={`flex gap-4 pb-2 min-w-fit p-4 backdrop-blur-lg bg-white/10 rounded-xl ${loading ? 'loading-shimmer' : ''}`}>
            {weatherData?.hourlyForecast.map((hour, index) => (
              <div key={index} className="text-center p-2 md:p-3 transition-transform hover:scale-105">
                <div className="text-xs md:text-sm mb-1 md:mb-2">{hour.time}</div>
                <hour.icon />
                <div className="text-xs md:text-sm mt-1 md:mt-2">{convertTemp(hour.temp, tempUnit)}°{tempUnit}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-center text-white/50 text-xs mt-2 mb-4">
          Background images provided by <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/80 transition-colors">Unsplash</a>
        </div>
      </div>
    </div>
  );
}

