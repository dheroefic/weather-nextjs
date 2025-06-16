'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Weather-themed background with soft overlay */}
      <div className="weather-background weather-fog">
        <Image
          src="/background-weather/a-cloudy.jpg"
          alt="Foggy background"
          fill
          className="object-cover"
          priority
        />
        {/* Soft gradient overlay for 404 pages */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800/60 via-slate-800/50 to-blue-900/60"></div>
        <div className="absolute inset-0 bg-black/25"></div>
      </div>
      
      {/* Glass overlay */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 error-page-container">
        <div className="error-glass-container error-dialog-enter max-w-md w-full p-8 rounded-2xl text-center">
          {/* Weather-themed 404 icon */}
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 relative error-icon-animation">
              <Image
                src="/icons/weathers/fog.svg"
                alt="Location not found"
                width={80}
                height={80}
                className="opacity-80"
              />
            </div>
          </div>

          {/* 404 message */}
          <h1 className="text-4xl font-bold text-white mb-2">
            404
          </h1>
          
          <h2 className="text-xl font-semibold text-white mb-4">
            Location Not Found
          </h2>
          
          <p className="text-gray-200 mb-6 leading-relaxed">
            The weather forecast you&apos;re looking for seems to have drifted away with the clouds. 
            Let&apos;s help you find your way back to clear skies.
          </p>

          {/* Navigation buttons */}
          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full px-6 py-3 error-button-primary text-white font-medium rounded-lg transition-all duration-300 backdrop-blur-sm"
            >
              Return to Weather Home
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="w-full px-6 py-3 error-button-secondary text-white font-medium rounded-lg transition-all duration-300 backdrop-blur-sm"
            >
              Go Back
            </button>
          </div>

          {/* Weather navigation */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-gray-400 text-sm mb-3">
              Popular weather destinations:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link
                href="/?city=New+York"
                className="px-3 py-1 text-xs bg-white/5 hover:bg-white/15 text-gray-300 rounded-full transition-all duration-200"
              >
                New York
              </Link>
              <Link
                href="/?city=London"
                className="px-3 py-1 text-xs bg-white/5 hover:bg-white/15 text-gray-300 rounded-full transition-all duration-200"
              >
                London
              </Link>
              <Link
                href="/?city=Tokyo"
                className="px-3 py-1 text-xs bg-white/5 hover:bg-white/15 text-gray-300 rounded-full transition-all duration-200"
              >
                Tokyo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
