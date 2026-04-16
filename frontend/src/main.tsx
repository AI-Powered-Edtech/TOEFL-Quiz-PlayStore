import * as Sentry from '@sentry/react';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { SentryErrorBoundary } from './components/SentryErrorBoundary';
import { reportWebVitals } from './utils/reportWebVitals';
import { secureStorage } from './utils/secureStorage';

if (!(crypto as any).randomUUID) {
  (crypto as any).randomUUID = () => {
    const bytes = typeof crypto !== 'undefined' && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(16))
      : Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
}

const devAccessToken = import.meta.env.VITE_DEV_ACCESS_TOKEN as string | undefined;
if (import.meta.env.DEV && devAccessToken) {
  secureStorage.setItem('access_token', devAccessToken);
}

// Gate init on DSN so dev/local runs and unconfigured deploys stay silent.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENV || 'production',
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0, // replays are expensive; opt-in only
    replaysOnErrorSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration()],
    beforeSend(event) {
      if (event.request?.url?.includes('/api/auth/') && event.request?.data) {
        event.request.data = '[REDACTED]';
      }
      return event;
    },
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SentryErrorBoundary>
      <App />
    </SentryErrorBoundary>
  </React.StrictMode>
);

reportWebVitals();
