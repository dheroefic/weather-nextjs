# Admin API Keys - Root Access Setup

This document explains how to create root/admin API keys for database population and testing without user authentication.

## Overview

The admin API endpoint (`/api/admin/api-keys`) allows creating API keys that bypass normal user authentication. This is useful for:
- Database population and testing
- System-level operations
- Development and debugging

## Security

⚠️ **Important Security Notes:**
- The admin endpoint requires an `ADMIN_SECRET` environment variable
- Only use this in development or secure environments
- Root API keys have full access to all API endpoints
- Store created keys securely

## Setup

### 1. Set Admin Secret

Add to your `.env.local`:
```env
ADMIN_SECRET=your_super_secret_admin_key_here
```

Choose a strong, random secret key. This protects the admin endpoint.

### 2. Apply Database Schema

Make sure your database schema is up to date:
```bash
./scripts/setup-geocoding.sh
```

## Creating Root API Keys

### Method 1: Node.js Script (Recommended)

```bash
# Make sure your dev server is running
pnpm dev

# Create a root API key
node scripts/create-api-key.js

# Or specify custom URL and name
node scripts/create-api-key.js "http://localhost:3000" "My Custom API Key"
```

### Method 2: Bash Script (requires curl)

```bash
# Make sure your dev server is running
pnpm dev

# Create a root API key
./scripts/create-root-api-key.sh

# Or specify custom URL
./scripts/create-root-api-key.sh "http://localhost:3000"
```

### Method 3: Direct API Call

```bash
curl -X POST "http://localhost:3000/api/admin/api-keys" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: your_admin_secret_here" \
  -d '{
    "name": "Root API Key",
    "expiresInDays": 365
  }'
```

## API Endpoints

### Create Root API Key
**POST** `/api/admin/api-keys`

**Headers:**
- `X-Admin-Secret`: Your admin secret key
- `Content-Type`: application/json

**Body:**
```json
{
  "name": "API Key Name",
  "userId": "optional_user_id",
  "expiresInDays": 365
}
```

**Response:**
```json
{
  "success": true,
  "apiKey": {
    "id": "uuid",
    "name": "API Key Name",
    "key": "wapi_abcd1234...",
    "user_id": "user_uuid",
    "created_at": "2025-01-01T00:00:00Z",
    "expires_at": "2026-01-01T00:00:00Z",
    "is_active": true
  },
  "message": "Root API key created successfully...",
  "usage": {
    "geocoding": "curl -H \"Authorization: Bearer wapi_abcd1234...\" ...",
    "weather": "curl -H \"Authorization: Bearer wapi_abcd1234...\" ..."
  }
}
```

### List All API Keys (Admin)
**GET** `/api/admin/api-keys`

**Headers:**
- `X-Admin-Secret`: Your admin secret key

**Response:**
```json
{
  "apiKeys": [
    {
      "id": "uuid",
      "name": "API Key Name",
      "user_id": "user_uuid",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z",
      "is_active": true,
      "expires_at": "2026-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

## Using Root API Keys

Once created, use the API key with any protected endpoint:

### Geocoding API
```bash
# Reverse geocoding
curl -H "Authorization: Bearer wapi_your_key_here" \
  "http://localhost:3000/api/geocoding?latitude=40.4637&longitude=-3.7492"

# Country search
curl -H "Authorization: Bearer wapi_your_key_here" \
  "http://localhost:3000/api/geocoding?search=Spain"
```

### Weather API (if available)
```bash
curl -H "Authorization: Bearer wapi_your_key_here" \
  "http://localhost:3000/api/weather?latitude=40.4637&longitude=-3.7492"
```

## Environment Variables

Add the generated API key to your `.env.local` for easy testing:
```env
# Admin secret for creating keys
ADMIN_SECRET=your_super_secret_admin_key_here

# Generated API key for testing
WEATHER_API_KEY=wapi_generated_key_here
```

## Security Best Practices

1. **Secure Admin Secret**: Use a strong, random admin secret
2. **Environment Protection**: Only enable admin endpoints in development
3. **Key Rotation**: Regularly rotate API keys
4. **Access Logging**: Monitor API key usage via audit logs
5. **Expiration**: Set reasonable expiration dates

## Troubleshooting

### Common Issues

1. **"Admin operations not configured"**
   - Add `ADMIN_SECRET` to `.env.local`

2. **"Unauthorized" error**
   - Check that `X-Admin-Secret` header matches `ADMIN_SECRET`

3. **Connection refused**
   - Make sure Next.js dev server is running (`pnpm dev`)

4. **API key not working**
   - Verify the key format starts with `wapi_`
   - Check that the key is active and not expired
   - Ensure proper Authorization header format

### Debug Mode

Set `NODE_ENV=development` to see detailed error messages in API responses.

## Production Considerations

⚠️ **Important for Production:**
- Remove or secure admin endpoints
- Use infrastructure-level authentication
- Implement proper key management
- Monitor API usage and set up alerts
- Use environment-specific secrets
