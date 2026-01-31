'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Component, type ReactNode } from 'react';

import { Button } from '@/presentation/components/ui/button';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Error Boundary Component
 *
 * Fängt JavaScript-Fehler in Child-Komponenten ab und zeigt
 * eine benutzerfreundliche Fehlermeldung.
 *
 * Features:
 * - Fehler werden abgefangen statt App-Crash
 * - Benutzerfreundliche Fehlermeldung
 * - Möglichkeit zum Neuladen
 * - Logging für Debugging
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // TODO: Send to error tracking service (e.g., Sentry)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-lg font-semibold">Ein Fehler ist aufgetreten</h2>
          <p className="mb-4 max-w-md text-gray-500">
            Bitte versuchen Sie es erneut. Falls das Problem weiterhin besteht,
            kontaktieren Sie den Support.
          </p>
          <Button onClick={this.handleReset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Seite neu laden
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
