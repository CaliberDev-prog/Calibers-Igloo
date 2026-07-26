import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-8">
          <div className="glass p-8 max-w-md w-full space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-400/10 flex items-center justify-center mx-auto">
              <span className="text-2xl">!</span>
            </div>
            <h2 className="text-lg font-semibold text-dark-100">Something went wrong</h2>
            <p className="text-sm text-dark-400">
              An unexpected error occurred. You can try returning to the dashboard or refreshing the page.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <div className="text-left bg-dark-900/60 rounded-xl p-3 border border-dark-700/30">
                <p className="text-xs font-mono text-red-400/80 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="btn-ghost text-sm"
              >
                Try Again
              </button>
              <a
                href="/dashboard"
                onClick={(e) => { e.preventDefault(); window.location.href = '/dashboard'; }}
                className="btn-primary text-sm"
              >
                Return to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
