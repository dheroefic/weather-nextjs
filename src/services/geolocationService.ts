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

// New enum for supported geocoding providers
export enum GeocodingProvider {
  OpenMeteo = 'openMeteo',
  LocationIQ = 'locationIQ'
}

// Replace with your actual LocationIQ API key or load from environment here.
const LOCATIONIQ_API_KEY = process.env.LOCATIONIQ_API_KEY || 'YOUR_LOCATIONIQ_API_KEY';

// Helper function to centralize API calls
async function callGeocodingApi(url: string): Promise<any> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding API request failed: ${response.statusText}`);
  }
  return await response.json();
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

export async function searchLocations(query: string, provider: GeocodingProvider = GeocodingProvider.OpenMeteo): Promise<GeolocationResponse<SearchResult[]>> {
  const cacheKey = `search-${provider}-${query.toLowerCase().trim()}`;
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
    let apiUrl = '';
    let results: SearchResult[] = [];

    if (provider === GeocodingProvider.OpenMeteo) {
      apiUrl = `${GEOCODING_API_BASE_URL}/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
      const data = await callGeocodingApi(apiUrl);
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error('Invalid response format');
      }
      results = data.results.map((item: any) => ({
        name: item.name || 'Unknown City',
        country: item.country || 'Unknown Country',
        latitude: item.latitude,
        longitude: item.longitude
      }));
    } else if (provider === GeocodingProvider.LocationIQ) {
      apiUrl = `https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(query)}&limit=5&format=json&addressdetails=1`;
      const data = await callGeocodingApi(apiUrl);
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }
      results = data.map((item: any) => ({
        name: item.address?.city || item.address?.town || item.address?.village || item.display_name || 'Unknown City',
        country: item.address?.country || 'Unknown Country',
        latitude: Number(item.lat),
        longitude: Number(item.lon)
      }));
    }

    const result = { success: true, data: results };
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

export async function reverseGeocode(coordinates: Coordinates, provider: GeocodingProvider = GeocodingProvider.OpenMeteo): Promise<GeolocationResponse<Location>> {
  const cacheKey = `reverse-geo-${provider}-${coordinates.latitude}-${coordinates.longitude}`;
  const cached = getFromCache<GeolocationResponse<Location>>(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }

  try {
    let apiUrl = '';
    let result: GeolocationResponse<Location>;

    if (provider === GeocodingProvider.OpenMeteo) {
      apiUrl = `${GEOCODING_API_BASE_URL}/reverse?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&language=en`;
      const data = await callGeocodingApi(apiUrl);
      result = {
        success: true,
        data: {
          city: data.name || 'Unknown City',
          country: data.country || 'Unknown Country',
          coordinates: { ...coordinates }
        }
      };
    } else if (provider === GeocodingProvider.LocationIQ) {
      apiUrl = `https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_API_KEY}&lat=${coordinates.latitude}&lon=${coordinates.longitude}&format=json&addressdetails=1`;
      const data = await callGeocodingApi(apiUrl);
      result = {
        success: true,
        data: {
          city: data.address?.city || data.address?.town || data.address?.village || data.display_name || 'Unknown City',
          country: data.address?.country || 'Unknown Country',
          coordinates: { ...coordinates }
        }
      };
    } else {
      throw new Error('Unsupported geocoding provider');
    }

    setInCache(cacheKey, result);
    return result;
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Failed to reverse geocode coordinates'
    };
  }
}
