/**
 * Common constants for geolocation API
 * Consolidates duplicate option objects used across the codebase
 */

/**
 * Standard options for navigator.geolocation.getCurrentPosition
 */
export const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0
};
