/**
 * useOfflineDetection
 * Phase 4: Detects real network connectivity changes and exposes reactive state.
 * Uses both `navigator.onLine` and an actual fetch probe for reliability.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

interface OfflineState {
    /** True if user is currently offline */
    isOffline: boolean;
    /** True if we just came back online (clears after 3s) */
    justReconnected: boolean;
}

const PROBE_URL = 'https://www.gstatic.com/generate_204'; // Google's 204 probe — no content, tiny payload
const PROBE_INTERVAL_MS = 30_000; // Check every 30 seconds while offline

async function checkConnectivity(): Promise<boolean> {
    if (!navigator.onLine) return false;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(PROBE_URL, { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
        clearTimeout(timeoutId);
        // no-cors fetch resolves with opaque response (type='opaque') on success
        return res.type === 'opaque' || res.ok;
    } catch {
        return false;
    }
}

export function useOfflineDetection(): OfflineState {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [justReconnected, setJustReconnected] = useState(false);
    const reconnectedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const probeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const handleOnline = useCallback(async () => {
        const connected = await checkConnectivity();
        if (connected) {
            setIsOffline(false);
            setJustReconnected(true);
            if (reconnectedTimerRef.current) clearTimeout(reconnectedTimerRef.current);
            reconnectedTimerRef.current = setTimeout(() => setJustReconnected(false), 3000);
            // Stop probing once back online
            if (probeIntervalRef.current) {
                clearInterval(probeIntervalRef.current);
                probeIntervalRef.current = null;
            }
        }
    }, []);

    const handleOffline = useCallback(() => {
        setIsOffline(true);
        // Start probing to detect reconnection reliably
        if (!probeIntervalRef.current) {
            probeIntervalRef.current = setInterval(async () => {
                const connected = await checkConnectivity();
                if (connected) handleOnline();
            }, PROBE_INTERVAL_MS);
        }
    }, [handleOnline]);

    useEffect(() => {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check
        checkConnectivity().then(connected => {
            if (!connected) setIsOffline(true);
        });

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (probeIntervalRef.current) clearInterval(probeIntervalRef.current);
            if (reconnectedTimerRef.current) clearTimeout(reconnectedTimerRef.current);
        };
    }, [handleOnline, handleOffline]);

    return { isOffline, justReconnected };
}
