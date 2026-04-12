
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';
import { supabase } from '../services/supabase';

const sendToAnalytics = (metric: any) => {
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

    // Optionally send to Supabase if enabled
    if (import.meta.env.VITE_ENABLE_PERFORMANCE_LOGGING === 'true') {
        supabase.from('performance_metrics').insert({
            metric_name: metric.name,
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
            id: metric.id,
            navigation_type: metric.navigationType,
            user_agent: navigator.userAgent
        }).then(() => {
            // Silently succeed or fail — vitals are non-critical
        }).catch(() => { });
    }
};

export const reportWebVitals = (onPerfEntry?: (metric: any) => void) => {
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
