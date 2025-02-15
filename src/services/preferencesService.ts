import type { Location, TemperatureUnit } from '@/types/weather';

interface UserPreferences {
  tempUnit: TemperatureUnit;
  location: Location | null;
}

const STORAGE_KEY = 'weather_preferences';

const defaultPreferences: UserPreferences = {
  tempUnit: 'C',
  location: null
};

export const loadPreferences = (): UserPreferences => {
  if (typeof window === 'undefined') return defaultPreferences;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultPreferences;

  try {
    return JSON.parse(stored) as UserPreferences;
  } catch {
    return defaultPreferences;
  }
};

export const savePreferences = (preferences: Partial<UserPreferences>): void => {
  if (typeof window === 'undefined') return;

  const current = loadPreferences();
  const updated = { ...current, ...preferences };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const clearPreferences = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
};