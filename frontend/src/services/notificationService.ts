/**
 * @deprecated Use socialService from './social.ts' instead.
 */
import { Notification } from '../types';
import { apiClient } from './apiClient';

const NOTIFICATIONS_KEY = 'notifications_';

const getNotificationsKey = (userId: string): string => `${NOTIFICATIONS_KEY}${userId}`;

const getLocalNotifications = (userId: string): Notification[] => {
    try {
        const stored = localStorage.getItem(getNotificationsKey(userId));
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveLocalNotifications = (userId: string, notifications: Notification[]): void => {
    localStorage.setItem(getNotificationsKey(userId), JSON.stringify(notifications));
};

export const notificationService = {

    async getNotifications(userId: string): Promise<Notification[]> {
        const notifications = getLocalNotifications(userId);
        return notifications
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 50);
    },

    async markAsRead(notificationId: string): Promise<void> {
        const authResponse = await apiClient.get<{ id?: string; user?: { id?: string } }>('/api/auth/profile');
        if (authResponse.error) return;

        const userId = authResponse.data?.user?.id || authResponse.data?.id;
        if (!userId) return;

        const notifications = getLocalNotifications(userId);
        const index = notifications.findIndex(n => n.id === notificationId);
        
        if (index !== -1) {
            notifications[index] = { ...notifications[index], is_read: true };
            saveLocalNotifications(userId, notifications);
        }
    },

    async markAllAsRead(userId: string): Promise<void> {
        const notifications = getLocalNotifications(userId);
        const updated = notifications.map(n => ({ ...n, is_read: true }));
        saveLocalNotifications(userId, updated);
    },

    async getUnreadCount(userId: string): Promise<number> {
        const notifications = getLocalNotifications(userId);
        return notifications.filter(n => !n.is_read).length;
    },

    async createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>): Promise<void> {
        try {
            const newNotification: Notification = {
                ...notification,
                id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
                is_read: false
            };

            const notifications = getLocalNotifications(notification.user_id);
            notifications.unshift(newNotification);
            
            if (notifications.length > 100) {
                notifications.splice(100);
            }
            
            saveLocalNotifications(notification.user_id, notifications);
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    }
};
