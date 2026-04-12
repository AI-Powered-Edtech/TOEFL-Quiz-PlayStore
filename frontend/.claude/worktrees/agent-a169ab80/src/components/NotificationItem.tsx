import { formatDistanceToNow } from 'date-fns';
import { UserPlus, Star, Trophy, Zap, Info, Check, X, CircleDot } from 'lucide-react';
import React from 'react';

import { Notification } from '../types';

interface NotificationItemProps {
    notification: Notification;
    onRead: (id: string) => void;
    onAction: (notification: Notification, action: string) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRead, onAction }) => {
    const { type, title, message, created_at, is_read } = notification;

    const getIcon = () => {
        switch (type) {
            case 'friend_request': return <UserPlus className="w-5 h-5 text-blue-500" />;
            case 'friend_accept': return <Check className="w-5 h-5 text-green-500" />;
            case 'circle_invite': return <CircleDot className="w-5 h-5 text-purple-500" />;
            case 'leaderboard_overtake': return <Trophy className="w-5 h-5 text-amber-500" />;
            case 'streak_warning': return <Zap className="w-5 h-5 text-red-500" />;
            case 'level_up': return <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />;
            default: return <Info className="w-5 h-5 text-slate-400" />;
        }
    };

    const isActionable = type === 'friend_request' || type === 'circle_invite';

    return (
        <div
            onClick={() => !is_read && onRead(notification.id)}
            className={`p-4 border-b border-slate-100 transition-colors ${is_read ? 'bg-white' : 'bg-blue-50/50'}`}
        >
            <div className="flex gap-3">
                <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${is_read ? 'bg-slate-100' : 'bg-white shadow-sm'}`}>
                    {getIcon()}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-sm ${is_read ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                            {title}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                            {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
                        </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-2">
                        {message}
                    </p>

                    {/* Action Buttons */}
                    {isActionable && (
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAction(notification, 'accept');
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 active:scale-95 transition-all"
                            >
                                Accept
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAction(notification, 'decline');
                                }}
                                className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 active:scale-95 transition-all"
                            >
                                Ignore
                            </button>
                        </div>
                    )}
                </div>
                {!is_read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0 self-center" />
                )}
            </div>
        </div>
    );
};
