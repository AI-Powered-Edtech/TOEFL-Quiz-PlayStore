
import * as Sentry from '@sentry/react';
import React from 'react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
}

export class SentryErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        Sentry.captureException(error, { extra: errorInfo as any });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-gray-50 p-4">
                    <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">Terjadi kendala</h2>
                        <p className="text-gray-600 mb-6">
                            Aplikasi mengalami kendala. Coba muat ulang atau kembali ke beranda.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                            Muat ulang
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
