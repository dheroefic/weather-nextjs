import type { Location, TemperatureUnit } from '@/types/weather';

interface UserPreferences {
  tempUnit: TemperatureUnit;
  location: Location | null;
}

const STORAGE_KEY = 'weather_preferences';

const defaultPreferences: UserPreferences = {
  tempUnit: 'C',
  location: null,
};

export const loadPreferences = (): UserPreferences => {
  // Ensure this code runs only in the browser
  if (typeof window === 'undefined') return defaultPreferences;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultPreferences;

  try {
    return JSON.parse(stored) as UserPreferences;
  } catch (error) {
    console.error('Error parsing stored preferences', error);
    return defaultPreferences;
  }
};

export const savePreferences = (preferences: Partial<UserPreferences>): void => {
  // Ensure this code runs only in the browser
  if (typeof window === 'undefined') return;

  const current = loadPreferences();
  const updated = { ...current, ...preferences };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const clearPreferences = (): void => {
  // Ensure this code runs only in the browser
  if (typeof window === 'undefined') return;

  localStorage.removeItem(STORAGE_KEY);
};
