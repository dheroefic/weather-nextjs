import type { Location } from '@/types/weather';
import { getFromCache, setInCache } from './cacheService';
import { getOpenMeteoConfig } from '@/utils/openmeteoConfig';

// Get OpenMeteo configuration
const openMeteoConfig = getOpenMeteoConfig();

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
    // Use the Next.js API route for country search
    const apiUrl = new URL('/api/geocoding', window.location.origin);
    apiUrl.searchParams.append('search', query);
    apiUrl.searchParams.append('language', 'en');

    // Get API key from environment variable
    const apiKey = process.env.NEXT_PUBLIC_GEOCODING_API_KEY;
    if (!apiKey) {
      throw new Error('Geocoding API key not configured');
    }

    const response = await fetch(apiUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch location data');
    }

    const data = await response.json();
    if (!data.results || !Array.isArray(data.results)) {
      throw new Error('Invalid response format');
    }

    // Transform the results to match SearchResult interface
    const results = data.results.map((item: any) => ({
      name: item.country_name || 'Unknown Country',
      country: item.country_name || 'Unknown Country',
      latitude: item.coordinates?.latitude || 0,
      longitude: item.coordinates?.longitude || 0
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
      // Use the Next.js API route instead of direct external API call to avoid CORS
      const apiUrl = new URL('/api/geocoding', window.location.origin);
      apiUrl.searchParams.append('latitude', coordinates.latitude.toString());
      apiUrl.searchParams.append('longitude', coordinates.longitude.toString());
      apiUrl.searchParams.append('language', 'en');

      // Get API key from environment variable
      const apiKey = process.env.NEXT_PUBLIC_GEOCODING_API_KEY;
      if (!apiKey) {
        throw new Error('Geocoding API key not configured');
      }

      const response = await fetch(apiUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch location data');
      }

      const data = await response.json();
      
      // Handle the response format from our Supabase-based geocoding API
      const firstResult = data.results?.[0];
      if (!firstResult) {
        throw new Error('No geocoding results found');
      }

      const result = {
        success: true,
        data: {
          city: firstResult.sub_region_name || firstResult.name || 'Unknown City',
          country: firstResult.country_name || 'Unknown Country',
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
