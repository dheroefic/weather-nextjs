'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { isProduction, isDebugEnabled } from '@/utils/featureFlags';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isDebugEnabled()) {
      console.error('Error caught by boundary:', error, errorInfo);
    }
    
    // Report to monitoring service in production
    if (isProduction()) {
      // You can add error reporting service here
      console.error('Production error:', { error, errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Enhanced dark background overlay */}
          <div className="absolute inset-0 error-backdrop"></div>
          
          {/* Error dialog with animation */}
          <div className="relative error-glass-container error-dialog-enter max-w-md w-full p-6 rounded-2xl text-center">
            {/* Weather-themed error icon */}
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto mb-3 relative opacity-80 error-icon-animation">
                <svg className="w-full h-full text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-xl font-semibold text-white mb-2">Weather System Hiccup</h2>
            <p className="text-gray-200 mb-4 leading-relaxed">
              A small weather disturbance occurred. Don&apos;t worry, these conditions usually pass quickly.
            </p>
            
            {!isProduction() && this.state.error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-left">
                <p className="text-red-300 text-xs font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-6 py-2 error-button-primary text-white font-medium rounded-lg transition-all duration-300 backdrop-blur-sm"
            >
              Clear Conditions
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
