/**
 * Shared geocoding cache utility for efficient reverse geocoding across the application
 * Uses geographical boundary-based caching to reuse results for nearby locations
 */

export interface CachedGeocodeResult {
  city: string;
  country: string;
  timestamp: number;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

// Global cache with configurable expiry
const geocodeCache = new Map<string, CachedGeocodeResult>();
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const BOUNDARY_BUFFER = 0.05; // Roughly 5km buffer
const GRID_SIZE = 0.09; // Approximately 10km at the equator

// Request deduplication - prevent multiple simultaneous requests for same area
const pendingRequests = new Map<string, Promise<{ city: string; country: string } | null>>();

/**
 * Calculate distance between two points in kilometers
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Create a grid key for caching based on approximate location
 */
function getGridKey(lat: number, lng: number): string {
  const gridLat = Math.floor(lat / GRID_SIZE) * GRID_SIZE;
  const gridLng = Math.floor(lng / GRID_SIZE) * GRID_SIZE;
  return `${gridLat.toFixed(4)},${gridLng.toFixed(4)}`;
}

/**
 * Check if a point is within the cached boundaries
 */
function isWithinCachedBounds(lat: number, lng: number, bounds: CachedGeocodeResult['bounds']): boolean {
  return lat >= bounds.minLat && lat <= bounds.maxLat && 
         lng >= bounds.minLng && lng <= bounds.maxLng;
}

/**
 * Clean up expired cache entries
 */
export function cleanupGeocodingCache(): void {
  const now = Date.now();
  for (const [key, value] of geocodeCache.entries()) {
    if ((now - value.timestamp) >= CACHE_EXPIRY_MS) {
      geocodeCache.delete(key);
    }
  }
}

/**
 * Get cached geocoding result if available within boundaries
 */
export function getCachedGeocoding(lat: number, lng: number): { city: string; country: string } | null {
  const gridKey = getGridKey(lat, lng);
  const now = Date.now();
  
  // Check if we have a valid cached result for this grid
  const cached = geocodeCache.get(gridKey);
  if (cached && (now - cached.timestamp) < CACHE_EXPIRY_MS) {
    if (isWithinCachedBounds(lat, lng, cached.bounds)) {
      console.log(`🎯 Cache HIT for (${lat.toFixed(4)}, ${lng.toFixed(4)}) -> ${cached.city}, ${cached.country}`);
      return { city: cached.city, country: cached.country };
    }
  }
  
  // Check neighboring grid cells
  for (let latOffset = -1; latOffset <= 1; latOffset++) {
    for (let lngOffset = -1; lngOffset <= 1; lngOffset++) {
      if (latOffset === 0 && lngOffset === 0) continue; // Skip current grid
      
      const neighborLat = Math.floor(lat / GRID_SIZE) * GRID_SIZE + (latOffset * GRID_SIZE);
      const neighborLng = Math.floor(lng / GRID_SIZE) * GRID_SIZE + (lngOffset * GRID_SIZE);
      const neighborKey = `${neighborLat.toFixed(4)},${neighborLng.toFixed(4)}`;
      
      const neighborCached = geocodeCache.get(neighborKey);
      if (neighborCached && (now - neighborCached.timestamp) < CACHE_EXPIRY_MS) {
        if (isWithinCachedBounds(lat, lng, neighborCached.bounds)) {
          console.log(`🎯 Neighbor cache HIT for (${lat.toFixed(4)}, ${lng.toFixed(4)}) -> ${neighborCached.city}, ${neighborCached.country}`);
          return { city: neighborCached.city, country: neighborCached.country };
        }
      }
    }
  }
  
  console.log(`❌ Cache MISS for (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
  return null;
}

/**
 * Cache a geocoding result with geographical boundaries
 */
export function cacheGeocodingResult(
  lat: number, 
  lng: number, 
  city: string, 
  country: string
): void {
  const gridKey = getGridKey(lat, lng);
  const now = Date.now();
  
  console.log(`💾 Caching result for (${lat.toFixed(4)}, ${lng.toFixed(4)}) -> ${city}, ${country}`);
  
  geocodeCache.set(gridKey, {
    city,
    country,
    timestamp: now,
    bounds: {
      minLat: lat - BOUNDARY_BUFFER,
      maxLat: lat + BOUNDARY_BUFFER,
      minLng: lng - BOUNDARY_BUFFER,
      maxLng: lng + BOUNDARY_BUFFER
    }
  });
}

/**
 * Request deduplication function to prevent multiple simultaneous requests for the same area
 */
export async function getOrRequestGeocoding(
  lat: number,
  lng: number,
  requestFn: () => Promise<{ city: string; country: string } | null>
): Promise<{ city: string; country: string } | null> {
  // First check cache
  const cached = getCachedGeocoding(lat, lng);
  if (cached) {
    return cached;
  }
  
  // Check if there's already a pending request for this area
  const gridKey = getGridKey(lat, lng);
  const pendingRequest = pendingRequests.get(gridKey);
  
  if (pendingRequest) {
    console.log(`⏳ Waiting for pending request for (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    return await pendingRequest;
  }
  
  // Make new request and store the promise
  console.log(`🌐 Making new API request for (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
  const requestPromise = requestFn();
  pendingRequests.set(gridKey, requestPromise);
  
  try {
    const result = await requestPromise;
    
    // Cache the result if successful
    if (result) {
      cacheGeocodingResult(lat, lng, result.city, result.country);
    }
    
    return result;
  } finally {
    // Clean up pending request
    pendingRequests.delete(gridKey);
  }
}

/**
 * Get cache statistics for debugging
 */
export function getGeocodingCacheStats() {
  const now = Date.now();
  const active = Array.from(geocodeCache.values()).filter(
    entry => (now - entry.timestamp) < CACHE_EXPIRY_MS
  ).length;
  
  return {
    totalEntries: geocodeCache.size,
    activeEntries: active,
    expiredEntries: geocodeCache.size - active
  };
}

/**
 * Clear all cached geocoding results
 */
export function clearGeocodingCache(): void {
  geocodeCache.clear();
}
