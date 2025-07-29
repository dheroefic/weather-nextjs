import { debug } from '@/utils/debug';
import { isUnsplashEnabled } from '@/utils/featureFlags';

/**
 * Background Image Service - Secure Implementation
 * 
 * SECURITY UPDATE: This service now uses a server-side API route to fetch Unsplash images,
 * keeping the API key secure on the server instead of exposing it to the client.
 * 
 * Migration from client-side:
 * - Old: NEXT_PUBLIC_UNSPLASH_ACCESS_KEY (exposed to client)
 * - New: UNSPLASH_ACCESS_KEY (server-side only) + NEXT_PUBLIC_ENABLE_UNSPLASH (feature flag)
 */

type WeatherCondition = 'sunny' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'default';

const staticBackgrounds: Record<WeatherCondition, string> = {
  sunny: '/background-weather/a-sunny.jpg',
  cloudy: '/background-weather/a-cloudy.jpg',
  rain: '/background-weather/a-rain.jpg',
  snow: '/background-weather/a-snow.jpg',
  storm: '/background-weather/a-storm.jpg',
  default: '/background-weather/a-default.jpg',
};

export interface BackgroundImageResult {
  imageUrl: string;
  attribution?: {
    photographerName: string;
    photographerUsername: string;
    photographerUrl: string;
  };
}

interface CachedImage extends BackgroundImageResult {
  timestamp: number;
}

const imageCache: Record<WeatherCondition, CachedImage | null> = {
  sunny: null,
  cloudy: null,
  rain: null,
  snow: null,
  storm: null,
  default: null,
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hours

export async function getBackgroundImage(condition: WeatherCondition): Promise<BackgroundImageResult> {
  // Check cache first
  const cachedImage = imageCache[condition];
  if (cachedImage && Date.now() - cachedImage.timestamp < CACHE_DURATION) {
    debug.background('Using cached background image:', { condition });
    return cachedImage;
  }

  // If Unsplash is not enabled via feature flag, use static background
  if (!isUnsplashEnabled()) {
    debug.background('Using static background image:', { condition });
    return {
      imageUrl: staticBackgrounds[condition] || staticBackgrounds.default
    };
  }

  debug.background('Fetching background image from API:', { condition });

  try {
    // Call our API route instead of Unsplash directly
    const response = await fetch(`/api/background?condition=${condition}`);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const backgroundResult: BackgroundImageResult = await response.json();

    debug.background('Received background image from API:', { 
      condition, 
      photographer: backgroundResult.attribution?.photographerName 
    });

    // Cache the result
    imageCache[condition] = {
      ...backgroundResult,
      timestamp: Date.now()
    };

    return backgroundResult;
  } catch (error) {
    debug.background('Error fetching from background API:', { error });
    return {
      imageUrl: staticBackgrounds[condition] || staticBackgrounds.default
    };
  }
}