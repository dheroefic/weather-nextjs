/**
 * Utility functions for map components that need efficient reverse geocoding
 */

import { 
  getCachedGeocoding, 
  cacheGeocodingResult, 
  cleanupGeocodingCache,
  getOrRequestGeocoding
} from '@/utils/geocodingCache';
import { reverseGeocode } from '@/services/geolocationService';

export interface LocationResult {
  city: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Efficient reverse geocoding with caching for map components
 * This function first checks the cache and only makes API calls when necessary
 */
export async function getLocationWithCache(
  latitude: number, 
  longitude: number
): Promise<LocationResult | null> {
  // Clean up expired cache entries periodically
  cleanupGeocodingCache();
  
  // Use deduplication to prevent multiple simultaneous requests
  const result = await getOrRequestGeocoding(latitude, longitude, async () => {
    try {
      const locationResponse = await reverseGeocode({ latitude, longitude });
      if (locationResponse.success && locationResponse.data) {
        return {
          city: locationResponse.data.city,
          country: locationResponse.data.country
        };
      }
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
    }
    return null;
  });
  
  if (result) {
    return {
      city: result.city,
      country: result.country,
      coordinates: { latitude, longitude }
    };
  }
  
  return null;
}

/**
 * Get location with fallback to coordinate string representation
 * Useful for map components that always need to display something
 */
export async function getLocationWithFallback(
  latitude: number, 
  longitude: number
): Promise<LocationResult> {
  const result = await getLocationWithCache(latitude, longitude);
  
  if (result) {
    return result;
  }
  
  // Fallback to coordinates as strings
  return {
    city: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    country: '',
    coordinates: { latitude, longitude }
  };
}
