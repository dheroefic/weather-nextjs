'use client';

import { useCallback, useRef, useEffect } from 'react';
import type { Map } from 'leaflet';

interface MapLocationUpdateOptions {
  map: Map | null;
  onLocationChange: (lat: number, lng: number) => void;
  onLoadingStateChange?: (isLoading: boolean) => void;
  debounceMs?: number;
  minDistanceKm?: number;
  enabled?: boolean;
}

/**
 * Hook to handle map location updates when user interacts with the map
 * Includes debouncing and minimum distance checks to avoid excessive API calls
 */
export const useMapLocationUpdate = ({
  map,
  onLocationChange,
  onLoadingStateChange,
  debounceMs = 1000, // 1 second debounce
  minDistanceKm = 5, // Minimum 5km movement to trigger update
  enabled = true
}: MapLocationUpdateOptions) => {
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate distance between two coordinates in kilometers
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Validate coordinates
  const isValidCoordinate = useCallback((lat: number, lng: number): boolean => {
    return typeof lat === 'number' && 
           typeof lng === 'number' && 
           !isNaN(lat) && 
           !isNaN(lng) &&
           lat >= -90 && lat <= 90 && 
           lng >= -180 && lng <= 180;
  }, []);

  // Handle map movement start (show loading immediately)
  const handleMapMoveStart = useCallback(() => {
    if (!map || !enabled || !onLoadingStateChange) return;
    
    // Clear any existing loading timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    // Show loading immediately when user starts interacting
    console.log('useMapLocationUpdate: Starting map movement, showing loading...');
    onLoadingStateChange(true);
  }, [map, enabled, onLoadingStateChange]);

  // Handle map movement
  const handleMapMove = useCallback(() => {
    if (!map || !enabled) return;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new debounced timeout
    debounceTimeoutRef.current = setTimeout(() => {
      const center = map.getCenter();
      const lat = center.lat;
      const lng = center.lng;

      // Validate coordinates
      if (!isValidCoordinate(lat, lng)) {
        console.warn('useMapLocationUpdate: Invalid coordinates from map center:', { lat, lng });
        // Hide loading on error
        if (onLoadingStateChange) {
          onLoadingStateChange(false);
        }
        return;
      }

      // Check if movement is significant enough
      const lastLocation = lastLocationRef.current;
      if (lastLocation) {
        const distance = calculateDistance(lastLocation.lat, lastLocation.lng, lat, lng);
        if (distance < minDistanceKm) {
          // Movement too small, don't update but hide loading
          if (onLoadingStateChange) {
            onLoadingStateChange(false);
          }
          return;
        }
      }

      // Update last location and trigger callback
      lastLocationRef.current = { lat, lng };
      console.log('useMapLocationUpdate: Triggering location change callback for:', { lat, lng });
      onLocationChange(lat, lng);
      
      // Hide loading after a longer delay to allow for geocoding + weather data fetching
      // Also add a maximum timeout to prevent infinite loading
      if (onLoadingStateChange) {
        loadingTimeoutRef.current = setTimeout(() => {
          console.log('useMapLocationUpdate: Hiding loading state after timeout');
          onLoadingStateChange(false);
        }, 4000); // Increased to 4 seconds to account for geocoding + weather API calls
        
        // Emergency timeout to force hide loading after 8 seconds
        setTimeout(() => {
          console.log('useMapLocationUpdate: Emergency timeout - forcing loading off');
          onLoadingStateChange(false);
        }, 8000);
      }
    }, debounceMs);
  }, [map, enabled, debounceMs, minDistanceKm, onLocationChange, onLoadingStateChange, calculateDistance, isValidCoordinate]);

  // Set up map event listeners
  useEffect(() => {
    if (!map || !enabled) return;

    // Add event listeners for map movement
    map.on('movestart', handleMapMoveStart);
    map.on('moveend', handleMapMove);
    map.on('zoomstart', handleMapMoveStart);
    map.on('zoomend', handleMapMove);

    // Cleanup function
    return () => {
      map.off('movestart', handleMapMoveStart);
      map.off('moveend', handleMapMove);
      map.off('zoomstart', handleMapMoveStart);
      map.off('zoomend', handleMapMove);
      
      // Clear any pending timeouts
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [map, enabled, handleMapMove, handleMapMoveStart]);

  // Update last location when external location changes (to prevent loops)
  const updateLastLocation = useCallback((lat: number, lng: number) => {
    if (isValidCoordinate(lat, lng)) {
      lastLocationRef.current = { lat, lng };
    }
  }, [isValidCoordinate]);

  return {
    updateLastLocation
  };
};

export default useMapLocationUpdate;
