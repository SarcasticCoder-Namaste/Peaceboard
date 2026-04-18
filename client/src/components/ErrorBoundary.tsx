import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI ErrorBoundary caught:", error, info);
  }

  private reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen w-full flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="inline-flex w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-rose-500 items-center justify-center shadow-xl mb-6">
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Something tripped us up
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            Don't worry — your data is safe. Try reloading the page or heading home.
          </p>

          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-4 max-h-48 overflow-auto text-left text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
              {this.state.error.message}
            </pre>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="gap-2 bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white"
              onClick={() => {
                this.reset();
                window.location.reload();
              }}
            >
              <RefreshCw className="w-4 h-4" /> Reload
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => {
                this.reset();
                window.location.href = "/";
              }}
            >
              <Home className="w-4 h-4" /> Go home
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
