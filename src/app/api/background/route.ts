import { NextRequest, NextResponse } from 'next/server';
import { createApi } from 'unsplash-js';

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

// Initialize Unsplash API with server-side environment variable
let unsplashApi: ReturnType<typeof createApi> | null = null;

if (process.env.UNSPLASH_ACCESS_KEY) {
  unsplashApi = createApi({
    accessKey: process.env.UNSPLASH_ACCESS_KEY,
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const condition = searchParams.get('condition') as WeatherCondition;

    if (!condition || !weatherToSearchTerms[condition]) {
      return NextResponse.json(
        { error: 'Invalid weather condition' },
        { status: 400 }
      );
    }

    // If Unsplash is not configured, return error
    if (!unsplashApi) {
      return NextResponse.json(
        { error: 'Unsplash service not configured' },
        { status: 503 }
      );
    }

    const searchTerms = weatherToSearchTerms[condition];
    const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

    console.log(`[Background API] Searching Unsplash with term: ${randomTerm}`);
    
    const result = await unsplashApi.search.getPhotos({
      query: randomTerm,
      orientation: 'landscape',
      perPage: 1,
      page: Math.floor(Math.random() * 20) + 1,
    });

    if (result.status === 200 && result.response?.results && result.response.results.length > 0) {
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

      const backgroundResult = {
        imageUrl: imageUrl.toString(),
        attribution: {
          photographerName: photo.user.name,
          photographerUsername: photo.user.username,
          photographerUrl: photo.user.links.html
        }
      };

      console.log(`[Background API] Found image from Unsplash: ${photo.user.name}`);
      
      return NextResponse.json(backgroundResult);
    }

    console.log('[Background API] No results from Unsplash');
    return NextResponse.json(
      { error: 'No images found' },
      { status: 404 }
    );

  } catch (error) {
    console.error('[Background API] Error fetching from Unsplash:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
