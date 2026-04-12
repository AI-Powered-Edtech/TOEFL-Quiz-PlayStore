
import {
    Bell, Target, Flame, User,
    Play, Zap, ChevronRight, ChevronDown, Sparkles,
    FileText, Lock, Dumbbell, PenTool, Mic, Layers, BookOpen, RotateCcw, Trophy
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { TodaysFocusService } from '../services/todaysFocusService';
import { AppView, SkillType, UserProgress, Skill, SectionType, TodaysFocusResult } from '../types';

interface DashboardProps {
    onStartTodayFocus: (skill: SkillType) => void;
    onStartSkillById: (skillId: number, section: SectionType) => void;
    onNavigate: (view: AppView) => void;
    userProgress: UserProgress;
    userName: string;
    streak: number;
    isGuest: boolean;
    jailCount?: number;
    hasActiveSession?: boolean;
    onResumeSession?: () => void;
    unreadNotifications?: number;
    onOpenNotifications?: () => void;
    userId?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
    onStartTodayFocus,
    onStartSkillById,
    onNavigate,
    userProgress,
    userName,
    streak,
    isGuest,
    jailCount = 0,
    hasActiveSession,
    onResumeSession,
    unreadNotifications,
    onOpenNotifications,
    userId
}) => {
    const [isSkillMenuOpen, setIsSkillMenuOpen] = useState(false);
    const [todaysFocus, setTodaysFocus] = useState<TodaysFocusResult | null>(null);
    const [isLoadingFocus, setIsLoadingFocus] = useState(true);

    // Fetch Today's Focus recommendation
    useEffect(() => {
        const fetchTodaysFocus = async () => {
            setIsLoadingFocus(true);
            try {
                const result = await TodaysFocusService.getRecommendedSkill(userId || '');
                setTodaysFocus(result);
            } catch (error) {
                console.error("Failed to fetch Today's Focus", error);
            } finally {
                setIsLoadingFocus(false);
            }
        };
        fetchTodaysFocus();
    }, [userId]);

    // Dynamic Theme Configuration based on section
    const getThemeConfig = (section: SectionType) => {
        const themes: Record<string, {
            gradient: string;
            shadow: string;
            buttonText: string;
            iconBg: string;
            icon: typeof Target;
        }> = {
            'STRUCTURE': {
                gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #60A5FA 100%)',
                shadow: 'shadow-blue-200/50 hover:shadow-blue-300/50',
                buttonText: 'text-blue-700',
                iconBg: 'bg-blue-700',
                icon: Target
            },
            'LISTENING': {
                gradient: 'linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)',
                shadow: 'shadow-green-200/50 hover:shadow-green-300/50',
                buttonText: 'text-green-700',
                iconBg: 'bg-green-700',
                icon: Mic
            },
            'READING': {
                gradient: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 50%, #A78BFA 100%)',
                shadow: 'shadow-purple-200/50 hover:shadow-purple-300/50',
                buttonText: 'text-purple-700',
                iconBg: 'bg-purple-700',
                icon: BookOpen
            },
            'SPEAKING': {
                gradient: 'linear-gradient(135deg, #DC2626 0%, #EF4444 50%, #F87171 100%)',
                shadow: 'shadow-red-200/50 hover:shadow-red-300/50',
                buttonText: 'text-red-700',
                iconBg: 'bg-red-700',
                icon: Mic
            }
        };
        return themes[section] || themes['STRUCTURE'];
    };

    // Get current theme based on Today's Focus
    const currentTheme = getThemeConfig(todaysFocus?.section || 'STRUCTURE');

    // Get clean skill name (remove "Skill N: " prefix)
    const getCleanSkillName = (skill: Skill): string => {
        if (skill.name.includes(':')) {
            return skill.name.split(':')[1].trim();
        }
        return skill.name;
    };

    const getTimeBasedGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    // Handle starting Today's Focus session with the recommended skill
    const handleStartSession = () => {
        if (todaysFocus?.skill) {
            // Extract numeric skill ID from skill.id (e.g., "S01" -> 1)
            const numericId = parseInt(todaysFocus.skill.id.replace(/\D/g, ''), 10);
            onStartSkillById(numericId, todaysFocus.section);
        } else {
            // Fallback to section-based start
            onStartTodayFocus(SkillType.STRUCTURE);
        }
    };

    return (
        <div data-testid="dashboard" className="w-full h-full flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50/30 to-slate-50">

            {/* --- FIXED HEADER --- */}
            <header data-testid="dashboard-header" className="flex-shrink-0 z-20 pb-2">
                <div className="w-full">
                    {/* 1. Pill Header */}
                    <div className="px-4 pt-4 pb-3">
                        <nav className="flex items-center justify-between gap-3">
                            <button
                                aria-label="Notifications"
                                onClick={onOpenNotifications}
                                className="p-2.5 bg-white rounded-full shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors relative"
                            >
                                <Bell className="w-5 h-5 text-slate-600" />
                                {unreadNotifications && unreadNotifications > 0 && (
                                    <span className="absolute top-2.5 right-3 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                                )}
                            </button>

                            <button className="flex-1 flex items-center justify-center gap-2 bg-white rounded-full px-4 py-2.5 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                                <span className="font-serif font-bold text-slate-800 text-sm tracking-tight">
                                    StreamQuiz AI
                                </span>
                            </button>

                            {/* HIDDEN DEBUG BENCHMARK BUTTON FOR PLAYWRIGHT */}
                            <button id="debug-tts-benchmark" style={{ display: 'none' }} onClick={() => onNavigate(AppView.TTS_BENCHMARK)}>
                                Benchmark
                            </button>

                            <div className="flex items-center gap-2">
                                {streak > 0 && (
                                    <button
                                        onClick={() => onNavigate(AppView.LEADERBOARD)}
                                        className="flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                                        title="View Leaderboard"
                                    >
                                        <Flame className="w-4 h-4 text-orange-500" />
                                        <span className="text-orange-600 font-bold text-sm">{streak}</span>
                                    </button>
                                )}
                                <button
                                    aria-label="Profile Settings"
                                    onClick={() => onNavigate(AppView.PROFILE)}
                                    className="relative p-2 bg-white rounded-full shadow-sm border border-slate-100 hover:shadow-md transition-all"
                                >
                                    <User className="w-5 h-5 text-slate-600" />
                                </button>
                            </div>
                        </nav>
                    </div>

                    {/* 2. Greeting */}
                    <div className="px-5 md:px-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <p data-testid="dashboard-greeting" className="text-slate-500 text-xs md:text-sm font-medium mb-0.5">Let's learn</p>
                                <h1 className="text-xl md:text-2xl font-bold text-slate-900 font-serif">
                                    {userName}
                                </h1>
                            </div>

                            {/* Section Badge - shows current focus section */}
                            {todaysFocus && (
                                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold border border-blue-100">
                                    <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                    <span>{todaysFocus.section}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* --- SCROLLABLE CONTENT --- */}
            <main className="flex-1 overflow-y-auto custom-scrollbar pb-24 px-4 pt-2 md:px-8 md:pt-6">
                <div className="w-full max-w-7xl mx-auto">

                    {/* 3. Resume Banner (if active session) */}
                    {hasActiveSession && onResumeSession && (
                        <div className="mb-4 animate-in fade-in slide-in-from-top-2">
                            <button
                                onClick={onResumeSession}
                                className="w-full bg-slate-800 rounded-[20px] p-4 flex items-center justify-between group shadow-lg shadow-slate-200/50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center animate-pulse">
                                        <RotateCcw className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-white font-bold text-sm">Resume Quiz</h3>
                                        <p className="text-slate-400 text-xs">Continue where you left off</p>
                                    </div>
                                </div>
                                <div className="bg-slate-700 p-2 rounded-full text-white group-hover:bg-blue-600 transition-colors">
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </button>
                        </div>
                    )}

                    {/* 4. Hero Card - Today's Focus */}
                    <div data-testid="todays-focus" className="mb-4">
                        <div
                            onClick={handleStartSession}
                            className={`relative rounded-[24px] p-5 md:p-10 cursor-pointer group overflow-hidden shadow-lg transition-all duration-300 ${currentTheme.shadow}`}
                            style={{
                                background: currentTheme.gradient
                            }}
                        >
                            <div className="absolute top-4 right-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
                            <div className="absolute bottom-0 right-8 w-12 h-12 bg-white/10 rounded-full blur-lg" />

                            {isLoadingFocus ? (
                                // Loading skeleton matched to loaded state height
                                <div className="animate-pulse min-h-[160px] md:min-h-[220px] flex flex-col justify-between">
                                    <div>
                                        <div className="h-4 bg-white/20 rounded-md w-28 mb-4"></div>
                                        <div className="h-8 md:h-12 bg-white/20 rounded-lg w-3/4 mb-3"></div>
                                        <div className="h-4 md:h-6 bg-white/20 rounded-md w-1/2 mb-6"></div>
                                    </div>
                                    <div className="w-32 md:w-48 h-10 md:h-14 bg-white/20 rounded-full mt-auto"></div>
                                </div>
                            ) : (
                                <>
                                    <div className="relative z-10 flex items-start justify-between">
                                        <div className="flex-1 pr-3">
                                            <div className="inline-flex items-center text-white/80 text-[10px] md:text-sm font-bold uppercase tracking-widest mb-1.5 md:mb-3">
                                                TODAY'S FOCUS
                                            </div>
                                            <h2 className="text-white text-lg md:text-4xl font-bold leading-tight mb-1 md:mb-3 font-serif">
                                                {todaysFocus ? getCleanSkillName(todaysFocus.skill) : 'Start Learning'}
                                            </h2>
                                            <p className="text-white/80 text-xs md:text-lg mb-3 md:mb-8 line-clamp-2 leading-relaxed">
                                                {todaysFocus ? (
                                                    <>
                                                        {todaysFocus.accuracy > 0 ? (
                                                            <span className="flex items-center gap-2">
                                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-white font-bold text-sm">
                                                                    {todaysFocus.accuracy}%
                                                                </span>
                                                                {todaysFocus.message}
                                                            </span>
                                                        ) : (
                                                            todaysFocus.message
                                                        )}
                                                    </>
                                                ) : 'Begin your learning journey'}
                                            </p>
                                            <button data-testid="start-session-btn" className={`inline-flex items-center gap-2 bg-white ${currentTheme.buttonText} px-3.5 py-1.5 md:px-8 md:py-4 rounded-full text-xs md:text-lg font-bold shadow-md hover:shadow-lg transition-all group-hover:scale-105`}>
                                                <span>Start session</span>
                                                <div className={`w-4 h-4 md:w-6 md:h-6 ${currentTheme.iconBg} rounded-full flex items-center justify-center`}>
                                                    <Play className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-white fill-white ml-0.5" />
                                                </div>
                                            </button>
                                        </div>
                                        <div className="relative mt-1">
                                            <div className="w-12 h-12 md:w-24 md:h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 shadow-lg">
                                                <currentTheme.icon className="w-6 h-6 md:w-12 md:h-12 text-white" />
                                            </div>
                                            <div className="absolute -bottom-1.5 -left-1.5 flex gap-0.5">
                                                <div className="w-5 h-5 md:w-10 md:h-10 bg-orange-500 rounded-md flex items-center justify-center shadow-md">
                                                    <Zap className="w-3 h-3 md:w-6 md:h-6 text-white fill-white" />
                                                </div>
                                                <div className="w-5 h-5 md:w-10 md:h-10 bg-yellow-400 rounded-md flex items-center justify-center shadow-md">
                                                    <Flame className="w-3 h-3 md:w-6 md:h-6 text-white fill-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative z-10 flex items-center gap-3 mt-3 md:mt-6 pt-2.5 md:pt-4 border-t border-white/20">
                                        <div className="flex items-center gap-1.5 text-white/90 text-[10px] md:text-base">
                                            <div className="w-3.5 h-3.5 md:w-5 md:h-5 rounded-full bg-white/20 flex items-center justify-center">
                                                <Sparkles className="w-2 h-2 md:w-3 md:h-3" />
                                            </div>
                                            <span>{todaysFocus?.section || 'Structure'}</span>
                                        </div>
                                        {todaysFocus?.quizCount ? (
                                            <div className="flex items-center gap-1.5 text-white/90 text-[10px] md:text-base">
                                                <div className="w-3.5 h-3.5 md:w-5 md:h-5 rounded-full bg-white/20 flex items-center justify-center">
                                                    <Target className="w-2 h-2 md:w-3 md:h-3" />
                                                </div>
                                                <span>{todaysFocus.quizCount} quizzes</span>
                                            </div>
                                        ) : null}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>



                    {/* 5. Quick Actions */}
                    <div className="mb-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                            <button
                                data-testid="quick-action-pdf"
                                onClick={() => onNavigate(AppView.PDF_UPLOAD)}
                                className="bg-white p-4 md:p-6 rounded-[20px] border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left group"
                            >
                                <div className="flex items-center gap-3 md:gap-5">
                                    <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                                        <FileText className="w-5 h-5 md:w-8 md:h-8 text-slate-500 group-hover:text-purple-600 transition-colors" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-800 text-sm md:text-xl mb-0.5 md:mb-1">PDF to Quiz</h3>
                                        <p className="text-[11px] md:text-sm text-slate-500 leading-tight line-clamp-2">
                                            Upload & generate
                                        </p>
                                    </div>
                                </div>
                            </button>

                            <button
                                data-testid="quick-action-error-jail"
                                onClick={() => onNavigate(AppView.ERROR_JAIL)}
                                className="bg-white p-4 md:p-6 rounded-[20px] border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left group relative"
                            >
                                {jailCount > 0 && (
                                    <span className="absolute top-2 right-2 md:top-3 md:right-3 bg-orange-500 text-white text-[9px] md:text-xs font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                                        {jailCount}
                                    </span>
                                )}
                                <div className="flex items-center gap-3 md:gap-5">
                                    <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                                        <Lock className="w-5 h-5 md:w-8 md:h-8 text-slate-500 group-hover:text-orange-600 transition-colors" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-800 text-sm md:text-xl mb-0.5 md:mb-1">Error Jail</h3>
                                        <p className="text-[11px] md:text-sm text-slate-500 leading-tight line-clamp-2">
                                            Fix past mistakes
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* 6. Skill Tools Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-slate-800 text-base">Skill Tools</h3>
                            <button
                                onClick={() => onNavigate(AppView.MORE_HUB)}
                                className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
                            >
                                View all <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 pb-4">
                            <button
                                data-testid="skill-tool-writing-gym"
                                onClick={() => onNavigate(AppView.WRITING_GYM)}
                                className="bg-white p-3 md:p-5 md:rounded-[24px] rounded-[20px] border border-slate-100 shadow-sm hover:shadow-md transition-all w-full text-left group"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <Dumbbell className="w-4.5 h-4.5 md:w-6 md:h-6 text-orange-500" />
                                    </div>
                                    <span className="text-[9px] md:text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 md:px-2.5 md:py-0.5 rounded-full">Grammar</span>
                                </div>
                                <h4 className="font-bold text-slate-800 text-xs md:text-base mb-0.5 font-serif group-hover:text-blue-600 transition-colors">Writing Gym</h4>
                                <p className="text-[10px] md:text-xs text-slate-500 leading-tight">Build muscle memory</p>
                            </button>

                            <button
                                data-testid="skill-tool-essay-dojo"
                                onClick={() => onNavigate(AppView.ESSAY_DOJO_HUB)}
                                className="bg-white p-3 md:p-5 md:rounded-[24px] rounded-[20px] border border-slate-100 shadow-sm hover:shadow-md transition-all w-full text-left group"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <PenTool className="w-4.5 h-4.5 md:w-6 md:h-6 text-blue-600" />
                                    </div>
                                    <span className="text-[9px] md:text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 md:px-2.5 md:py-0.5 rounded-full">Writing</span>
                                </div>
                                <h4 className="font-bold text-slate-800 text-xs md:text-base mb-0.5 font-serif group-hover:text-blue-600 transition-colors">Essay Dojo</h4>
                                <p className="text-[10px] md:text-xs text-slate-500 leading-tight">Timed AI grading</p>
                            </button>


                        </div>
                    </div>
                </div>
            </main >


        </div >
    );
};
