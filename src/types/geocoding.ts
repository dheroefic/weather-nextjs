/**
 * Geocoding types for Supabase-based geocoding service
 * Based on Nominatim data stored in country_name and country_osm_grid tables
 * Following official Nominatim API patterns
 */

export interface CountryName {
  id: string;
  country_code: string;
  name: string;
  default_language_code?: string;
  partition?: number;
  created_at: string;
  updated_at: string;
}

export interface CountryOsmGrid {
  id: string;
  country_code: string;
  area?: number;
  geometry?: GeoJSON.Geometry; // PostGIS geometry (GeoJSON or WKT)
  created_at: string;
  updated_at: string;
}

export interface CountrySubRegion {
  id: string;
  sub_region_code: string;
  name: string;
  division_type: string;
  country_code: string;
  latitude?: number;
  longitude?: number;
  partition?: number;
  created_at: string;
  updated_at: string;
}

// Following Nominatim's result structure with sub-region support
export interface GeocodingResult {
  place_id?: string;
  licence?: string;
  osm_type?: string;
  osm_id?: string;
  lat: number;
  lon: number;
  category?: string;
  type?: string;
  place_rank?: number;
  importance?: number;
  addresstype?: string;
  name?: string;
  display_name: string;
  address?: {
    country?: string;
    country_code?: string;
    state?: string;
    region?: string;
    province?: string;
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
    parish?: string;
    emirate?: string;
    district?: string;
    county?: string;
  };
  boundingbox?: [string, string, string, string]; // [min_lat, max_lat, min_lon, max_lon]
  geometry?: GeoJSON.Geometry;
  // Internal fields
  country_code: string;
  country_name: string;
  default_language: string;
  area?: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  // Sub-region fields
  sub_region_code?: string;
  sub_region_name?: string;
  division_type?: string;
}

export interface GeocodingResponse {
  results: GeocodingResult[];
  count: number;
}

export interface GeocodingError {
  error: string;
  details?: string;
}

export interface GeocodingSearchParams {
  latitude: string;
  longitude: string;
  language?: string;
  search?: string;
}
