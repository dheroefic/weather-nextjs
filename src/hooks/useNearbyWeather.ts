'use client';

import { useState, useEffect, useRef } from 'react';
import { NearbyLocation } from '@/types/nearbyWeather';
import { Location } from '@/types/weather';
import { fetchNearbyWeatherData } from '@/services/weatherDistribution';

interface UseNearbyWeatherProps {
  location: Location;
  weatherData?: any; // Current weather data for the main location
  zoomLevel?: number;
  enabled?: boolean;
}

export function useNearbyWeather({ 
  location, 
  weatherData,
  zoomLevel = 13, 
  enabled = true 
}: UseNearbyWeatherProps) {
  const [nearbyWeatherData, setNearbyWeatherData] = useState<NearbyLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to track the current request and avoid race conditions
  const currentRequestRef = useRef<AbortController | null>(null);
  const locationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to fetch nearby weather data
  const fetchNearbyData = async (lat: number, lng: number, zoom: number) => {
    // Cancel any existing request
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
    }

    const controller = new AbortController();
    currentRequestRef.current = controller;

    try {
      setIsLoading(true);
      setError(null);

      // Add current location to the array first
      const currentLocationData: NearbyLocation = {
        latitude: lat,
        longitude: lng,
        weatherData: weatherData?.currentWeather ? {
          currentWeather: weatherData.currentWeather
        } : null,
        city: location.city,
        country: location.country,
      };

      // Start with current location
      setNearbyWeatherData([currentLocationData]);

      // Fetch nearby weather data
      const nearbyData = await fetchNearbyWeatherData(lat, lng, zoom);
      
      // Check if request was aborted
      if (controller.signal.aborted) {
        return;
      }

      // Combine current location with nearby data
      const allLocations = [currentLocationData, ...nearbyData];
      setNearbyWeatherData(allLocations);
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      
      console.error('Error fetching nearby weather data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch nearby weather data');
    } finally {
      setIsLoading(false);
      currentRequestRef.current = null;
    }
  };

  // Handle location changes with debouncing
  useEffect(() => {
    if (!enabled || !location.coordinates) {
      setNearbyWeatherData([]);
      setIsLoading(false);
      return;
    }

    const { latitude, longitude } = location.coordinates;

    // Validate coordinates are valid numbers
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
        isNaN(latitude) || isNaN(longitude) ||
        latitude < -90 || latitude > 90 || 
        longitude < -180 || longitude > 180) {
      console.warn('Invalid coordinates provided to useNearbyWeather:', { latitude, longitude });
      setNearbyWeatherData([]);
      setIsLoading(false);
      return;
    }

    // Clear existing timeout
    if (locationTimeoutRef.current) {
      clearTimeout(locationTimeoutRef.current);
    }

    // Show loading immediately when location changes
    setIsLoading(true);
    
    // Clear current data to indicate that new data is being fetched
    setNearbyWeatherData([]);

    // Reduced delay for better responsiveness - fetch data more quickly
    locationTimeoutRef.current = setTimeout(() => {
      fetchNearbyData(latitude, longitude, zoomLevel);
    }, 800); // Reduced from 1.5 seconds to 800ms

    return () => {
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
      }
    };
  }, [location.coordinates?.latitude, location.coordinates?.longitude, enabled]);

  // Handle zoom level changes (immediate, no delay)
  useEffect(() => {
    if (!enabled || !location.coordinates || !nearbyWeatherData.length) {
      return;
    }

    const { latitude, longitude } = location.coordinates;
    
    // Validate coordinates are valid numbers
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
        isNaN(latitude) || isNaN(longitude) ||
        latitude < -90 || latitude > 90 || 
        longitude < -180 || longitude > 180) {
      console.warn('Invalid coordinates for zoom level change:', { latitude, longitude });
      return;
    }
    
    fetchNearbyData(latitude, longitude, zoomLevel);
  }, [zoomLevel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.abort();
      }
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
      }
    };
  }, []);

  // Function to manually refresh nearby data
  const refreshNearbyData = () => {
    if (!location.coordinates) return;
    
    const { latitude, longitude } = location.coordinates;
    
    // Validate coordinates are valid numbers
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
        isNaN(latitude) || isNaN(longitude) ||
        latitude < -90 || latitude > 90 || 
        longitude < -180 || longitude > 180) {
      console.warn('Invalid coordinates for manual refresh:', { latitude, longitude });
      return;
    }
    
    fetchNearbyData(latitude, longitude, zoomLevel);
  };

  return {
    nearbyWeatherData,
    isLoading,
    error,
    refreshNearbyData,
  };
}
