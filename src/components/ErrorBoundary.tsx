import React from "react";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: unknown;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    // This ensures we capture the real runtime error in Lovable logs
    console.error("[ErrorBoundary] Uncaught error:", error);
    console.error("[ErrorBoundary] Error info:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen bg-background text-foreground">
            <div className="container mx-auto px-4 py-10">
              <h1 className="text-2xl font-semibold">Ocorreu um erro na tela</h1>
              <p className="mt-2 text-muted-foreground">
                Tente recarregar a página. Se continuar, me avise que eu vejo o erro no log.
              </p>
              <button
                className="mt-6 inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium"
                onClick={() => window.location.reload()}
              >
                Recarregar
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
