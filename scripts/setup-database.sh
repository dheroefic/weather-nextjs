#!/bin/bash

# Weather App Database Setup Script
# This script applies the complete schema including ISO 31662 geographic data

set -e  # Exit on any error

echo "🏗️  Weather App Database Setup"
echo "================================="

# Get database configuration
read -p "Enter your database connection string (or press Enter for Supabase local): " DB_CONNECTION
if [ -z "$DB_CONNECTION" ]; then
    DB_CONNECTION="postgresql://postgres:postgres@localhost:54322/postgres"
    echo "Using default Supabase local connection"
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DATABASE_DIR="$PROJECT_ROOT/database"

echo ""
echo "📁 Using database files from: $DATABASE_DIR"
echo "🔗 Database connection: $DB_CONNECTION"
echo ""

# Check if required files exist
SCHEMA_FILE="$DATABASE_DIR/schema.sql"
ISO_INSERTS_FILE="$DATABASE_DIR/iso31662-inserts.sql"
COUNTRY_NAME_FILE="$DATABASE_DIR/country_name.sql"
COUNTRY_SUB_REGION_FILE="$DATABASE_DIR/country_sub_region_name.sql"
COUNTRY_GRID_FILE="$DATABASE_DIR/country_grid.sql"
COUNTRY_GRID_MIGRATED_FILE="$DATABASE_DIR/country_grid_migrated.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo "❌ Error: schema.sql not found at $SCHEMA_FILE"
    exit 1
fi

echo "✅ Found schema.sql"

if [ ! -f "$ISO_INSERTS_FILE" ]; then
    echo "⚠️  iso31662-inserts.sql not found. Generating it now..."
    cd "$PROJECT_ROOT"
    node scripts/generate-iso31662-sql.js
fi

echo "✅ Found iso31662-inserts.sql"

# Check for grid data
if [ -f "$COUNTRY_GRID_FILE" ]; then
    echo "✅ Found country_grid.sql"
    if [ ! -f "$COUNTRY_GRID_MIGRATED_FILE" ]; then
        echo "🔄 Migrating grid data to new schema..."
        cd "$PROJECT_ROOT"
        node scripts/migrate-grid-data.js
        if [ $? -ne 0 ]; then
            echo "❌ Grid data migration failed"
            exit 1
        fi
        echo "✅ Grid data migration completed"
    else
        echo "✅ Found migrated grid data"
    fi
else
    echo "⚠️  country_grid.sql not found. Grid data will be skipped."
fi

# Function to execute SQL file
execute_sql() {
    local file="$1"
    local description="$2"
    
    echo "📄 Applying $description..."
    if psql "$DB_CONNECTION" -f "$file" > /dev/null 2>&1; then
        echo "✅ Successfully applied $description"
    else
        echo "❌ Error applying $description"
        echo "   File: $file"
        echo "   You may need to check your database connection or file contents"
        exit 1
    fi
}

# Apply schema
echo ""
echo "🏗️  Applying database schema..."
execute_sql "$SCHEMA_FILE" "main schema (schema.sql)"

# Apply ISO 31662 data
echo ""
echo "🌍 Applying ISO 31662 geographic data..."
execute_sql "$ISO_INSERTS_FILE" "ISO 31662 countries and sub-regions"

# Apply grid data if available
if [ -f "$COUNTRY_GRID_MIGRATED_FILE" ]; then
    echo ""
    echo "🗺️  Applying OSM grid data..."
    execute_sql "$COUNTRY_GRID_MIGRATED_FILE" "OpenStreetMap country grid boundaries"
elif [ -f "$COUNTRY_GRID_FILE" ]; then
    echo ""
    echo "⚠️  Original grid file found but not migrated. Skipping grid data."
    echo "   Run 'node scripts/migrate-grid-data.js' to migrate the grid data first."
fi

# Apply additional country data if it exists and contains different data
if [ -f "$COUNTRY_NAME_FILE" ]; then
    echo ""
    echo "📋 Checking for additional country data..."
    # Check if this file has different data than what we just inserted
    # For now, skip this to avoid duplicates
    echo "⏭️  Skipping country_name.sql (data already inserted from ISO 31662)"
fi

if [ -f "$COUNTRY_SUB_REGION_FILE" ]; then
    echo ""
    echo "📋 Checking for additional sub-region data..."
    # This file seems to have detailed insert statements, let's skip it
    # since we already have the data from ISO 31662
    echo "⏭️  Skipping country_sub_region_name.sql (data already inserted from ISO 31662)"
fi

echo ""
echo "🎉 Database setup completed successfully!"
echo ""
echo "📊 Summary:"
echo "   ✅ Applied main schema with all tables"
echo "   ✅ Inserted ISO 31662 country and sub-region data"
if [ -f "$COUNTRY_GRID_MIGRATED_FILE" ]; then
    echo "   ✅ Applied OpenStreetMap grid boundaries"
fi
echo "   ✅ Created indexes for optimal performance"
echo "   ✅ Enabled Row Level Security (RLS) policies"
echo "   ✅ Established foreign key relationships"
echo ""
echo "🔍 To verify the data, you can run:"
echo "   SELECT COUNT(*) FROM country_name;"
echo "   SELECT COUNT(*) FROM country_sub_region_name;"
if [ -f "$COUNTRY_GRID_MIGRATED_FILE" ]; then
    echo "   SELECT COUNT(*) FROM country_osm_grid;"
    echo "   SELECT COUNT(DISTINCT country_code) FROM country_osm_grid;"
fi
echo ""
echo "📝 Sample queries:"
echo "   -- Get all countries with their grid data"
echo "   SELECT cn.name, cn.country_code, COUNT(cog.id) as grid_count"
echo "   FROM country_name cn"
echo "   LEFT JOIN country_osm_grid cog ON cn.country_code = cog.country_code"
echo "   GROUP BY cn.name, cn.country_code"
echo "   ORDER BY grid_count DESC;"
echo ""
echo "   -- Get sub-regions for a specific country (e.g., United States)"
echo "   SELECT sub_region_code, name, division_type FROM country_sub_region_name WHERE country_code = 'US';"
echo ""
echo "   -- Search for regions by name"
echo "   SELECT * FROM country_sub_region_name WHERE name ILIKE '%california%';"
echo ""
echo "   -- Get geometric data for a country"
echo "   SELECT country_code, area, ST_AsText(geometry::geometry) as boundary"
echo "   FROM country_osm_grid WHERE country_code = 'US' LIMIT 1;"
