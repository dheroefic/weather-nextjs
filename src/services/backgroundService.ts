import { createApi } from 'unsplash-js';
import { debug } from '@/utils/debug';
import { isUnsplashEnabled } from '@/utils/featureFlags';

type WeatherCondition = 'sunny' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'default';

interface UnsplashPhoto {
  urls: {
    regular: string;
  };
  links: {
    download_location: string;
  };
  user: {
    name: string;
    username: string;
    links: {
      html: string;
    };
  };
}

const weatherToSearchTerms: Record<WeatherCondition, string[]> = {
  sunny: ['sunny weather', 'clear sky', 'sunshine'],
  cloudy: ['cloudy weather', 'overcast sky', 'clouds'],
  rain: ['rainy weather', 'rain', 'rainfall'],
  snow: ['snow weather', 'snowy landscape', 'winter snow'],
  storm: ['storm weather', 'thunderstorm', 'lightning'],
  default: ['nature landscape', 'sky', 'weather'],
};

const staticBackgrounds: Record<WeatherCondition, string> = {
  sunny: '/background-weather/a-sunny.jpg',
  cloudy: '/background-weather/a-cloudy.jpg',
  rain: '/background-weather/a-rain.jpg',
  snow: '/background-weather/a-snow.jpg',
  storm: '/background-weather/a-storm.jpg',
  default: '/background-weather/a-default.jpg',
};

let unsplashApi: ReturnType<typeof createApi> | null = null;

if (isUnsplashEnabled()) {
  unsplashApi = createApi({
    accessKey: process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY!,
  });
}

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

  if (!unsplashApi) {
    debug.background('Using static background image:', { condition });
    return {
      imageUrl: staticBackgrounds[condition] || staticBackgrounds.default
    };
  }

  debug.background('Fetching background image from Unsplash:', { condition });

  try {
    const searchTerms = weatherToSearchTerms[condition];
    const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

    debug.background('Searching Unsplash with term:', { randomTerm });
    const result = await unsplashApi.search.getPhotos({
      query: randomTerm,
      orientation: 'landscape',
      perPage: 1,
      page: Math.floor(Math.random() * 20) + 1,
    });

    if (result.status === 200 && result.response && result.response.results && result.response.results.length > 0) {
      const photo = result.response.results[0] as UnsplashPhoto;

      // Track download when image is selected
      await unsplashApi.photos.trackDownload({
        downloadLocation: photo.links.download_location
      });

      // Use Unsplash's URL parameters for optimal image loading
      const imageUrl = new URL(photo.urls.regular);
      imageUrl.searchParams.set('w', '1920');
      imageUrl.searchParams.set('q', '80');
      imageUrl.searchParams.set('fit', 'max');
      imageUrl.searchParams.set('auto', 'format');
      imageUrl.searchParams.set('utm_source', 'weather_app');
      imageUrl.searchParams.set('utm_medium', 'referral');

      const backgroundResult: BackgroundImageResult = {
        imageUrl: imageUrl.toString(),
        attribution: {
          photographerName: photo.user.name,
          photographerUsername: photo.user.username,
          photographerUrl: photo.user.links.html
        }
      };

      // Cache the result
      imageCache[condition] = {
        ...backgroundResult,
        timestamp: Date.now()
      };

      return backgroundResult;
    }

    debug.background('No results from Unsplash, using static background');
    return {
      imageUrl: staticBackgrounds[condition] || staticBackgrounds.default
    };
  } catch (error) {
    debug.background('Error fetching from Unsplash:', { error });
    return {
      imageUrl: staticBackgrounds[condition] || staticBackgrounds.default
    };
  }
}