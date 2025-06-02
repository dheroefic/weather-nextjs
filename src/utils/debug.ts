// Debug utility for weather application

import { isDebugEnabled } from './featureFlags';

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

  featureFlags: () => {
    if (isDebugEnabled()) {
      const { getFeatureFlagStates } = require('./featureFlags');
      console.log(`${debugPrefix} Feature Flags:`, getFeatureFlagStates());
    }
  }
};