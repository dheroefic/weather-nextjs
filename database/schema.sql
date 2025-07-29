-- Weather App Database Schema
-- This file contains the SQL commands to create tables for authentication, audit logging, and rate limiting

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- API Keys table for managing client API keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- API Audit Logs table for tracking API usage
CREATE TABLE IF NOT EXISTS api_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    request_params JSONB,
    response_status INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    error_message TEXT,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate Limits table for implementing rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL, -- Can be IP address or API key
    endpoint VARCHAR(255) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    window_ms INTEGER NOT NULL,
    max_requests INTEGER NOT NULL,
    last_request TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Associations table for tracking IP addresses, API keys, and usage patterns
CREATE TABLE IF NOT EXISTS associations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address INET NOT NULL,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    hit_count INTEGER DEFAULT 1,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    country VARCHAR(100),
    city VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_api_audit_logs_api_key_id ON api_audit_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_audit_logs_user_id ON api_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_audit_logs_created_at ON api_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_audit_logs_endpoint ON api_audit_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_audit_logs_ip_address ON api_audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_api_audit_logs_response_status ON api_audit_logs(response_status);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_endpoint ON rate_limits(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON rate_limits(window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limits_composite ON rate_limits(identifier, endpoint);

CREATE INDEX IF NOT EXISTS idx_associations_ip_address ON associations(ip_address);
CREATE INDEX IF NOT EXISTS idx_associations_api_key_id ON associations(api_key_id);
CREATE INDEX IF NOT EXISTS idx_associations_user_id ON associations(user_id);
CREATE INDEX IF NOT EXISTS idx_associations_last_seen ON associations(last_seen);
CREATE INDEX IF NOT EXISTS idx_associations_hit_count ON associations(hit_count);
CREATE INDEX IF NOT EXISTS idx_associations_composite ON associations(ip_address, api_key_id, user_id);

-- RLS (Row Level Security) policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE associations ENABLE ROW LEVEL SECURITY;

-- API Keys policies
CREATE POLICY "Users can view their own API keys" ON api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys" ON api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- API Audit Logs policies (read-only for users, admins can see all)
CREATE POLICY "Users can view audit logs for their API keys" ON api_audit_logs
    FOR SELECT USING (
        api_key_id IN (
            SELECT id FROM api_keys WHERE user_id = auth.uid()
        )
    );

-- Rate Limits policies (service manages this, users can read their own)
CREATE POLICY "Service can manage rate limits" ON rate_limits
    FOR ALL USING (true);

-- Associations policies (service manages this, users can read their own)
CREATE POLICY "Users can view their own associations" ON associations
    FOR SELECT USING (
        user_id = auth.uid() OR 
        api_key_id IN (
            SELECT id FROM api_keys WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service can manage associations" ON associations
    FOR ALL USING (true);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON rate_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_associations_updated_at BEFORE UPDATE ON associations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old audit logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM api_audit_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old rate limit records (keep last 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limits 
    WHERE window_end < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old associations (keep associations with recent activity)
CREATE OR REPLACE FUNCTION cleanup_old_associations()
RETURNS void AS $$
BEGIN
    DELETE FROM associations 
    WHERE last_seen < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Country Name table (based on ISO 3166-1 data)
CREATE TABLE IF NOT EXISTS country_name (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code VARCHAR(2) NOT NULL UNIQUE, -- ISO 3166-1 alpha-2 code
    name VARCHAR(255) NOT NULL,
    default_language_code VARCHAR(10),
    latitude DECIMAL(10,8), -- Country center coordinates
    longitude DECIMAL(11,8),
    partition INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Country Sub-Region Name Table (based on ISO 3166-2 data)
CREATE TABLE IF NOT EXISTS country_sub_region_name (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sub_region_code VARCHAR(10) NOT NULL UNIQUE, -- ISO 3166-2 code (e.g., 'US-CA', 'AD-07')
    name VARCHAR(255) NOT NULL,
    division_type VARCHAR(50) NOT NULL, -- 'province', 'state', 'region', 'parish', 'emirate', etc.
    country_code VARCHAR(2) NOT NULL, -- ISO 3166-1 country code
    latitude DECIMAL(10,8), -- Geographic coordinates if available
    longitude DECIMAL(11,8),
    partition INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Country OSM Grid table for geocoding (based on Nominatim/OpenStreetMap data)
CREATE TABLE IF NOT EXISTS public.country_osm_grid (
    country_code character varying(2),
    area double precision,
    geometry public.geometry
);

-- Indexes for country tables
CREATE INDEX IF NOT EXISTS idx_country_name_country_code ON country_name(country_code);
CREATE INDEX IF NOT EXISTS idx_country_name_name ON country_name(name);
CREATE INDEX IF NOT EXISTS idx_country_name_language ON country_name(default_language_code);
CREATE INDEX IF NOT EXISTS idx_country_name_coordinates ON country_name(latitude, longitude);

-- Text search index for country names
CREATE INDEX IF NOT EXISTS idx_country_name_text ON country_name USING gin(to_tsvector('english', name));

-- Indexes for sub-regions
CREATE INDEX IF NOT EXISTS idx_country_sub_region_code ON country_sub_region_name(sub_region_code);
CREATE INDEX IF NOT EXISTS idx_country_sub_region_name ON country_sub_region_name(name);
CREATE INDEX IF NOT EXISTS idx_country_sub_region_country_code ON country_sub_region_name(country_code);
CREATE INDEX IF NOT EXISTS idx_country_sub_region_division_type ON country_sub_region_name(division_type);
CREATE INDEX IF NOT EXISTS idx_country_sub_region_coordinates ON country_sub_region_name(latitude, longitude);

-- Text search index for sub-region names
CREATE INDEX IF NOT EXISTS idx_country_sub_region_name_text ON country_sub_region_name USING gin(to_tsvector('english', name));

-- Enhanced indexes for the grid tables
CREATE INDEX IF NOT EXISTS idx_country_osm_grid_country_code ON country_osm_grid(country_code);
CREATE INDEX IF NOT EXISTS idx_country_osm_grid_area ON country_osm_grid(area);
-- Spatial index for geometry (requires PostGIS extension)
CREATE INDEX IF NOT EXISTS idx_country_osm_grid_geom ON country_osm_grid USING GIST (geometry);

-- Indexes for sub-region grid
CREATE INDEX IF NOT EXISTS idx_sub_region_osm_grid_code ON sub_region_osm_grid(sub_region_code);
CREATE INDEX IF NOT EXISTS idx_sub_region_osm_grid_country ON sub_region_osm_grid(country_code);
CREATE INDEX IF NOT EXISTS idx_sub_region_osm_grid_area ON sub_region_osm_grid(area);
CREATE INDEX IF NOT EXISTS idx_sub_region_osm_grid_level ON sub_region_osm_grid(grid_level);
-- CREATE INDEX IF NOT EXISTS idx_sub_region_osm_grid_geom ON sub_region_osm_grid USING GIST (geometry::geometry);

-- Foreign key constraints
ALTER TABLE country_sub_region_name 
ADD CONSTRAINT fk_sub_region_country 
FOREIGN KEY (country_code) REFERENCES country_name(country_code) ON DELETE CASCADE;

-- Note: No foreign key for country_osm_grid as OSM data may have different country codes than ISO standard

ALTER TABLE sub_region_osm_grid 
ADD CONSTRAINT fk_sub_grid_country 
FOREIGN KEY (country_code) REFERENCES country_name(country_code) ON DELETE CASCADE;

ALTER TABLE sub_region_osm_grid 
ADD CONSTRAINT fk_sub_grid_region 
FOREIGN KEY (sub_region_code) REFERENCES country_sub_region_name(sub_region_code) ON DELETE CASCADE;

-- RLS policies for geocoding tables
ALTER TABLE country_name ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_sub_region_name ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_osm_grid ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_region_osm_grid ENABLE ROW LEVEL SECURITY;

-- Allow read access to geocoding data for all users (public geographic data)
CREATE POLICY "Allow read access to country names" ON country_name
    FOR SELECT USING (true);

CREATE POLICY "Allow read access to sub-regions" ON country_sub_region_name
    FOR SELECT USING (true);

CREATE POLICY "Allow read access to country OSM grid" ON country_osm_grid
    FOR SELECT USING (true);

CREATE POLICY "Allow read access to sub-region OSM grid" ON sub_region_osm_grid
    FOR SELECT USING (true);

-- Triggers for updated_at on geocoding tables
CREATE TRIGGER update_country_name_updated_at BEFORE UPDATE ON country_name
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_country_sub_region_name_updated_at BEFORE UPDATE ON country_sub_region_name
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_region_osm_grid_updated_at BEFORE UPDATE ON sub_region_osm_grid
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();