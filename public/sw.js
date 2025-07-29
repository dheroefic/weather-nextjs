const CACHE_NAME = 'weather-app-v1';
const urlsToCache = [
  '/',
  '/icons/weathers/',
  '/background-weather/',
];

const WEATHER_API_CACHE = 'weather-api-v1';
const BACKGROUND_CACHE = 'background-images-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache weather API responses for 10 minutes
  // Handle both default and custom OpenMeteo API URLs
  if (url.hostname === 'api.open-meteo.com' || 
      url.hostname === 'geocoding-api.open-meteo.com' ||
      url.pathname.includes('/v1/forecast') ||
      url.pathname.includes('/v1/search') ||
      url.pathname.includes('/v1/reverse')) {
    event.respondWith(
      caches.open(WEATHER_API_CACHE).then((cache) => {
        return cache.match(request).then((response) => {
          if (response) {
            const responseTime = new Date(response.headers.get('sw-cache-time') || 0);
            const now = new Date();
            const diffMinutes = (now - responseTime) / (1000 * 60);
            
            if (diffMinutes < 10) {
              return response;
            }
          }

          return fetch(request).then((networkResponse) => {
            const responseToCache = networkResponse.clone();
            responseToCache.headers.set('sw-cache-time', new Date().toISOString());
            cache.put(request, responseToCache);
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // Cache Unsplash images for 24 hours
  if (url.hostname === 'images.unsplash.com') {
    event.respondWith(
      caches.open(BACKGROUND_CACHE).then((cache) => {
        return cache.match(request).then((response) => {
          if (response) {
            const responseTime = new Date(response.headers.get('sw-cache-time') || 0);
            const now = new Date();
            const diffHours = (now - responseTime) / (1000 * 60 * 60);
            
            if (diffHours < 24) {
              return response;
            }
          }

          return fetch(request).then((networkResponse) => {
            const responseToCache = networkResponse.clone();
            responseToCache.headers.set('sw-cache-time', new Date().toISOString());
            cache.put(request, responseToCache);
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // Default caching strategy
  event.respondWith(
    caches.match(request)
      .then((response) => {
        return response || fetch(request);
      })
  );
});
