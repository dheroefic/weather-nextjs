// Debug utility for weather application

const isDebugEnabled = process.env.NEXT_PUBLIC_DEBUG === 'true';
const debugPrefix = '[Weather App Debug]';

export const debug = {
  api: (message: string, data?: any) => {
    if (isDebugEnabled) {
      console.log(`${debugPrefix} API:`, message);
      if (data) console.log(data);
    }
  },

  weather: (message: string, data?: any) => {
    if (isDebugEnabled) {
      console.log(`${debugPrefix} Weather:`, message);
      if (data) console.log(data);
    }
  },

  background: (message: string, data?: any) => {
    if (isDebugEnabled) {
      console.log(`${debugPrefix} Background:`, message);
      if (data) console.log(data);
    }
  }
};