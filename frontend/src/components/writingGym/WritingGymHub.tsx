import {
    Dumbbell, Lock, Star, Trophy,
    ArrowRight, BookOpen, PenTool,
    Puzzle, Target, ArrowLeft, Grid, Swords, TrendingUp, Zap,
    House, Brain, DraftingCompass, BarChart2, FileText, ChevronRight, Play, AlertCircle
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { getNextLogicWeaverSkill } from '../../data/logicWeaverSkills';
import { getMasonSkill } from '../../data/masonSkills';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { isIELTSParagraphEnabled } from '../../services/featureFlagService';
import { getTotalStars, getNextSkill } from '../../services/masonProgressService';
import { writingGymService } from '../../services/writingGymService';
import { WritingGymLevel, WritingGymProgress, AppView } from '../../types';
import { getGuestUserId } from '../../utils/guestUser';
import { Button } from '../Button';
import { FeatureFlagGuard } from '../FeatureFlagGuard';
import PaywallSheet from '../PaywallSheet';
import { useToast } from '../ui/Toast';

import { ComplexityLadderHistory } from './ComplexityLadderHistory';
import { LogicWeaverSkillPicker } from './LogicWeaverSkillPicker';
import { MasonSkillPicker } from './MasonSkillPicker';


interface WritingGymHubProps {
    onNavigate: (view: AppView) => void;
    onBack: () => void;
}

export const WritingGymHub: React.FC<WritingGymHubProps> = ({ onNavigate, onBack }) => {
    const { user, isAuthenticated } = useAuth();
    const userId = user?.id || getGuestUserId();
    const toast = useToast();
    const { tier, isPaid } = useSubscription();

    const [progress, setProgress] = useState<WritingGymProgress[]>([]);
    const [unlockedLevels, setUnlockedLevels] = useState<WritingGymLevel[]>(['mason']);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showPaywall, setShowPaywall] = useState(false);

    // Mason State
    const [showSkillPicker, setShowSkillPicker] = useState(false);
    const [masonTotalStars, setMasonTotalStars] = useState(0);
    const [nextMasonSkill, setNextMasonSkill] = useState<any>(null);

    // Logic Weaver State
    const [showLWSkillPicker, setShowLWSkillPicker] = useState(false);
    const [lwTotalStars, setLwTotalStars] = useState(0);
    const [nextLWSkill, setNextLWSkill] = useState<any>(null);

    // IELTS Paragraph State
    const [esTotalStars, setEsTotalStars] = useState(0);

    // Complexity Ladder Stats
    const [laddersClimbed, setLaddersClimbed] = useState(0);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        // Automatically unlock all levels for testing/demo purposes
        setUnlockedLevels(['mason', 'logic_weaver', 'ielts_paragraph', 'complexity_ladder']);
        
        if (isAuthenticated) {
            loadProgress();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const loadProgress = async () => {
        try {
            setError(null);
            const data = await writingGymService.getProgress(userId);
            setProgress(data);

            // Unlock all levels for now
            const unlocked: WritingGymLevel[] = ['mason', 'logic_weaver', 'ielts_paragraph', 'complexity_ladder'];
            setUnlockedLevels(unlocked);

            const [totalStars, nextSkill] = await Promise.all([
                getTotalStars(userId),
                getNextSkill(userId)
            ]);
            setMasonTotalStars(totalStars);
            setNextMasonSkill(nextSkill);

            const lwProgress = data.filter(p => p.level === 'logic_weaver');
            const lwStars = lwProgress.reduce((sum, p) => sum + p.stars_earned, 0);
            const lwCompleted = lwProgress.length;
            const nextLW = getNextLogicWeaverSkill(lwCompleted);

            setLwTotalStars(lwStars);
            setNextLWSkill(nextLW);

            const esProgress = data.filter(p => p.level === 'ielts_paragraph');
            const esStars = esProgress.reduce((sum, p) => sum + p.stars_earned, 0);

            setEsTotalStars(esStars);

            const ladders = data.filter(p => p.level === 'complexity_ladder');
            setLaddersClimbed(ladders.length);

        } catch (error) {
            console.error('Failed to load gym progress', error);
            setError('Failed to load training progress. Please try again.');
            toast.error('Could not load your progress. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const TrainingProgramItem = ({
        title,
        description,
        icon: Icon,
        stars,
        colorClass,
        bgClass,
        onClick,
        locked = false
    }: {
        title: string,
        description: string,
        icon: any,
        stars: number,
        colorClass: string,
        bgClass: string,
        onClick: () => void,
        locked?: boolean
    }) => (
        <div
            onClick={locked ? undefined : onClick}
            className={`bg-white dark:bg-[#1E1E1E] rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-slate-100 dark:border-slate-800 transition-transform ${locked ? 'opacity-60 cursor-not-allowed grayscale' : 'active:scale-[0.98] cursor-pointer'}`}
        >
            <div className={`w-12 h-12 rounded-xl ${bgClass} flex items-center justify-center flex-shrink-0 relative`}>
                {locked ? (
                    <Lock className="w-6 h-6 text-slate-400" />
                ) : (
                    <Icon className={`w-6 h-6 ${colorClass}`} />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-white truncate">{title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {locked ? "Complete previous level with 3+ stars to unlock" : description}
                </p>
                {!locked && (
                    <div className="flex items-center gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={`w-3 h-3 ${star <= (stars % 5 === 0 && stars > 0 ? 5 : stars % 5) // Simplistic star viz for now
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-200 dark:text-slate-700'
                                    }`}
                            />
                        ))}
                    </div>
                )}
            </div>
            {!locked && <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />}
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-[#F5F7FA] dark:bg-black font-sans">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 bg-white dark:bg-black sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
                <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
                    <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </Button>
                <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">Writing Gym</h1>
                    <Dumbbell className="w-5 h-5 text-blue-600" />
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHistory(true)}
                    className="text-blue-600 font-semibold text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                    History
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-24 space-y-6">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-800/50 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={loadProgress} className="ml-4 shrink-0 bg-white dark:bg-slate-800 dark:text-red-400 dark:border-red-800">
                            Retry
                        </Button>
                    </div>
                )}

                {/* Current Focus Card */}
                {loading ? (
                    <div className="bg-blue-600/50 rounded-3xl p-6 shadow-sm border border-blue-500/20 animate-pulse min-h-[220px] flex flex-col justify-between">
                        <div>
                            <div className="h-5 bg-white/20 rounded w-28 mb-6"></div>
                            <div className="h-8 bg-white/20 rounded-lg w-3/4 mb-3"></div>
                            <div className="h-4 bg-white/20 rounded w-full mb-2"></div>
                            <div className="h-4 bg-white/20 rounded w-4/5"></div>
                        </div>
                        <div className="h-12 bg-white/20 rounded-xl w-full mt-6"></div>
                    </div>
                ) : (
                    <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-200 dark:shadow-none relative overflow-hidden">
                        {/* Background decorations */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/30 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-blue-500/50 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-blue-400/30">
                                    Current Focus
                                </span>
                                {nextMasonSkill?.id && (
                                    <span className="text-blue-100 text-sm font-medium">
                                        Level {nextMasonSkill.id.replace(/\D/g, '')}
                                    </span>
                                )}
                            </div>

                            <h2 className="text-2xl font-bold mb-2">
                                {nextMasonSkill ? nextMasonSkill.name : "The Mason"}
                            </h2>
                            <p className="text-blue-100 text-sm mb-6 leading-relaxed opacity-90">
                                {nextMasonSkill
                                    ? "Pick up where you left off building strong sentence foundations."
                                    : "Start your journey to better writing."}
                            </p>

                            <Button
                                variant="secondary"
                                onClick={() => {
                                    if (nextMasonSkill?.id) {
                                        localStorage.setItem('mason_current_skill', nextMasonSkill.id);
                                    }
                                    onNavigate(AppView.WRITING_GYM_LEVEL_1);
                                }}
                                className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold h-12 rounded-xl border-none shadow-sm flex items-center justify-center gap-2"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                Continue Practice
                            </Button>
                        </div>
                    </div>
                )}

                {/* Training Programs */}
                <div>
                    <div className="flex justify-between items-end mb-3">
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">Training Programs</h3>
                        <span className="text-xs text-slate-500 font-medium">View All</span>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            <>
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-slate-100 dark:border-slate-800 animate-pulse h-[82px]">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0"></div>
                                        <div className="flex-1">
                                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2"></div>
                                            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-2/3"></div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <>
                                <TrainingProgramItem
                                    title="The Mason"
                                    description="Build strong sentence foundations."
                                    icon={House} // Was BrickWall/Home
                                    stars={masonTotalStars}
                                    bgClass="bg-blue-50 dark:bg-blue-900/20"
                                    colorClass="text-blue-600 dark:text-blue-400"
                                    onClick={() => onNavigate(AppView.WRITING_GYM_LEVEL_1)}
                                />

                                <TrainingProgramItem
                                    title="Logic Weaver"
                                    description={!isPaid && !unlockedLevels.includes('logic_weaver') ? 'Complete Mason levels with 3+ stars to unlock' : 'Connect ideas seamlessly.'}
                                    icon={Brain}
                                    stars={lwTotalStars}
                                    bgClass="bg-purple-50 dark:bg-purple-900/20"
                                    colorClass="text-purple-600 dark:text-purple-400"
                                    onClick={() => onNavigate(AppView.WRITING_GYM_LEVEL_2)}
                                    locked={!isPaid && !unlockedLevels.includes('logic_weaver')}
                                />

                                <TrainingProgramItem
                                    title="IELTS Paragraph Builder"
                                    description="Master academic structure."
                                    icon={DraftingCompass}
                                    stars={esTotalStars}
                                    bgClass="bg-emerald-50 dark:bg-emerald-900/20"
                                    colorClass="text-emerald-600 dark:text-emerald-400"
                                    onClick={() => onNavigate(AppView.WRITING_GYM_LEVEL_3)}
                                    locked={!unlockedLevels.includes('ielts_paragraph')}
                                />

                                <TrainingProgramItem
                                    title="Complexity Ladder"
                                    description={!isPaid ? '💎 Upgrade ke Basic untuk membuka' : 'Climb from simple sentences to C2 academic structures.'}
                                    icon={TrendingUp}
                                    stars={laddersClimbed}
                                    bgClass="bg-indigo-50 dark:bg-indigo-900/20"
                                    colorClass="text-indigo-600 dark:text-indigo-400"
                                    onClick={() => !isPaid ? setShowPaywall(true) : onNavigate(AppView.COMPLEXITY_LADDER)}
                                    locked={!isPaid || !unlockedLevels.includes('complexity_ladder')}
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* Full Writing Tasks */}
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-3">Full Writing Tasks</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div
                            onClick={() => !isPaid ? setShowPaywall(true) : onNavigate(AppView.WRITING_GYM_TASK_1)}
                            className={`bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden active:scale-[0.98] transition-transform cursor-pointer aspect-square flex flex-col justify-between ${!isPaid ? 'opacity-60 grayscale' : ''}`}
                        >
                            {!isPaid && <Lock className="absolute top-3 right-3 w-5 h-5 text-white/70" />}
                            <div className="bg-white/20 w-10 h-10 rounded-lg flex items-center justify-center backdrop-blur-md">
                                <BarChart2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg leading-tight mb-1">Task 1</h4>
                                <p className="text-[10px] opacity-80 uppercase tracking-wide font-medium">Data Interpretation</p>
                            </div>
                        </div>

                        <div
                            onClick={() => !isPaid ? setShowPaywall(true) : onNavigate(AppView.WRITING_GYM_TASK_2)}
                            className={`bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden active:scale-[0.98] transition-transform cursor-pointer aspect-square flex flex-col justify-between ${!isPaid ? 'opacity-60 grayscale' : ''}`}
                        >
                            {!isPaid && <Lock className="absolute top-3 right-3 w-5 h-5 text-white/70" />}
                            <div className="bg-white/20 w-10 h-10 rounded-lg flex items-center justify-center backdrop-blur-md">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg leading-tight mb-1">Task 2</h4>
                                <p className="text-[10px] opacity-80 uppercase tracking-wide font-medium">Essay Writing</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showSkillPicker && (
                <MasonSkillPicker
                    userId={userId}
                    currentSkillId={nextMasonSkill?.id}
                    onSelectSkill={(skillId) => {
                        localStorage.setItem('mason_current_skill', skillId);
                        onNavigate(AppView.WRITING_GYM_LEVEL_1);
                        setShowSkillPicker(false);
                    }}
                    onClose={() => setShowSkillPicker(false)}
                />
            )}

            {showLWSkillPicker && (
                <LogicWeaverSkillPicker
                    isOpen={showLWSkillPicker}
                    onClose={() => setShowLWSkillPicker(false)}
                    completedLevels={progress.filter(p => p.level === 'logic_weaver').length}
                    onSelectSkill={(skillId) => {
                        localStorage.setItem('logic_weaver_current_skill', skillId);
                        onNavigate(AppView.WRITING_GYM_LEVEL_2);
                        setShowLWSkillPicker(false);
                    }}
                />
            )}

            <ComplexityLadderHistory
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
            />

            {/* Paywall */}
            <PaywallSheet
                isOpen={showPaywall}
                onClose={() => setShowPaywall(false)}
                triggeredBy="writing_gym_advanced"
                currentTier={tier}
            />
        </div>
    );
};
