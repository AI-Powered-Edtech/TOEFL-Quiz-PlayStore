/**
 * OfflineBanner
 * Phase 4: A slim banner shown when the user is offline or reconnecting.
 * Positions at the bottom to avoid interfering with the top app bar.
 */
import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';

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
                fixed bottom-[72px] inset-x-0 z-40 flex items-center justify-center gap-2
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
