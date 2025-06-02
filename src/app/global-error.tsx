'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen relative overflow-hidden bg-gray-900">
          {/* Weather-themed background with dramatic overlay */}
          <div className="weather-background weather-cloudy">
            <Image
              src="/background-weather/a-storm.jpg"
              alt="Storm background"
              fill
              className="object-cover"
              priority
            />
            {/* Dramatic gradient overlay for critical errors */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/30 via-slate-900/70 to-gray-900/80"></div>
            <div className="absolute inset-0 bg-black/30"></div>
          </div>
          
          {/* Glass overlay */}
          <div className="relative z-10 min-h-screen flex items-center justify-center p-4 error-page-container">
            <div className="error-glass-container error-dialog-enter max-w-lg w-full p-8 rounded-2xl text-center">
              {/* Weather-themed error icon */}
              <div className="mb-6">
                <div className="w-24 h-24 mx-auto mb-4 relative error-icon-animation">
                  <Image
                    src="/icons/weathers/lightning-bolt.svg"
                    alt="Critical Error"
                    width={96}
                    height={96}
                    className="opacity-80"
                  />
                </div>
              </div>

              {/* Error message */}
              <h1 className="text-3xl font-bold text-white mb-4">
                Severe Weather Alert
              </h1>
              
              <p className="text-gray-200 mb-6 leading-relaxed text-lg">
                We&apos;re experiencing a critical system storm that has affected our weather services. 
                Our meteorologists are working to restore normal conditions.
              </p>

              {/* Error details for development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-left">
                  <h3 className="text-red-300 font-semibold mb-2">Debug Information:</h3>
                  <p className="text-red-300 text-sm font-mono break-all">
                    {error.message}
                  </p>
                  {error.digest && (
                    <p className="text-red-400 text-xs mt-2">
                      Error ID: {error.digest}
                    </p>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-4">
                <button
                  onClick={() => reset()}
                  className="w-full px-6 py-4 error-button-primary text-white font-medium rounded-lg transition-all duration-300 backdrop-blur-sm text-lg"
                >
                  Restart Weather System
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-6 py-3 error-button-secondary text-white font-medium rounded-lg transition-all duration-300 backdrop-blur-sm"
                >
                  Reload Application
                </button>
                
                <Link
                  href="/"
                  className="block w-full px-6 py-3 bg-green-500/20 hover:bg-green-600/30 text-green-200 font-medium rounded-lg transition-all duration-300 backdrop-blur-sm border border-green-400/30 hover:border-green-300/50"
                >
                  Return to Safety
                </Link>
              </div>

              {/* Support information */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-gray-400 text-sm mb-2">
                  If this storm persists, please contact our weather support team
                </p>
                <p className="text-gray-500 text-xs">
                  Error reported at {new Date().toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
