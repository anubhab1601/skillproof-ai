'use client';
import { Component } from 'react';

/**
 * Global error boundary — wraps pages to prevent white screens.
 * Shows a friendly error UI with a retry button.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-red-600 text-3xl">error</span>
            </div>
            <h2 className="text-xl font-bold text-[#131b2e] mb-2">Something went wrong</h2>
            <p className="text-sm text-[#454655] mb-6">
              An unexpected error occurred. Please try again or refresh the page.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-6 py-3 bg-[#0623bb] text-white rounded-xl font-semibold hover:opacity-90 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
