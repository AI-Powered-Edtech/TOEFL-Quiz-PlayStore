import {
    ArrowLeft, Trophy, Crown, Medal,
    Users, UserPlus, CircleDot, Copy, Check,
    Flame, Zap, BookOpen, PenTool, FileText,
    Plus, LogIn, X, Loader2, Activity, AlertCircle, RefreshCw
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { circleService } from '../services/circleService';
import { socialService } from '../services/social';
type Friend = any;
import { friendActivityService, FriendActivity } from '../services/friendActivityService';
import { leaderboardService, UnifiedLeaderboardEntry } from '../services/leaderboardService';
import { AppView, Circle } from '../types';

import { CircleDetailView } from './CircleDetailView';

interface SocialHubProps {
    onNavigate: (view: AppView) => void;
    currentUserName: string;
    currentUserId?: string;
}

type TabType = 'leaderboards' | 'friends' | 'circles';

// Format XP for display (e.g. 1200 → "1.2k")
const _formatXp = (xp: number): string => {
    if (xp >= 1000) return (xp / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return xp.toString();
};



export const SocialHub: React.FC<SocialHubProps> = ({ onNavigate, currentUserName, currentUserId }) => {
    const [activeTab, setActiveTab] = useState<TabType>('leaderboards');
    const [leaderboard, setLeaderboard] = useState<UnifiedLeaderboardEntry[]>([]);
    const [myRank, setMyRank] = useState<UnifiedLeaderboardEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
    const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'all'>('all');
    const [copied, setCopied] = useState(false);

    // Circle State
    const [circles, setCircles] = useState<Circle[]>([]);
    const [loadingCircles, setLoadingCircles] = useState(false);
    const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);

    // Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [circleName, setCircleName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [modalError, setModalError] = useState<string | null>(null);
    const [acting, setActing] = useState(false);

    const [friends, setFriends] = useState<Friend[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [addFriendCode, setAddFriendCode] = useState('');
    const [addingFriend, setAddingFriend] = useState(false);
    const [friendError, setFriendError] = useState<string | null>(null);
    const [friendNotice, setFriendNotice] = useState<string | null>(null);
    const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);

    const [friendActivities, setFriendActivities] = useState<FriendActivity[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);

    const [realFriendCode, setRealFriendCode] = useState<string | null>(null);

    // Initial Data Fetch
    useEffect(() => {
        if (currentUserId) {
            socialService.getOrCreateFriendCode(currentUserId).then(setRealFriendCode);
        }
    }, [currentUserId]);

    // Fetch Friends when tab active
    useEffect(() => {
        if (activeTab === 'friends' && currentUserId) {
            fetchFriends();
        }
    }, [activeTab, currentUserId]);

    // Fetch friend activities when friends are loaded
    useEffect(() => {
        if (activeTab === 'friends' && currentUserId && friends.length > 0) {
            const friendIds = friends.map(f => f.friend_id);
            setLoadingActivities(true);
            friendActivityService.fetchFriendActivities(currentUserId, friendIds)
                .then(setFriendActivities)
                .finally(() => setLoadingActivities(false));
        }
    }, [activeTab, currentUserId, friends]);

    const fetchFriends = async () => {
        if (!currentUserId) return;
        setLoadingFriends(true);
        try {
            const data = await socialService.listFriends();
            setFriends(data);
        } catch (e) {
            console.warn(e);
        } finally {
            setLoadingFriends(false);
        }
    };

    const handleAddFriend = async () => {
        if (!addFriendCode.trim()) return;
        if (!currentUserId) {
            setFriendError('Sign in required to add friends.');
            return;
        }
        setAddingFriend(true);
        setFriendError(null);
        try {
            const result = await socialService.addFriend(addFriendCode);
            if (result.ok) {
                setAddFriendCode('');
                fetchFriends(); // refresh list
                setFriendNotice('Friend added successfully.');
            } else {
                setFriendError(result.error || 'Failed to add friend');
            }
        } catch (e) {
            setFriendError('An unexpected error occurred');
            setFriendNotice(null);
        } finally {
            setAddingFriend(false);
        }
    };

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                setLeaderboardError(null);
                const data = await leaderboardService.getUnifiedLeaderboard(timeFilter, 50);
                setLeaderboard(data);

                // Find current user's rank
                if (currentUserId) {
                    const me = data.find(e => e.userId === currentUserId);
                    setMyRank(me || null);
                }
            } catch (error) {
                console.warn('Failed to fetch leaderboard:', error);
                setLeaderboard([]);
                setMyRank(null);
                setLeaderboardError('Ringkasan komunitas belum bisa dimuat. Kamu tetap bisa memakai Social Hub dan lanjut latihan.');
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, [timeFilter, currentUserId]);

    useEffect(() => {
        if (activeTab === 'circles') {
            fetchUserCircles();
        }
    }, [activeTab]);

    const fetchUserCircles = async () => {
        setLoadingCircles(true);
        try {
            const data = await circleService.getUserCircles();
            setCircles(data);
        } catch (error) {
            console.warn('Failed to fetch circles', error);
        } finally {
            setLoadingCircles(false);
        }
    };

    const handleCreateCircle = async () => {
        if (!circleName.trim()) return;
        setActing(true);
        setModalError(null);
        try {
            await circleService.createCircle(circleName);
            setShowCreateModal(false);
            setCircleName('');
            fetchUserCircles();
        } catch (error: any) {
            console.warn('Create circle failed:', error);
            setModalError(`Failed: ${error.message || error.details || 'Unknown error'}`);
        } finally {
            setActing(false);
        }
    };

    const handleJoinCircle = async () => {
        if (!joinCode.trim()) return;
        setActing(true);
        setModalError(null);
        try {
            await circleService.joinCircle(joinCode);
            setShowJoinModal(false);
            setJoinCode('');
            fetchUserCircles();
        } catch (error: any) {
            console.warn('Join circle failed:', error);
            setModalError(`Failed: ${error.message || error.details || 'Unknown error'}`);
        } finally {
            setActing(false);
        }
    };

    if (selectedCircle) {
        return (
            <CircleDetailView
                circle={selectedCircle}
                currentUserId={currentUserId}
                onBack={() => {
                    setSelectedCircle(null);
                    fetchUserCircles();
                }}
                onUpdate={fetchUserCircles}
            />
        );
    }


    const copyFriendCode = () => {
        if (realFriendCode) {
            navigator.clipboard.writeText(realFriendCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const confirmRemoveFriend = async () => {
        if (!friendToRemove) return;
        await socialService.removeFriend(friendToRemove.friend_id);
        setFriendNotice('Friend removed.');
        setFriendToRemove(null);
        fetchFriends();
    };

    const getRankIcon = (index: number) => {
        if (index === 0) return <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />;
        if (index === 1) return <Medal className="w-5 h-5 text-slate-400 fill-slate-300" />;
        if (index === 2) return <Medal className="w-5 h-5 text-amber-700 fill-amber-600" />;
        return <span className="font-bold text-slate-500 w-5 text-center">{index + 1}</span>;
    };

    const tabs = [
        { id: 'leaderboards' as TabType, label: 'Leaderboards', icon: Trophy },
        { id: 'friends' as TabType, label: 'Friends', icon: Users },
        { id: 'circles' as TabType, label: 'Circles', icon: CircleDot },
    ];

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
                            <h1 className="text-2xl font-bold text-white tracking-tight">Social Hub</h1>
                            <p className="text-blue-100 text-xs font-medium opacity-80">Compete, Connect, Conquer</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Main Content (Scrollable) --- */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-28 bg-slate-50 dark:bg-slate-950">

                {/* Gradient Extension behind the tabs */}
                <div
                    className="relative z-0 px-5 pt-2 pb-20 -mt-1 overflow-hidden"
                    style={{ background: 'linear-gradient(180deg, #2563EB 0%, #3B82F6 50%, #60A5FA 100%)' }}
                >
                    {/* Abstract Background Decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500 opacity-[0.05] rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
                </div>

                <div className="relative z-10 -mt-20 px-5">

                    {/* Tab Bar - Floating Card Style */}
                    <div className="flex bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 p-1.5 rounded-2xl relative z-20 mb-6">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 flex flex-col items-center py-3 gap-1 transition-all rounded-xl ${isActive
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? 'fill-indigo-100 dark:fill-indigo-900' : ''}`} />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Content Area */}
                    <div className="space-y-4">

                        {/* Leaderboards Tab */}
                        {activeTab === 'leaderboards' && (
                            <div className="space-y-5">
                                {/* Your Rank Card */}
                                {myRank && (
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />

                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl font-black text-slate-700 dark:text-slate-300">
                                                #{myRank.rank}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate">{myRank.userName} (You)</h3>
                                                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm">
                                                    <span className="flex items-center gap-1 font-medium">
                                                        <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                        {myRank.totalXp.toLocaleString()} XP
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* XP Breakdown */}
                                        <div className="flex gap-2 mt-4">
                                            <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5">
                                                <BookOpen className="w-3.5 h-3.5" /> Quiz: {_formatXp(myRank.quizXp)}
                                            </span>
                                            <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[10px] px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5">
                                                <PenTool className="w-3.5 h-3.5" /> Writing: {_formatXp(myRank.writingXp)}
                                            </span>
                                            <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5">
                                                <FileText className="w-3.5 h-3.5" /> Essay: {_formatXp(myRank.essayXp)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Time Filter */}
                                <div className="flex gap-2 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl">
                                    {(['week', 'month', 'all'] as const).map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setTimeFilter(f)}
                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${timeFilter === f
                                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                                }`}
                                        >
                                            {f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : 'All Time'}
                                        </button>
                                    ))}
                                </div>

                                {/* Rankings */}
                                {leaderboardError && (
                                    <div role="alert" aria-live="polite" className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-900 flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-bold">Ringkasan AI belum tersedia</p>
                                            <p className="text-xs mt-1 text-blue-800">Kami gagal memuat insight AI saat ini, tapi komunitas dan latihan tetap bisa digunakan.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setLoading(true);
                                                setLeaderboardError(null);
                                                try {
                                                    const data = await leaderboardService.getUnifiedLeaderboard(timeFilter, 50);
                                                    setLeaderboard(data);
                                                    if (currentUserId) {
                                                        const me = data.find(e => e.userId === currentUserId);
                                                        setMyRank(me || null);
                                                    }
                                                } catch (error) {
                                                    console.warn('Failed to retry leaderboard:', error);
                                                    setLeaderboard([]);
                                                    setMyRank(null);
                                                    setLeaderboardError('Ringkasan komunitas belum bisa dimuat. Kamu tetap bisa memakai Social Hub dan lanjut latihan.');
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-700 border border-blue-100"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            Coba lagi
                                        </button>
                                    </div>
                                )}

                                {loading ? (
                                    <div className="space-y-3" aria-label="Loading rankings">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm animate-pulse flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
                                                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                                                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                                                </div>
                                                <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
                                            </div>
                                        ))}
                                    </div>
                                ) : leaderboard.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                        <Trophy className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                                        <p className="text-slate-600 dark:text-slate-400 font-medium">No rankings yet</p>
                                        <p className="text-xs mt-1">Complete quizzes to appear here!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {leaderboard.map((entry) => {
                                            const isMe = entry.userId === currentUserId;
                                            const index = entry.rank - 1;
                                            return (
                                                <div
                                                    key={entry.userId}
                                                    className={`relative p-4 rounded-2xl border transition-all flex items-center gap-3 ${isMe
                                                        ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800/30'
                                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                                                        }`}
                                                >
                                                    {/* Rank */}
                                                    <div className="flex flex-col items-center justify-center w-8 shrink-0">
                                                        {getRankIcon(index)}
                                                    </div>

                                                    {/* Avatar */}
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 shadow-sm ${index === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' :
                                                        index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                                                            index === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-600 text-white' :
                                                                isMe ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                                        }`}>
                                                        {entry.userName.charAt(0).toUpperCase()}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className={`font-bold text-sm truncate ${isMe ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                            {entry.userName} {isMe && '(You)'}
                                                        </h3>
                                                        {/* XP Breakdown Pills */}
                                                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                            {entry.quizXp > 0 && (
                                                                <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[9px] px-1.5 py-0.5 rounded md:rounded-full font-bold">
                                                                    Quiz: {_formatXp(entry.quizXp)}
                                                                </span>
                                                            )}
                                                            {entry.writingXp > 0 && (
                                                                <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[9px] px-1.5 py-0.5 rounded md:rounded-full font-bold">
                                                                    W: {_formatXp(entry.writingXp)}
                                                                </span>
                                                            )}
                                                            {entry.essayXp > 0 && (
                                                                <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[9px] px-1.5 py-0.5 rounded md:rounded-full font-bold">
                                                                    E: {_formatXp(entry.essayXp)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Total XP */}
                                                    <div className="text-right shrink-0">
                                                        <div className={`font-bold text-sm ${index === 0 ? 'text-amber-600 dark:text-amber-400' :
                                                            isMe ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                                                            }`}>
                                                            {entry.totalXp.toLocaleString()}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">XP</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Friends Tab */}
                        {activeTab === 'friends' && (
                            <div className="space-y-4">
                                {/* Your Friend Code */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />

                                    <div className="relative z-10">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Your Friend Code</p>
                                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700 dashed">
                                            <span className="font-mono font-bold text-lg tracking-wider text-slate-800 dark:text-slate-200">{realFriendCode || 'Generating...'}</span>
                                            <button
                                                onClick={copyFriendCode}
                                                className="p-2 bg-white dark:bg-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm border border-slate-100 dark:border-slate-600"
                                            >
                                                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-slate-400" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Add Friend */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                                            <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                onChange={(e) => {
                                                    setAddFriendCode(e.target.value.toUpperCase());
                                                    setFriendError(null);
                                                    setFriendNotice(null);
                                                }}
                                                placeholder="ENTER CODE"
                                                disabled={addingFriend}
                                                className="w-full text-sm font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 bg-transparent outline-none uppercase"
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddFriend}
                                            disabled={!addFriendCode.trim() || addingFriend || !currentUserId}
                                            className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-emerald-200 dark:shadow-none"
                                        >
                                            {addingFriend ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                                        </button>
                                    </div>
                                    {friendError && (
                                        <p className="text-xs text-red-500 mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{friendError}</p>
                                    )}
                                    {friendNotice && (
                                        <p role="status" aria-live="polite" className="text-xs text-emerald-600 mt-2 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">{friendNotice}</p>
                                    )}
                                </div>

                                {/* Friends List */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide px-1">My Friends ({friends.length})</h3>

                                    {loadingFriends ? (
                                        <div className="text-center py-10 text-slate-400">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                            Loading friends...
                                        </div>
                                    ) : friends.length === 0 ? (
                                        <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">No friends added yet.</p>
                                            <p className="text-xs text-slate-400 mt-1">Share your code above to connect!</p>
                                        </div>
                                    ) : (
                                        friends.map((friend) => (
                                            <div
                                                key={friend.friend_id}
                                                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
                                            >
                                                <div className="relative">
                                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-lg">
                                                        {friend.profile?.avatar_url ? (
                                                            <img src={friend.profile.avatar_url} alt={friend.profile.full_name || 'Friend'} className="w-full h-full rounded-xl object-cover" />
                                                        ) : (
                                                            (friend.profile?.full_name || 'F').charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate">{friend.profile?.full_name || 'Anonymous'}</h4>
                                                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                                        <span className="flex items-center gap-1 font-medium">
                                                            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                                                            {(friend.profile?.xp || 0).toLocaleString()} XP
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => setFriendToRemove(friend)}
                                                    className="text-slate-300 hover:text-red-500 p-2"
                                                    title="Remove Friend"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Friend Activity Feed */}
                                {loadingActivities ? (
                                    <div className="text-center py-6 text-slate-400">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                                        <span className="text-xs">Loading activities...</span>
                                    </div>
                                ) : friendActivities.length > 0 ? (
                                    <div className="mt-6">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide px-1 mb-3 flex items-center gap-2">
                                            <Activity className="w-4 h-4" />
                                            Recent Activity
                                        </h3>
                                        <div className="space-y-2">
                                            {friendActivities.slice(0, 10).map((activity) => (
                                                <div
                                                    key={activity.id}
                                                    className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-lg">
                                                        {friendActivityService.getActivityIcon(activity)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-slate-700 dark:text-slate-300">
                                                            <span className="font-bold">{activity.friendName === 'You' ? 'You' : activity.friendName}</span>
                                                            {' '}{friendActivityService.getActivityMessage(activity)}
                                                        </p>
                                                        <p className="text-xs text-slate-400">
                                                            {friendActivityService.formatTimeAgo(activity.timestamp)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {/* Circles Tab */}
                        {activeTab === 'circles' && (
                            <div className="space-y-4">
                                {/* Create/Join Actions */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm text-center hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group"
                                    >
                                        <div className="w-10 h-10 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                            <Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Create Circle</span>
                                    </button>
                                    <button
                                        onClick={() => setShowJoinModal(true)}
                                        className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm text-center hover:border-purple-300 dark:hover:border-purple-700 transition-colors group"
                                    >
                                        <div className="w-10 h-10 mx-auto rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                            <LogIn className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Join Circle</span>
                                    </button>
                                </div>

                                {/* My Circles */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide px-1">My Circles ({circles.length})</h3>

                                    {loadingCircles ? (
                                        <div className="text-center py-8 text-slate-400">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                            Loading...
                                        </div>
                                    ) : circles.length === 0 ? (
                                        <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                            <CircleDot className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">You haven't joined any circles yet.</p>
                                            <p className="text-xs text-slate-400 mt-1">Join one or create your own!</p>
                                        </div>
                                    ) : (
                                        circles.map((circle) => (
                                            <div
                                                key={circle.id}
                                                onClick={() => setSelectedCircle(circle)}
                                                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-all hover:shadow-md active:scale-95"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-200">{circle.name}</h4>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">{circle.member_count} members</p>
                                                            <span className="text-slate-300 dark:text-slate-600">•</span>
                                                            <p className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 select-all">
                                                                {circle.code}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                                        {circle.avatar_url ? (
                                                            <img src={circle.avatar_url} alt={circle.name} className="w-full h-full rounded-xl object-cover" />
                                                        ) : (
                                                            circle.name.charAt(0)
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Weekly Challenge */}
                                                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Weekly Goal</span>
                                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{circle.weekly_xp || 0} XP</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                                                            style={{ width: `${Math.min(100, ((circle.weekly_xp || 0) / 5000) * 100)}%` }} // Assuming 5000 XP goal
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {friendToRemove && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="remove-friend-title">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-xl">
                        <h2 id="remove-friend-title" className="text-xl font-bold text-slate-900 dark:text-white mb-2">Remove friend?</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{friendToRemove.profile?.full_name || 'This friend'} will be removed from your friend list.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setFriendToRemove(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200">Cancel</button>
                            <button onClick={confirmRemoveFriend} className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white">Remove</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Circle Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Circle</h2>
                            <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Circle Name</label>
                                <input
                                    type="text"
                                    value={circleName}
                                    onChange={(e) => setCircleName(e.target.value)}
                                    placeholder="e.g. TOEFL Warriors"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none transition-all text-slate-900 dark:text-white"
                                />
                            </div>

                            {modalError && (
                                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{modalError}</p>
                            )}

                            <button
                                onClick={handleCreateCircle}
                                disabled={!currentUserId || !circleName.trim() || acting}
                                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none"
                            >
                                {!currentUserId ? 'Sign in to Create' : (acting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Circle')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Join Circle Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Join Circle</h2>
                            <button onClick={() => setShowJoinModal(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Circle Code</label>
                                <input
                                    type="text"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. AB12CD"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900 outline-none transition-all font-mono uppercase tracking-widest text-center text-lg text-slate-900 dark:text-white"
                                    maxLength={6}
                                />
                                <p className="text-xs text-slate-400 mt-2 text-center">Ask your friend for their 6-digit circle code.</p>
                            </div>

                            {modalError && (
                                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-center">{modalError}</p>
                            )}

                            <button
                                onClick={handleJoinCircle}
                                disabled={!currentUserId || joinCode.length < 6 || acting}
                                className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-purple-200 dark:shadow-none"
                            >
                                {!currentUserId ? 'Sign in to Join' : (acting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Join Circle')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
