/**
 * OpenMeteo API Configuration Utility
 * 
 * This utility provides centralized configuration for OpenMeteo API endpoints
 * and helps with debugging API configuration issues.
 */

import { debug } from '@/utils/debug';

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
  const config = getOpenMeteoConfig();
  debug.config('OpenMeteo API Configuration', {
    baseUrl: config.baseUrl,
    geocodingUrl: config.geocodingUrl,
    hasApiKey: config.hasApiKey,
    apiKey: config.hasApiKey ? `${config.apiKey?.substring(0, 8)}...` : 'Using free OpenMeteo API (no API key required)'
  });
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
