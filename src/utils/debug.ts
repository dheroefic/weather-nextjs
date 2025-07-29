// Debug utility for weather application

import { isDebugEnabled, getFeatureFlagStates } from './featureFlags';

const debugPrefix = '[Weather App Debug]';

export const debug = {
  api: <T = unknown>(message: string, data?: T) => {
    if (isDebugEnabled()) {
      console.log(`${debugPrefix} API:`, message);
      if (data) console.log(data);
    }
  },

  weather: <T = unknown>(message: string, data?: T) => {
    if (isDebugEnabled()) {
      console.log(`${debugPrefix} Weather:`, message);
      if (data) console.log(data);
    }
  },

  background: <T = unknown>(message: string, data?: T) => {
    if (isDebugEnabled()) {
      console.log(`${debugPrefix} Background:`, message);
      if (data) console.log(data);
    }
  },

  map: <T = unknown>(message: string, data?: T) => {
    if (isDebugEnabled()) {
      console.log(`${debugPrefix} Map:`, message);
      if (data) console.log(data);
    }
  },

  layout: <T = unknown>(message: string, data?: T) => {
    if (isDebugEnabled()) {
      console.log(`${debugPrefix} Layout:`, message);
      if (data) console.log(data);
    }
  },

  serviceWorker: <T = unknown>(message: string, data?: T) => {
    if (isDebugEnabled()) {
      console.log(`${debugPrefix} SW:`, message);
      if (data) console.log(data);
    }
  },

  config: <T = unknown>(message: string, data?: T) => {
    if (isDebugEnabled()) {
      console.log(`${debugPrefix} Config:`, message);
      if (data) console.log(data);
    }
  },

  warn: <T = unknown>(message: string, data?: T) => {
    if (isDebugEnabled()) {
      console.warn(`${debugPrefix} Warning:`, message);
      if (data) console.warn(data);
    }
  },

  featureFlags: () => {
    if (isDebugEnabled()) {
      console.log(`${debugPrefix} Feature Flags:`, getFeatureFlagStates());
    }
  }
};