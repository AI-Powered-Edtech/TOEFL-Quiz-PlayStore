import { create } from 'zustand';
import authService, { Profile } from '../services/auth';
import { UserProgress } from '../types';
import { trackEmailLogin, trackEmailRegister, trackLogout, trackGuestLogin } from '../utils/authAnalytics';
import { secureStorage } from '../utils/secureStorage';
import { clearTierCache } from '../services/subscriptionService';

interface AuthStore {
    user: Profile | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    progress: UserProgress;
    unreadCount: number;
    login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
    register: (username: string, password: string, fullName?: string) => Promise<{ ok: boolean; error?: string }>;
    logout: () => void;
    refreshProfile: () => Promise<void>;
    updateProfile: (updates: { full_name?: string; bio?: string; avatar_url?: string }) => Promise<{ ok: boolean; error?: string }>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => void;
    deleteAccount: () => Promise<{ ok: boolean; error?: string }>;

    setAuthState: (state: Partial<Omit<AuthStore, 'setAuthState' | 'login' | 'register' | 'logout' | 'refreshProfile' | 'updateProfile' | 'signInWithGoogle' | 'signOut' | 'deleteAccount'>>) => void;
}

const DEFAULT_PROGRESS: UserProgress = {
    completedSkills: 0,
    totalSkills: 60,
    streak: 0,
    level: 1,
    xp: 0,
    currentStreak: 0,
    totalQuizzes: 0,
    totalCorrect: 0,
    unlockedBadges: [],
};

export const useAuthStore = create<AuthStore>((set, get) => ({
    user: null,
    isAuthenticated: !!secureStorage.getItem('access_token'),
    isLoading: false,
    progress: DEFAULT_PROGRESS,
    unreadCount: 0,

    login: async (username: string, password: string) => {
        set({ isLoading: true });
        try {
            const result = await authService.login({ username, password });
            if (result.ok) {
                const profile = await authService.getProfile();
                set({
                    user: profile,
                    isAuthenticated: true,
                    isLoading: false,
                    progress: profile ? {
                        ...DEFAULT_PROGRESS,
                        xp: profile.xp,
                    } : DEFAULT_PROGRESS,
                });
                await trackEmailLogin(true, profile?.id);
            } else {
                await trackEmailLogin(false);
                set({ isLoading: false });
            }
            return result;
        } catch (error) {
            await trackEmailLogin(false);
            set({ isLoading: false });
            return { ok: false, error: 'Network error' };
        }
    },

    register: async (username: string, password: string, fullName?: string) => {
        set({ isLoading: true });
        try {
            const result = await authService.register({ username, password, full_name: fullName });
            if (result.ok) {
                const profile = await authService.getProfile();
                set({
                    user: profile,
                    isAuthenticated: true,
                    isLoading: false,
                    progress: profile ? {
                        ...DEFAULT_PROGRESS,
                        xp: profile.xp,
                    } : DEFAULT_PROGRESS,
                });
                await trackEmailRegister(true, profile?.id);
            } else {
                await trackEmailRegister(false);
                set({ isLoading: false });
            }
            return result;
        } catch (error) {
            await trackEmailRegister(false);
            set({ isLoading: false });
            return { ok: false, error: 'Network error' };
        }
    },

    logout: () => {
        const userId = get().user?.id;
        authService.logout();
        clearTierCache();
        set({
            user: null,
            isAuthenticated: false,
            progress: DEFAULT_PROGRESS,
        });
        if (userId) {
            trackLogout(userId);
        }
    },

    signInWithGoogle: async () => {
        const redirectUri = `${window.location.origin}/auth/callback`;
        const oauthData = await authService.initOAuth(redirectUri);
        if (oauthData) {
            sessionStorage.setItem('oauth_state', oauthData.state);
            window.location.href = oauthData.auth_url;
        } else {
            console.warn('[AuthStore] Failed to init OAuth');
        }
    },

    signOut: () => {
        get().logout();
    },

    deleteAccount: async () => {
        set({ isLoading: true });
        try {
            const result = await authService.deleteAccount();
            if (result.ok) {
                clearTierCache();
                set({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    progress: DEFAULT_PROGRESS,
                    unreadCount: 0,
                });
            } else {
                set({ isLoading: false });
            }
            return result;
        } catch (error) {
            set({ isLoading: false });
            return { ok: false, error: 'Network error' };
        }
    },

    refreshProfile: async () => {
        if (!authService.isAuthenticated()) return;
        set({ isLoading: true });
        try {
            const profile = await authService.getProfile();
            if (profile) {
                set({
                    user: profile,
                    isAuthenticated: true,
                    isLoading: false,
                    progress: {
                        ...get().progress,
                        xp: profile.xp,
                    },
                });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            set({ isLoading: false });
        }
    },

    updateProfile: async (updates) => {
        const result = await authService.updateProfile(updates);
        if (result.ok) {
            await get().refreshProfile();
        }
        return result;
    },

    setAuthState: (state) => set(state),
}));


let authSessionListenerStarted = false;

export const initAuthSessionListener = () => {
    if (authSessionListenerStarted || typeof window === 'undefined') return;
    authSessionListenerStarted = true;
    window.addEventListener('auth:session_expired', () => {
        clearTierCache();
        useAuthStore.setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            progress: DEFAULT_PROGRESS,
            unreadCount: 0,
        });
    });
};

initAuthSessionListener();
