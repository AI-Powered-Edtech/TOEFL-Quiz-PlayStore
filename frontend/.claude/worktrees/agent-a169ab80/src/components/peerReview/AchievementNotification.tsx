import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Award, Zap, TrendingUp, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export interface Achievement {
    id: string;
    type: 'xp' | 'tier' | 'milestone' | 'streak';
    title: string;
    message: string;
    xp?: number;
    icon?: React.ReactNode;
}

interface AchievementNotificationProps {
    achievement: Achievement | null;
    onClose: () => void;
}

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({ achievement, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (achievement) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [achievement, onClose]);

    if (!achievement) return null;

    const getIcon = () => {
        if (achievement.icon) return achievement.icon;

        switch (achievement.type) {
            case 'xp':
                return <Zap className="w-6 h-6" />;
            case 'tier':
                return <Trophy className="w-6 h-6" />;
            case 'milestone':
                return <Award className="w-6 h-6" />;
            case 'streak':
                return <TrendingUp className="w-6 h-6" />;
            default:
                return <Star className="w-6 h-6" />;
        }
    };

    const getColorClasses = () => {
        switch (achievement.type) {
            case 'xp':
                return 'from-yellow-500 to-orange-500';
            case 'tier':
                return 'from-purple-500 to-pink-500';
            case 'milestone':
                return 'from-blue-500 to-cyan-500';
            case 'streak':
                return 'from-green-500 to-emerald-500';
            default:
                return 'from-indigo-500 to-purple-500';
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -100, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -50, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full mx-4"
                >
                    <div className={`bg-gradient-to-r ${getColorClasses()} p-1 rounded-2xl shadow-2xl`}>
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 flex items-center gap-4">
                            <motion.div
                                initial={{ rotate: -180, scale: 0 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                className={`w-12 h-12 rounded-full bg-gradient-to-br ${getColorClasses()} flex items-center justify-center text-white flex-shrink-0 shadow-lg`}
                            >
                                {getIcon()}
                            </motion.div>

                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-1">
                                    {achievement.title}
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {achievement.message}
                                </p>
                                {achievement.xp && (
                                    <div className="flex items-center gap-1 mt-2">
                                        <Zap className="w-3 h-3 text-yellow-500" />
                                        <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
                                            +{achievement.xp} XP
                                        </span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    setIsVisible(false);
                                    setTimeout(onClose, 300);
                                }}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
                            >
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Sparkle effects */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="absolute -top-2 -right-2 text-yellow-400"
                    >
                        ✨
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1, delay: 0.3, repeat: Infinity }}
                        className="absolute -bottom-2 -left-2 text-yellow-400"
                    >
                        ✨
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Hook to manage achievement queue
export const useAchievements = () => {
    const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
    const [queue, setQueue] = useState<Achievement[]>([]);

    useEffect(() => {
        if (!currentAchievement && queue.length > 0) {
            setCurrentAchievement(queue[0]);
            setQueue(prev => prev.slice(1));
        }
    }, [currentAchievement, queue]);

    const showAchievement = (achievement: Achievement) => {
        setQueue(prev => [...prev, achievement]);
    };

    const closeAchievement = () => {
        setCurrentAchievement(null);
    };

    return {
        currentAchievement,
        showAchievement,
        closeAchievement
    };
};
