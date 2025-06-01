// Weather data cache expires in 10 minutes, location cache in 24 hours
import { performanceMonitor } from '@/utils/performance';

const WEATHER_CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes
const LOCATION_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// In-memory cache for faster access during the same session
const memoryCache = new Map<string, CacheItem<any>>();

export function getFromCache<T>(key: string, isWeatherData = false): T | null {
  const expiry = isWeatherData ? WEATHER_CACHE_EXPIRY : LOCATION_CACHE_EXPIRY;
  
  // Try memory cache first
  const memoryItem = memoryCache.get(key);
  if (memoryItem && Date.now() - memoryItem.timestamp < expiry) {
    return memoryItem.data;
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
    memoryCache.set(key, cached);
    return cached.data;
  } catch (error) {
    console.error('Error parsing cache item', error);
    localStorage.removeItem(key);
    memoryCache.delete(key);
    return null;
  }
}

export function setInCache<T>(key: string, data: T, isWeatherData = false): void {
  // Check if running in the browser
  if (typeof window === 'undefined') return;

  const item: CacheItem<T> = {
    data,
    timestamp: Date.now(),
  };
  
  // Set in both memory and localStorage
  memoryCache.set(key, item);
  try {
    localStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error('Error setting cache item', error);
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
