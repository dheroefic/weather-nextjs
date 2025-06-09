'use client';

import dynamic from 'next/dynamic';

const WeatherApp = dynamic(() => import('./components/WeatherApp'), { 
  ssr: false 
});

export default function Home() {
  return <WeatherApp />;
}

