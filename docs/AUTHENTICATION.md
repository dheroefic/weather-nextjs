# Authentication & Security Documentation

This document describes the comprehensive authentication and security system implemented for the Weather Next.js app.

## Overview

The weather app now includes:
- **Supabase Authentication** - User registration and login
- **API Key Management** - Secure API key generation and validation
- **Rate Limiting** - Configurable rate limits per endpoint and user
- **Audit Logging** - Complete tracking of API usage and associations
- **Security Headers** - CORS, CSP, and other security measures
- **IP/User Associations** - Tracking of client relationships and usage patterns

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

### Authentication

#### POST `/api/auth/register`
Register a new user account.

```json
{
  "email": "user@example.com",
  "password": "your_secure_password",
  "name": "Your Name"
}
```

#### POST `/api/auth/login`
Login with email and password.

```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

#### POST `/api/auth/logout`
Logout and invalidate session.

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

### Statistics & Monitoring

#### GET `/api/stats/usage`
Get API usage statistics.

Query parameters:
- `api_key_id`: Filter by specific API key
- `days`: Days to look back (1-90, default: 30)

#### GET `/api/stats/associations`
Get IP/API key associations.

Query parameters:
- `api_key_id`: Filter by API key
- `min_hits`: Minimum hit count to include

### Weather Endpoints

#### GET `/api/background`
Get weather background images (now secured).

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

1. **Register a user**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpassword123"}'
   ```

2. **Login**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpassword123"}'
   ```

3. **Create API key** (use the access_token from login):
   ```bash
   curl -X POST http://localhost:3000/api/api-keys \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -d '{"name":"Test Key","expiresInDays":30}'
   ```

4. **Test API with key**:
   ```bash
   curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/api/background?condition=sunny
   ```

## Monitoring & Analytics

### Audit Logging

All API requests are logged with:
- Timestamp and response time
- User/API key identification
- Request parameters
- Response status and size
- Error messages
- IP address and user agent

### Association Tracking

The system tracks:
- Which IP addresses use which API keys
- Hit counts per association
- First and last seen timestamps
- Geographic information (when available)

### Suspicious Activity Detection

The system can identify:
- High-volume requests from single IPs
- High error rates
- Unusual access patterns
- Potential abuse attempts

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
- Users can only see their own data
- Audit logs are filtered by ownership
- Automatic cleanup of old data

### Error Handling

- Detailed error logging for debugging
- Generic error messages to clients
- Rate limiting on authentication attempts
- Graceful degradation of services

## Troubleshooting

### Common Issues

1. **"API key required" error**
   - Ensure you're providing the API key in headers
   - Check that the key is active and not expired

2. **"Rate limit exceeded" error**
   - Wait for the retry period shown in headers
   - Consider requesting higher limits

3. **Database connection errors**
   - Verify environment variables are correct
   - Check Supabase service status

4. **Authentication failures**
   - Verify user credentials
   - Check if account is confirmed

### Debugging

Enable detailed logging by checking:
- Browser developer tools for client errors
- Server logs for API errors
- Supabase dashboard for database issues
- Rate limit statistics in the database

## Future Enhancements

Potential improvements:
- Geographic rate limiting
- API key usage quotas
- Webhook notifications for suspicious activity
- Dashboard for usage analytics
- Integration with external monitoring services
- Advanced fraud detection algorithms
