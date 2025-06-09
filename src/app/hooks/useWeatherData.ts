'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWeatherData } from '@/services/weatherService';
import { getBackgroundImage } from '@/services/backgroundService';
import { loadPreferences, savePreferences } from '@/services/preferencesService';
import { getUserGeolocation, reverseGeocode } from '@/services/geolocationService';
import type { Location, WeatherData, ForecastDay, TemperatureUnit } from '@/types/weather';
import { debug } from '@/utils/debug';

export function useWeatherData() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [location, setLocation] = useState<Location>({ city: '', country: '' });
  const [forecastPeriod, setForecastPeriod] = useState<'4 days' | '8 days' | '14 days'>('14 days');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [tempUnit, setTempUnit] = useState<TemperatureUnit>('C');
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<ForecastDay | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10);
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
    if (fetchingRef.current) return;
    
    try {
      fetchingRef.current = true;
      setSelectedDay(null);
      
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
          debug.warn('Failed to load background image:', bgError);
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
            debug.warn('Reverse geocoding failed:', locationResponse.error);
            setLocation(defaultLocation);
          }
        } else {
          debug.warn('Geolocation failed:', geoResponse.error);
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

  return {
    // State
    currentTime,
    location,
    forecastPeriod,
    weatherData,
    tempUnit,
    loading,
    selectedDay,
    autoRefreshInterval,
    showSettings,
    backgroundImage,
    showMap,
    showPerfDashboard,
    imageAttribution,
    
    // Actions
    setLocation,
    setForecastPeriod,
    setSelectedDay,
    setShowSettings,
    setShowMap,
    setShowPerfDashboard,
    setBackgroundImage,
    convertTemp,
    toggleTempUnit,
    handleRefresh,
    handleAutoRefreshChange
  };
}
