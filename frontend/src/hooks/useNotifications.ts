import { useState, useEffect, useCallback } from 'react';

import { socialService } from '../services/social';
import { Notification } from '../types';

export const useNotifications = (userId?: string) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        if (!userId) return;
        try {
            const data = await socialService.getNotifications();
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
            await socialService.markNotificationRead(id);
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
            // await socialService.markAllAsRead(userId);
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
        const intervalId = window.setInterval(() => {
            fetchNotifications();
        }, 30000);

        return () => {
            window.clearInterval(intervalId);
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
