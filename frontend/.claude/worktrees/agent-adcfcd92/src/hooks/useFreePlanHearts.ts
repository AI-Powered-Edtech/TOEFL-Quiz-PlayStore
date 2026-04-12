import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';

const FREE_HEARTS_KEY = 'writing_gym_free_hearts';
const LAST_RESET_KEY = 'writing_gym_last_reset';
const MAX_HEARTS = 5; // Adjusted to match free tier limit in most gamification systems

export const useFreePlanHearts = () => {
    const { user, isAuthenticated } = useAuth();
    const [hearts, setHearts] = useState<number>(MAX_HEARTS);
    const [isLoading, setIsLoading] = useState(true);

    const loadHearts = useCallback(async () => {
        setIsLoading(true);
        const today = new Date().toDateString();

        if (isAuthenticated && user?.id) {
            // Load from Supabase for authenticated users
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('hearts_count, last_heart_refill_at')
                    .eq('id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error('Error loading hearts:', error);
                }

                if (data) {
                    if (data.last_heart_refill_at !== today) {
                        // Reset hearts for new day
                        await supabase
                            .from('profiles')
                            .update({ hearts_count: MAX_HEARTS, last_heart_refill_at: today })
                            .eq('id', user.id);
                        setHearts(MAX_HEARTS);
                    } else {
                        setHearts(data.hearts_count ?? MAX_HEARTS);
                    }
                } else {
                    // Profile might not have these columns set yet
                    await supabase
                        .from('profiles')
                        .update({ hearts_count: MAX_HEARTS, last_heart_refill_at: today })
                        .eq('id', user.id);
                    setHearts(MAX_HEARTS);
                }
            } catch (err) {
                console.error('Failed to sync hearts:', err);
                // Fallback to local
                fallbackToLocal(today);
            }
        } else {
            // Fallback to localStorage for guests
            fallbackToLocal(today);
        }
        setIsLoading(false);
    }, [isAuthenticated, user?.id]);

    const fallbackToLocal = (today: string) => {
        const lastReset = localStorage.getItem(LAST_RESET_KEY);
        if (lastReset !== today) {
            localStorage.setItem(FREE_HEARTS_KEY, MAX_HEARTS.toString());
            localStorage.setItem(LAST_RESET_KEY, today);
            setHearts(MAX_HEARTS);
        } else {
            const storedHearts = localStorage.getItem(FREE_HEARTS_KEY);
            if (storedHearts !== null) {
                setHearts(parseInt(storedHearts, 10));
            } else {
                setHearts(MAX_HEARTS);
            }
        }
    };

    useEffect(() => {
        loadHearts();
    }, [loadHearts]);

    const decrementHeart = async () => {
        if (hearts <= 0) return;

        const newHearts = hearts - 1;
        setHearts(newHearts); // Optimistic UI update

        if (isAuthenticated && user?.id) {
            try {
                await supabase
                    .from('profiles')
                    .update({ hearts_count: newHearts })
                    .eq('id', user.id);
            } catch (err) {
                console.error('Failed to save heart deduction:', err);
            }
        } else {
            localStorage.setItem(FREE_HEARTS_KEY, newHearts.toString());
        }
    };

    const isOutOfHearts = hearts <= 0;

    return {
        hearts,
        decrementHeart,
        isOutOfHearts,
        isLoading
    };
};
