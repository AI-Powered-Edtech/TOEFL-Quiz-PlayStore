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

// Initialize Sentry
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [],
  // 10% in production to control cost & overhead. Full sampling in dev for debugging.
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  environment: import.meta.env.MODE,
});

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
