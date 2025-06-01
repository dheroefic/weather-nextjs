'use client';

import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import WeatherMetrics from '@/components/WeatherMetrics';
import HourlyForecast from '@/components/HourlyForecast';
import ErrorBoundary from '@/components/ErrorBoundary';
import { fetchWeatherData } from '@/services/weatherService';
import { getBackgroundImage } from '@/services/backgroundService';
import { loadPreferences, savePreferences } from '@/services/preferencesService';
import { getUserGeolocation, reverseGeocode } from '@/services/geolocationService';
import './weather-backgrounds.css';

import type { Location, WeatherData, ForecastDay, TemperatureUnit } from '@/types/weather';
import PerformanceDashboard from '@/components/PerformanceDashboard';

// Lazy load heavy components
const DailyForecast = lazy(() => import('@/components/DailyForecast'));
const DetailPanel = lazy(() => import('@/components/DetailPanel'));
const MapPanel = lazy(() => import('@/components/MapPanel'));
const Footer = lazy(() => import('@/components/Footer'));

export default function WeatherApp() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [location, setLocation] = useState<Location>({ city: '', country: '' });
  const [forecastPeriod, setForecastPeriod] = useState<'4 days' | '8 days' | '14 days'>('4 days');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [tempUnit, setTempUnit] = useState<TemperatureUnit>('C');
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<ForecastDay | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10); // Default 10 minutes
  const [showSettings, setShowSettings] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showPerfDashboard, setShowPerfDashboard] = useState(false);
  const [imageAttribution, setImageAttribution] = useState<{
    photographerName: string;
    photographerUsername: string;
    photographerUrl: string;
  } | null>(null);

  // Use refs to track timers and prevent multiple instances
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fetchingRef = useRef<boolean>(false);

  // Memoized temperature conversion function
  const convertTemp = useCallback((temp: number, unit: TemperatureUnit): number => {
    if (unit === 'F') {
      return Math.round((temp * 9/5) + 32);
    }
    return Math.round(temp);
  }, []);

  const toggleTempUnit = useCallback(() => {
    const newUnit = tempUnit === 'C' ? 'F' : 'C';
    setTempUnit(newUnit);
    savePreferences({ tempUnit: newUnit });
  }, [tempUnit]);

  // Optimized data fetching with debouncing and error handling
  const fetchData = useCallback(async () => {
    if (fetchingRef.current) return; // Prevent concurrent requests
    
    try {
      fetchingRef.current = true;
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

        // Get background image based on weather condition (with error handling)
        try {
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
        } catch (bgError) {
          console.warn('Failed to load background image:', bgError);
          setBackgroundImage('/background-weather/a-default.jpg');
          setImageAttribution(null);
        }
      } else {
        console.error('Invalid weather data structure received');
        setWeatherData(null);
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
      setWeatherData(null);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [location.coordinates]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleAutoRefreshChange = useCallback((minutes: number | null) => {
    setAutoRefreshInterval(minutes || 10);
    setShowSettings(false);
  }, []);

  // Load preferences on initial mount
  useEffect(() => {
    const preferences = loadPreferences();
    if (preferences.tempUnit) setTempUnit(preferences.tempUnit);
    if (preferences.location) setLocation(preferences.location);
  }, []);

  // Centralized timer management for weather data refresh
  useEffect(() => {
    if (!location.coordinates) return;

    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    // Initial fetch
    setLoading(true);
    fetchData();

    // Set up auto-refresh if enabled
    if (autoRefreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        fetchData();
      }, autoRefreshInterval * 60 * 1000);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [location.coordinates, autoRefreshInterval, fetchData]);

  // Separate timer for clock updates
  useEffect(() => {
    if (clockTimerRef.current) {
      clearInterval(clockTimerRef.current);
    }

    clockTimerRef.current = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      if (clockTimerRef.current) {
        clearInterval(clockTimerRef.current);
        clockTimerRef.current = null;
      }
    };
  }, []);

  // Initialize location with proper error handling and fallback
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
      // Set timeout for fallback location
      timeoutId = setTimeout(() => {
        setLocation(defaultLocation);
      }, 5000);

      try {
        const geoResponse = await getUserGeolocation();
        clearTimeout(timeoutId);

        if (geoResponse.success && geoResponse.data) {
          const locationResponse = await reverseGeocode(geoResponse.data);
          if (locationResponse.success && locationResponse.data) {
            setLocation(locationResponse.data);
          } else {
            console.warn('Reverse geocoding failed:', locationResponse.error);
            setLocation(defaultLocation);
          }
        } else {
          console.warn('Geolocation failed:', geoResponse.error);
          setLocation(defaultLocation);
        }
      } catch (error) {
        console.error('Location initialization error:', error);
        clearTimeout(timeoutId);
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

  // Memoized utility functions to prevent unnecessary re-renders
  const formatDate = useMemo(() => (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  const formatTime = useMemo(() => (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }, []);

  const getWindRotationDegree = useMemo(() => (direction: string): number => {
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
  }, []);

  const currentWeather = weatherData?.currentWeather.condition || 'Loading...';

  return (
    <ErrorBoundary>
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-0 md:p-4 relative">
      <div className="fixed inset-0 z-0">
        <Image
          src={backgroundImage || '/background-weather/a-default.jpg'}
          alt={`Weather background showing ${currentWeather}`}
          fill
          priority
          quality={75}
          sizes="100vw"
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyDzK5shm3SistN6zEE1cZr+mMNIaI/F8jksV/bSKMqW8ByJR8PTEvI/"
          style={{
            objectFit: 'cover',
            filter: 'blur(8px)',
            transform: 'scale(1.1)'
          }}
          onError={() => {
            setBackgroundImage('/background-weather/a-default.jpg');
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

        <Suspense fallback={
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-white/10 rounded mb-6"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-white/10 rounded-xl"></div>
              ))}
            </div>
          </div>
        }>
          <DailyForecast
            forecastPeriod={forecastPeriod}
            loading={loading}
            dailyForecast={weatherData?.dailyForecast}
            tempUnit={tempUnit}
            convertTemp={convertTemp}
            onForecastPeriodChange={setForecastPeriod}
            onDaySelect={setSelectedDay}
          />
        </Suspense>

        <Suspense fallback={
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-white/10 rounded mb-4"></div>
            <div className="h-24 bg-white/10 rounded mb-6"></div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-white/10 rounded"></div>
              ))}
            </div>
          </div>
        }>
          <DetailPanel
            selectedDay={selectedDay}
            weatherData={weatherData}
            tempUnit={tempUnit}
            convertTemp={convertTemp}
            onClose={() => setSelectedDay(null)}
            onDaySelect={setSelectedDay}
          />
        </Suspense>

        <Suspense fallback={
          <div className="animate-pulse">
            <div className="h-96 bg-white/10 rounded-xl"></div>
          </div>
        }>
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
        </Suspense>

        <Suspense fallback={<div className="animate-pulse h-8 bg-white/10 rounded"></div>}>
          <Footer imageAttribution={imageAttribution} />
        </Suspense>

        <PerformanceDashboard
          isVisible={showPerfDashboard}
          onToggle={() => setShowPerfDashboard(!showPerfDashboard)}
        />
      </div>
    </div>
    </ErrorBoundary>
  );
}

