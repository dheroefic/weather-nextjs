'use client';

import { useEffect } from 'react';
import Image from 'next/image';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Weather-themed background with gradient overlay */}
      <div className="weather-background weather-cloudy">
        <Image
          src="/background-weather/a-default.jpg"
          alt="Weather background"
          fill
          className="object-cover"
          priority
        />
        {/* Beautiful gradient overlay for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-blue-900/50 to-indigo-900/70"></div>
        <div className="absolute inset-0 bg-black/20"></div>
      </div>
      
      {/* Glass overlay */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 error-page-container">
        <div className="error-glass-container error-dialog-enter max-w-md w-full p-8 rounded-2xl text-center">
          {/* Weather-themed error icon */}
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 relative error-icon-animation">
              <Image
                src="/icons/weathers/not-available.svg"
                alt="Error"
                width={80}
                height={80}
                className="opacity-80"
              />
            </div>
          </div>

          {/* Error message */}
          <h1 className="text-2xl font-bold text-white mb-3">
            Weather Update Unavailable
          </h1>
          
          <p className="text-gray-200 mb-6 leading-relaxed">
            We&apos;re experiencing some stormy weather in our systems. 
            Don&apos;t worry, this should clear up soon.
          </p>

          {/* Error details for development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-left">
              <p className="text-red-300 text-sm font-mono">
                {error.message}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={() => reset()}
              className="w-full px-6 py-3 error-button-primary text-white font-medium rounded-lg transition-all duration-300 backdrop-blur-sm"
            >
              Try Again
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="w-full px-6 py-3 error-button-secondary text-white font-medium rounded-lg transition-all duration-300 backdrop-blur-sm"
            >
              Return Home
            </button>
          </div>

          {/* Weather attribution footer */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-gray-400 text-xs">
              Weather conditions will improve shortly
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
