// Network Status Hook
// React hook for monitoring online/offline status

import { useEffect, useState } from 'react';

import { offlineQueue } from '../services/offlineQueue';

export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [wasOffline, setWasOffline] = useState(false);
    const [queueSize, setQueueSize] = useState(0);

    useEffect(() => {
        const handleOnline = async () => {
            console.log('[NetworkStatus] Connection restored');
            setIsOnline(true);
            setWasOffline(true);

            // Process queued operations
            try {
                await offlineQueue.processQueue();
                const size = await offlineQueue.getQueueSize();
                setQueueSize(size);
            } catch (error) {
                console.error('[NetworkStatus] Failed to process queue:', error);
            }

            // Clear the "was offline" flag after 5 seconds
            setTimeout(() => {
                setWasOffline(false);
            }, 5000);
        };

        const handleOffline = async () => {
            console.log('[NetworkStatus] Connection lost');
            setIsOnline(false);

            // Update queue size
            try {
                const size = await offlineQueue.getQueueSize();
                setQueueSize(size);
            } catch (error) {
                console.error('[NetworkStatus] Failed to get queue size:', error);
            }
        };

        // Listen to online/offline events
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Update queue size periodically when offline
        const interval = setInterval(async () => {
            if (!navigator.onLine) {
                try {
                    const size = await offlineQueue.getQueueSize();
                    setQueueSize(size);
                } catch (error) {
                    // Ignore errors
                }
            }
        }, 10000); // Every 10 seconds

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    return { isOnline, wasOffline, queueSize };
}
