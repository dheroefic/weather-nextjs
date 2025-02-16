const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export function getFromCache<T>(key: string): T | null {
  const item = localStorage.getItem(key);
  if (!item) return null;

  const cached = JSON.parse(item) as CacheItem<T>;
  if (Date.now() - cached.timestamp > CACHE_EXPIRY) {
    localStorage.removeItem(key);
    return null;
  }

  return cached.data;
}

export function setInCache<T>(key: string, data: T): void {
  const item: CacheItem<T> = {
    data,
    timestamp: Date.now(),
  };
  localStorage.setItem(key, JSON.stringify(item));
}