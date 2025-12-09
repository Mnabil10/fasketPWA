import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error | null;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error("Uncaught error", error, info);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 px-6 text-center">
          <div className="text-5xl mb-4">:(</div>
          <h1 className="font-poppins text-2xl mb-2" style={{ fontWeight: 700 }}>
            Something went wrong
          </h1>
          <p className="text-gray-600 mb-6 max-w-sm">
            {this.state.error?.message || "The app encountered an unexpected error. Please try again."}
          </p>
          <button
            onClick={this.reset}
            className="px-6 py-3 rounded-xl bg-primary text-white font-medium shadow-lg"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
