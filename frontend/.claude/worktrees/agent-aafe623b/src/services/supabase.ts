
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/browser';

// Konfigurasi Supabase Anda
// Konfigurasi Supabase Anda
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase URL or Anon Key is missing in environment variables');
}

// Prevent crash if env vars are missing (common in CI or new setups)
// valid URL check is rudimentary but effective for preventing empty string throw
export const supabase = (() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        if (import.meta.env.PROD) {
            throw new Error('CRITICAL: Missing Supabase environment variables in production');
        }
        console.warn('Using placeholder Supabase client - database operations will fail');
        return createClient('https://placeholder.supabase.co', 'placeholder');
    }
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();

// Sentry user context: tie every crash report to the authenticated user.
// Called once on module load; listener fires on login, logout, and token refresh.
supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
        Sentry.setUser({
            id: session.user.id,
            email: session.user.email ?? undefined,
        });
    } else {
        // Clear user context on logout — don't track anonymous sessions
        Sentry.setUser(null);
    }
});


/**
 * Detect if running inside a Capacitor native shell
 */
const isCapacitorNative = (): boolean => {
    return typeof (window as any).Capacitor !== 'undefined' &&
        (window as any).Capacitor.isNativePlatform?.();
};

/**
 * Initiates Google OAuth Sign-In.
 * On web: redirects back to window.location.origin
 * On Capacitor: redirects to the native app's custom URL scheme
 */
export const signInWithGoogle = async () => {
    let redirectUrl = isCapacitorNative()
        ? 'com.toeflquiz.app://login'
        : window.location.origin;

    // Validate redirect URL scheme
    if (!redirectUrl.startsWith('http') && !redirectUrl.startsWith('com.toeflquiz.app')) {
        console.warn(`[Security] Invalid redirect URL scheme: ${redirectUrl}. Falling back to origin.`);
        redirectUrl = window.location.origin;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: isCapacitorNative(), // Let us handle the browser in Capacitor
        },
    });

    // On Capacitor, open the auth URL in the system browser (not the WebView)
    if (isCapacitorNative() && data?.url) {
        window.open(data.url, '_system');
    }

    return { data, error };
};

/**
 * Signs out the current user.
 */
export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
};

import { withTimeout } from '../utils/promiseTimeout';

/**
 * Waits for the Supabase auth session to be fully restored from localStorage.
 * On page reload, the Supabase client needs time to restore the JWT token.
 * This prevents queries from firing before auth is ready.
 * 
 * @param timeoutMs Maximum time to wait for auth (default 10s)
 * @returns The restored session, or null if no session exists (guest user)
 */
export const waitForAuth = async (timeoutMs: number = 10000): Promise<any> => {
    const start = Date.now();

    // First attempt — may succeed immediately if session is already restored
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session;

    // If no session yet, listen for auth state change (session restoration)
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            // Timeout: resolve null (treat as guest)
            cleanup();
            resolve(null);
        }, timeoutMs);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                cleanup();
                resolve(session);
            }
        });

        const cleanup = () => {
            clearTimeout(timeout);
            subscription.unsubscribe();
        };

        // Check again in case session was restored between getSession and listener setup
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (s) {
                cleanup();
                resolve(s);
            }
        });
    });
};

/**
 * Fetches the user's profile from the 'profiles' table.
 * This table is usually populated via a Postgres Trigger on auth.users.
 */
export const getUserProfile = async (userId: string) => {
    try {
        // @ts-ignore
        const result = await withTimeout(
            supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single(),
            10000 + 10000, // 20s: up to ~10s for auth lock release + 10s for query
            'Fetch Profile'
        );

        const { data, error } = result as any;

        if (error) {
            // It's possible the trigger hasn't fired yet or row doesn't exist
            console.warn('Profile not found in DB (yet):', error.message);
            return null;
        }
        return data;
    } catch (e) {
        console.error('Unexpected error fetching profile:', e);
        return null;
    }
};

/**
 * Updates the user's profile.
 */
export const updateProfile = async (userId: string, updates: any) => {
    try {
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (error) {
            console.error('Error updating profile:', error.message);
            return { error };
        }
        return { error: null };
    } catch (e) {
        console.error('Unexpected error updating profile:', e);
        return { error: e };
    }
};

/**
 * Uploads a user's avatar to the 'avatars' storage bucket.
 * Returns the public URL of the uploaded image.
 */
export const uploadAvatar = async (userId: string, file: File) => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (uploadError) {
            console.error('Error uploading avatar:', uploadError);
            return { error: uploadError };
        }

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        return { publicUrl, error: null };
    } catch (e) {
        console.error('Unexpected error uploading avatar:', e);
        return { error: e };
    }
};
