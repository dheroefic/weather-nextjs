# Geocoding API Documentation

This document describes the Supabase-based geocoding API that replaces the external OpenMeteo geocoding service with local Nominatim data.

## Overview

The geocoding API provides:
- **Reverse geocoding**: Convert coordinates to country information
- **Country search**: Find countries by name
- **Multi-language support**: Localized country names
- **API Key Authentication**: Required for all requests
- **Rate limiting**: 100 requests per minute per API key
- **Audit logging**: Complete request tracking

## Authentication

**All geocoding API requests require a valid API key.** You can provide the API key in three ways:

1. **Authorization Header** (Recommended):
   ```
   Authorization: Bearer your_api_key_here
   ```

2. **Custom Header**:
   ```
   X-API-Key: your_api_key_here
   ```

3. **Query Parameter**:
   ```
   ?api_key=your_api_key_here
   ```

### Getting an API Key

1. Authenticate with your Supabase account
2. Create an API key via the `/api/api-keys` endpoint
3. Use the returned key for geocoding requests

## Database Schema

### `country_name` Table
```sql
- id: UUID (Primary Key)
- country_code: VARCHAR(2) (ISO 3166-1 alpha-2)
- name: VARCHAR(255) (Country name)
- default_language_code: VARCHAR(10) (ISO 639-1 language code)
- partition: INTEGER (Nominatim partition)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### `country_osm_grid` Table
```sql
- id: UUID (Primary Key)
- country_code: VARCHAR(2) (ISO 3166-1 alpha-2)
- area: NUMERIC (Country area in km²)
- geometry: TEXT (PostGIS geometry as text - POINT or POLYGON)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## API Endpoints

### Reverse Geocoding
**GET** `/api/geocoding?latitude={lat}&longitude={lng}&language={lang}`

**Parameters:**
- `latitude` (required): Latitude in decimal degrees (-90 to 90)
- `longitude` (required): Longitude in decimal degrees (-180 to 180)
- `language` (optional): Language code (default: 'en')

**Example:**
```bash
curl -H "Authorization: Bearer your_api_key_here" \
  "http://localhost:3000/api/geocoding?latitude=40.4637&longitude=-3.7492&language=en"
```

**Response:**
```json
{
  "results": [
    {
      "country_code": "ES",
      "country_name": "Spain",
      "default_language": "es",
      "area": 505992,
      "geometry": "POINT(-3.7492 40.4637)",
      "coordinates": {
        "latitude": 40.4637,
        "longitude": -3.7492
      }
    }
  ],
  "count": 1
}
```

### Country Search
**GET** `/api/geocoding?search={query}&language={lang}`

**Parameters:**
- `search` (required): Country name to search for
- `language` (optional): Language code (default: 'en')

**Example:**
```bash
curl -H "Authorization: Bearer your_api_key_here" \
  "http://localhost:3000/api/geocoding?search=Spain&language=en"
```

**Response:**
```json
{
  "results": [
    {
      "country_code": "ES",
      "country_name": "Spain",
      "default_language": "es",
      "area": 505992,
      "geometry": "POINT(-3.7492 40.4637)"
    }
  ],
  "count": 1
}
```

## Error Responses

### Authentication Required (401)
```json
{
  "error": "API key required"
}
```

### Invalid API Key (403)
```json
{
  "error": "Invalid or expired API key"
}
```

### Rate Limit Exceeded (429)
```json
{
  "error": "Rate limit exceeded"
}
```

### Invalid Parameters (400)
```json
{
  "error": "Missing latitude or longitude parameters"
}
```

### Server Error (500)
```json
{
  "error": "Failed to fetch geocoding data",
  "details": "Database connection failed" // Only in development
}
```

## Setup Instructions

### 1. Apply Database Schema
```bash
# Run the setup script
./scripts/setup-geocoding.sh

# Or manually apply with psql
psql $SUPABASE_DB_URL -f database/schema.sql
psql $SUPABASE_DB_URL -f database/sample-geocoding-data.sql
```

### 2. Environment Variables
Ensure your `.env.local` contains:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_DB_URL=postgresql://postgres:[password]@[host]:5432/postgres
```

### 3. Data Population
The sample data includes 15 major countries. For production, you'll need to:

1. **Export from Nominatim**: Download full country data
2. **Transform geometry**: Convert PostGIS geometries to text format
3. **Import data**: Use the provided schema structure

### 4. Test the API
```bash
# First, get an API key (requires authentication)
# Then test reverse geocoding
curl -H "Authorization: Bearer your_api_key_here" \
  "http://localhost:3000/api/geocoding?latitude=40.4637&longitude=-3.7492"

# Test country search
curl -H "Authorization: Bearer your_api_key_here" \
  "http://localhost:3000/api/geocoding?search=United States"
```

## Performance Considerations

### Caching
- API responses cached for 1 hour (`Cache-Control: public, max-age=3600`)
- Consider implementing Redis for high-traffic scenarios

### Database Optimization
- Indexes on `country_code`, `name`, and `default_language_code`
- Consider spatial indexes for geometry columns in production

### Rate Limiting
- Default: 100 requests per minute per API key
- Configurable via `rateLimitConfigs.weather` in `/lib/rateLimiter.ts`
- Tied to authenticated API key, not IP address

## Integration with Weather App

The geocoding service integrates with:
- **Location Services**: `src/services/geolocationService.ts`
- **Weather Service**: `src/services/weatherService.ts`
- **Cache Service**: `src/services/cacheService.ts`

### Usage Example
```typescript
import { GeocodingService } from '@/services/geocodingService';

// Note: These are service-level methods for server-side use
// For client-side, use the API endpoints with proper authentication

// Reverse geocoding
const results = await GeocodingService.reverseGeocode(40.4637, -3.7492, 'en');

// Country search
const countries = await GeocodingService.searchCountries('Spain', 'en', 10);
```

### Client-side API Usage
```typescript
// Client-side usage with API key
const response = await fetch('/api/geocoding?latitude=40.4637&longitude=-3.7492', {
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
});
const data = await response.json();
```

## Security Features

- **API Key Authentication**: Required for all requests
- **Row Level Security (RLS)**: Enabled on all tables
- **Rate Limiting**: Per-API-key request limits
- **Input Validation**: Coordinate range validation
- **Audit Logging**: Complete request tracking with API key association
- **Error Handling**: Safe error messages in production

## Migration from OpenMeteo

To migrate from the external OpenMeteo geocoding API:

1. **Update client code**: The API interface remains compatible
2. **Data format**: Response format matches OpenMeteo structure
3. **Performance**: Local queries are typically faster
4. **Reliability**: No external API dependencies
5. **Cost**: No API usage fees

## Troubleshooting

### Common Issues

1. **No results found**: Check if country data exists in tables
2. **Authentication errors**: Verify API key is valid and active
3. **Database errors**: Verify Supabase connection and RLS policies
4. **Rate limiting**: Check API key usage limits
5. **Geometry parsing**: Ensure geometry format is valid PostGIS text

### Debug Mode
Set `NODE_ENV=development` to see detailed error messages in API responses.

### Monitoring
Check the `api_audit_logs` table for request tracking and performance monitoring.
