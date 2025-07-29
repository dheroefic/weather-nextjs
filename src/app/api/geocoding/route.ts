import { NextRequest, NextResponse } from 'next/server';
import { GeocodingService } from '@/services/geocodingService';
import { AuthMiddleware } from '@/lib/authMiddleware';
import { GeocodingResponse, GeocodingError } from '@/types/geocoding';

export async function GET(request: NextRequest) {
  return AuthMiddleware.withAuth(
    request,
    async () => {
      const { searchParams } = new URL(request.url);
      const latitude = searchParams.get('latitude');
      const longitude = searchParams.get('longitude');
      const language = searchParams.get('language') || 'en';
      const search = searchParams.get('search'); // For country name search

      try {
        // Handle location search by name (cities and countries)
        if (search) {
          const results = await GeocodingService.searchLocations(search, language, 10);
          
          const response: GeocodingResponse = {
            results,
            count: results.length
          };

          return NextResponse.json(response, {
            headers: {
              'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            }
          });
        }

        // Handle reverse geocoding
        if (!latitude || !longitude) {
          return NextResponse.json(
            { error: 'Missing latitude or longitude parameters' } as GeocodingError,
            { status: 400 }
          );
        }

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        if (isNaN(lat) || isNaN(lng)) {
          return NextResponse.json(
            { error: 'Invalid latitude or longitude format' } as GeocodingError,
            { status: 400 }
          );
        }

        // Validate coordinate ranges
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return NextResponse.json(
            { error: 'Coordinates out of valid range' } as GeocodingError,
            { status: 400 }
          );
        }

        const results = await GeocodingService.reverseGeocode(lat, lng);
        
        const response: GeocodingResponse = {
          results,
          count: results.length
        };

        return NextResponse.json(response, {
          headers: {
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          }
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.error('Geocoding API error:', error);
        return NextResponse.json(
          { 
            error: 'Failed to fetch geocoding data',
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
          } as GeocodingError,
          { status: 500 }
        );
      }
    },
    {
      requireAuth: true, // Require API key authentication
      rateLimitConfig: 'weather', // Use weather rate limiting (100 req/min)
    }
  );
}
