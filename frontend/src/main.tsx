import * as Sentry from '@sentry/react';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { SentryErrorBoundary } from './components/SentryErrorBoundary';
import { reportWebVitals } from './utils/reportWebVitals';

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