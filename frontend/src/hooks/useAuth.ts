import { useState, useEffect } from 'react';
import authService from '../services/auth';
import { useAuthStore } from '../stores/useAuthStore';
import { mergeMasonProgress } from '../services/masonProgressService';

export const useAuth = () => {
    const { user, isAuthenticated, isLoading } = useAuthStore();

    useEffect(() => {
        if (authService.isAuthenticated()) {
            useAuthStore.getState().refreshProfile();
        }
    }, []);

    const login = async (username: string, password: string) => {
        const result = await useAuthStore.getState().login(username, password);
        if (result.ok) {
            const currentUser = useAuthStore.getState().user;
            if (currentUser?.id) {
                await mergeMasonProgress(currentUser.id);
            }
        }
        return result;
    };

    const register = async (username: string, password: string, fullName?: string) => {
        return useAuthStore.getState().register(username, password, fullName);
    };

    const logout = () => {
        useAuthStore.getState().logout();
    };

    const updateProfile = async (updates: { full_name?: string; bio?: string; avatar_url?: string }) => {
        return useAuthStore.getState().updateProfile(updates);
    };

    return {
        user,
        profile: user,
        progress: useAuthStore.getState().progress,
        loading: isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        updateProfile,
    };
};

export default useAuth;
