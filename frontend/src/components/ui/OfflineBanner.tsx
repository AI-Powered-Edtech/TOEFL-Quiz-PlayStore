/**
 * OfflineBanner
 * Phase 4: A slim banner shown when the user is offline or reconnecting.
 * Positions at the bottom to avoid interfering with the top app bar.
 */
import { WifiOff, Wifi } from 'lucide-react';
import React from 'react';

interface OfflineBannerProps {
    isOffline: boolean;
    justReconnected: boolean;
    /** Optional message for when offline — e.g. "Some data may be unavailable" */
    offlineMessage?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
    isOffline,
    justReconnected,
    offlineMessage = 'You\'re offline. Showing cached content.',
}) => {
    if (!isOffline && !justReconnected) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={`
                fixed bottom-[calc(5.25rem+var(--sab))] left-1/2 z-40 flex w-full max-w-md -translate-x-1/2 items-center justify-center gap-2
                px-4 py-2.5 text-sm font-semibold
                transition-all duration-300 ease-out
                ${justReconnected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-500 text-white'}
            `}
        >
            {justReconnected ? (
                <>
                    <Wifi className="w-4 h-4 shrink-0" />
                    <span>Back online!</span>
                </>
            ) : (
                <>
                    <WifiOff className="w-4 h-4 shrink-0" />
                    <span>{offlineMessage}</span>
                </>
            )}
        </div>
    );
};
