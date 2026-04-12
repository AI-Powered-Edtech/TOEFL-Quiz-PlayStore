import { Notification } from '../types';

import { supabase } from './supabase';

export const notificationService = {
    /**
     * Fetch recent notifications for a user
     */
    async getNotifications(userId: string): Promise<Notification[]> {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching notifications:', error);
            // Return empty array on error (like table missing) to prevent app crash during dev
            return [];
        }

        return data as Notification[];
    },

    /**
     * Mark a single notification as read
     */
    async markAsRead(notificationId: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) throw error;
    },

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
    },

    /**
     * Get unread count
     */
    async getUnreadCount(userId: string): Promise<number> {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) return 0;
        return count || 0;
    },

    /**
     * Create a new notification
     */
    async createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .insert([notification]);

        if (error) {
            console.error('Error creating notification:', error);
        }
    }
};
