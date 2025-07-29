#!/bin/bash

# Script to create a root API key for database population and testing
# This creates an API key that can be used to test the geocoding API

set -e

echo "🔑 Creating Root API Key for Weather App"
echo "========================================"

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check for required environment variables
if [[ -z "${ADMIN_SECRET}" ]]; then
    echo "❌ ADMIN_SECRET environment variable is required"
    echo "Please set it in your .env.local file:"
    echo "ADMIN_SECRET=your_super_secret_admin_key_here"
    exit 1
fi

# Get the base URL
BASE_URL=${1:-"http://localhost:3000"}
API_KEY_NAME=${2:-"Root API Key $(date +%Y%m%d-%H%M%S)"}
ROLE=${3:-"root"}

echo "📡 Creating API key at: $BASE_URL"
echo "🏷️  API key name: $API_KEY_NAME"
echo "👤 Role: $ROLE"
echo ""

# Create the API key
RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/api-keys" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: $ADMIN_SECRET" \
  -d "{
    \"name\": \"$API_KEY_NAME\",
    \"role\": \"$ROLE\",
    \"expiresInDays\": 365
  }")

# Check if request was successful
if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    API_KEY=$(echo "$RESPONSE" | jq -r '.apiKey.key')
    API_KEY_ID=$(echo "$RESPONSE" | jq -r '.apiKey.id')
    EXPIRES_AT=$(echo "$RESPONSE" | jq -r '.apiKey.expires_at')
    
    echo "✅ API Key created successfully!"
    echo ""
    echo "📋 API Key Details:"
    echo "   ID: $API_KEY_ID"
    echo "   Key: $API_KEY"
    echo "   Expires: $EXPIRES_AT"
    echo ""
    echo "🔐 IMPORTANT: Store this API key securely - it will not be shown again!"
    echo ""
    echo "📝 Save to .env.local:"
    echo "   WEATHER_API_KEY=$API_KEY"
    echo ""
    echo "🧪 Test the geocoding API:"
    echo "   curl -H \"Authorization: Bearer $API_KEY\" \\"
    echo "     \"$BASE_URL/api/geocoding?latitude=40.4637&longitude=-3.7492\""
    echo ""
    echo "🌍 Test country search:"
    echo "   curl -H \"Authorization: Bearer $API_KEY\" \\"
    echo "     \"$BASE_URL/api/geocoding?search=Spain\""
    
    # Save to a file for easy access
    echo "$API_KEY" > .api-key.txt
    echo ""
    echo "💾 API key also saved to .api-key.txt (add to .gitignore)"
    
else
    echo "❌ Failed to create API key"
    echo "Response: $RESPONSE"
    
    # Check for common errors
    if echo "$RESPONSE" | grep -q "Unauthorized"; then
        echo ""
        echo "💡 Make sure ADMIN_SECRET is set correctly in your .env.local"
    elif echo "$RESPONSE" | grep -q "not configured"; then
        echo ""
        echo "💡 Admin operations not configured. Add ADMIN_SECRET to your .env.local"
    fi
    
    exit 1
fi
