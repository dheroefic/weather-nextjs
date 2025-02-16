import type { Location } from '@/types/weather';
import { getFromCache, setInCache } from './cacheService';

export interface SearchResult {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface GeolocationResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const GEOCODING_API_BASE_URL = 'https://geocoding-api.open-meteo.com/v1';

export const getUserGeolocation = async (): Promise<GeolocationResponse<Coordinates>> => {
  return new Promise((resolve) => {
    // Ensure we are running in a browser environment.
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({
        success: false,
        data: null,
        error: 'Geolocation is not supported in this environment'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          resolve({
            success: true,
            data: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          });
        } catch (error) {
          console.error(error);
          resolve({
            success: false,
            data: null,
            error: 'Error getting location details'
          });
        }
      },
      (error) => {
        resolve({
          success: false,
          data: null,
          error: error.message
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  });
};

export function formatSearchResults(results: SearchResult[]): SearchResult[] {
  return results.map(result => ({
    name: result.name || 'Unknown City',
    country: result.country || 'Unknown Country',
    latitude: result.latitude,
    longitude: result.longitude
  }));
}

export async function searchLocations(query: string): Promise<GeolocationResponse<SearchResult[]>> {
  const cacheKey = `search-${query.toLowerCase().trim()}`;
  const cached = getFromCache<GeolocationResponse<SearchResult[]>>(cacheKey);
  if (cached) {
    return cached;
  }

  if (!query.trim()) {
    return {
      success: false,
      data: null,
      error: 'Search query is empty'
    };
  }

  try {
    const response = await fetch(
      `${GEOCODING_API_BASE_URL}/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch location data');
    }

    const data = await response.json();
    if (!data.results || !Array.isArray(data.results)) {
      throw new Error('Invalid response format');
    }

    const results = data.results.map((item: { name: string; country: string; latitude: number; longitude: number; }) => ({
      name: item.name || 'Unknown City',
      country: item.country || 'Unknown Country',
      latitude: item.latitude,
      longitude: item.longitude
    }));

    const result = {
      success: true,
      data: results
    };
    
    setInCache(cacheKey, result);
    return result;
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

export function reverseGeocode(coordinates: Coordinates): Promise<GeolocationResponse<Location>> {
  const cacheKey = `reverse-geo-${coordinates.latitude}-${coordinates.longitude}`;
  const cached = getFromCache<GeolocationResponse<Location>>(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }

  return new Promise(async (resolve) => {
    try {
      const response = await fetch(
        `${GEOCODING_API_BASE_URL}/reverse?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&language=en`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch location data');
      }

      const data = await response.json();
      const result = {
        success: true,
        data: {
          city: data.name || 'Unknown City',
          country: data.country || 'Unknown Country',
          coordinates: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
          }
        }
      };
      
      setInCache(cacheKey, result);
      resolve(result);
    } catch (error) {
      resolve({
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to reverse geocode coordinates'
      });
    }
  });
}
