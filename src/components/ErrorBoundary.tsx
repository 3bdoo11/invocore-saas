import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled React Error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-[280px] p-6 flex flex-col items-center justify-center text-center bg-slate-900 text-white rounded-2xl border border-slate-800 m-4 shadow-xl"
        >
          <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-white mb-1.5">
            {this.props.fallbackTitle || 'حدث تنبيه غير متوقع أثناء معالجة العرض'}
          </h2>
          <p className="text-xs text-slate-400 max-w-md mb-5 leading-relaxed">
            {this.props.fallbackMessage ||
              'تم احتواء الخطأ بأمان دون إيقاف باقي المنصة. يمكنك إعادة تحميل الصفحة للعودة فوراً لحالتك المحفوظة.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة تحميل المنصة</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
