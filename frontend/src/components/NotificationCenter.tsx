import { ArrowLeft, CheckCheck, Bell } from 'lucide-react';
import React, { useEffect } from 'react';

import { useNotifications } from '../hooks/useNotifications';
import { circleService } from '../services/circleService';
import { socialService } from '../services/social';
import { AppView, Notification } from '../types';

import { NotificationItem } from './NotificationItem';


interface NotificationCenterProps {
    onNavigate: (view: AppView) => void;
    userId?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigate, userId }) => {
    const [notice, setNotice] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const showNotice = (type: 'success' | 'error', text: string) => {
        setNotice({ type, text });
        window.setTimeout(() => setNotice(null), 3000);
    };

    const {
        notifications,
        loading,
        markAsRead,
        markAllAsRead
    } = useNotifications(userId);

    const handleAction = async (notification: Notification, action: string) => {
        try {
            if (notification.type === 'friend_request') {
                const requesterId = notification.data?.senderId; // Assuming data structure
                if (!requesterId) return;

                if (action === 'accept') {
                    await socialService.respondToRequest(requesterId, true);
                    showNotice('success', 'Friend request accepted.');
                } else {
                    await socialService.respondToRequest(requesterId, false);
                }
            } else if (notification.type === 'circle_invite') {
                const circleCode = notification.data?.circleCode;
                if (!circleCode) return;

                if (action === 'accept') {
                    await circleService.joinCircle(circleCode);
                    showNotice('success', 'Joined circle.');
                    onNavigate(AppView.SOCIAL_HUB);
                }
            }

            // Always mark as read after action
            markAsRead(notification.id);
        } catch (error) {
            console.error('Action failed:', error);
            showNotice('error', 'Failed to process action.');
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 flex items-center justify-between shrink-0 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        aria-label="Back to home"
                        onClick={() => onNavigate(AppView.DASHBOARD)}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </button>
                    <h1 className="font-bold text-lg text-slate-800 dark:text-slate-100">Notifications</h1>
                </div>

                {notifications.some(n => !n.is_read) && (
                    <button
                        type="button"
                        aria-label="Mark all notifications as read"
                        onClick={() => markAllAsRead()}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Mark all as read"
                    >
                        <CheckCheck className="w-5 h-5" />
                    </button>
                )}
            </div>

            {notice && (
                <div role="status" aria-live="polite" className={`mx-4 mt-3 rounded-xl px-4 py-3 text-sm font-semibold ${notice.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {notice.text}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4"></div>
                        <p>Memuat notifikasi...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 px-8 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Bell className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="font-bold text-slate-600 text-lg mb-1">Semua beres!</h3>
                        <p className="text-sm">Belum ada notifikasi baru saat ini.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 bg-white">
                        {notifications.map(notification => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onRead={markAsRead}
                                onAction={handleAction}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
