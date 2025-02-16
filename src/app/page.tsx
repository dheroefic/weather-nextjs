'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import WeatherMetrics from '@/components/WeatherMetrics';
import HourlyForecast from '@/components/HourlyForecast';
import DailyForecast from '@/components/DailyForecast';
import DetailPanel from '@/components/DetailPanel';
import MapPanel from '@/components/MapPanel';
import Footer from '@/components/Footer';
import { fetchWeatherData } from '@/services/weatherService';
import { getBackgroundImage } from '@/services/backgroundService';
import { loadPreferences, savePreferences } from '@/services/preferencesService';
import { getUserGeolocation, reverseGeocode } from '@/services/geolocationService';
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
  const [showMap, setShowMap] = useState(false);
  const [imageAttribution, setImageAttribution] = useState<{
    photographerName: string;
    photographerUsername: string;
    photographerUrl: string;
  } | null>(null);

  // Load preferences on initial mount
  useEffect(() => {
    const preferences = loadPreferences();
    if (preferences.tempUnit) setTempUnit(preferences.tempUnit);
    if (preferences.location) setLocation(preferences.location);
  }, []);

  const convertTemp = (temp: number, unit: TemperatureUnit): number => {
    if (unit === 'F') {
      return Math.round((temp * 9/5) + 32);
    }
    return temp;
  };

  const toggleTempUnit = () => {
    const newUnit = tempUnit === 'C' ? 'F' : 'C';
    setTempUnit(newUnit);
    savePreferences({ tempUnit: newUnit });
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

    const initializeLocation = async () => {
      timeoutId = setTimeout(() => {
        setLocation(defaultLocation);
      }, 5000);

      const geoResponse = await getUserGeolocation();
      clearTimeout(timeoutId);

      if (geoResponse.success && geoResponse.data) {
        const locationResponse = await reverseGeocode(geoResponse.data);
        if (locationResponse.success && locationResponse.data) {
          setLocation(locationResponse.data);
        } else {
          console.error('Reverse geocoding error:', locationResponse.error);
          setLocation(defaultLocation);
        }
      } else {
        console.error('Geolocation error:', geoResponse.error);
        setLocation(defaultLocation);
      }
    };

    initializeLocation();

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
        <Header
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
          showMap={showMap}
          setShowMap={setShowMap}
        />

        <WeatherMetrics weatherData={weatherData} loading={loading} />

        <HourlyForecast
          weatherData={weatherData}
          loading={loading}
          tempUnit={tempUnit}
          convertTemp={convertTemp}
        />

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
          onDaySelect={setSelectedDay}
        />

        <MapPanel
          isOpen={showMap}
          weatherData={weatherData}
          onClose={() => setShowMap(false)}
          location={location}
          tempUnit={tempUnit}
          convertTemp={convertTemp}
          onLocationSelect={(coordinates) => {
            setLocation(prev => ({
              ...prev,
              coordinates,
              city: coordinates.city || prev.city,
              country: coordinates.country || prev.country
            }));
          }}
        />

        <Footer imageAttribution={imageAttribution} />
      </div>
    </div>
  );
}

