import { useState, useEffect, useCallback } from 'react';

import { notificationService } from '../services/notificationService';
import { supabase } from '../services/supabase';
import { Notification } from '../types';

export const useNotifications = (userId?: string) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        if (!userId) return;
        try {
            const data = await notificationService.getNotifications(userId);
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // Mark as read and update local state immediately
    const markAsRead = async (id: string) => {
        if (!userId) return;

        // Optimistic update
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, is_read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            await notificationService.markAsRead(id);
        } catch (error) {
            console.error('Failed to mark as read:', error);
            // Revert on error would go here, but for read status it's low risk
        }
    };

    const markAllAsRead = async () => {
        if (!userId) return;

        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);

        try {
            await notificationService.markAllAsRead(userId);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    // Initial fetch and Realtime Subscription
    useEffect(() => {
        if (!userId) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        fetchNotifications();

        // Subscribe to new notifications
        const subscription = supabase
            .channel(`notifications:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    const newNotification = payload.new as Notification;
                    setNotifications(prev => [newNotification, ...prev]);
                    setUnreadCount(prev => prev + 1);

                    // Optional: Play a sound or show a toast here
                    // if (Notification.permission === 'granted') { ... }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [userId, fetchNotifications]);

    return {
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead
    };
};
