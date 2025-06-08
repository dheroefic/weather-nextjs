'use client';

import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import type { LatLngExpression, Map as LeafletMap } from 'leaflet';
import type { Location } from '@/types/weather';
import type { NearbyLocation } from '@/types/nearbyWeather';
import { fetchNearbyWeatherData } from '@/services/weatherDistribution';
import { getUserGeolocation, reverseGeocode } from '@/services/geolocationService';
import type { SearchResult } from '@/services/geolocationService';
import { debug } from '@/utils/debug';

// Types for the map utility
export interface MapConfig {
  defaultZoom: number;
  minZoom: number;
  maxZoom: number;
  tileLayer: {
    url: string;
    attribution: string;
    maxZoom: number;
  };
  controls: {
    zoomControl: boolean;
    attributionControl: boolean;
  };
}

export interface MapState {
  mapInstance: LeafletMap | null;
  isMapReady: boolean;
  isDestroying: boolean;
  mapCenter: LatLngExpression;
  nearbyLocations: NearbyLocation[];
}

export interface LocationState {
  coordinates: { latitude: number; longitude: number } | null;
  isLoading: boolean;
  error: string | null;
}

// Default map configurations
export const DEFAULT_MAP_CONFIG: MapConfig = {
  defaultZoom: 13,
  minZoom: 3,
  maxZoom: 18,
  tileLayer: {
    url: 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 18,
  },
  controls: {
    zoomControl: false,
    attributionControl: true,
  },
};

export const DEFAULT_EMBEDDED_MAP_CONFIG: MapConfig = {
  ...DEFAULT_MAP_CONFIG,
  defaultZoom: 10,
  controls: {
    zoomControl: false,
    attributionControl: true,
  },
};

// Constants for localStorage
const USER_LOCATION_STORAGE_KEY = 'weather_user_location';
const LOCATION_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Fallback coordinates (Jakarta, Indonesia)
const FALLBACK_COORDINATES = { latitude: -6.2088, longitude: 106.8456 };

// Utility functions for coordinate validation
export const isValidCoordinate = (lat: number, lng: number): boolean => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

export const validateCoordinates = (coordinates: { latitude: number; longitude: number } | null): boolean => {
  if (!coordinates) return false;
  return isValidCoordinate(coordinates.latitude, coordinates.longitude);
};

// Race condition handling with mutex
class LocationMutex {
  private isLocked = false;
  private queue: Array<() => void> = [];

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isLocked) {
        this.isLocked = true;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.isLocked = false;
    }
  }
}

const locationMutex = new LocationMutex();

// User location management with localStorage and race condition handling
export class UserLocationManager {
  private static instance: UserLocationManager;
  private cachedLocation: { latitude: number; longitude: number } | null = null;
  private cacheTimestamp: number = 0;
  private listeners: Set<(location: { latitude: number; longitude: number } | null) => void> = new Set();
  private pendingRequests = new Map<string, Promise<{ latitude: number; longitude: number } | null>>();

  static getInstance(): UserLocationManager {
    if (!UserLocationManager.instance) {
      UserLocationManager.instance = new UserLocationManager();
    }
    return UserLocationManager.instance;
  }

  // Get user location with race condition handling
  async getUserLocation(forceRefresh = false): Promise<{ latitude: number; longitude: number } | null> {
    const requestId = `getUserLocation-${forceRefresh}`;
    
    // If there's already a pending request for the same operation, return it
    if (this.pendingRequests.has(requestId)) {
      return this.pendingRequests.get(requestId) || null;
    }

    const promise = this._getUserLocationInternal(forceRefresh);
    this.pendingRequests.set(requestId, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(requestId);
    }
  }

  private async _getUserLocationInternal(forceRefresh: boolean): Promise<{ latitude: number; longitude: number } | null> {
    await locationMutex.acquire();
    
    try {
      // Check if we have a valid cached location
      if (!forceRefresh && this.isCacheValid()) {
        return this.cachedLocation;
      }

      // Try to load from localStorage first
      const storedLocation = this.loadFromStorage();
      if (!forceRefresh && storedLocation && validateCoordinates(storedLocation)) {
        this.cachedLocation = storedLocation;
        this.cacheTimestamp = Date.now();
        this.notifyListeners(storedLocation);
        return storedLocation;
      }

      // Get fresh location from device
      try {
        const geoResponse = await getUserGeolocation();
        if (geoResponse.success && geoResponse.data) {
          const coordinates = {
            latitude: geoResponse.data.latitude,
            longitude: geoResponse.data.longitude,
          };

          if (validateCoordinates(coordinates)) {
            this.cachedLocation = coordinates;
            this.cacheTimestamp = Date.now();
            this.saveToStorage(coordinates);
            this.notifyListeners(coordinates);
            return coordinates;
          }
        }
      } catch (error) {
        debug.warn('Error getting device location:', error);
      }

      // Fallback to stored location if available
      if (storedLocation && validateCoordinates(storedLocation)) {
        this.cachedLocation = storedLocation;
        this.cacheTimestamp = Date.now();
        this.notifyListeners(storedLocation);
        return storedLocation;
      }

      // Final fallback
      this.cachedLocation = FALLBACK_COORDINATES;
      this.cacheTimestamp = Date.now();
      this.notifyListeners(FALLBACK_COORDINATES);
      return FALLBACK_COORDINATES;

    } finally {
      locationMutex.release();
    }
  }

  // Update user location (for when user selects a new location)
  async updateUserLocation(coordinates: { latitude: number; longitude: number }): Promise<void> {
    if (!validateCoordinates(coordinates)) {
      throw new Error('Invalid coordinates provided');
    }

    await locationMutex.acquire();
    
    try {
      this.cachedLocation = coordinates;
      this.cacheTimestamp = Date.now();
      this.saveToStorage(coordinates);
      this.notifyListeners(coordinates);
    } finally {
      locationMutex.release();
    }
  }

  // Subscribe to location changes
  subscribe(callback: (location: { latitude: number; longitude: number } | null) => void): () => void {
    this.listeners.add(callback);
    
    // Immediately call with current location if available
    if (this.cachedLocation) {
      callback(this.cachedLocation);
    }

    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(location: { latitude: number; longitude: number } | null): void {
    this.listeners.forEach(callback => {
      try {
        callback(location);
      } catch (error) {
        console.error('Error in location listener:', error);
      }
    });
  }

  private isCacheValid(): boolean {
    return (
      this.cachedLocation !== null &&
      validateCoordinates(this.cachedLocation) &&
      Date.now() - this.cacheTimestamp < LOCATION_CACHE_DURATION
    );
  }

  private loadFromStorage(): { latitude: number; longitude: number } | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(USER_LOCATION_STORAGE_KEY);
      if (!stored) return null;

      const data = JSON.parse(stored);
      if (data.coordinates && data.timestamp) {
        // Check if stored data is not too old
        const age = Date.now() - data.timestamp;
        if (age < LOCATION_CACHE_DURATION && validateCoordinates(data.coordinates)) {
          return data.coordinates;
        }
      }
    } catch (error) {
      debug.warn('Error loading location from storage:', error);
      this.clearStorage();
    }

    return null;
  }

  private saveToStorage(coordinates: { latitude: number; longitude: number }): void {
    if (typeof window === 'undefined') return;

    try {
      const data = {
        coordinates,
        timestamp: Date.now(),
      };
      localStorage.setItem(USER_LOCATION_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      debug.warn('Error saving location to storage:', error);
    }
  }

  private clearStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(USER_LOCATION_STORAGE_KEY);
    } catch (error) {
      debug.warn('Error clearing location storage:', error);
    }
  }

  // Clear all cached data
  clearCache(): void {
    this.cachedLocation = null;
    this.cacheTimestamp = 0;
    this.clearStorage();
    this.notifyListeners(null);
  }
}

// React hook for using user location
export const useUserLocation = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const locationManager = useMemo(() => UserLocationManager.getInstance(), []);

  useEffect(() => {
    const unsubscribe = locationManager.subscribe((newLocation) => {
      setLocation(newLocation);
      setIsLoading(false);
      setError(null);
    });

    // Initial load
    locationManager.getUserLocation().catch((err) => {
      setError(err.message || 'Failed to get location');
      setIsLoading(false);
    });

    return unsubscribe;
  }, [locationManager]);

  const updateLocation = useCallback(async (coordinates: { latitude: number; longitude: number }) => {
    try {
      setIsLoading(true);
      setError(null);
      await locationManager.updateUserLocation(coordinates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update location');
    } finally {
      setIsLoading(false);
    }
  }, [locationManager]);

  const refreshLocation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await locationManager.getUserLocation(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh location');
    } finally {
      setIsLoading(false);
    }
  }, [locationManager]);

  return {
    location,
    isLoading,
    error,
    updateLocation,
    refreshLocation,
  };
};

// Map management hook
export const useMapManager = (config: MapConfig = DEFAULT_MAP_CONFIG) => {
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isDestroying, setIsDestroying] = useState(false);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([0, 0]);
  const [nearbyLocations, setNearbyLocations] = useState<NearbyLocation[]>([]);
  
  const debounceTimeoutRef = useRef<number | null>(null);

  // Enhanced setMapInstance with cleanup of previous instance
  const setMapInstanceSafe = useCallback((newMapInstance: LeafletMap | null) => {
    setMapInstance(prevInstance => {
      // Clean up previous instance if it exists
      if (prevInstance && prevInstance !== newMapInstance) {
        try {
          debug.map('Cleaning up previous map instance before setting new one');
          if (prevInstance.getContainer && prevInstance.getContainer()) {
            if (prevInstance.off) {
              prevInstance.off();
            }
            prevInstance.remove();
          }
        } catch (error) {
          debug.warn('Error cleaning up previous map instance:', error);
        }
      }
      
      return newMapInstance;
    });
    
    if (!newMapInstance) {
      setIsMapReady(false);
    }
  }, []); // Remove mapInstance dependency to break circular dependency

  // Cleanup method
  const cleanupMap = useCallback(() => {
    setIsDestroying(true);
    setIsMapReady(false);
    
    setMapInstance(prevInstance => {
      if (prevInstance) {
        try {
          debug.map('Manual cleanup of map instance');
          if (prevInstance.getContainer && prevInstance.getContainer()) {
            if (prevInstance.off) {
              prevInstance.off();
            }
            prevInstance.remove();
          }
        } catch (error) {
          debug.warn('Error during manual map cleanup:', error);
        }
      }
      return null;
    });
    
    setIsDestroying(false);
  }, []); // Remove mapInstance dependency

  // Safe flyTo function with validation
  const safeFlyTo = useCallback((lat: number, lng: number, zoom: number) => {
    if (!isValidCoordinate(lat, lng)) {
      console.error('Invalid coordinates provided to safeFlyTo:', { lat, lng });
      return;
    }

    if (!mapInstance || !mapInstance.getContainer || !mapInstance.getContainer()) {
      console.error('Map instance not ready for flyTo operation');
      return;
    }

    try {
      const container = mapInstance.getContainer();
      if (container && document.body.contains(container)) {
        mapInstance.flyTo([lat, lng], zoom, {
          duration: 1.5,
          easeLinearity: 0.25,
        });
      } else {
        debug.warn('Map container is not in DOM, using setView fallback');
        mapInstance.setView([lat, lng], zoom);
      }
    } catch (error) {
      debug.warn('FlyTo failed, attempting setView fallback:', error);
      try {
        mapInstance.setView([lat, lng], zoom);
      } catch (fallbackError) {
        console.error('Both flyTo and setView failed:', fallbackError);
      }
    }
  }, [mapInstance]);

  // Fetch nearby weather data with debouncing
  const fetchNearbyData = useCallback(async (lat: number, lng: number) => {
    if (!isValidCoordinate(lat, lng)) {
      console.error('Invalid coordinates provided to fetchNearbyData:', { lat, lng });
      return;
    }

    try {
      const currentZoom = mapInstance?.getZoom() || config.defaultZoom;
      const locations = await fetchNearbyWeatherData(lat, lng, currentZoom);
      setNearbyLocations(locations.filter((loc): loc is NonNullable<typeof loc> => loc !== null));
    } catch (error) {
      console.error('Error fetching nearby weather data:', error);
    }
  }, [mapInstance, config.defaultZoom]);

  // Handle map movement with debouncing
  const handleMapMove = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = window.setTimeout(() => {
      if (mapInstance && mapInstance.getContainer && mapInstance.getContainer()) {
        try {
          const center = mapInstance.getCenter();
          if (center && isValidCoordinate(center.lat, center.lng)) {
            fetchNearbyData(center.lat, center.lng);
          }
        } catch (error) {
          debug.warn('Error getting map center:', error);
        }
      }
    }, 1000);
  }, [mapInstance, fetchNearbyData]);

  // Update map center
  const updateMapCenter = useCallback((lat: number, lng: number, shouldFly = true) => {
    if (!isValidCoordinate(lat, lng)) {
      console.error('Invalid coordinates provided to updateMapCenter:', { lat, lng });
      return;
    }

    const newCenter: LatLngExpression = [lat, lng];
    setMapCenter(newCenter);

    if (shouldFly && mapInstance) {
      safeFlyTo(lat, lng, config.defaultZoom);
    }
  }, [mapInstance, safeFlyTo, config.defaultZoom]);

  // Set up map event listeners
  useEffect(() => {
    if (!mapInstance || !mapInstance.getContainer) return;

    try {
      mapInstance.on('moveend', handleMapMove);
      mapInstance.on('zoomend', handleMapMove);
    } catch (error) {
      console.error('Error setting up map event listeners:', error);
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (mapInstance && mapInstance.off) {
        try {
          mapInstance.off('moveend', handleMapMove);
          mapInstance.off('zoomend', handleMapMove);
        } catch (error) {
          console.error('Error removing map event listeners:', error);
        }
      }
    };
  }, [mapInstance, handleMapMove]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Cleanup map instance on unmount using functional state update
      setMapInstance(prevInstance => {
        if (prevInstance) {
          try {
            debug.map('Cleaning up map instance from useMapManager');
            if (prevInstance.getContainer && prevInstance.getContainer()) {
              // Remove all event listeners
              if (prevInstance.off) {
                prevInstance.off();
              }
              // Remove the map instance
              prevInstance.remove();
            }
          } catch (error) {
            console.error('Error cleaning up map instance in useMapManager:', error);
          }
        }
        return null;
      });
    };
  }, []); // Remove mapInstance dependency to prevent cleanup loop

  return {
    mapInstance,
    setMapInstance: setMapInstanceSafe,
    isMapReady,
    setIsMapReady,
    isDestroying,
    setIsDestroying,
    mapCenter,
    setMapCenter,
    nearbyLocations,
    safeFlyTo,
    fetchNearbyData,
    updateMapCenter,
    handleMapMove,
    cleanupMap,
  };
};

// Location selection utilities
export const useLocationSelection = () => {
  const { updateLocation } = useUserLocation();

  const selectLocationFromCoordinates = useCallback(async (
    latitude: number,
    longitude: number,
    onLocationSelect?: (location: Location) => void
  ) => {
    if (!isValidCoordinate(latitude, longitude)) {
      throw new Error('Invalid coordinates provided');
    }

    try {
      // Update the user location in storage
      await updateLocation({ latitude, longitude });

      // If callback provided, get city/country info and call it
      if (onLocationSelect) {
        try {
          const locationResponse = await reverseGeocode({ latitude, longitude });
          if (locationResponse.success && locationResponse.data) {
            onLocationSelect(locationResponse.data);
          } else {
            onLocationSelect({
              city: latitude.toString(),
              country: longitude.toString(),
              coordinates: { latitude, longitude },
            });
          }
        } catch (error) {
          debug.warn('Error in reverse geocoding:', error);
          onLocationSelect({
            city: latitude.toString(),
            country: longitude.toString(),
            coordinates: { latitude, longitude },
          });
        }
      }
    } catch (error) {
      console.error('Error selecting location:', error);
      throw error;
    }
  }, [updateLocation]);

  const selectLocationFromSearchResult = useCallback(async (
    result: SearchResult,
    onLocationSelect?: (location: Location) => void
  ) => {
    await selectLocationFromCoordinates(
      result.latitude,
      result.longitude,
      onLocationSelect
    );
  }, [selectLocationFromCoordinates]);

  const selectCurrentDeviceLocation = useCallback(async (
    onLocationSelect?: (location: Location) => void
  ) => {
    try {
      const geoResponse = await getUserGeolocation();
      if (geoResponse.success && geoResponse.data) {
        await selectLocationFromCoordinates(
          geoResponse.data.latitude,
          geoResponse.data.longitude,
          onLocationSelect
        );
      } else {
        throw new Error(geoResponse.error || 'Failed to get device location');
      }
    } catch (error) {
      console.error('Error getting device location:', error);
      throw error;
    }
  }, [selectLocationFromCoordinates]);

  return {
    selectLocationFromCoordinates,
    selectLocationFromSearchResult,
    selectCurrentDeviceLocation,
  };
};

// Safe coordinates hook that provides fallback
export const useSafeCoordinates = (location?: Location) => {
  return useMemo(() => {
    if (location?.coordinates && validateCoordinates(location.coordinates)) {
      return location.coordinates;
    }
    return FALLBACK_COORDINATES;
  }, [location?.coordinates]);
};
