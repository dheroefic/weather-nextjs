#!/bin/bash
# filepath: /Users/dheroefic/project/weather-nextjs/scripts/apply-schema.sh

# Weather App Database Schema Migration Script
# This script applies the database schema to Supabase

set -e

echo "🔄 Applying database schema to Supabase..."

# Check if required environment variables are set
if [ -z "$POSTGRES_URL" ]; then
    echo "❌ Error: POSTGRES_URL environment variable is not set"
    echo "Please set your Supabase database URL in .env.local"
    exit 1
fi

# Apply the schema using psql
echo "📊 Creating tables and indexes..."
psql "$POSTGRES_URL" -f database/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database schema applied successfully!"
    echo ""
    echo "📋 Tables created:"
    echo "  • api_keys - API key management"
    echo "  • api_audit_logs - Request tracking and audit logging"
    echo "  • rate_limits - Rate limiting data"
    echo "  • associations - IP/API key/user associations"
    echo ""
    echo "🔒 Security features enabled:"
    echo "  • Row Level Security (RLS) policies"
    echo "  • Automatic timestamp updates"
    echo "  • Data cleanup functions"
    echo "  • Comprehensive indexing"
    echo ""
    echo "🎉 Your weather app is now secured with authentication and audit logging!"
else
    echo "❌ Error applying database schema"
    exit 1
fi
