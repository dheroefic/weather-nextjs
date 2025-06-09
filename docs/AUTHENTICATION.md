# API Documentation

This document describes the API endpoints available in the Weather Next.js app.

## Overview

The weather app includes these core APIs:
- **API Key Management** - Secure API key generation and validation
- **Background Images** - Weather-themed background images via Unsplash
- **Rate Limiting** - Configurable rate limits per endpoint and user
- **Audit Logging** - Complete tracking of API usage and associations
- **Security Headers** - CORS, CSP, and other security measures

## Database Schema

### Tables Created

1. **`api_keys`** - Manages user API keys
   - Secure bcrypt hashing
   - Expiration dates
   - Active/inactive status

2. **`api_audit_logs`** - Tracks all API requests
   - Response times
   - Error messages
   - Request/response sizes
   - User and IP information

3. **`rate_limits`** - Implements rate limiting
   - Sliding window algorithm
   - Per-endpoint configuration
   - Automatic cleanup

4. **`associations`** - Tracks IP/API key/user relationships
   - Hit counts
   - Geographic information
   - Usage patterns

## Security Features

### Authentication Methods

1. **API Key Authentication**
   ```bash
   # Header method (recommended)
   curl -H "Authorization: Bearer wapi_your_api_key_here" \
        https://your-domain.com/api/background?condition=sunny

   # X-API-Key header method
   curl -H "X-API-Key: wapi_your_api_key_here" \
        https://your-domain.com/api/background?condition=sunny

   # Query parameter method (less secure)
   curl "https://your-domain.com/api/background?condition=sunny&api_key=wapi_your_api_key_here"
   ```

2. **User Session Authentication**
   - JWT tokens from Supabase
   - Automatic session management

### Rate Limiting

Different endpoints have different rate limits:

- **Background API**: 30 requests/minute
- **Weather API**: 100 requests/minute  
- **Auth endpoints**: 5 requests/5 minutes
- **Default**: 50 requests/minute

Rate limit headers included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: When the window resets
- `Retry-After`: Seconds until you can retry (when limited)

### Security Headers

All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` with strict policies
- CORS headers for API endpoints

## API Endpoints

### API Key Management

#### GET `/api/api-keys`
List your API keys (requires authentication).

#### POST `/api/api-keys`
Create a new API key.

```json
{
  "name": "My Weather App Key",
  "expiresInDays": 365
}
```

#### PUT `/api/api-keys/{id}`
Update an API key.

```json
{
  "name": "Updated Key Name",
  "is_active": false
}
```

#### DELETE `/api/api-keys/{id}`
Delete an API key.

### Background Images

#### GET `/api/background`
Get weather background images.

Query parameters:
- `condition`: Weather condition (sunny, cloudy, rain, snow, storm, default)

## Setup Instructions

### 1. Environment Configuration

Ensure your `.env.local` contains all required variables:

```bash
# Supabase Configuration
SUPABASE_URL="your_supabase_url"
NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
SUPABASE_JWT_SECRET="your_jwt_secret"

# Unsplash API for background images
UNSPLASH_ACCESS_KEY="your_unsplash_access_key"

# Database
POSTGRES_URL="your_postgres_url"
# ... other postgres variables

# API Security
API_SECRET_KEY="your_generated_secret"
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Apply Database Schema

Run the migration script:

```bash
./scripts/apply-schema.sh
```

Or manually apply with psql:

```bash
psql "$POSTGRES_URL" -f database/schema.sql
```

### 3. Test the System

1. **Create API key**:
   ```bash
   curl -X POST http://localhost:3000/api/api-keys \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -d '{"name":"Test Key","expiresInDays":30}'
   ```

2. **Test API with key**:
   ```bash
   curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/api/background?condition=sunny
   ```

## Monitoring & Analytics

### Audit Logging

All API requests are logged with:
- Timestamp and response time
- API key identification
- Request parameters
- Response status and size
- Error messages
- IP address and user agent

### Rate Limiting & Security

The system includes:
- Configurable rate limits per endpoint
- Security headers on all responses
- API key validation and management
- Request/response monitoring

## Security Considerations

### API Key Security

- API keys are stored as bcrypt hashes
- Keys have the prefix `wapi_` for identification
- Keys can have expiration dates
- Keys can be deactivated without deletion

### Rate Limiting

- Uses sliding window algorithm
- Per-endpoint configuration
- Automatic cleanup of old records
- Graceful handling of rate limit exceeded

### Data Privacy

- Row Level Security (RLS) enabled
- API logs are filtered by ownership
- Automatic cleanup of old data

### Error Handling

- Detailed error logging for debugging
- Generic error messages to clients
- Rate limiting per endpoint
- Graceful degradation of services

## Troubleshooting

### Common Issues

1. **"API key required" error**
   - Ensure you're providing the API key in headers
   - Check that the key is active and not expired

2. **"Rate limit exceeded" error**
   - Wait for the retry period shown in headers
   - Consider spacing out requests

3. **Database connection errors**
   - Verify environment variables are correct
   - Check Supabase service status

4. **Background image failures**
   - Verify UNSPLASH_ACCESS_KEY is set
   - Check Unsplash API status

### Debugging

Enable detailed logging by checking:
- Browser developer tools for client errors
- Server logs for API errors
- Supabase dashboard for database issues
- Network requests in developer tools

## Future Enhancements

Potential improvements:
- Enhanced rate limiting per user
- API key usage quotas
- Background image caching improvements
- Additional weather condition support
- Integration with more image providers
- Advanced performance monitoring
