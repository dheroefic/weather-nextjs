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
 * Note: This flag indicates if the feature should be enabled on the client,
 * but the actual API key is securely stored on the server
 */
export const isUnsplashEnabled = (): boolean => {
  // We can use a public flag to enable/disable the feature
  // while keeping the actual API key secure on the server
  return process.env.NEXT_PUBLIC_ENABLE_UNSPLASH === 'true';
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
