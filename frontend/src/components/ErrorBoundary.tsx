// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const message = error instanceof Error ? error.message : 'Unknown rendering error';
    const componentStack = typeof errorInfo?.componentStack === 'string' ? errorInfo.componentStack : '';
    // Log strings only to avoid secondary serialization failures hiding the original error.
    console.error(`Uncaught error: ${message}${componentStack ? `\n${componentStack}` : ''}`);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] px-4">
          <div className="text-center p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-md max-w-lg w-full">
            <h2 className="text-2xl font-bold text-[var(--icon-red-text)] mb-4">Something went wrong</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-cyan-text)]"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
