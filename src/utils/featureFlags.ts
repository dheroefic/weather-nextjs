/**
 * Feature Flags Utility
 * 
 * Centralized management of feature flags for the weather application.
 * All feature flags are controlled via environment variables.
 */

/**
 * Check if desktop layout support is enabled
 * Controlled by NEXT_PUBLIC_ENABLE_DESKTOP_LAYOUT environment variable
 */
export const isDesktopLayoutEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_ENABLE_DESKTOP_LAYOUT === 'true';
};

/**
 * Check if debug mode is enabled
 * Controlled by NEXT_PUBLIC_DEBUG environment variable
 */
export const isDebugEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_DEBUG === 'true';
};

/**
 * Check if Unsplash background service is configured
 * Controlled by NEXT_PUBLIC_UNSPLASH_ACCESS_KEY environment variable
 */
export const isUnsplashEnabled = (): boolean => {
  return !!process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
};

/**
 * Check if app is in development mode
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Check if app is in production mode
 */
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Get all current feature flag states (useful for debugging)
 */
export const getFeatureFlagStates = () => {
  return {
    desktopLayout: isDesktopLayoutEnabled(),
    debug: isDebugEnabled(),
    unsplash: isUnsplashEnabled(),
    development: isDevelopment(),
    production: isProduction(),
  };
};
