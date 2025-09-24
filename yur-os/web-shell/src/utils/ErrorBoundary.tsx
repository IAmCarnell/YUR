import React, { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean;
}

/**
 * Centralized Error Boundary for YUR OS spatial interface
 * Provides graceful error recovery for 3D components and plugins
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('YUR OS ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    if (process.env.NODE_ENV === 'production') {
      this.reportErrorToService(error, errorInfo);
    }
  }

  private reportErrorToService(error: Error, errorInfo: ErrorInfo): void {
    // Integration point for error monitoring
    console.warn('Error reported to YUR OS monitoring:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.9)',
          color: '#fff',
          padding: '2rem',
          borderRadius: '10px',
          border: '1px solid #ff6b6b',
          maxWidth: '600px',
          zIndex: 9999,
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#ff6b6b' }}>
            ⚠️ YUR OS Error
          </h2>
          <p style={{ margin: '0 0 1rem 0', opacity: 0.9 }}>
            An unexpected error occurred in the spatial interface. 
            You can try recovering or reload the experience.
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div style={{
              background: '#1a1a1a',
              padding: '1rem',
              borderRadius: '5px',
              margin: '1rem 0',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
              overflow: 'auto',
              maxHeight: '200px',
            }}>
              <pre style={{ margin: 0, color: '#ff9999' }}>
                {this.state.error.message}
                {this.state.error.stack && '\n\n' + this.state.error.stack}
              </pre>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button
              onClick={this.handleRetry}
              style={{
                background: '#4a9eff',
                color: '#fff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Try Again
            </button>
            <button
              onClick={this.handleReload}
              style={{
                background: 'transparent',
                color: '#fff',
                border: '1px solid #666',
                padding: '0.5rem 1rem',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Reload YUR OS
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC for wrapping components with error boundaries
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Hook for programmatic error handling
 */
export function useErrorHandler() {
  return (error: Error) => {
    throw error;
  };
}

/**
 * Spatial-specific error boundary for 3D scenes
 */
export function SpatialErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Spatial component error:', error, errorInfo);
        // Could pause animations, reset camera, etc.
      }}
      fallback={
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#fff',
          textAlign: 'center',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '1rem',
          borderRadius: '10px',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🌌</div>
          <div>Spatial component failed to load</div>
          <div style={{ fontSize: '0.875rem', opacity: 0.7, marginTop: '0.5rem' }}>
            The 3D interface encountered an error
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}