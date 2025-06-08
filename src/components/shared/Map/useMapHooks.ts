'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Map } from 'leaflet';
import type { WeatherData } from '@/types/weather';

export interface UseMapStateResult {
  mapInstance: Map | null;
  isMapReady: boolean;
  leaflet: typeof import('leaflet') | null;
  setMapInstance: (map: Map) => void;
  setIsMapReady: (ready: boolean) => void;
}

export const useMapState = (): UseMapStateResult => {
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Dynamic leaflet import
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        const L = await import('leaflet');
        if (mountedRef.current) {
          setLeaflet(L);
        }
      } catch (error) {
        console.error('Error loading leaflet:', error);
      }
    };
    
    if (typeof window !== 'undefined' && !leaflet) {
      loadLeaflet();
    }
  }, [leaflet]);

  return {
    mapInstance,
    isMapReady,
    leaflet,
    setMapInstance,
    setIsMapReady,
  };
};

export interface UseCustomIconResult {
  createCustomIcon: (weatherIcon?: string) => any;
}

export const useCustomIcon = (
  leaflet: typeof import('leaflet') | null,
  weatherData?: WeatherData | null,
  isMobile: boolean = false
): UseCustomIconResult => {
  const createCustomIcon = useCallback((weatherIcon?: string) => {
    if (!leaflet) return undefined;
    
    try {
      // Use provided weather icon, or weather data icon, or dedicated map marker
      const iconUrl = weatherIcon || weatherData?.currentWeather?.icon || '/icons/weathers/map-marker.svg';
      
      return leaflet.icon({
        iconUrl: iconUrl,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
        className: isMobile ? 'mobile-weather-marker' : 'weather-marker',
      });
    } catch (error) {
      console.warn('Error creating custom icon:', error);
      // Return fallback icon on error
      try {
        return leaflet.icon({
          iconUrl: '/icons/weathers/not-available.svg',
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40],
          className: `${isMobile ? 'mobile-weather-marker' : 'weather-marker'} fallback`,
        });
      } catch (fallbackError) {
        console.error('Error creating fallback icon:', fallbackError);
        return undefined;
      }
    }
  }, [leaflet, weatherData, isMobile]);

  return { createCustomIcon };
};

export interface UseMapInvalidationProps {
  mapInstance: Map | null;
  isMapReady: boolean;
  isOpen?: boolean;
  delay?: number;
}

export const useMapInvalidation = ({ 
  mapInstance, 
  isMapReady, 
  isOpen = true, 
  delay = 100 
}: UseMapInvalidationProps) => {
  useEffect(() => {
    if (isOpen && mapInstance && isMapReady) {
      const timer = setTimeout(() => {
        if (mapInstance && mapInstance.getContainer && mapInstance.getContainer()) {
          try {
            mapInstance.invalidateSize();
          } catch (error) {
            console.warn('Error invalidating map size:', error);
          }
        }
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mapInstance, isMapReady, delay]);
};
