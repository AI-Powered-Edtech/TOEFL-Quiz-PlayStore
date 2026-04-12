/**
 * Guest ID Management Utility
 * 
 * Provides persistent guest identification across sessions using localStorage.
 * Guest IDs are prefixed with "guest_" to distinguish from authenticated user UUIDs.
 */

const GUEST_ID_KEY = 'toeflquiz_guest_id';

/**
 * Gets existing guest ID or creates a new one
 * Format: guest_{timestamp}_{random}
 */
export const getOrCreateGuestId = (): string => {
    let guestId = localStorage.getItem(GUEST_ID_KEY);

    if (!guestId) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 11);
        guestId = `guest_${timestamp}_${random}`;
        localStorage.setItem(GUEST_ID_KEY, guestId);
    }

    return guestId;
};

/**
 * Gets user ID - either from authenticated user or guest
 * @param authUserId - Optional authenticated user ID from auth context
 * @returns User ID (auth UUID or guest ID)
 */
export const getUserId = (authUserId?: string | null): string => {
    return authUserId || getOrCreateGuestId();
};

/**
 * Checks if a user ID is a guest ID
 */
export const isGuestId = (userId: string): boolean => {
    return userId.startsWith('guest_');
};

/**
 * Clears guest ID (useful for testing or logout)
 */
export const clearGuestId = (): void => {
    localStorage.removeItem(GUEST_ID_KEY);
};
