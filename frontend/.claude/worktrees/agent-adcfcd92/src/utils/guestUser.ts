/**
 * Utility function to get or generate a persistent guest user ID
 * This ensures guest users have a valid UUID for database operations
 */
export const getGuestUserId = (): string => {
    const GUEST_ID_KEY = 'toefl_guest_user_id';
    let guestId = localStorage.getItem(GUEST_ID_KEY);

    if (!guestId) {
        guestId = crypto.randomUUID();
        localStorage.setItem(GUEST_ID_KEY, guestId);
    }

    return guestId;
};

/**
 * Clear the guest user ID from localStorage
 * Useful for testing or when user wants to start fresh
 */
export const clearGuestUserId = (): void => {
    const GUEST_ID_KEY = 'toefl_guest_user_id';
    localStorage.removeItem(GUEST_ID_KEY);
};
