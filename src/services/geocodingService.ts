/**
 * Geocoding Service - Supabase Implementation
 * Uses Nominatim-based data stored in Supabase for reverse geocoding
 */

import { supabaseAdmin } from '@/lib/supabase';
import { CountryName, CountryOsmGrid, GeocodingResult } from '@/types/geocoding';

export class GeocodingService {
  private static readonly EARTH_RADIUS_KM = 6371;
  private static readonly MAX_DISTANCE_KM = 1000; // Maximum search radius - generous for partial geometries

  /**
   * Calculate distance between two points using Haversine formula
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_KM * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Extract coordinates from PostGIS geometry (JSON or WKT format)
   * Handles GeoJSON objects and WKT strings for POINT and POLYGON geometries
   */
  private static extractCoordinates(geometry: any): { latitude: number; longitude: number } | null {
    try {
      // Handle GeoJSON objects
      if (typeof geometry === 'object' && geometry.type) {
        switch (geometry.type) {
          case 'Point':
            // Point: { type: 'Point', coordinates: [lng, lat] }
            if (geometry.coordinates && Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2) {
              return {
                longitude: geometry.coordinates[0],
                latitude: geometry.coordinates[1]
              };
            }
            break;
          case 'Polygon':
            // Polygon: { type: 'Polygon', coordinates: [[[lng, lat], ...]] }
            if (geometry.coordinates && Array.isArray(geometry.coordinates) && geometry.coordinates[0] && geometry.coordinates[0][0]) {
              return {
                longitude: geometry.coordinates[0][0][0],
                latitude: geometry.coordinates[0][0][1]
              };
            }
            break;
          case 'MultiPolygon':
            // MultiPolygon: { type: 'MultiPolygon', coordinates: [[[[lng, lat], ...]]] }
            if (geometry.coordinates && Array.isArray(geometry.coordinates) && geometry.coordinates[0] && geometry.coordinates[0][0] && geometry.coordinates[0][0][0]) {
              return {
                longitude: geometry.coordinates[0][0][0][0],
                latitude: geometry.coordinates[0][0][0][1]
              };
            }
            break;
        }
      }

      // Handle WKT strings (fallback for text format)
      if (typeof geometry === 'string') {
        // Handle POINT geometry: POINT(longitude latitude)
        const pointMatch = geometry.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
        if (pointMatch) {
          return {
            longitude: parseFloat(pointMatch[1]),
            latitude: parseFloat(pointMatch[2])
          };
        }

        // Handle POLYGON geometry - calculate centroid from all coordinates
        const polygonMatch = geometry.match(/POLYGON\s*\(\s*\(([^)]+)\)\s*\)/i);
        if (polygonMatch) {
          const coordsText = polygonMatch[1];
          const coordPairs = coordsText.split(',').map(pair => {
            const [lon, lat] = pair.trim().split(/\s+/).map(parseFloat);
            return { lon, lat };
          }).filter(coord => !isNaN(coord.lon) && !isNaN(coord.lat));
          
          if (coordPairs.length > 0) {
            // Calculate centroid
            const centroid = coordPairs.reduce(
              (acc, coord) => ({
                lon: acc.lon + coord.lon,
                lat: acc.lat + coord.lat
              }),
              { lon: 0, lat: 0 }
            );
            
            return {
              longitude: centroid.lon / coordPairs.length,
              latitude: centroid.lat / coordPairs.length
            };
          }
        }

        // Handle MULTIPOLYGON geometry - use first polygon for centroid
        const multiPolygonMatch = geometry.match(/MULTIPOLYGON\s*\(\s*\(\s*\(([^)]+)\)/i);
        if (multiPolygonMatch) {
          const coordsText = multiPolygonMatch[1];
          const coordPairs = coordsText.split(',').slice(0, 20).map(pair => { // Limit to first 20 points for performance
            const [lon, lat] = pair.trim().split(/\s+/).map(parseFloat);
            return { lon, lat };
          }).filter(coord => !isNaN(coord.lon) && !isNaN(coord.lat));
          
          if (coordPairs.length > 0) {
            const centroid = coordPairs.reduce(
              (acc, coord) => ({
                lon: acc.lon + coord.lon,
                lat: acc.lat + coord.lat
              }),
              { lon: 0, lat: 0 }
            );
            
            return {
              longitude: centroid.lon / coordPairs.length,
              latitude: centroid.lat / coordPairs.length
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.warn('Failed to parse geometry:', geometry, error);
      return null;
    }
  }

  /**
   * Create a Nominatim-compatible result from database data with sub-region support
   */
  private static formatEnhancedResult(
    countryData: any,
    gridData: any,
    subRegionData: any,
    latitude: number,
    longitude: number,
    distance?: number
  ): GeocodingResult {
    const coordinates = { latitude, longitude };
    
    // Calculate bounding box (approximate)
    const bbox_delta = 0.1; // ~11km at equator
    const boundingbox: [string, string, string, string] = [
      (latitude - bbox_delta).toString(),   // min_lat
      (latitude + bbox_delta).toString(),   // max_lat
      (longitude - bbox_delta).toString(),  // min_lon
      (longitude + bbox_delta).toString()   // max_lon
    ];

    // Determine the primary location info based on available data
    const isSubRegion = subRegionData && distance !== undefined && distance < 100; // Within 100km
    
    let primaryName = countryData.name;
    let displayName = countryData.name;
    let addressType = 'country';
    let placeType = 'country';
    let placeRank = 4;
    let importance = 0.75;
    let placeId = `country_${countryData.country_code}`;

    const address: any = {
      country: countryData.name,
      country_code: countryData.country_code.toLowerCase(),
    };

    if (isSubRegion) {
      // Use sub-region as primary if it's close
      primaryName = subRegionData.name;
      displayName = `${subRegionData.name}, ${countryData.name}`;
      addressType = subRegionData.division_type;
      placeType = subRegionData.division_type;
      placeRank = this.getPlaceRankForDivision(subRegionData.division_type);
      importance = this.getImportanceForDivision(subRegionData.division_type);
      placeId = `sub_region_${subRegionData.sub_region_code}`;
      
      // Add sub-region to address
      address[subRegionData.division_type] = subRegionData.name;
      address.state = subRegionData.name; // Common field for administrative divisions
    }

    const result: GeocodingResult = {
      place_id: placeId,
      licence: "© OpenStreetMap contributors",
      osm_type: "relation",
      osm_id: isSubRegion ? subRegionData.sub_region_code : countryData.country_code,
      lat: latitude,
      lon: longitude,
      category: "place",
      type: placeType,
      place_rank: placeRank,
      importance: importance,
      addresstype: addressType,
      name: primaryName,
      display_name: displayName,
      address,
      boundingbox,
      geometry: gridData?.geometry || {
        type: "Point",
        coordinates: [longitude, latitude]
      },
      // Internal fields
      country_code: countryData.country_code,
      country_name: countryData.name,
      default_language: countryData.default_language_code || 'en',
      area: gridData?.area,
      coordinates,
      // Additional sub-region fields
      sub_region_code: subRegionData?.sub_region_code,
      sub_region_name: subRegionData?.name,
      division_type: subRegionData?.division_type
    };

    if (distance !== undefined) {
      // Optional: Keep minimal logging for debugging if needed
      // console.log(`Distance: ${distance.toFixed(2)} km`);
    }

    return result;
  }

  /**
   * Get place rank for different administrative division types
   */
  private static getPlaceRankForDivision(divisionType: string): number {
    const rankMap: { [key: string]: number } = {
      'country': 4,
      'province': 8,
      'state': 8,
      'region': 10,
      'county': 12,
      'parish': 14,
      'emirate': 8,
      'district': 12,
      'city': 16,
      'town': 16,
      'village': 18
    };
    return rankMap[divisionType.toLowerCase()] || 12;
  }

  /**
   * Get importance score for different administrative division types
   */
  private static getImportanceForDivision(divisionType: string): number {
    const importanceMap: { [key: string]: number } = {
      'country': 0.75,
      'province': 0.65,
      'state': 0.65,
      'region': 0.60,
      'county': 0.55,
      'parish': 0.50,
      'emirate': 0.65,
      'district': 0.55,
      'city': 0.70,
      'town': 0.60,
      'village': 0.50
    };
    return importanceMap[divisionType.toLowerCase()] || 0.55;
  }

  /**
   * Create a Nominatim-compatible result from database data
   * Following official Nominatim API result structure
   */
  private static formatResult(
    countryData: any,
    gridData: any,
    latitude: number,
    longitude: number,
    distance?: number
  ): GeocodingResult {
    const coordinates = { latitude, longitude };
    
    // Calculate bounding box (approximate)
    const bbox_delta = 0.1; // ~11km at equator
    const boundingbox: [string, string, string, string] = [
      (latitude - bbox_delta).toString(),   // min_lat
      (latitude + bbox_delta).toString(),   // max_lat
      (longitude - bbox_delta).toString(),  // min_lon
      (longitude + bbox_delta).toString()   // max_lon
    ];

    const result: GeocodingResult = {
      place_id: `country_${countryData.country_code}`,
      licence: "© OpenStreetMap contributors",
      osm_type: "relation",
      osm_id: countryData.country_code,
      lat: latitude,
      lon: longitude,
      category: "place",
      type: "country",
      place_rank: 4, // Country level
      importance: 0.75,
      addresstype: "country",
      name: countryData.name,
      display_name: countryData.name,
      address: {
        country: countryData.name,
        country_code: countryData.country_code.toLowerCase(),
      },
      boundingbox,
      geometry: gridData?.geometry,
      // Internal fields
      country_code: countryData.country_code,
      country_name: countryData.name,
      default_language: countryData.default_language_code || 'en',
      area: gridData?.area,
      coordinates
    };

    if (distance !== undefined) {
      // Optional: Keep minimal logging for debugging if needed
      // console.log(`Distance: ${distance.toFixed(2)} km`);
    }

    return result;
  }

  /**
   * Reverse geocoding using Supabase data with ISO 3166-2 sub-region support
   */
  static async reverseGeocode(latitude: number, longitude: number, language = 'en') {
    try {
      // First, try to find sub-regions by proximity to coordinates
      let closestSubRegion = null;
      let closestCountryCode = null;
      let minDistance = Infinity;
      
      // Get ALL sub-regions with coordinates by using pagination to bypass Supabase's 1000 record limit
      let subRegionsData: any[] = [];
      let pageSize = 1000;
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data: pageData, error: pageError } = await supabaseAdmin
          .from('country_sub_region_name')
          .select('*')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (pageError) {
          console.warn(`⚠️ [SUB-REGION WARN] Page ${page} query failed:`, pageError);
          break;
        }
        
        if (pageData && pageData.length > 0) {
          subRegionsData = subRegionsData.concat(pageData);
          hasMore = pageData.length === pageSize; // Continue if we got a full page
          page++;
        } else {
          hasMore = false;
        }
        
        // Safety limit to prevent infinite loops
        if (page > 10) {
          console.warn(`⚠️ [PAGINATION WARN] Reached safety limit of 10 pages`);
          break;
        }
      }

      if (subRegionsData && subRegionsData.length > 0) {
        // Find closest sub-region
        for (const subRegion of subRegionsData) {
          const distance = this.calculateDistance(
            latitude, 
            longitude, 
            parseFloat(subRegion.latitude.toString()), 
            parseFloat(subRegion.longitude.toString())
          );
          
          if (distance < minDistance && distance <= this.MAX_DISTANCE_KM) {
            minDistance = distance;
            closestSubRegion = subRegion;
            closestCountryCode = subRegion.country_code;
          }
        }
      }

      // If no sub-region found, fall back to country-level search
      if (!closestSubRegion) {
        // Get all countries with OSM grid data
        const { data: osmGridData, error: osmError } = await supabaseAdmin
          .from('country_osm_grid')
          .select('*');

        if (osmError) {
          console.error(`❌ [SQL ERROR] OSM Grid query failed:`, osmError);
          throw new Error(`OSM Grid query failed: ${osmError.message}`);
        }

        if (osmGridData) {
          for (const grid of osmGridData) {
            if (grid.geometry) {
              const coords = this.extractCoordinates(grid.geometry);
              if (coords) {
                const distance = this.calculateDistance(latitude, longitude, coords.latitude, coords.longitude);
                
                if (distance < minDistance && distance <= this.MAX_DISTANCE_KM) {
                  minDistance = distance;
                  closestCountryCode = grid.country_code;
                }
              }
            }
          }
        }
      }

      // If still no match found, try fallback
      if (!closestCountryCode) {
        const { data: firstCountry } = await supabaseAdmin
          .from('country_name')
          .select('country_code')
          .limit(1)
          .single();

        if (firstCountry) {
          closestCountryCode = firstCountry.country_code;
        }
      }

      if (!closestCountryCode) {
        return [];
      }
      
      // Get country name data - use lowercase as that's what's stored in the database
      const { data: countryData, error: countryError } = await supabaseAdmin
        .from('country_name')
        .select('*')
        .eq('country_code', closestCountryCode.toLowerCase())
        .limit(1);

      if (countryError || !countryData?.[0]) {
        console.error(`❌ [SQL ERROR] Country name query failed:`, countryError);
        return [];
      }

      const country = countryData[0];

      // Get OSM grid data for the country
      const { data: gridData } = await supabaseAdmin
        .from('country_osm_grid')
        .select('*')
        .eq('country_code', closestCountryCode.toLowerCase())
        .limit(1);

      const grid = gridData?.[0];

      // Create the result with sub-region information if available
      const result = this.formatEnhancedResult(
        country,
        grid,
        closestSubRegion,
        latitude,
        longitude,
        minDistance
      );

      return [result];

    } catch (error) {
      console.error('Enhanced reverse geocoding error:', error);
      throw error;
    }
  }

  /**
   * Search for locations using local database only
   * Searches both countries and regions/cities from local data
   */
  static async searchCountries(
    query: string,
    language: string = 'en',
    limit: number = 10
  ): Promise<GeocodingResult[]> {
    try {
      console.log(`🔍 [SEARCH DEBUG] Starting local-only location search for query: "${query}", language: ${language}, limit: ${limit}`);
      
      const results: GeocodingResult[] = [];
      
      // First, search our country database for exact country matches
      const { data: countries, error: countryError } = await supabaseAdmin
        .from('country_name')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(limit);
      
      console.log(`📊 [SQL DEBUG] Country Search Query: SELECT * FROM country_name WHERE name ILIKE '%${query}%' ORDER BY name LIMIT ${limit}`);
      
      if (countryError) {
        console.warn(`⚠️ [SQL WARN] Country search failed:`, countryError);
      } else if (countries && countries.length > 0) {
        console.log(`✅ [SQL RESULT] Country search returned ${countries.length} countries:`, countries);
        
        // Process country results
        for (const country of countries) {
          console.log(`🔍 [LOOKUP DEBUG] Looking up grid data for country: ${country.country_code}`);
          
          const gridQuery = supabaseAdmin
            .from('country_osm_grid')
            .select('*')
            .eq('country_code', country.country_code.toLowerCase())
            .limit(1);
            
          console.log(`📊 [SQL DEBUG] Grid Query for ${country.country_code}: SELECT * FROM country_osm_grid WHERE country_code = '${country.country_code.toLowerCase()}' LIMIT 1`);
          
          const { data: gridData, error: gridError } = await gridQuery;
          
          if (gridError) {
            console.warn(`⚠️ [SQL WARN] Grid query failed for ${country.country_code}:`, gridError);
          }

          const grid = gridData?.[0];
          console.log(`📄 [GRID DEBUG] Grid data for ${country.country_code}:`, grid);

          // Calculate centroid for the country if geometry is available
          let centerLat = 0, centerLon = 0;
          if (grid?.geometry) {
            const coords = this.extractCoordinates(grid.geometry);
            if (coords) {
              centerLat = coords.latitude;
              centerLon = coords.longitude;
              console.log(`📍 [COORDS DEBUG] Extracted center for ${country.country_code}: lat=${centerLat}, lng=${centerLon}`);
            } else {
              console.warn(`⚠️ [GEOMETRY WARN] Failed to extract coordinates for ${country.country_code}`);
            }
          } else {
            console.warn(`⚠️ [GEOMETRY WARN] No geometry data for ${country.country_code}`);
          }

          // Create result object
          const result = this.formatResult(country, grid, centerLat, centerLon);
          results.push(result);
          console.log(`✅ [RESULT DEBUG] Added result for ${country.country_code}: ${country.name}`);
        }
      }
      
      // If no results found in countries, search local regions from database first
      if (results.length === 0) {
        console.log(`🏝️ [REGION DEBUG] No country results, searching local regions database for: "${query}"`);
        
        try {
          const { data: regionData, error: regionError } = await supabaseAdmin
            .from('local_regions')
            .select('*')
            .or(`name.ilike.%${query}%,display_name.ilike.%${query}%`)
            .order('importance', { ascending: false })
            .limit(limit);
          
          console.log(`📊 [SQL DEBUG] Local Regions Query: SELECT * FROM local_regions WHERE name ILIKE '%${query}%' OR display_name ILIKE '%${query}%' ORDER BY importance DESC LIMIT ${limit}`);
          
          if (regionError) {
            console.warn(`⚠️ [SQL WARN] Local regions search failed:`, regionError);
          } else if (regionData && regionData.length > 0) {
            console.log(`✅ [SQL RESULT] Local regions search returned ${regionData.length} regions:`, regionData);
            
            for (const region of regionData) {
              const result: GeocodingResult = {
                place_id: `local_${region.type}_${region.country_code}_${region.id}`,
                licence: "© OpenStreetMap contributors",
                osm_type: "relation",
                osm_id: region.id,
                lat: parseFloat(region.latitude.toString()),
                lon: parseFloat(region.longitude.toString()),
                category: "place",
                type: region.type,
                place_rank: region.place_rank || 16,
                importance: parseFloat(region.importance?.toString() || '0.5'),
                addresstype: region.type,
                name: region.name,
                display_name: region.display_name,
                address: {
                  [region.type]: region.name,
                  country: region.country_name,
                  country_code: region.country_code
                },
                boundingbox: [
                  (parseFloat(region.latitude.toString()) - 0.5).toString(),
                  (parseFloat(region.latitude.toString()) + 0.5).toString(),
                  (parseFloat(region.longitude.toString()) - 0.5).toString(),
                  (parseFloat(region.longitude.toString()) + 0.5).toString()
                ],
                geometry: {
                  type: "Point",
                  coordinates: [parseFloat(region.longitude.toString()), parseFloat(region.latitude.toString())]
                },
                country_code: region.country_code,
                country_name: region.country_name,
                default_language: region.language_code || language,
                coordinates: {
                  latitude: parseFloat(region.latitude.toString()),
                  longitude: parseFloat(region.longitude.toString())
                }
              };
              
              results.push(result);
              console.log(`✅ [REGION DEBUG] Added database region: ${region.display_name}`);
            }
          }
        } catch (error) {
          console.warn(`⚠️ [REGION WARN] Local regions database search failed:`, error);
        }
      }
      
      // If still no results, fall back to hardcoded regional data
      if (results.length === 0) {
        console.log(`🏝️ [FALLBACK DEBUG] No database results, checking hardcoded local data for: "${query}"`);
        const localResults = this.searchLocalRegions(query, language, limit);
        results.push(...localResults);
      }

      console.log(`� [SEARCH SUCCESS] Returning ${results.length} total results for "${query}"`);
      return results.slice(0, limit); // Ensure we don't exceed the requested limit
    } catch (error) {
      console.error(`❌ [SEARCH ERROR] Local search failed:`, error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search local regions/cities with hardcoded data
   * This provides immediate support for common Indonesian locations
   */
  private static searchLocalRegions(query: string, language: string, limit: number): GeocodingResult[] {
    console.log(`🏝️ [REGION DEBUG] Searching local regions for: "${query}"`);
    
    // Hardcoded Indonesian regions and major cities for immediate support
    const localRegions = [
      // Sumatra regions
      { name: 'Sumatra', display_name: 'Sumatra, Indonesia', lat: 0.1498584, lon: 102.8197858, type: 'region', country: 'Indonesia', country_code: 'id' },
      { name: 'Sumatera', display_name: 'Sumatra, Indonesia', lat: 0.1498584, lon: 102.8197858, type: 'region', country: 'Indonesia', country_code: 'id' },
      { name: 'North Sumatra', display_name: 'North Sumatra, Indonesia', lat: 3.5952, lon: 98.6722, type: 'province', country: 'Indonesia', country_code: 'id' },
      { name: 'West Sumatra', display_name: 'West Sumatra, Indonesia', lat: -0.7893, lon: 100.6512, type: 'province', country: 'Indonesia', country_code: 'id' },
      { name: 'South Sumatra', display_name: 'South Sumatra, Indonesia', lat: -3.3194, lon: 104.9148, type: 'province', country: 'Indonesia', country_code: 'id' },
      
      // Java regions
      { name: 'Java', display_name: 'Java, Indonesia', lat: -7.6145, lon: 110.7122, type: 'island', country: 'Indonesia', country_code: 'id' },
      { name: 'West Java', display_name: 'West Java, Indonesia', lat: -6.9147, lon: 107.6098, type: 'province', country: 'Indonesia', country_code: 'id' },
      { name: 'Central Java', display_name: 'Central Java, Indonesia', lat: -7.1500, lon: 110.1403, type: 'province', country: 'Indonesia', country_code: 'id' },
      { name: 'East Java', display_name: 'East Java, Indonesia', lat: -7.5360, lon: 112.2384, type: 'province', country: 'Indonesia', country_code: 'id' },
      
      // Other major regions
      { name: 'Bali', display_name: 'Bali, Indonesia', lat: -8.4095, lon: 115.1889, type: 'province', country: 'Indonesia', country_code: 'id' },
      { name: 'Kalimantan', display_name: 'Kalimantan, Indonesia', lat: -1.6815, lon: 113.3823, type: 'region', country: 'Indonesia', country_code: 'id' },
      { name: 'Borneo', display_name: 'Kalimantan, Indonesia', lat: -1.6815, lon: 113.3823, type: 'region', country: 'Indonesia', country_code: 'id' },
      { name: 'Sulawesi', display_name: 'Sulawesi, Indonesia', lat: -2.1124, lon: 120.1316, type: 'island', country: 'Indonesia', country_code: 'id' },
      { name: 'Papua', display_name: 'Papua, Indonesia', lat: -4.2699, lon: 138.0804, type: 'province', country: 'Indonesia', country_code: 'id' },
      
      // Major Indonesian cities
      { name: 'Jakarta', display_name: 'Jakarta, Indonesia', lat: -6.2088, lon: 106.8456, type: 'city', country: 'Indonesia', country_code: 'id' },
      { name: 'Surabaya', display_name: 'Surabaya, East Java, Indonesia', lat: -7.2575, lon: 112.7521, type: 'city', country: 'Indonesia', country_code: 'id' },
      { name: 'Bandung', display_name: 'Bandung, West Java, Indonesia', lat: -6.9175, lon: 107.6191, type: 'city', country: 'Indonesia', country_code: 'id' },
      { name: 'Medan', display_name: 'Medan, North Sumatra, Indonesia', lat: 3.5952, lon: 98.6722, type: 'city', country: 'Indonesia', country_code: 'id' },
      { name: 'Semarang', display_name: 'Semarang, Central Java, Indonesia', lat: -6.9667, lon: 110.4167, type: 'city', country: 'Indonesia', country_code: 'id' },
      { name: 'Palembang', display_name: 'Palembang, South Sumatra, Indonesia', lat: -2.9761, lon: 104.7754, type: 'city', country: 'Indonesia', country_code: 'id' },
      { name: 'Makassar', display_name: 'Makassar, South Sulawesi, Indonesia', lat: -5.1477, lon: 119.4327, type: 'city', country: 'Indonesia', country_code: 'id' },
      { name: 'Denpasar', display_name: 'Denpasar, Bali, Indonesia', lat: -8.6705, lon: 115.2126, type: 'city', country: 'Indonesia', country_code: 'id' }
    ];

    const searchResults: GeocodingResult[] = [];
    const queryLower = query.toLowerCase();
    
    for (const region of localRegions) {
      // Check if query matches region name (case insensitive)
      if (region.name.toLowerCase().includes(queryLower) || 
          region.display_name.toLowerCase().includes(queryLower)) {
        
        const result: GeocodingResult = {
          place_id: `local_${region.type}_${region.country_code}_${region.name.replace(/\s+/g, '_').toLowerCase()}`,
          licence: "© OpenStreetMap contributors",
          osm_type: "relation",
          osm_id: region.name,
          lat: region.lat,
          lon: region.lon,
          category: "place",
          type: region.type,
          place_rank: region.type === 'country' ? 4 : region.type === 'province' ? 8 : region.type === 'region' ? 10 : 16,
          importance: region.type === 'country' ? 0.75 : region.type === 'province' ? 0.65 : 0.55,
          addresstype: region.type,
          name: region.name,
          display_name: region.display_name,
          address: {
            [region.type]: region.name,
            country: region.country,
            country_code: region.country_code
          },
          boundingbox: [
            (region.lat - 0.5).toString(),
            (region.lat + 0.5).toString(),
            (region.lon - 0.5).toString(),
            (region.lon + 0.5).toString()
          ],
          geometry: {
            type: "Point",
            coordinates: [region.lon, region.lat]
          },
          country_code: region.country_code,
          country_name: region.country,
          default_language: language,
          coordinates: {
            latitude: region.lat,
            longitude: region.lon
          }
        };
        
        searchResults.push(result);
        console.log(`✅ [REGION DEBUG] Found local region: ${region.display_name}`);
        
        if (searchResults.length >= limit) break;
      }
    }
    
    return searchResults;
  }

  /**
   * Search for locations (cities and countries) by name
   * This combines city search from local JSON data with country search from database
   */
  static async searchLocations(
    query: string,
    language: string = 'en',
    limit: number = 10
  ): Promise<GeocodingResult[]> {
    try {
      console.log(`🔍 [SEARCH DEBUG] Starting location search for query: "${query}", language: ${language}, limit: ${limit}`);
      
      const results: GeocodingResult[] = [];
      const normalizedQuery = query.toLowerCase().trim();

      // First, search for cities in local JSON data
      const citiesModule = await import('@/data/cities.json');
      const cities = citiesModule.default;
      
      const matchingCities = cities.filter(city => 
        city.name.toLowerCase().includes(normalizedQuery)
      ).slice(0, Math.min(limit, 5)); // Limit cities to 5 max

      console.log(`🏙️ [CITY DEBUG] Found ${matchingCities.length} matching cities`);

      // Convert cities to GeocodingResult format
      for (const city of matchingCities) {
        const result: GeocodingResult = {
          place_id: `city_${city.name.toLowerCase().replace(/\s+/g, '_')}_${city.country.toLowerCase().replace(/\s+/g, '_')}`,
          licence: "© OpenStreetMap contributors",
          osm_type: "node",
          osm_id: "0",
          lat: city.latitude,
          lon: city.longitude,
          category: "place",
          type: "city",
          place_rank: 16,
          importance: 0.7,
          addresstype: "city",
          name: city.name,
          display_name: `${city.name}, ${city.country}`,
          address: {
            city: city.name,
            country: city.country,
            country_code: this.getCountryCode(city.country)
          },
          boundingbox: [
            (city.latitude - 0.1).toString(),
            (city.latitude + 0.1).toString(),
            (city.longitude - 0.1).toString(),
            (city.longitude + 0.1).toString()
          ],
          geometry: {
            type: "Point",
            coordinates: [city.longitude, city.latitude]
          },
          country_code: this.getCountryCode(city.country),
          country_name: city.country,
          default_language: language,
          coordinates: {
            latitude: city.latitude,
            longitude: city.longitude
          }
        };
        
        results.push(result);
        console.log(`✅ [CITY RESULT] Added city: ${city.name}, ${city.country}`);
      }

      // If we have space for more results, search countries
      const remainingLimit = limit - results.length;
      if (remainingLimit > 0) {
        console.log(`🌍 [COUNTRY DEBUG] Searching for countries with remaining limit: ${remainingLimit}`);
        const countryResults = await this.searchCountries(query, language, remainingLimit);
        results.push(...countryResults);
      }

      console.log(`✅ [FINAL DEBUG] Total results found: ${results.length}`);
      return results.slice(0, limit);
    } catch (error) {
      console.error('Error in searchLocations:', error);
      // Fallback to country search only
      return this.searchCountries(query, language, limit);
    }
  }

  /**
   * Helper method to get country code from country name
   * This is a simplified mapping - you might want to use a more comprehensive solution
   */
  private static getCountryCode(countryName: string): string {
    const countryMap: { [key: string]: string } = {
      'United Kingdom': 'gb',
      'United States': 'us',
      'France': 'fr',
      'Germany': 'de',
      'Italy': 'it',
      'Spain': 'es',
      'Canada': 'ca',
      'Australia': 'au',
      'Japan': 'jp',
      'China': 'cn',
      'India': 'in',
      'Brazil': 'br',
      'Russia': 'ru',
      'South Korea': 'kr',
      'Mexico': 'mx',
      'Netherlands': 'nl',
      'Turkey': 'tr',
      'Saudi Arabia': 'sa',
      'Switzerland': 'ch',
      'Belgium': 'be',
      'Poland': 'pl',
      'Ireland': 'ie',
      'Norway': 'no',
      'Austria': 'at',
      'Israel': 'il',
      'United Arab Emirates': 'ae',
      'Argentina': 'ar',
      'South Africa': 'za',
      'Chile': 'cl',
      'Finland': 'fi',
      'Denmark': 'dk',
      'Indonesia': 'id',
      'Thailand': 'th',
      'Malaysia': 'my',
      'Singapore': 'sg',
      'Philippines': 'ph',
      'Vietnam': 'vn',
      'Egypt': 'eg',
      'Nigeria': 'ng',
      'Kenya': 'ke',
      'Morocco': 'ma',
      'Ghana': 'gh'
    };
    
    return countryMap[countryName] || countryName.toLowerCase().substring(0, 2);
  }
}
