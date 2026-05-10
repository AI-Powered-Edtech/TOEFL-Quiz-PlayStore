import { Home, BookOpen, Dumbbell, Users, Menu } from 'lucide-react';
import React from 'react';

import { AppView } from '../types';

interface MobileTabBarProps {
    currentView: AppView;
    onNavigate: (view: AppView) => void;
    unreadNotifications?: number;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({ currentView, onNavigate, unreadNotifications }) => {
    const handleTabClick = (tab: 'home' | 'blog' | 'practice' | 'study' | 'more') => {
        if (tab === 'home') {
            onNavigate(AppView.DASHBOARD);
        } else if (tab === 'blog') {
            onNavigate(AppView.BLOG);
        } else if (tab === 'practice') {
            onNavigate(AppView.PRACTICE_HUB);
        } else if (tab === 'study') {
            onNavigate(AppView.SOCIAL_HUB);
        } else {
            onNavigate(AppView.MORE_HUB);
        }
    };

    const isActive = (tab: 'home' | 'blog' | 'practice' | 'study' | 'more') => {
        if (tab === 'home') return currentView === AppView.DASHBOARD;
        if (tab === 'blog') return currentView === AppView.BLOG || currentView === AppView.BLOG_POST;
        if (tab === 'practice') return currentView === AppView.PRACTICE_HUB || [AppView.SIMULATION, AppView.WRITING_GYM, AppView.WRITING, AppView.QUIZ].includes(currentView);
        if (tab === 'study') return currentView === AppView.SOCIAL_HUB || [AppView.VOCAB_HUB, AppView.LEADERBOARD, AppView.PUBLIC_PROFILE].includes(currentView);
        return currentView === AppView.MORE_HUB || [AppView.ERROR_JAIL, AppView.PROFILE, AppView.SETTINGS, AppView.PDF_UPLOAD, AppView.DEVILS_ADVOCATE, AppView.PEER_REVIEW, AppView.ORACLE].includes(currentView);
    };

    const tabs = [
        { id: 'home' as const, label: 'Home', icon: Home },
        { id: 'blog' as const, label: 'Blog', icon: BookOpen },
        { id: 'practice' as const, label: 'Practice', icon: Dumbbell },
        { id: 'study' as const, label: 'Social', icon: Users },
        { id: 'more' as const, label: 'More', icon: Menu },
    ];

    return (
        <nav 
            id="mobile-tab-bar"
            aria-label="Primary navigation"
            className="fixed left-4 right-4 z-50 bg-white/90 backdrop-blur-md shadow-xl shadow-slate-200/50 border border-white/50 rounded-2xl md:left-1/2 md:right-auto md:w-[min(40rem,calc(100vw-2rem))] md:-translate-x-1/2 md:px-6"
            style={{ bottom: 'calc(1rem + var(--sab))' }}
        >
            <div className="px-2 py-3">
                <div className="flex justify-around items-center">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = isActive(tab.id);

                        return (
                            <button
                                key={tab.id}
                                aria-label={tab.label}
                                aria-current={active ? 'page' : undefined}
                                onClick={() => handleTabClick(tab.id)}
                                className={`flex flex-col items-center justify-center p-1 transition-all duration-300 min-w-[56px] min-h-[48px] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 group relative ${active ? 'scale-110' : 'hover:scale-105'}`}
                                data-testid={`tab-${tab.id}`}
                            >
                                {active && (
                                    <div className="absolute inset-0 bg-blue-50/50 rounded-xl blur-sm -z-10"></div>
                                )}

                                <div className={`p-2 rounded-xl transition-all duration-300 mb-0.5 ${active
                                    ? 'bg-blue-100 text-blue-600 shadow-sm'
                                    : 'text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-50'
                                    }`}>
                                    <Icon className={`w-5 h-5 ${active ? 'fill-current' : ''}`} strokeWidth={active ? 2.5 : 2} />
                                </div>

                                {/* Notification Badge - Adjusted position for floating */}
                                {tab.id === 'study' && unreadNotifications && unreadNotifications > 0 && (
                                    <span className="absolute top-1 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white z-10 animate-pulse shadow-sm"></span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
};