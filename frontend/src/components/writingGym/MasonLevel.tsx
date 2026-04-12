import {
    DndContext,
    useSensor,
    useSensors,
    PointerSensor,
    KeyboardSensor,
    DragOverlay,
    closestCenter,
    MeasuringStrategy,
    DragEndEvent,
    DragStartEvent
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { LazyMotion, domAnimation, AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, Lightbulb, X } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';

import { getLevelByNumber, getSkillFromLevel, calculateLevelXp } from '../../data/masonLevels';
import { useAuth } from '../../hooks/useAuth';
import { useFreePlanHearts } from '../../hooks/useFreePlanHearts';
import { useMasonGame } from '../../hooks/useMasonGame';
import { useSound } from '../../hooks/useSound';
import { useSubscription } from '../../hooks/useSubscription';
import { writingGymProgressService } from '../../services/writingGymProgressService';
import { AppView } from '../../types';
import { getGuestUserId } from '../../utils/guestUser';
import { masonHaptics } from '../../utils/masonHaptics';
import { getSyntaxColor } from '../../utils/masonUtils';
import { Button } from '../Button';
import PaywallSheet from '../PaywallSheet';

import { MasonBrick } from './MasonBrick';
import { MasonErrorScreen } from './MasonErrorScreen';
import { MasonFooterControls } from './MasonFooterControls';
import { MasonHeader } from './MasonHeader';
import { MasonSkillMap } from './MasonSkillMap';
import { MasonSuccessScreen } from './MasonSuccessScreen';
import { MasonTargetArea } from './MasonTargetArea';
import { MasonWordBank } from './MasonWordBank';


export const MasonLevel: React.FC<{ onNavigate: (view: AppView) => void; initialLevel?: number }> = ({ onNavigate, initialLevel }) => {
    // ==================== HOOKS ====================
    const { user, isAuthenticated, loading } = useAuth();
    const userId = user?.id || getGuestUserId();
    const sound = useSound();

    // Subscription & Hearts
    const { isPaid, tier } = useSubscription();
    const { decrementHeart, isOutOfHearts } = useFreePlanHearts();
    const [showPaywall, setShowPaywall] = useState(false);

    const masonGameProps = useMasonGame({
        initialLevel,
        onNavigate,
        decrementHeart: !isPaid ? decrementHeart : undefined,
        isOutOfHearts: !isPaid ? isOutOfHearts : false,
        onPaywall: () => setShowPaywall(true),
        onWrongAnswer: () => {
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
        }
    });
    const { state, actions } = masonGameProps;
    const {
        currentLevel,
        exercise,
        items,
        placedItems,
        gameState,
        showSuccessScreen,
        showErrorScreen,
        showSkillMap,
        showResumePrompt,
        pendingSession,
        sessionId,
        isFrozen,
        revealedItemId,
        showHint,
        showExplanation
    } = state;

    // Detect fallback exercises
    useEffect(() => {
        if (exercise && exercise.explanation === "Explanation will appear here." && exercise.id) {
            import('react-hot-toast').then(({ toast }) => {
                toast("Using Offline Training Mode", { icon: "🔌", id: "mason-offline-toast" })
            });
        }
    }, [exercise]);

    // Local UI State
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [isShaking, setIsShaking] = useState(false);
    const [showSyntaxHighlight, setShowSyntaxHighlight] = useState(false);


    // Derived Data
    const currentLevelData = useMemo(() => getLevelByNumber(currentLevel), [currentLevel]);
    const currentSkillId = currentLevelData?.skillId || 'S01';
    const currentSkill = useMemo(() => getSkillFromLevel(currentLevel), [currentLevel]);

    // ==================== HANDLERS ====================

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
        sound.play('pickup');
        masonHaptics.selection();
    };

    const handleDragEndLocal = (event: DragEndEvent) => {
        setActiveDragId(null);
        actions.handleDragEnd(event);
    };

    // ==================== RENDER ====================

    if (showSkillMap) {
        return (
            <MasonSkillMap
                userId={userId}
                currentLevel={currentLevel}
                onSelectLevel={(level) => {
                    actions.setCurrentLevel(level);
                    actions.setShowSkillMap(false);
                }}
                onClose={() => actions.setShowSkillMap(false)}
            />
        );
    }

    return (
        <LazyMotion features={domAnimation}>
            <div className="h-[100dvh] flex flex-col bg-[#F5F7FA] overflow-hidden">
                <MasonHeader
                    onNavigate={onNavigate}
                    currentLevel={currentLevel}
                    skillName={currentSkill?.name || 'Mason'}
                    gameState={gameState}
                    onSetLevel={actions.setCurrentLevel}
                    onShowSkillMap={() => actions.setShowSkillMap(true)}
                />

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEndLocal}
                    onDragCancel={() => setActiveDragId(null)}
                    measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
                >
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-32 flex flex-col gap-6">

                        {/* Translation Hint (Level 2) */}
                        <AnimatePresence>
                            {showHint && exercise?.translation && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-purple-50 border border-purple-100 p-3 rounded-xl mx-auto max-w-md w-full flex items-start gap-3 shadow-sm"
                                >
                                    <Lightbulb className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-purple-700 uppercase mb-1">Translation Hint</p>
                                        <p className="text-sm text-purple-900 font-medium italic">"{exercise.translation}"</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <MasonTargetArea
                            placedItems={placedItems}
                            exercise={exercise}
                            isShaking={isShaking}
                            showSyntaxHighlight={showSyntaxHighlight}
                            onItemTap={(item) => actions.handleItemTap(item, 'target')}
                        />

                        <MasonWordBank
                            items={items}
                            revealedItemId={revealedItemId}
                            onItemTap={(item) => actions.handleItemTap(item, 'pool')}
                        />
                    </div>

                    <DragOverlay>
                        {activeDragId ? (
                            <MasonBrick
                                id={activeDragId}
                                content={items.find(i => i.id === activeDragId)?.content || placedItems.find(i => i.id === activeDragId)?.content || ''}
                                type={items.find(i => i.id === activeDragId)?.type || 'word'} // Fallback type
                                isPlaced={!!placedItems.find(i => i.id === activeDragId)}
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>

                <MasonFooterControls
                    gameState={gameState}
                    isFrozen={isFrozen}
                    onReveal={actions.handleReveal}
                    onFreeze={actions.handleFreeze}
                    onShuffle={actions.handleShuffle}
                    onHint={actions.handleHint} // Using hook action
                    onCheck={actions.checkAnswer}
                />

                {/* MODALS & SCREENS */}
                <AnimatePresence>
                    {showSuccessScreen && (
                        <MasonSuccessScreen
                            starsEarned={gameState.score >= 1000 ? 3 : gameState.score >= 700 ? 2 : 1} // Simplified star logic
                            score={gameState.score}
                            timeBonus={gameState.timeRemaining * 10}
                            comboBonus={gameState.combo * 50}
                            skillName={currentSkill?.name || 'Mason'}
                            currentLevel={currentLevel}
                            xpEarned={calculateLevelXp(currentLevel, gameState.score >= 1000 ? 3 : gameState.score >= 700 ? 2 : 1)}
                            skillProgress={{ current: 1, total: 10 }} // Placeholder
                            onTryHarder={() => actions.loadNewExercise()}
                            onNextLevel={() => actions.setCurrentLevel(currentLevel + 1)}
                            onShowSkillMap={() => actions.setShowSkillMap(true)}
                            hasNextLevel={currentLevel < 50}
                        />
                    )}
                    {showErrorScreen && (
                        <MasonErrorScreen
                            userSentence={placedItems.map(i => i.content).join(' ')}
                            correctSentence={exercise?.target_sentence}
                            grammarTip={exercise?.explanation}
                            skillName={currentSkill?.name}
                            onRetry={() => actions.loadNewExercise()}
                            onBack={() => onNavigate(AppView.WRITING_GYM_HUB)}
                        />
                    )}
                    {showExplanation && (
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            className="fixed bottom-32 left-4 right-4 bg-white rounded-2xl p-6 shadow-2xl z-40 border border-slate-100"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                                    Hint
                                </h3>
                                <button onClick={() => actions.setShowExplanation(false)} className="p-1 hover:bg-slate-100 rounded-full">
                                    <X className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                {exercise?.grammar_point || "Focus on the subject-verb agreement. Ensure the subject matches the verb form."}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Resume Prompt Modal */}
                <AnimatePresence>
                    {showResumePrompt && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200"
                            >
                                <h2 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
                                    <RotateCcw className="w-6 h-6 text-blue-500" />
                                    Resume Session?
                                </h2>
                                <p className="text-slate-600 mb-6 font-medium">
                                    You have an unfinished game at <span className="text-blue-600 font-bold">Level {pendingSession?.gameState?.currentLevel}</span>.
                                    Would you like to continue where you left off?
                                </p>
                                <div className="flex flex-col gap-3">
                                    <Button
                                        onClick={actions.handleResumeSession}
                                        className="w-full py-3 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200"
                                    >
                                        Resume Game 🚀
                                    </Button>
                                    <button
                                        onClick={actions.handleStartNew}
                                        className="w-full py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                                    >
                                        Start New
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* HEART PAYWALL MODAL */}
                <PaywallSheet
                    isOpen={showPaywall}
                    onClose={() => setShowPaywall(false)}
                    currentTier={tier}
                    triggeredBy="writing_gym_advanced" // Mason is theoretically a premium feature we gated with hearts
                />
            </div>
        </LazyMotion>
    );
};