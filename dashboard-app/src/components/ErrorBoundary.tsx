import React from 'react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches React errors and displays a friendly error message
 * instead of white screen crash
 */
class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
                    <div className="max-w-2xl bg-slate-800 rounded-2xl p-8 shadow-xl border border-red-500/30">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">💥</span>
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Ошибка приложения</h1>
                            <p className="text-slate-400">Что-то пошло не так при загрузке Dashboard</p>
                        </div>

                        {/* Error Details */}
                        <div className="bg-slate-900 rounded-xl p-4 mb-6 overflow-auto max-h-64">
                            <p className="text-sm text-red-400 font-mono mb-2">
                                {this.state.error?.message || 'Unknown error'}
                            </p>
                            {this.state.error?.stack && (
                                <pre className="text-xs text-slate-500 whitespace-pre-wrap">
                                    {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                                </pre>
                            )}
                        </div>

                        {/* Debug Info */}
                        <div className="bg-slate-900 rounded-xl p-4 mb-6">
                            <p className="text-xs text-slate-500 mb-2">Отладочная информация:</p>
                            <div className="text-xs font-mono space-y-1">
                                <div className="flex">
                                    <span className="text-slate-500 w-32">VITE_API_URL:</span>
                                    <span className={import.meta.env.VITE_API_URL ? 'text-green-400' : 'text-red-400'}>
                                        {import.meta.env.VITE_API_URL ? '✓ Configured' : '✗ Not set'}
                                    </span>
                                </div>
                                <div className="flex">
                                    <span className="text-slate-500 w-32">VITE_API_KEY:</span>
                                    <span className={import.meta.env.VITE_API_KEY ? 'text-green-400' : 'text-red-400'}>
                                        {import.meta.env.VITE_API_KEY ? '✓ Configured' : '✗ Not set'}
                                    </span>
                                </div>
                                <div className="flex">
                                    <span className="text-slate-500 w-32">Build Mode:</span>
                                    <span className="text-slate-400">{import.meta.env.MODE}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                            >
                                Перезагрузить
                            </button>
                            <button
                                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                                className="px-6 py-2 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition-all"
                            >
                                Попробовать снова
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
