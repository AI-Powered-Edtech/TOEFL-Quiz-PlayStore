import React from 'react';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

import authService from '../services/auth';
import { useAuthStore } from '../stores/useAuthStore';
import { AppView } from '../types';

interface AuthCallbackProps {
    onNavigate: (view: AppView) => void;
}

export const AuthCallback: React.FC<AuthCallbackProps> = ({ onNavigate }) => {
    const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = React.useState('Completing sign in...');

    React.useEffect(() => {
        let mounted = true;

        const completeOAuth = async () => {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const state = params.get('state');
            const expectedState = sessionStorage.getItem('oauth_state');

            if (!code || !state) {
                setStatus('error');
                setMessage('Login callback is missing required data. Please try again.');
                return;
            }

            if (!expectedState || expectedState !== state) {
                setStatus('error');
                setMessage('Login session mismatch. Please start Google login again.');
                return;
            }

            const result = await authService.handleOAuthCallback(code, state);
            if (!mounted) return;

            if (!result.ok) {
                setStatus('error');
                setMessage(result.error || 'Google login failed. Please try again.');
                return;
            }

            sessionStorage.removeItem('oauth_state');
            await useAuthStore.getState().refreshProfile();
            if (!mounted) return;

            setStatus('success');
            setMessage('Login complete. Redirecting...');
            window.history.replaceState({}, '', '/');
            setTimeout(() => onNavigate(AppView.DASHBOARD), 500);
        };

        completeOAuth().catch((error) => {
            console.error('[AuthCallback] OAuth completion failed:', error);
            if (mounted) {
                setStatus('error');
                setMessage('Unable to complete login. Please check your connection and try again.');
            }
        });

        return () => { mounted = false; };
    }, [onNavigate]);

    const Icon = status === 'success' ? CheckCircle2 : status === 'error' ? AlertTriangle : Loader2;

    return (
        <div className="flex h-full min-h-[60vh] flex-col items-center justify-center bg-slate-50 px-6 text-center">
            <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border shadow-sm ${
                status === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-600' :
                status === 'error' ? 'border-red-100 bg-red-50 text-red-600' :
                'border-blue-100 bg-blue-50 text-blue-600'
            }`}>
                <Icon className={`h-8 w-8 ${status === 'loading' ? 'animate-spin' : ''}`} />
            </div>
            <h1 className="mb-2 text-xl font-bold text-slate-900">
                {status === 'error' ? 'Login needs attention' : status === 'success' ? 'Signed in' : 'Signing you in'}
            </h1>
            <p className="max-w-sm text-sm leading-6 text-slate-500">{message}</p>
            {status === 'error' && (
                <button
                    onClick={() => onNavigate(AppView.PROFILE)}
                    className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-200"
                >
                    Back to login
                </button>
            )}
        </div>
    );
};

export default AuthCallback;
