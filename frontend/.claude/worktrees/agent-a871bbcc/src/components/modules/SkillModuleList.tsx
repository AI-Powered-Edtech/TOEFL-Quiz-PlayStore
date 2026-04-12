import React, { useState, useEffect } from 'react';
import { AppView, Skill } from '../../types';
import { ArrowLeft, Lightbulb, User, Lock } from 'lucide-react';
import { TOEFL_STRUCTURE_SKILLS } from '../../data/skills';
import { getUserTier, canAccessFeature, type SubscriptionTier } from '../../services/subscriptionService';
import PaywallSheet from '../PaywallSheet';

interface SkillModuleListProps {
    onNavigate: (view: AppView, params?: any) => void;
    completedSkillIds?: string[];
}

export const SkillModuleList: React.FC<SkillModuleListProps> = ({
    onNavigate,
    completedSkillIds = []
}) => {
    // For now we only show structure skills (1-19)
    const structureSkills = TOEFL_STRUCTURE_SKILLS.slice(0, 19);
    const progress = completedSkillIds.length;
    const totalSkills = 19;

    const [tier, setTier] = useState<SubscriptionTier | null>(null);
    const [isPaywallOpen, setIsPaywallOpen] = useState(false);
    const [paywallReason, setPaywallReason] = useState('');

    useEffect(() => {
        let isMounted = true;
        getUserTier().then(t => {
            if (isMounted) setTier(t);
        });
        return () => { isMounted = false; };
    }, []);

    const handleSkillClick = async (skillId: string, isUnlocked: boolean) => {
        if (!isUnlocked) return;

        const access = await canAccessFeature('skill_module_read');
        if (!access.allowed) {
            setPaywallReason(access.reason || 'Upgrade ke Premium untuk membaca lebih banyak modul.');
            setIsPaywallOpen(true);
            return;
        }

        onNavigate(AppView.SKILL_MODULE_READER, { skillId });
    };

    return (
        <div data-testid="skill-module-list" className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="flex-shrink-0 bg-white z-10 sticky top-0 border-b border-slate-100">
                <div className="px-5 pt-6 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onNavigate(AppView.BLOG)}
                            className="w-10 h-10 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Structure Skills</h1>
                            <p className="text-slate-500 text-xs font-medium">Select a skill to start reading</p>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100 cursor-pointer">
                        <User className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 pt-4 pb-24 custom-scrollbar">

                {/* Progress Bar */}
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-bold text-slate-800">Your Progress</h2>
                    <span className="text-sm font-bold text-blue-600">{progress}/{totalSkills}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full mb-8 overflow-hidden">
                    <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${(progress / totalSkills) * 100}%` }}
                    />
                </div>

                {/* Skills Grid */}
                <div className="grid grid-cols-4 gap-3 mb-8">
                    {structureSkills.map((skill, index) => {
                        const skillNumber = index + 1;

                        // Rule: Free users must do sequential. Basic/C2 are fully unlocked.
                        const isSequentialUnlocked = skillNumber === 1 || completedSkillIds.includes(structureSkills[index - 1]?.id) || completedSkillIds.includes(skill.id);
                        const isUnlocked = tier !== 'free' || isSequentialUnlocked;
                        const isCompleted = completedSkillIds.includes(skill.id);

                        return (
                            <button
                                key={skill.id}
                                onClick={() => handleSkillClick(skill.id, isUnlocked)}
                                className={`
                                    relative flex flex-col items-center justify-center p-3 rounded-2xl aspect-square transition-all duration-200
                                    ${isUnlocked
                                        ? skillNumber === 1 || isCompleted
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                            : 'bg-white border border-slate-100 hover:border-blue-200 text-slate-800'
                                        : 'bg-slate-50 border border-slate-100 text-slate-300 pointer-events-none'
                                    }
                                `}
                            >
                                {!isUnlocked && (
                                    <Lock className="w-5 h-5 mb-1 text-slate-300" />
                                )}
                                <span className={`text-2xl font-bold ${isUnlocked ? (skillNumber === 1 || isCompleted ? 'text-white' : 'text-slate-800') : 'font-serif opacity-0'}`}>
                                    {isUnlocked ? skillNumber : ''}
                                </span>
                                <span className="text-[9px] uppercase tracking-wider font-bold mt-1 opacity-80">
                                    {!isUnlocked ? 'Locked' : (skillNumber === 1 && !isCompleted ? 'Start' : 'Skill')}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Pro Tip */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-4 mt-auto">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border border-blue-100 shadow-sm text-blue-500">
                        <Lightbulb className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-sm mb-1">Pro Tip</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Structure skills are best learned in order. Master "Subjects and Verbs" before moving to "Objects of Prepositions".
                        </p>
                    </div>
                </div>

            </div>

            {/* Paywall Gate */}
            <PaywallSheet
                isOpen={isPaywallOpen}
                onClose={() => setIsPaywallOpen(false)}
                triggeredBy="skill_module_read"
                reason={paywallReason}
            />
        </div>
    );
};
