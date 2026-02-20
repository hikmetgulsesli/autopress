import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
          <div className="max-w-md w-full bg-surface-alt border border-border rounded-2xl p-8 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-rose-400" />
              </div>
              
              <h1 className="text-xl font-bold text-text mb-2">
                Bir Şeyler Yanlış Gitti
              </h1>
              
              <p className="text-text-muted mb-6">
                Uygulamada beklenmeyen bir hata oluştu. 
                Sayfayı yenileyerek veya ana sayfaya dönerek sorunu çözebilirsiniz.
              </p>

              {this.state.error && (
                <div className="w-full bg-surface border border-border rounded-lg p-4 mb-6 text-left">
                  <p className="text-xs font-mono text-rose-400 break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex gap-3 w-full">
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 bg-surface border border-border text-text hover:bg-surface-alt"
                  style={{ cursor: 'pointer' }}
                >
                  <Home className="w-4 h-4" />
                  Ana Sayfa
                </button>
                <button
                  onClick={this.handleReset}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 bg-primary-400 text-surface hover:bg-primary-500"
                  style={{ 
                    cursor: 'pointer',
                    backgroundColor: 'var(--color-primary-400)',
                    color: 'var(--color-surface)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-500)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-400)';
                  }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Yenile
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
