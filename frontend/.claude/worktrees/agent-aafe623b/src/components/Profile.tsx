
import { BookOpen, Trophy, Flame, Target, Award, Star, ArrowLeft, LogOut, LogIn, Eye, EyeOff, Activity, Upload, Check, Copy, User, ChevronRight } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';


import { friendService } from '../services/friendService';
import { leaderboardService } from '../services/leaderboardService';
import { oracleDataService } from '../services/oracleDataService';
import { oracleService } from '../services/oracleService';
import { uploadAvatar } from '../services/supabase';
import { UserProgress, AppView, ScorePrediction } from '../types';

import { Button } from './Button';

interface ProfileProps {
    user: any;
    progress: UserProgress;
    onNavigate: (view: AppView) => void;
    onSignIn: () => void;
    onSignOut: () => void;
    onUpdateProfile?: (updates: any) => Promise<any>;
    isAuthenticated: boolean;
}

export const Profile: React.FC<ProfileProps> = ({ user, progress, onNavigate, onSignIn, onSignOut, onUpdateProfile, isAuthenticated }) => {

    const [prediction, setPrediction] = useState<ScorePrediction | null>(null);
    const [loadingOracle, setLoadingOracle] = useState(false);
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [bioText, setBioText] = useState(progress.bio || '');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [stats, setStats] = useState({ xp: 0, quizzes: 0, correct: 0, streak: 0 });
    const [friendCode, setFriendCode] = useState<string | null>(null);
    const [codeCopied, setCodeCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setBioText(progress.bio || '');
    }, [progress.bio]);

    useEffect(() => {
        const fetchProfileData = async () => {
            const userId = user?.id || 'guest';
            setLoadingOracle(true);

            try {
                // 1. Prediction (Score Oracle)
                const predictionData = await oracleService.recalculatePrediction(userId);
                setPrediction(predictionData);

                // 2. Stats (XP, Quizzes, Streak)
                if (userId !== 'guest') {
                    // XP from Leaderboard (as requested)
                    const rankData = await leaderboardService.getUserRank(userId);

                    // Detailed Stats from Oracle Aggregation
                    const aggData = await oracleDataService.aggregateUserData(userId);

                    // Calculate Streak
                    const allDates = [
                        ...(aggData.quizDates || []),
                        ...(aggData.gymDates || []),
                        ...(aggData.essayDates || [])
                    ].map(d => new Date(d).toISOString().split('T')[0]); // YYYY-MM-DD

                    const uniqueDates = [...new Set(allDates)].sort().reverse();
                    let streak = 0;
                    if (uniqueDates.length > 0) {
                        const today = new Date().toISOString().split('T')[0];
                        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

                        // Streak is active if activity today or yesterday
                        if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
                            streak = 1;
                            let current = new Date(uniqueDates[0]);
                            for (let i = 1; i < uniqueDates.length; i++) {
                                const prev = new Date(uniqueDates[i]);
                                const diffTime = Math.abs(current.getTime() - prev.getTime());
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                if (diffDays === 1) {
                                    streak++;
                                    current = prev;
                                } else {
                                    break;
                                }
                            }
                        }
                    }

                    setStats({
                        xp: rankData?.totalXp || 0,
                        quizzes: aggData.totalQuizzes || 0,
                        correct: aggData.totalCorrect || 0,
                        streak: streak
                    });
                }
            } catch (err) {
                console.error("Failed to load profile data:", err);
            } finally {
                setLoadingOracle(false);
            }
        };

        fetchProfileData();
    }, [user?.id]);

    useEffect(() => {
        // Load friend code
        if (user?.id) {
            friendService.getOrCreateFriendCode(user.id).then(setFriendCode);
        }
    }, [user?.id]);

    const handleToggleOracle = () => {
        if (onUpdateProfile) {
            const newValue = !progress.show_oracle_score;
            onUpdateProfile({ show_oracle_score: newValue });
        }
    };

    // Mock level calculation for UI visual
    const xpToNext = 500 - (progress.xp % 500);
    const percentToNext = ((progress.xp % 500) / 500) * 100;

    const badgeList = [
        { id: 1, name: 'First Steps', description: 'Completed your first quiz', icon: '🚀', unlocked: progress.totalQuizzes > 0 },
        { id: 2, name: 'On Fire', description: 'reached a 3-day streak', icon: '🔥', unlocked: progress.streak >= 3 }
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Fixed Header */}
            <div className="flex-shrink-0 px-4 py-4 bg-slate-50 z-10">
                <div className="flex items-center pt-2 justify-between">
                    <div className="flex items-center">
                        <button
                            onClick={() => onNavigate(AppView.MORE_HUB)}
                            className="mr-3 p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-blue-50 transition-colors shadow-sm"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-700" />
                        </button>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Your Profile</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {isAuthenticated && (
                            <>
                                <button
                                    onClick={handleToggleOracle}
                                    className={`p-2 rounded-full transition-colors ${progress.show_oracle_score ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-slate-400 hover:bg-slate-100'}`}
                                    title={progress.show_oracle_score ? "Hide Oracle Score" : "Show Oracle Score"}
                                >
                                    {progress.show_oracle_score ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                </button>
                                <button
                                    onClick={onSignOut}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                    title="Sign Out"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 px-4">
                <div className="container mx-auto max-w-2xl">

                    {/* Public Preview Toggle */}
                    {isAuthenticated && (
                        <div className="mb-4 flex justify-end">
                            <button
                                onClick={() => setPreviewMode(!previewMode)}
                                className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${previewMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                            >
                                {previewMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                {previewMode ? 'Viewing as Public' : 'Preview Public Profile'}
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* User Card */}
                        <div className="md:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-blue-600 to-blue-800 opacity-10" />

                            <div className="relative z-10 flex flex-col items-center text-center mt-4">
                                <div className="relative group">
                                    {/* Hidden File Input */}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file && onUpdateProfile && user?.id) {
                                                setUploadingAvatar(true);
                                                const { publicUrl, error } = await uploadAvatar(user.id, file);
                                                if (publicUrl) {
                                                    await onUpdateProfile({ avatar_url: publicUrl });
                                                }
                                                setUploadingAvatar(false);
                                            }
                                        }}
                                    />

                                    {user?.avatarUrl ? (
                                        <img
                                            src={user.avatarUrl}
                                            alt={user.name}
                                            className={`w-24 h-24 rounded-full border-4 border-white shadow-xl mb-4 object-cover ${!previewMode && isAuthenticated ? 'cursor-pointer group-hover:brightness-90 transition-all' : ''}`}
                                            onClick={() => !previewMode && isAuthenticated && fileInputRef.current?.click()}
                                        />
                                    ) : (
                                        <div
                                            className={`w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-xl shadow-blue-900/20 transform rotate-3 ${!previewMode && isAuthenticated ? 'cursor-pointer group-hover:scale-105 transition-transform' : ''}`}
                                            onClick={() => !previewMode && isAuthenticated && fileInputRef.current?.click()}
                                        >
                                            {user?.name?.[0]?.toUpperCase() || <User className="w-8 h-8" />}
                                        </div>
                                    )}

                                    {/* Upload Overlay Icon */}
                                    {!previewMode && isAuthenticated && (
                                        <div
                                            className="absolute bottom-4 right-0 bg-white p-1.5 rounded-full shadow-md border border-slate-100 cursor-pointer hover:bg-slate-50 text-blue-600"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRef.current?.click();
                                            }}
                                        >
                                            {uploadingAvatar ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                                        </div>
                                    )}
                                </div>

                                <h2 className="text-xl font-bold text-slate-800 mb-1">
                                    {user?.name || 'Student'}
                                </h2>

                                <div className="flex items-center gap-2 mb-4">
                                    <p className="text-slate-500 text-sm bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                        {user?.email || 'Guest Account'}
                                    </p>
                                </div>

                                {/* Friend Code */}
                                {isAuthenticated && friendCode && (
                                    <button
                                        className="text-xs font-bold text-indigo-600 flex items-center gap-1.5 hover:text-indigo-700 transition-colors mb-4 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200"
                                        onClick={() => {
                                            navigator.clipboard.writeText(friendCode);
                                            setCodeCopied(true);
                                            setTimeout(() => setCodeCopied(false), 2000);
                                        }}
                                    >
                                        🤝 {friendCode} {codeCopied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                )}

                                {/* Bio Section */}
                                <div className="w-full text-left mb-6">
                                    {isEditingBio && !previewMode ? (
                                        <div className="animate-in fade-in zoom-in-95 duration-200">
                                            <textarea
                                                className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-slate-50 text-slate-700 resize-none"
                                                rows={3}
                                                placeholder="Tell us about yourself..."
                                                value={bioText}
                                                onChange={(e) => setBioText(e.target.value)}
                                                autoFocus
                                            />
                                            <div className="flex gap-2 mt-2 justify-end">
                                                <button
                                                    onClick={() => {
                                                        setIsEditingBio(false);
                                                        setBioText(progress.bio || '');
                                                    }}
                                                    className="text-xs px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (onUpdateProfile) {
                                                            await onUpdateProfile({ bio: bioText });
                                                            setIsEditingBio(false);
                                                        }
                                                    }}
                                                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 font-medium shadow-sm shadow-blue-200"
                                                >
                                                    <Check className="w-3 h-3" /> Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className={`text-sm text-slate-600 italic relative group ${!previewMode && isAuthenticated ? 'cursor-pointer hover:bg-slate-50 p-2 -m-2 rounded-lg transition-colors' : ''}`}
                                            onClick={() => !previewMode && isAuthenticated && setIsEditingBio(true)}
                                        >
                                            {progress.bio ? `"${progress.bio}"` : <span className="text-slate-400 not-italic">No bio yet. Tap to add one.</span>}
                                            {!previewMode && isAuthenticated && (
                                                <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-slate-400">
                                                    <Target className="w-3 h-3" />
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {!isAuthenticated ? (
                                    <div className="w-full space-y-3">
                                        <p className="text-xs text-slate-400 mb-3">Sign in to sync your progress across devices.</p>
                                        <Button onClick={onSignIn} className="w-full bg-slate-900 text-white hover:bg-slate-800 shadow-md">
                                            <LogIn className="w-4 h-4 mr-2" />
                                            Login with Google
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-bold text-slate-500">Level {progress.level}</span>
                                            <span className="text-xs bg-orange-50 text-orange-600 px-2.5 py-1 rounded-lg font-bold border border-orange-200">
                                                Lvl {progress.level}
                                            </span>
                                        </div>
                                        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                                                style={{ width: `${percentToNext}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2 text-right font-medium">
                                            {xpToNext} XP to next level
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="md:col-span-2 space-y-6">
                            {/* ORACLE SCORE CARD — Tappable → Score Oracle */}
                            {progress.show_oracle_score !== false && (
                                <div
                                    className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                                    onClick={() => onNavigate(AppView.ORACLE)}
                                >
                                    <div className="absolute top-0 right-0 p-3 opacity-10">
                                        <Activity className="w-32 h-32" />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="flex items-center font-bold text-lg">
                                                <Activity className="w-5 h-5 mr-2 text-cyan-400" />
                                                Oracle Score Prediction
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                {loadingOracle && <span className="text-xs text-cyan-400 animate-pulse">Updating...</span>}
                                                <ChevronRight className="w-5 h-5 text-white/50" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div className="bg-white/10 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
                                                <div className="text-xs text-slate-300 uppercase tracking-wider mb-1">TOEFL PBT</div>
                                                <div className="text-2xl font-bold text-white">{prediction?.toefl_pbt_score || '-'}</div>
                                            </div>
                                            <div className="bg-white/10 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
                                                <div className="text-xs text-slate-300 uppercase tracking-wider mb-1">TOEFL iBT</div>
                                                <div className="text-2xl font-bold text-cyan-300">{prediction?.toefl_ibt_score || '-'}</div>
                                            </div>
                                            <div className="bg-white/10 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
                                                <div className="text-xs text-slate-300 uppercase tracking-wider mb-1">IELTS</div>
                                                <div className="text-2xl font-bold text-white">{prediction?.ielts_score || '-'}</div>
                                            </div>
                                        </div>

                                        <p className="text-xs text-slate-400 mt-4 text-center flex items-center justify-center gap-1">
                                            Based on {prediction?.data_points || 0} activities. Tap to see breakdown →
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Key Metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1">
                                    <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center mb-2">
                                        <Star className="w-5 h-5 text-yellow-500" />
                                    </div>
                                    <div className="text-xl font-bold text-slate-800">{stats.xp.toLocaleString()}</div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Total XP</div>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1">
                                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center mb-2">
                                        <Flame className="w-5 h-5 text-orange-500" />
                                    </div>
                                    <div className="text-xl font-bold text-slate-800">{stats.streak}</div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Day Streak</div>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                                        <BookOpen className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="text-xl font-bold text-slate-800">{stats.quizzes}</div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Quizzes</div>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1">
                                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-2">
                                        <Target className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div className="text-xl font-bold text-slate-800">{stats.correct}</div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Correct</div>
                                </div>
                            </div>

                            {/* Recent Activity / Achievements */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                                    <Award className="w-5 h-5 mr-3 text-blue-600" />
                                    Achievements
                                </h3>
                                {badgeList.some(b => b.unlocked) ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {badgeList.map(badge => (
                                            <div key={badge.id} className={`p-4 rounded-xl flex items-center gap-3 border ${badge.unlocked ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100 opacity-60 grayscale'}`}>
                                                <div className="text-2xl drop-shadow-sm">{badge.icon}</div>
                                                <div>
                                                    <div className={`text-[10px] font-bold uppercase tracking-wider ${badge.unlocked ? 'text-orange-600' : 'text-slate-400'}`}>
                                                        {badge.unlocked ? 'Unlocked' : 'Locked'}
                                                    </div>
                                                    <div className="text-sm font-bold text-slate-800 leading-tight">{badge.name}</div>
                                                    <div className="text-xs text-slate-500 leading-tight">{badge.description}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <Trophy className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                        <p className="font-medium">Complete quizzes to unlock badges!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
