import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, TrendingUp, ChevronRight, ChevronDown } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { writingGymService } from '../../services/writingGymService';
import { LadderHistoryItem } from '../../types';

interface ComplexityLadderHistoryProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ComplexityLadderHistory: React.FC<ComplexityLadderHistoryProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSession, setExpandedSession] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && user?.id) {
            loadHistory();
        }
    }, [isOpen, user]);

    const loadHistory = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const data = await writingGymService.getCompletedLadders(user.id);
            setHistory(data);
        } catch (error) {
            console.error("Failed to load ladder history", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Climb History</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Review your syntax mastery</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                            <p>No climbs completed yet. Start your first climb!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {history.map((session) => (
                                <div key={session.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                    <div
                                        onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">{session.skill_id}</h3>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(session.updated_at).toLocaleDateString()}
                                                </span>
                                                <span className="text-green-600 dark:text-green-400 font-medium">
                                                    Completed
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <div className="text-2xl font-black text-indigo-100 dark:text-indigo-900/30 leading-none">
                                                    {session.history?.length || 0}
                                                </div>
                                                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Levels</div>
                                            </div>
                                            {expandedSession === session.id ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    <AnimatePresence>
                                        {expandedSession === session.id && (
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: 'auto' }}
                                                exit={{ height: 0 }}
                                                className="overflow-hidden bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800"
                                            >
                                                <div className="p-4 space-y-4">
                                                    {session.history && Array.isArray(session.history) ? (
                                                        session.history.map((item: LadderHistoryItem, idx: number) => (
                                                            <div key={idx} className="relative pl-6 pb-2 border-l-2 border-indigo-200 dark:border-indigo-900 last:border-0 last:pb-0">
                                                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white dark:border-slate-900"></div>
                                                                <div className="mb-1 flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                                                                        {item.levelName}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-slate-500 mb-2 italic">
                                                                    "{item.instruction}"
                                                                </div>
                                                                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm text-sm">
                                                                    {item.userSentence}
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-slate-400 italic text-center py-2">No detailed history available for this session.</p>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
