// Weather data cache expires in 10 minutes, location cache in 24 hours
const WEATHER_CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes
const LOCATION_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// In-memory cache for faster access during the same session
const memoryCache = new Map<string, CacheItem<unknown>>();

export function getFromCache<T>(key: string, isWeatherData = false): T | null {
  const expiry = isWeatherData ? WEATHER_CACHE_EXPIRY : LOCATION_CACHE_EXPIRY;
  
  // Try memory cache first
  const memoryItem = memoryCache.get(key);
  if (memoryItem && Date.now() - memoryItem.timestamp < expiry) {
    return memoryItem.data as T;
  }

  // Check if running in the browser
  if (typeof window === 'undefined') return null;

  const item = localStorage.getItem(key);
  if (!item) return null;

  try {
    const cached = JSON.parse(item) as CacheItem<T>;
    if (Date.now() - cached.timestamp > expiry) {
      localStorage.removeItem(key);
      memoryCache.delete(key);
      return null;
    }
    
    // Update memory cache
    memoryCache.set(key, cached as CacheItem<unknown>);
    return cached.data;
  } catch (error) {
    console.error('Error parsing cache item', error);
    localStorage.removeItem(key);
    memoryCache.delete(key);
    return null;
  }
}

export function setInCache<T>(key: string, data: T): void {
  // Check if running in the browser
  if (typeof window === 'undefined') return;

  const item: CacheItem<T> = {
    data,
    timestamp: Date.now(),
  };
  
  // Check localStorage usage before attempting to store
  if (shouldClearCache()) {
    clearOldCacheEntries();
  }
  
  // Set in both memory and localStorage
  memoryCache.set(key, item as CacheItem<unknown>);
  try {
    localStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error('Error setting cache item', error);
    
    // If quota exceeded, try to clear some old cache entries
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, clearing old cache entries');
      clearOldCacheEntries();
      
      // Try again after clearing
      try {
        localStorage.setItem(key, JSON.stringify(item));
      } catch (retryError) {
        console.error('Failed to set cache item even after clearing old entries', retryError);
      }
    }
  }
}

export function clearCache(): void {
  memoryCache.clear();
  if (typeof window !== 'undefined') {
    localStorage.clear();
  }
}

export function clearWeatherCache(): void {
  // Clear only weather-related cache entries
  const keysToDelete: string[] = [];
  memoryCache.forEach((_, key) => {
    if (key.startsWith('weather_')) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => {
    memoryCache.delete(key);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  });
}

function clearOldCacheEntries(): void {
  if (typeof window === 'undefined') return;
  
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  // Get all localStorage keys and check if they're expired cache entries
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    
    try {
      const item = localStorage.getItem(key);
      if (!item) continue;
      
      const cached = JSON.parse(item) as CacheItem<unknown>;
      if (cached.timestamp) {
        // Remove entries older than 1 hour regardless of their intended expiry
        const age = now - cached.timestamp;
        const ONE_HOUR = 60 * 60 * 1000;
        
        if (age > ONE_HOUR) {
          keysToDelete.push(key);
        }
      }
    } catch (error) {
      // If we can't parse it, it might be corrupted cache, remove it
      console.error('Error parsing cache item for key:', key, error);
      keysToDelete.push(key);
    }
  }
  
  // Remove old entries
  keysToDelete.forEach(key => {
    localStorage.removeItem(key);
    memoryCache.delete(key);
  });
  
  console.log(`Cleared ${keysToDelete.length} old cache entries`);
}

function shouldClearCache(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Try to estimate localStorage usage
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key || '');
      if (key && value) {
        totalSize += key.length + value.length;
      }
    }
    
    // If we're using more than 4MB (rough estimate), start clearing
    const FOUR_MB = 4 * 1024 * 1024;
    return totalSize > FOUR_MB;
  } catch (error) {
    // If we can't check, err on the side of caution
    console.error('Error checking localStorage size', error);
    return true;
  }
}
