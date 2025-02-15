import type { Location } from '@/types/weather';

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

const GEOCODING_API_BASE_URL = 'https://api.bigdatacloud.net/data';

export async function getUserLocation(): Promise<GeolocationResponse<Coordinates>> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        success: false,
        data: null,
        error: 'Geolocation is not supported by your browser'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          success: true,
          data: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        });
      },
      (error) => {
        let errorMessage = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        resolve({
          success: false,
          data: null,
          error: errorMessage
        });
      }
    );
  });
}

export async function searchLocations(query: string): Promise<GeolocationResponse<SearchResult[]>> {
  if (!query.trim()) {
    return {
      success: false,
      data: null,
      error: 'Search query is empty'
    };
  }

  try {
    // Use Nominatim API for geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch location data');
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format');
    }

    const results = data.map(item => ({
      name: item.display_name.split(',')[0] || 'Unknown City',
      country: item.display_name.split(',').slice(-1)[0]?.trim() || 'Unknown Country',
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon)
    }));

    return {
      success: true,
      data: results
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

export function formatSearchResults(results: SearchResult[]): SearchResult[] {
  return results.map(result => ({
    name: result.name || 'Unknown City',
    country: result.country || 'Unknown Country',
    latitude: result.latitude,
    longitude: result.longitude
  }));
}

export function reverseGeocode(coordinates: Coordinates): Promise<GeolocationResponse<Location>> {
  return new Promise(async (resolve) => {
    try {
      const response = await fetch(
        `${GEOCODING_API_BASE_URL}/reverse-geocode-client?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&localityLanguage=en`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch location data');
      }

      const data = await response.json();
      resolve({
        success: true,
        data: {
          city: data.city || 'Unknown City',
          country: data.countryName || 'Unknown Country',
          coordinates: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
          }
        }
      });
    } catch (error) {
      resolve({
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to reverse geocode coordinates'
      });
    }
  });
}