import {
    Lock, Video, User, Settings, LogOut, ChevronRight,
    Crown, Bot, Mic, Swords, Users, FileEdit, Database,
    TrendingUp, Zap, Shield, GraduationCap, Sparkles, ArrowLeft, Trophy, Activity
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { featureFlagService } from '../services/featureFlagService';
import { AppView, UserProgress } from '../types';


interface MoreHubProps {
    onNavigate: (view: AppView) => void;
    onSignOut: () => void;
    user: any;
    progress: UserProgress;
    jailCount?: number;
}

// ----------------------------------------------------------------------
// Component: FeatureCard
// ----------------------------------------------------------------------
interface FeatureCardProps {
    icon: React.ElementType;
    title: string;
    subtitle: string;
    colorClass: string; // e.g., "text-indigo-600 bg-indigo-50"
    onClick: () => void;
    badge?: string | number;
    fullWidth?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, subtitle, colorClass, onClick, badge, fullWidth }) => {
    return (
        <button
            onClick={onClick}
            className={`
                relative flex flex-col items-start p-5
                bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 
                rounded-3xl shadow-sm hover:shadow-md
                transition-all duration-200 active:scale-95
                ${fullWidth ? 'col-span-2' : 'col-span-1'}
            `}
        >
            <div className="flex justify-between w-full mb-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorClass} transition-transform`}>
                    <Icon className="w-6 h-6" />
                </div>
                {badge && (
                    <span className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm animate-pulse">
                        {badge}
                    </span>
                )}
            </div>
            <div className="text-left">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">{title}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-snug">{subtitle}</p>
            </div>
        </button>
    );
};

// ----------------------------------------------------------------------
// Component: MenuItem
// ----------------------------------------------------------------------
interface MenuItemProps {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    iconColor?: string;
    hasArrow?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon: Icon, label, onClick, iconColor = "text-slate-500", hasArrow = true }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center justify-between p-4 active:bg-slate-50 dark:active:bg-slate-800 transition-colors group border-b border-slate-50 dark:border-slate-800 last:border-0"
    >
        <div className="flex items-center gap-4">
            <div className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-800 ${iconColor}`}>
                <Icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        </div>
        {hasArrow && <ChevronRight className="w-4 h-4 text-slate-300" />}
    </button>
);


// ----------------------------------------------------------------------
// Main Component: MoreHub
// ----------------------------------------------------------------------
export const MoreHub: React.FC<MoreHubProps> = ({ onNavigate, onSignOut, user, progress, jailCount = 0 }) => {
    const { t } = useTranslation();



    // Feature Flags & Role State
    const [showMonitor, setShowMonitor] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkFlags = async () => {
            const enabled = await featureFlagService.isEnabled('monitoring_alerts', user?.id);
            setShowMonitor(enabled);

            // Check admin status
            const adminModule = await import('../services/adminService');
            const adminStatus = await adminModule.isCurrentUserAdmin();
            setIsAdmin(adminStatus);
        };
        checkFlags().catch(err => console.error('MoreHub role check failed:', err));
    }, [user?.id]);





    // Calculate Level Progress
    const xpProgress = Math.min(100, ((progress.xp % 500) / 500) * 100);

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            {/* --- Fixed Header --- */}
            <div className="flex-shrink-0 bg-[#2563EB] z-10">
                <div className="px-5 pt-6 pb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onNavigate(AppView.DASHBOARD)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-all active:scale-95"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">More Menu</h1>
                            <p className="text-blue-100 text-xs font-medium opacity-80">Profile, Settings & Tools</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Main Content (Scrollable) --- */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-28 bg-slate-50 dark:bg-slate-950">

                {/* Gradient Extension behind the card */}
                <div
                    className="relative z-0 px-5 pt-2 pb-20 -mt-1 overflow-hidden"
                    style={{ background: 'linear-gradient(180deg, #2563EB 0%, #3B82F6 50%, #60A5FA 100%)' }}
                >
                    {/* Abstract Background Decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500 opacity-[0.05] rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
                </div>

                <div className="relative z-10 -mt-20 px-5">
                    {/* Profile Card Section */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden mb-6">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />

                        <div className="flex items-center gap-4 relative z-10">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl font-black text-slate-700 dark:text-slate-300 shadow-inner">
                                    {user?.name?.[0]?.toUpperCase() || 'G'}
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-amber-400 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white dark:border-slate-900 flex items-center gap-1 shadow-sm">
                                    <Crown className="w-3 h-3" />
                                    {progress.level}
                                </div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white truncate">{user?.name || 'Guest User'}</h2>
                                <div className="mt-2">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                                        <span>Level Progress</span>
                                        <span>{progress.xp} XP</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{ width: `${xpProgress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: AI Power Tools */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('more.ai_studio')}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <FeatureCard
                                icon={Swords}
                                title="Devil's Advocate"
                                subtitle="Challenge logic"
                                colorClass="bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                                onClick={() => onNavigate(AppView.DEVILS_ADVOCATE)}
                            />
                            <FeatureCard
                                icon={TrendingUp}
                                title="Score Oracle"
                                subtitle="Predict band"
                                colorClass="bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400"
                                onClick={() => onNavigate(AppView.ORACLE)}
                            />
                        </div>
                    </div>

                    {/* Section: Essentials */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <Zap className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('more.essentials')}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">


                            <FeatureCard
                                icon={Lock}
                                title="Error Jail"
                                subtitle="Fix mistakes"
                                colorClass="bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                                badge={jailCount > 0 ? jailCount : undefined}
                                onClick={() => onNavigate(AppView.ERROR_JAIL)}
                            />
                            <FeatureCard
                                icon={Database}
                                title="Question Bank"
                                subtitle="Browse database"
                                colorClass="bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                                onClick={() => onNavigate(AppView.BANK)}
                            />
                        </div>
                    </div>

                    {/* Section: Menu List */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <Settings className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('more.preferences')}</span>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <MenuItem
                                icon={User}
                                label="My Profile"
                                onClick={() => onNavigate(AppView.PROFILE)}
                                iconColor="text-slate-600"
                            />
                            <MenuItem
                                icon={Settings}
                                label="Settings"
                                onClick={() => onNavigate(AppView.SETTINGS)}
                                iconColor="text-slate-600"
                            />

                        </div>
                    </div>

                    {/* Sign Out Button */}
                    <button
                        onClick={onSignOut}
                        className="w-full py-4 rounded-2xl border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors active:scale-95"
                    >
                        <LogOut className="w-4 h-4" />
                        {t('more.sign_out')}
                    </button>

                    {/* Footer Brand */}
                    <div className="mt-8 flex flex-col items-center justify-center opacity-40">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Shield className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-500 tracking-widest">TOEFL MASTER AI</span>
                        </div>
                        <p className="text-[10px] text-slate-400">v2.4.0 • Production Build</p>
                    </div>

                </div>
            </div>
        </div>
    );
};