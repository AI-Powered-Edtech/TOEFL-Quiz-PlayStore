import * as Sentry from '@sentry/react';
import { LayoutDashboard } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';

import { AdminAuthGate } from './components/admin/AdminAuthGate';
import { BackofficeHub } from './components/admin/BackofficeHub';
import { SentryErrorBoundary } from './components/SentryErrorBoundary';

import './index.css';

// Admin entry point does not depend on AppRouter to keep main bundle clean

Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    environment: import.meta.env.MODE,
});

const AdminApp = () => {
    // Simple auth check or routing if we want to build a mini-router, 
    // but for now we just mount the Hub.
    const [view, setView] = useState<'HUB' | 'EXIT'>('HUB');

    if (view === 'EXIT') {
        return (
            <div className="w-screen h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
                <LayoutDashboard className="w-16 h-16 text-blue-500 mb-6" />
                <h1 className="text-2xl font-bold mb-2">Backoffice Exited</h1>
                <p className="text-slate-400 mb-6">You can close this tab or return to the main application.</p>
                <a href="/" className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg shadow-blue-900/50">Go to Main App</a>
            </div>
        );
    }

    return (
        <div className="w-screen h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 overflow-hidden">
            <Toaster position="top-center" />
            <AdminAuthGate>
                <BackofficeHub
                    onNavigate={() => { }} // No external navigation needed
                    onBack={() => setView('EXIT')}
                />
            </AdminAuthGate>
        </div>
    );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount");

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <SentryErrorBoundary>
            <AdminApp />
        </SentryErrorBoundary>
    </React.StrictMode>
);
