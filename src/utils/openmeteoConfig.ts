/**
 * OpenMeteo API Configuration Utility
 * 
 * This utility provides centralized configuration for OpenMeteo API endpoints
 * and helps with debugging API configuration issues.
 */

export interface OpenMeteoConfig {
  baseUrl: string;
  geocodingUrl: string;
  apiKey?: string;
  hasApiKey: boolean;
}

/**
 * Get the current OpenMeteo configuration
 */
export function getOpenMeteoConfig(): OpenMeteoConfig {
  const baseUrl = process.env.NEXT_PUBLIC_OPENMETEO_API_URL || 'https://api.open-meteo.com/v1';
  const geocodingUrl = process.env.NEXT_PUBLIC_OPENMETEO_GEOCODING_URL || 'https://geocoding-api.open-meteo.com/v1';
  const apiKey = process.env.NEXT_PUBLIC_OPENMETEO_API_KEY;

  return {
    baseUrl,
    geocodingUrl,
    apiKey,
    hasApiKey: Boolean(apiKey),
  };
}

/**
 * Debug function to log OpenMeteo configuration
 * Only logs in development mode when debug is enabled
 */
export function debugOpenMeteoConfig(): void {
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true') {
    const config = getOpenMeteoConfig();
    console.group('🌤️ OpenMeteo API Configuration');
    console.log('Base URL:', config.baseUrl);
    console.log('Geocoding URL:', config.geocodingUrl);
    console.log('Has API Key:', config.hasApiKey);
    if (config.hasApiKey) {
      console.log('API Key:', `${config.apiKey?.substring(0, 8)}...`);
    } else {
      console.log('ℹ️ Using free OpenMeteo API (no API key required)');
    }
    console.groupEnd();
  }
}

/**
 * Validate OpenMeteo configuration URLs
 */
export function validateOpenMeteoConfig(): { isValid: boolean; errors: string[] } {
  const config = getOpenMeteoConfig();
  const errors: string[] = [];

  // Validate base URL
  try {
    new URL(config.baseUrl);
  } catch {
    errors.push(`Invalid base URL: ${config.baseUrl}`);
  }

  // Validate geocoding URL
  try {
    new URL(config.geocodingUrl);
  } catch {
    errors.push(`Invalid geocoding URL: ${config.geocodingUrl}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
