
import { ArrowLeft, Trophy, Crown, Medal, User, Clock, Target } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { getGlobalLeaderboard } from '../services/historyService';
import { AppView, QuizResult } from '../types';

import { Button } from './Button';

interface LeaderboardViewProps {
    onNavigate: (view: AppView) => void;
    currentUserName: string;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onNavigate, currentUserName }) => {
    const [rankings, setRankings] = useState<QuizResult[]>([]);
    const [filter, setFilter] = useState<'all' | 'structure' | 'reading'>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            const data = await getGlobalLeaderboard();
            setRankings(data);
            setLoading(false);
        };
        fetchLeaderboard();
    }, []);

    const filteredRankings = rankings.filter(r => {
        if (filter === 'all') return true;
        return r.section.toLowerCase() === filter;
    });

    const getRankIcon = (index: number) => {
        if (index === 0) return <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />;
        if (index === 1) return <Medal className="w-5 h-5 text-slate-400 fill-slate-300" />;
        if (index === 2) return <Medal className="w-5 h-5 text-amber-700 fill-amber-600" />;
        return <span className="font-bold text-slate-500 w-5 text-center">{index + 1}</span>;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-[#2563EB] px-4 pt-6 pb-12 flex items-center gap-4 shrink-0 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <button 
                    onClick={() => onNavigate(AppView.DASHBOARD)} 
                    className="p-2 hover:bg-white/10 rounded-full transition-colors relative z-10"
                >
                    <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <div className="relative z-10">
                    <h1 className="font-bold text-white text-xl flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-300" />
                        Global Leaderboard
                    </h1>
                    <p className="text-blue-100 text-xs">Competing against 1.2k students today</p>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col -mt-6 relative z-20 rounded-t-3xl bg-slate-50">
                {/* Filter Tabs */}
                <div className="flex p-4 gap-2 overflow-x-auto no-scrollbar">
                    {['all', 'structure', 'reading'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                                filter === f 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'bg-white text-slate-500 border border-slate-200'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-20 space-y-3">
                    {loading ? (
                         <div className="text-center py-10 text-slate-400">Loading rankings...</div>
                    ) : filteredRankings.map((result, index) => {
                        const isMe = result.userName === currentUserName;
                        
                        return (
                            <div 
                                key={result.id} 
                                className={`relative p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                                    isMe 
                                    ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200' 
                                    : 'bg-white border-slate-100 shadow-sm'
                                }`}
                            >
                                <div className="flex flex-col items-center justify-center w-8 shrink-0">
                                    {getRankIcon(index)}
                                </div>

                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                                    isMe ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {result.userName.charAt(0)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className={`font-bold text-sm truncate ${isMe ? 'text-blue-900' : 'text-slate-800'}`}>
                                            {result.userName} {isMe && '(You)'}
                                        </h3>
                                        {index < 3 && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 rounded font-bold">TOP 3</span>}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Target className="w-3 h-3" /> {result.score}%
                                        </span>
                                        <span className="flex items-center gap-1 truncate max-w-[100px]">
                                            <Clock className="w-3 h-3" /> {formatDate(result.date)}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="font-bold text-blue-600 text-sm">+{result.xpEarned} XP</div>
                                    <div className="text-[10px] text-slate-400 font-medium uppercase">{result.section.substring(0,3)}</div>
                                </div>
                            </div>
                        );
                    })}

                    {!loading && filteredRankings.length === 0 && (
                        <div className="text-center py-10 text-slate-400">
                            No records found for this category.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
