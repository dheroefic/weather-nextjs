#!/usr/bin/env node

/**
 * Script to generate SQL INSERT statements from ISO 31662 JSON data
 * This script reads the iso31662.json file and generates SQL statements
 * for both country_name and country_sub_region_name tables
 */

const fs = require('fs');
const path = require('path');

// Path to the ISO 31662 JSON file
const iso31662Path = path.join(__dirname, '../database/iso31662.json');
const outputPath = path.join(__dirname, '../database/country_name_sub.sql');

// Read and parse the JSON data
let iso31662Data;
try {
    const jsonContent = fs.readFileSync(iso31662Path, 'utf8');
    iso31662Data = JSON.parse(jsonContent);
} catch (error) {
    console.error('Error reading ISO 31662 JSON file:', error);
    process.exit(1);
}

// Helper function to escape SQL strings
function escapeSqlString(str) {
    if (str === null || str === undefined) {
        return 'NULL';
    }
    return `'${str.replace(/'/g, "''")}'`;
}

// Helper function to format coordinates
function formatCoordinate(coord) {
    if (coord === null || coord === undefined || isNaN(coord)) {
        return 'NULL';
    }
    return coord;
}

// Helper function to resolve the ultimate country code for any subdivision
function resolveCountryCode(code, data, visited = new Set()) {
    // Prevent infinite recursion
    if (visited.has(code)) {
        return null;
    }
    visited.add(code);
    
    const entry = data[code];
    if (!entry || !entry.parent) {
        return null;
    }
    
    // If parent is a 2-letter code, it's a country
    if (entry.parent.length === 2) {
        return entry.parent;
    }
    
    // If parent is longer, recursively resolve
    return resolveCountryCode(entry.parent, data, visited);
}

// Helper function to get division type (handles typo in JSON data)
function getDivisionType(data) {
    // Handle the typo "divicsion" in the JSON data
    return data.division || data.divicsion || 'unknown';
}

// Generate SQL statements
let countryValues = [];
let subRegionValues = [];

// Process each entry in the JSON data
for (const [code, data] of Object.entries(iso31662Data)) {
    // Skip non-geographic entries
    if (['EARTH', 'ASI', 'AFR', 'ANT', 'AUS', 'EUR', 'NAM', 'SAM'].includes(code)) {
        continue;
    }

    const divisionType = getDivisionType(data);

    if (divisionType === 'country' && !data.parent) {
        // This is a top-level country entry (no parent) - convert country code to lowercase
        const countryValueRow = `(${escapeSqlString(data.code.toLowerCase())}, ${escapeSqlString(data.name)}, ${formatCoordinate(data.lat)}, ${formatCoordinate(data.lng)}, 0)`;
        countryValues.push(countryValueRow);
    } else if (data.parent) {
        // This is a sub-region entry - resolve the ultimate country code
        const countryCode = resolveCountryCode(code, iso31662Data);
        if (countryCode) {
            const subRegionValueRow = `(${escapeSqlString(data.code.toLowerCase())}, ${escapeSqlString(data.name)}, ${escapeSqlString(divisionType)}, ${escapeSqlString(countryCode.toLowerCase())}, ${formatCoordinate(data.lat)}, ${formatCoordinate(data.lng)}, 0)`;
            subRegionValues.push(subRegionValueRow);
        }
    }
}

// Generate batch INSERT statements
const countrySql = countryValues.length > 0 ? 
    `INSERT INTO public.country_name (country_code, name, latitude, longitude, partition) VALUES\n${countryValues.join(',\n')};` : 
    '';

const subRegionSql = subRegionValues.length > 0 ? 
    `INSERT INTO public.country_sub_region_name (sub_region_code, name, division_type, country_code, latitude, longitude, partition) VALUES\n${subRegionValues.join(',\n')};` : 
    '';

// Generate the complete SQL file
const sqlContent = `-- ISO 31662 Data Insert Statements
-- Generated from iso31662.json
-- This file contains batch INSERT statements for country_name and country_sub_region_name tables

-- Disable triggers temporarily for bulk insert
SET session_replication_role = replica;

-- Clear existing data (optional - remove these lines if you want to keep existing data)
-- DELETE FROM public.country_sub_region_name;
-- DELETE FROM public.country_name;

-- Insert country data (batch)
${countrySql}

-- Insert sub-region data (batch)
${subRegionSql}

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Update statistics
ANALYZE public.country_name;
ANALYZE public.country_sub_region_name;
`;

// Write the SQL file
try {
    fs.writeFileSync(outputPath, sqlContent);
    console.log(`✅ Successfully generated SQL file: ${outputPath}`);
    console.log(`📊 Generated ${countryValues.length} country entries and ${subRegionValues.length} sub-region entries (batch inserts)`);
    console.log(`\n📝 To apply these changes to your database, run:`);
    console.log(`   psql -d your_database_name -f ${outputPath}`);
    console.log(`\n   Or for Supabase:`);
    console.log(`   supabase db reset`);
    console.log(`   # Then apply your schema.sql and iso31662-inserts.sql`);
} catch (error) {
    console.error('Error writing SQL file:', error);
    process.exit(1);
}
