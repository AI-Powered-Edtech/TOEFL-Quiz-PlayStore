import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Medal, Star, Crown, Users, Calendar, ChevronRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { writingGymProgressService } from '../../services/writingGymProgressService';
import { AppView, LeaderboardEntry } from '../../types';
import { getGuestUserId } from '../../utils/guestUser';
import { Button } from '../Button';

interface MasonLeaderboardProps {
    onNavigate: (view: AppView) => void;
}

type TimeFilter = 'all' | 'weekly' | 'monthly';

export const MasonLeaderboard: React.FC<MasonLeaderboardProps> = ({ onNavigate }) => {
    const { user } = useAuth();
    const userId = user?.id || getGuestUserId();

    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
    const [userRank, setUserRank] = useState<number | null>(null);

    useEffect(() => {
        loadLeaderboard();

        // Auto polling every 30 seconds
        const intervalId = setInterval(() => {
            loadLeaderboard(true);
        }, 30000);

        return () => clearInterval(intervalId);
    }, [timeFilter]);

    const loadLeaderboard = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await writingGymProgressService.getLeaderboard(100);
            const entries: LeaderboardEntry[] = data.map((e, idx) => ({
                rank: idx + 1,
                userId: e.userId,
                userName: e.username,
                score: e.score,
                timeMs: 0,
                stars: 0
            }));
            setEntries(entries);

            const userEntry = data.findIndex(e => e.userId === userId);
            setUserRank(userEntry >= 0 ? userEntry + 1 : null);
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="w-5 h-5 text-amber-400" fill="currentColor" />;
        if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
        if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
        return <span className="text-sm font-bold text-slate-400">#{rank}</span>;
    };

    const getRankStyle = (rank: number): string => {
        if (rank === 1) return 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 shadow-amber-100';
        if (rank === 2) return 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-300';
        if (rank === 3) return 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300';
        return 'bg-white border-slate-200';
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white p-4 pb-6">
                <div className="flex items-center gap-3 mb-4">
                    <button
                        onClick={() => onNavigate(AppView.MORE_HUB)}
                        className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black">Leaderboard</h1>
                        <p className="text-sm opacity-80">The Mason - Top Players</p>
                    </div>
                    <div className="ml-auto">
                        <Trophy className="w-8 h-8 opacity-50" />
                    </div>
                </div>

                {/* Time Filter */}
                <div className="flex gap-2">
                    {(['all', 'weekly', 'monthly'] as TimeFilter[]).map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setTimeFilter(filter)}
                            className={`
                                px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all
                                ${timeFilter === filter
                                    ? 'bg-white text-orange-600 shadow-lg'
                                    : 'bg-white/20 hover:bg-white/30'}
                            `}
                        >
                            {filter === 'all' ? 'All Time' : filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* User Rank Card */}
            {userRank && (
                <div className="mx-4 -mt-4 bg-white rounded-2xl shadow-lg p-4 border-2 border-indigo-200 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-black text-lg">
                            {user?.email?.[0]?.toUpperCase() || 'Y'}
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-slate-800">Your Ranking</div>
                            <div className="text-sm text-slate-500">Keep playing to climb higher!</div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-black text-indigo-600">#{userRank}</div>
                            <div className="text-xs text-slate-400">of {entries.length}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard List */}
            <div className="flex-1 overflow-y-auto p-4 pb-24">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
                    </div>
                ) : entries.length === 0 ? (
                    <div className="text-center py-12">
                        <Trophy className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                        <div className="text-slate-500 font-medium">No entries yet</div>
                        <div className="text-sm text-slate-400">Be the first to play!</div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {entries.map((entry, index) => {
                            const isCurrentUser = entry.userId === userId;
                            return (
                                <motion.div
                                    key={entry.userId}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`
                                        rounded-xl border-2 p-3 transition-all
                                        ${getRankStyle(entry.rank)}
                                        ${isCurrentUser ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Rank */}
                                        <div className="w-10 flex justify-center">
                                            {getRankIcon(entry.rank)}
                                        </div>

                                        {/* Avatar */}
                                        <div className={`
                                            w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                                            ${entry.rank === 1 ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                                                entry.rank === 2 ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
                                                    entry.rank === 3 ? 'bg-gradient-to-br from-orange-400 to-amber-500' :
                                                        'bg-gradient-to-br from-slate-300 to-slate-400'}
                                        `}>
                                            {entry.userName[0]?.toUpperCase() || '?'}
                                        </div>

                                        {/* Name & Stars */}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-800 truncate">
                                                {entry.userName}
                                                {isCurrentUser && <span className="ml-2 text-xs text-indigo-500">(You)</span>}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-amber-500">
                                                {[...Array(Math.min(entry.stars, 5))].map((_, i) => (
                                                    <Star key={i} className="w-3 h-3 fill-current" />
                                                ))}
                                                {entry.stars > 5 && <span>+{entry.stars - 5}</span>}
                                            </div>
                                        </div>

                                        {/* Score */}
                                        <div className="text-right">
                                            <div className="text-lg font-black text-slate-700">{entry.score.toLocaleString()}</div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">XP</div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Bottom CTA */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white dark:from-slate-900 dark:via-slate-900">
                <Button
                    onClick={() => onNavigate(AppView.WRITING_GYM_LEVEL_1)}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                    Play The Mason <ChevronRight className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
};
