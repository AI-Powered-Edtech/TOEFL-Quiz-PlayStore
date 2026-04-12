// Haptic Feedback Utility for Mason
// Provides tactile feedback for mobile devices with graceful web fallback
// Uses dynamic imports to avoid build errors on web

// Check platform without importing Capacitor
const isCapacitorAvailable = () => {
    try {
        // Check if we're in a Capacitor context
        return typeof (window as any).Capacitor !== 'undefined' &&
            (window as any).Capacitor.isNativePlatform?.();
    } catch {
        return false;
    }
};

// Helper to dynamically import Haptics only on native platforms
const getHaptics = async () => {
    if (!isCapacitorAvailable()) return null;

    try {
        // Use a variable for the module name to prevent static analysis from trying to resolve it eagerly
        const moduleName = '@capacitor/haptics';
        const { Haptics, ImpactStyle, NotificationType } = await import(
            /* @vite-ignore */
            moduleName
        );
        return { Haptics, ImpactStyle, NotificationType };
    } catch (e) {
        console.warn('[Haptics] Failed to load Capacitor Haptics:', e);
        return null;
    }
};

export const masonHaptics = {
    /**
     * Light impact - for brick pickup/tap
     */
    async light() {
        const haptics = await getHaptics();
        if (!haptics) return;

        try {
            await haptics.Haptics.impact({ style: haptics.ImpactStyle.Light });
        } catch (e) {
            console.warn('[Haptics] Light impact failed:', e);
        }
    },

    /**
     * Medium impact - for brick placement
     */
    async medium() {
        const haptics = await getHaptics();
        if (!haptics) return;

        try {
            await haptics.Haptics.impact({ style: haptics.ImpactStyle.Medium });
        } catch (e) {
            console.warn('[Haptics] Medium impact failed:', e);
        }
    },

    /**
     * Heavy impact - for errors
     */
    async heavy() {
        const haptics = await getHaptics();
        if (!haptics) return;

        try {
            await haptics.Haptics.impact({ style: haptics.ImpactStyle.Heavy });
        } catch (e) {
            console.warn('[Haptics] Heavy impact failed:', e);
        }
    },

    /**
     * Success notification - for correct answers
     */
    async success() {
        const haptics = await getHaptics();
        if (!haptics) return;

        try {
            await haptics.Haptics.notification({ type: haptics.NotificationType.Success });
        } catch (e) {
            console.warn('[Haptics] Success notification failed:', e);
        }
    },

    /**
     * Warning notification - for wrong answers
     */
    async warning() {
        const haptics = await getHaptics();
        if (!haptics) return;

        try {
            await haptics.Haptics.notification({ type: haptics.NotificationType.Warning });
        } catch (e) {
            console.warn('[Haptics] Warning notification failed:', e);
        }
    },

    /**
     * Error notification - for game over
     */
    async error() {
        const haptics = await getHaptics();
        if (!haptics) return;

        try {
            await haptics.Haptics.notification({ type: haptics.NotificationType.Error });
        } catch (e) {
            console.warn('[Haptics] Error notification failed:', e);
        }
    },

    /**
     * Selection haptic - for power-ups
     */
    async selection() {
        const haptics = await getHaptics();
        if (!haptics) return;

        try {
            await haptics.Haptics.selectionStart();
            setTimeout(async () => {
                await haptics.Haptics.selectionChanged();
                setTimeout(async () => {
                    await haptics.Haptics.selectionEnd();
                }, 50);
            }, 50);
        } catch (e) {
            console.warn('[Haptics] Selection failed:', e);
        }
    }
};
