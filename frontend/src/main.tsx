import * as Sentry from '@sentry/react';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { SentryErrorBoundary } from './components/SentryErrorBoundary';
import { reportWebVitals } from './utils/reportWebVitals';
import { secureStorage } from './utils/secureStorage';

// TEMPORARY TOKEN INJECT FOR QA
const tempToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIyOTM0YTFhMC1mMDNlLTQ5MDAtOTU0ZS0zZDAxYTljNTI2MmIiLCJyb2xlIjoidXNlciIsInRva2VuX3R5cGUiOiJhY2Nlc3MiLCJleHAiOjE3NzYwNTc3ODYsImlhdCI6MTc3NjA1Njg4Nn0.V51ZEsIsCXOA2V5P7zA9h1aAJugAxDBkGcdmom-OO_k';
secureStorage.setItem('access_token', tempToken);

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