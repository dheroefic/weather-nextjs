'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import CurrentWeather from '@/components/CurrentWeather';
import WeatherMetrics from '@/components/WeatherMetrics';
import DailyForecast from '@/components/DailyForecast';
import DetailPanel from '@/components/DetailPanel';
import { fetchWeatherData } from '@/services/weatherService';
import { getBackgroundImage } from '@/services/backgroundService';
import './weather-backgrounds.css';

import type { Location, WeatherData, ForecastDay, TemperatureUnit } from '@/types/weather';

export default function WeatherApp() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [location, setLocation] = useState<Location>({ city: '', country: '' });
  const [forecastPeriod, setForecastPeriod] = useState<'4 days' | '8 days' | '14 days'>('4 days');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [tempUnit, setTempUnit] = useState<TemperatureUnit>('C');
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<ForecastDay | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [imageAttribution, setImageAttribution] = useState<{
    photographerName: string;
    photographerUsername: string;
    photographerUrl: string;
  } | null>(null);

  const convertTemp = (temp: number, unit: TemperatureUnit): number => {
    if (unit === 'F') {
      return Math.round((temp * 9/5) + 32);
    }
    return temp;
  };

  const toggleTempUnit = () => {
    setTempUnit(prev => prev === 'C' ? 'F' : 'C');
  };

  const fetchData = useCallback(async () => {
    try {
      setWeatherData(null);
      setSelectedDay(null);
      setForecastPeriod('4 days');
      
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

        // Get background image based on weather condition
        const weatherCondition = data.currentWeather.condition.toLowerCase();
        const condition = weatherCondition.includes('rain') ? 'rain'
          : weatherCondition.includes('cloud') ? 'cloudy'
          : weatherCondition.includes('snow') ? 'snow'
          : weatherCondition.includes('storm') ? 'storm'
          : weatherCondition.includes('clear') || weatherCondition.includes('sunny') ? 'sunny'
          : 'default';

        const backgroundResult = await getBackgroundImage(condition);
        setBackgroundImage(backgroundResult.imageUrl);
        setImageAttribution(backgroundResult.attribution || null);
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
  }, [location.coordinates]);

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  const handleAutoRefreshChange = (minutes: number | null) => {
    setAutoRefreshInterval(minutes);
    setShowSettings(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchData();

    // Set default auto-refresh interval to 10 minutes
    setAutoRefreshInterval(10);

    // Start auto-refresh timer
    const timer = setInterval(() => {
      fetchData();
    }, 10 * 60 * 1000); // 10 minutes in milliseconds

    return () => clearInterval(timer);
  }, [location.coordinates, fetchData]);

  useEffect(() => {
    if (autoRefreshInterval === null) return;

    const intervalId = setInterval(() => {
      fetchData();
    }, autoRefreshInterval * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [autoRefreshInterval, fetchData]);

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

  const currentWeather = weatherData?.currentWeather.condition || 'Loading...';

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-0 md:p-4 relative">
      <div className="fixed inset-0 z-0">
        <Image
          src={backgroundImage || '/background-weather/a-default.jpg'}
          alt={`Weather background showing ${currentWeather}`}
          fill
          priority
          quality={85}
          sizes="100vw"
          style={{
            objectFit: 'cover',
            filter: 'blur(8px)',
            transform: 'scale(1.1)'
          }}
        />
      </div>
      <div className="w-full h-full min-h-screen md:h-auto md:min-h-0 md:max-w-3xl bg-black/20 backdrop-blur-lg md:rounded-3xl overflow-hidden text-white p-3 md:p-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-8 w-full">
          <CurrentWeather
            weatherData={weatherData}
            location={location}
            currentTime={currentTime}
            tempUnit={tempUnit}
            loading={loading}
            onLocationSelect={setLocation}
            onTempUnitToggle={toggleTempUnit}
            convertTemp={convertTemp}
            getWindRotationDegree={getWindRotationDegree}
            formatDate={formatDate}
            formatTime={formatTime}
            handleRefresh={handleRefresh}
            showSettings={showSettings}
            setShowSettings={setShowSettings}
            autoRefreshInterval={autoRefreshInterval}
            handleAutoRefreshChange={handleAutoRefreshChange}
          />
        </div>

        <div className="glass-container p-3 md:p-6 mb-3 md:mb-6 rounded-xl md:rounded-2xl backdrop-blur-md bg-white/5">
          <div className={`text-2xl md:text-5xl mb-3 md:mb-5 font-bold ${loading ? 'loading-element' : ''} flex items-center gap-2 md:gap-3`}>
            {weatherData && (
              <>
                {weatherData.currentWeather.condition}
                <Image
                  src={`${weatherData.currentWeather.icon}`}
                  alt={weatherData.currentWeather.condition}
                  width={48}
                  height={48}
                  className="weather-icon w-6 h-6 md:w-12 md:h-12"
                />
              </>
            )}
          </div>
          <div className={`text-base md:text-xl text-white/90 ${loading ? 'loading-element' : ''} flex items-center gap-2`}>
            {weatherData && (
              <>
                {weatherData.currentWeather.condition} with a temperature of {convertTemp(weatherData.currentWeather.temperature, tempUnit)}°{tempUnit}. {weatherData.currentWeather.wind.speed > 20 ? 'Strong' : 'Light to moderate'} {weatherData.currentWeather.wind.direction} winds at {weatherData.currentWeather.wind.speed} km/h.
              </>
            )}
          </div>
        </div>

        <WeatherMetrics weatherData={weatherData} loading={loading} />

        <DailyForecast
          forecastPeriod={forecastPeriod}
          loading={loading}
          dailyForecast={weatherData?.dailyForecast}
          tempUnit={tempUnit}
          convertTemp={convertTemp}
          onForecastPeriodChange={setForecastPeriod}
          onDaySelect={setSelectedDay}
        />

        <DetailPanel
          selectedDay={selectedDay}
          weatherData={weatherData}
          tempUnit={tempUnit}
          convertTemp={convertTemp}
          onClose={() => setSelectedDay(null)}
        />

        <div className="glass-container p-2 text-center text-[10px] text-white/40 rounded-lg backdrop-blur-md bg-white/5 mt-4">
          <p>
            Created with 🩷 by dheroefic • Images: {imageAttribution ? (
              <>
                Photo by <a href={imageAttribution.photographerUrl} className="hover:text-white/60" target="_blank" rel="noopener noreferrer">{imageAttribution.photographerName}</a> on <a href="https://unsplash.com" className="hover:text-white/60" target="_blank" rel="noopener noreferrer">Unsplash</a>
              </>
            ) : (
              <a href="https://unsplash.com" className="hover:text-white/60" target="_blank" rel="noopener noreferrer">Unsplash</a>
            )} • Weather Data: <a href="https://open-meteo.com" className="hover:text-white/60" target="_blank" rel="noopener noreferrer">Open Meteo</a> • Icons: <a href="https://bas.dev/about" className="hover:text-white/60" target="_blank" rel="noopener noreferrer">Bas Milius</a>
          </p>
        </div>
      </div>
    </div>
  );
}

