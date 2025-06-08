import { NextRequest, NextResponse } from 'next/server';
import { createApi } from 'unsplash-js';
import { AuthMiddleware, AuthContext } from '@/lib/authMiddleware';
import { AuditLogger } from '@/lib/auditLogger';

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
  const startTime = Date.now();
  const endpoint = '/api/background';

  return AuthMiddleware.withAuth(
    request,
    async (req: NextRequest, context: AuthContext) => {
      try {
        const { searchParams } = new URL(request.url);
        const condition = searchParams.get('condition') as WeatherCondition;

        if (!condition || !weatherToSearchTerms[condition]) {
          const responseTime = Date.now() - startTime;

          await AuditLogger.logRequest(request, {
            endpoint,
            responseStatus: 400,
            responseTimeMs: responseTime,
            apiKeyId: context.apiKey?.id,
            userId: context.user?.id,
            requestParams: { condition },
            errorMessage: 'Invalid weather condition',
          });

          return NextResponse.json(
            { error: 'Invalid weather condition' },
            { status: 400 }
          );
        }

        // If Unsplash is not configured, return error
        if (!unsplashApi) {
          const responseTime = Date.now() - startTime;

          await AuditLogger.logRequest(request, {
            endpoint,
            responseStatus: 503,
            responseTimeMs: responseTime,
            apiKeyId: context.apiKey?.id,
            userId: context.user?.id,
            requestParams: { condition },
            errorMessage: 'Unsplash service not configured',
          });

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
          
          const responseTime = Date.now() - startTime;

          await AuditLogger.logRequest(request, {
            endpoint,
            responseStatus: 200,
            responseTimeMs: responseTime,
            apiKeyId: context.apiKey?.id,
            userId: context.user?.id,
            requestParams: { condition },
          });

          const response = NextResponse.json(backgroundResult);
          return AuthMiddleware.addSecurityHeaders(response);
        }

        console.log('[Background API] No results from Unsplash');
        const responseTime = Date.now() - startTime;

        await AuditLogger.logRequest(request, {
          endpoint,
          responseStatus: 404,
          responseTimeMs: responseTime,
          apiKeyId: context.apiKey?.id,
          userId: context.user?.id,
          requestParams: { condition },
          errorMessage: 'No images found',
        });

        return NextResponse.json(
          { error: 'No images found' },
          { status: 404 }
        );

      } catch (error) {
        console.error('[Background API] Error fetching from Unsplash:', error);
        const responseTime = Date.now() - startTime;

        await AuditLogger.logRequest(request, {
          endpoint,
          responseStatus: 500,
          responseTimeMs: responseTime,
          apiKeyId: context.apiKey?.id,
          userId: context.user?.id,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });

        const response = NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );

        return AuthMiddleware.addSecurityHeaders(response);
      }
    },
    {
      allowPublic: true,
      rateLimitConfig: 'background',
    }
  );
}
