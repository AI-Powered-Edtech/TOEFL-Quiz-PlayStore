
import { useState, useEffect } from 'react';

import { calculateUserProgress } from '../services/historyService';
import { supabase, getUserProfile, signInWithGoogle, signOut, updateProfile } from '../services/supabase';
import { loggingService } from '../services/loggingService';
import { metricsService } from '../services/metricsService';
import { UserProgress } from '../types';

// Default progress for fallback/initialization
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
    show_oracle_score: true // Default visible for everyone
};

export const useAuth = () => {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Progress state that intelligently merges LocalStorage and DB
    const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);

    useEffect(() => {
        let isMounted = true;
        let initialized = false;

        // 1. Wait for auth initialization to complete (lock release), then fetch profile.
        //    This is the SAFE path — initialize() resolves after the lock is released,
        //    so getSession() and REST queries won't deadlock.
        const initSession = async () => {
            try {
                await supabase.auth.initialize();
                initialized = true;

                const { data: { session } } = await supabase.auth.getSession();

                if (!isMounted) return;

                if (session?.user) {
                    setUser(session.user);
                    loggingService.setUser(session.user.id);
                    metricsService.setUser(session.user.id);
                    await fetchAndSyncProfile(session.user.id);
                } else {
                    loggingService.clearContext();
                    metricsService.clearContext();
                    const local = await calculateUserProgress();
                    if (isMounted) {
                        setProgress(local);
                        setLoading(false);
                    }
                }
            } catch (error: any) {
                if (!isMounted) return;

                // Ignore AbortError caused by React Strict Mode double unmounts
                if (error?.name === 'AbortError' || error?.message?.includes('Fetch is aborted')) {
                    // It's safe to ignore; the second useEffect run will succeed
                    return;
                }

                console.error("Auth initialization failed:", error);

                loggingService.clearContext();
                metricsService.clearContext();

                // Fallback to local/guest mode
                const local = await calculateUserProgress();
                if (isMounted) {
                    setProgress(local);
                    setUser(null);
                    setLoading(false);
                }
            }
        };

        initSession();

        // 2. Listen for auth changes.
        //    CRITICAL: During _initialize(), this callback fires INSIDE the navigator lock.
        //    Making REST queries here (fetchAndSyncProfile → getSession → _acquireLock)
        //    causes a deadlock because the re-entrant lock waits for _initialize() to finish.
        //    We use the `initialized` flag to skip profile fetching during initialization.
        //    initSession() handles the initial profile fetch safely after the lock is released.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                setUser(session.user);
                loggingService.setUser(session.user.id);
                metricsService.setUser(session.user.id);
                // Only fetch profile AFTER initialization is complete (lock released)
                if (initialized && isMounted) {
                    await fetchAndSyncProfile(session.user.id);
                }
            } else {
                if (isMounted) {
                    setUser(null);
                    setProfile(null);
                }
                loggingService.clearContext();
                metricsService.clearContext();
                const local = await calculateUserProgress();
                if (isMounted) {
                    setProgress(local);
                    setLoading(false);
                }
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const fetchAndSyncProfile = async (userId: string) => {
        setLoading(true);
        // A. Fetch from 'profiles' table (Trigger generated)
        const dbProfile = await getUserProfile(userId);

        if (dbProfile) {
            setProfile(dbProfile);

            // B. Map DB Profile to UserProgress
            const dbProgress: UserProgress = {
                ...DEFAULT_PROGRESS,
                xp: dbProfile.xp || 0,
                streak: dbProfile.streak || 0,
                currentStreak: dbProfile.streak || 0,
                level: dbProfile.level || Math.floor((dbProfile.xp || 0) / 500) + 1,
                totalQuizzes: dbProfile.total_quizzes || 0,
                totalCorrect: dbProfile.total_correct || 0,
                show_oracle_score: dbProfile.show_oracle_score !== false // Default true if undefined
            };

            // Merge: DB Profile takes precedence for XP/Streak
            setProgress(prev => ({
                ...prev,
                ...dbProgress,
                // Keep computed stats if not in DB profile
                completedSkills: 0, // Placeholder or fetch real count
            }));
        } else {
            // Fallback if profile row missing (rare race condition with trigger)
            const local = await calculateUserProgress();
            setProgress(local);
        }
        setLoading(false);
    };

    const handleLogin = async () => {
        try {
            const { error } = await signInWithGoogle();
            if (error) {
                throw error;
            }
        } catch (error: any) {
            console.error("Login failed:", error);
            // If the provider is still not enabled, Supabase will return a specific error here
            alert(`Login failed: ${error.message || "Unknown error"}`);
        }
    };

    const handleLogout = async () => {
        await signOut();
    };

    const handleUpdateProfile = async (updates: any) => {
        if (!user) return;

        // Optimistic update
        if (updates.show_oracle_score !== undefined) {
            setProgress(prev => ({ ...prev, show_oracle_score: updates.show_oracle_score }));
        }

        const { error } = await updateProfile(user.id, updates);
        if (error) {
            // Revert if failed (simple implementation: reload profile or just alert)
            console.error("Failed to update profile", error);
            // Ideally revert state here
        }
    };

    return {
        user,
        profile,
        progress,
        loading,
        signInWithGoogle: handleLogin,
        signOut: handleLogout,
        updateProfile: handleUpdateProfile,
        isAuthenticated: !!user
    };
};
