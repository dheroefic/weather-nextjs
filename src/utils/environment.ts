/**
 * Utility functions for environment detection
 * Consolidates duplicate typeof window checks across the codebase
 */

/**
 * Check if code is running in a client (browser) environment
 * @returns true if running in browser, false otherwise
 */
export function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if code is running in a server environment
 * @returns true if running on server, false otherwise
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}

/**
 * Check if browser geolocation API is available
 * @returns true if geolocation is supported, false otherwise
 */
export function isGeolocationAvailable(): boolean {
  return isClient() && typeof navigator !== 'undefined' && !!navigator.geolocation;
}
