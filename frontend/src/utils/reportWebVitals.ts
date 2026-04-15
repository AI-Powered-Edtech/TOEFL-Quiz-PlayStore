import { Metric, onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

import api from '../services/apiClient';

const sendToAnalytics = (metric: Metric) => {
    const body = JSON.stringify(metric);
    const url = import.meta.env.VITE_ANALYTICS_ENDPOINT;

    // If we have an analytics endpoint, send it there
    if (url && navigator.sendBeacon) {
        navigator.sendBeacon(url, body);
    }

    // Log to console in dev (debug level, only non-good ratings to reduce noise)
    if (import.meta.env.DEV && metric.rating !== 'good') {
        console.debug('[Web Vitals]', metric);
    }

    if (import.meta.env.VITE_ENABLE_PERFORMANCE_LOGGING === 'true') {
        api.post('/api/monitoring/metrics/batch', [{
            metric_name: metric.name,
            metric_value: metric.value,
            unit: null,
            component: 'web_vitals',
            tags: {
                rating: metric.rating,
                delta: metric.delta,
                id: metric.id,
                navigation_type: metric.navigationType,
                user_agent: navigator.userAgent,
            }
        }], { timeout: 3000 }).catch(() => {});
    }
};

export const reportWebVitals = (onPerfEntry?: (metric: Metric) => void) => {
    if (onPerfEntry && onPerfEntry instanceof Function) {
        onCLS(onPerfEntry);
        onINP(onPerfEntry);
        onLCP(onPerfEntry);
        onFCP(onPerfEntry);
        onTTFB(onPerfEntry);
    } else {
        // Default behavior
        onCLS(sendToAnalytics);
        onINP(sendToAnalytics);
        onLCP(sendToAnalytics);
        onFCP(sendToAnalytics);
        onTTFB(sendToAnalytics);
    }
};
