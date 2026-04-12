import { useState, useEffect } from 'react';

// Add type mapping for window object
declare global {
    interface Window {
        Capacitor?: any;
    }
}

const isCapacitorNative = () =>
    typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();

export const useNetworkState = () => {
    const [isOnline, setIsOnline] = useState<boolean>(true);

    useEffect(() => {
        // Web listeners (always active)
        const setOnline = () => setIsOnline(true);
        const setOffline = () => setIsOnline(false);

        window.addEventListener('online', setOnline);
        window.addEventListener('offline', setOffline);

        // Set initial state from browser
        setIsOnline(navigator.onLine);

        // Capacitor native listener (dynamic import to avoid bare-specifier errors on web hosts)
        let networkListener: any;
        if (isCapacitorNative()) {
            import('@capacitor/network')
                .then(({ Network }) => {
                    Network.getStatus().then(status => setIsOnline(status.connected));
                    Network.addListener('networkStatusChange', status => {
                        setIsOnline(status.connected);
                    }).then(listener => {
                        networkListener = listener;
                    });
                })
                .catch(() => {
                    // Not available — stick with browser events
                });
        }

        return () => {
            window.removeEventListener('online', setOnline);
            window.removeEventListener('offline', setOffline);
            if (networkListener) networkListener.remove();
        };
    }, []);

    return { isOnline };
};
