
import { ArrowLeft, Map as MapIcon, BookOpen, Crown, ArrowRight, Clock } from 'lucide-react';
import React from 'react';

import { OnboardingProfile, OnboardingStatus, Skill, SectionType, UserProgress, AppView } from '../types';

import { Button } from './Button';
import { SkillSelector } from './SkillSelector';
import { learningPathService, LearningPathRecommendation } from '../services/learningPathService';

interface LearningPathProps {
  onSelectSkill: (skill: Skill) => void;
  onOpenOnboarding: () => void;
  onboardingStatus: OnboardingStatus;
  onboardingProfile: OnboardingProfile;
  userProgress: UserProgress; // Added usage of UserProgress
  isLoading?: boolean;
  onBack?: () => void;
  initialSection?: SectionType;
  userId?: string;
  onNavigate?: (view: AppView) => void;
}

export const LearningPath: React.FC<LearningPathProps> = ({
  onSelectSkill,
  onOpenOnboarding,
  onboardingStatus,
  onboardingProfile,
  userProgress,
  isLoading = false,
  onBack,
  initialSection,
  userId,
  onNavigate
}) => {
  const [recommendedSkill, setRecommendedSkill] = React.useState<LearningPathRecommendation | null>(null);

  React.useEffect(() => {
    const localHistory = userId ? JSON.parse(localStorage.getItem(`quiz_history_${userId}`) || '[]') : [];
    const skillStats = new Map<string, { total: number; correct: number }>();
    const sectionStats = new Map<string, { total: number; correct: number }>();

    for (const row of localHistory) {
      const skillId = String(row.skill_id || row.skillId || 'S01');
      const section = String(row.section || 'structure').toLowerCase();
      const correct = row.correct === true || row.isCorrect === true || Number(row.score || 0) > 0;
      const skill = skillStats.get(skillId) || { total: 0, correct: 0 };
      skill.total += 1;
      if (correct) skill.correct += 1;
      skillStats.set(skillId, skill);
      const sec = sectionStats.get(section) || { total: 0, correct: 0 };
      sec.total += 1;
      if (correct) sec.correct += 1;
      sectionStats.set(section, sec);
    }

    const progressInput = Array.from(skillStats.entries()).map(([skillId, stat]) => ({
      skillId,
      stars: stat.total >= 3 && stat.correct / stat.total >= 0.8 ? 3 : stat.total > 0 ? 1 : 0,
      bestScore: Math.round((stat.correct / Math.max(1, stat.total)) * 100),
    }));
    const weakAreas = Array.from(sectionStats.entries()).map(([section, stat]) => ({
      section,
      score: Math.round((stat.correct / Math.max(1, stat.total)) * 100),
      questionCount: stat.total,
    }));

    const recommendations = learningPathService.getRecommendedSkills(progressInput, weakAreas, 50);
    if (recommendations.length > 0) setRecommendedSkill(recommendations[0]);
  }, [userId]);

  const xpProgress = Math.min(100, ((userProgress.xp % 500) / 500) * 100);

  return (
    <div className="flex flex-col h-full bg-[#F5F7FA]">
      {/* Fixed Header - Dashboard Style */}
      <div className="flex-shrink-0 bg-[#F5F7FA] z-20 pb-2">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2.5 bg-white rounded-full shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            )}

            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-900 font-serif tracking-tight flex items-center gap-2">
                Learning Path
              </h1>
              <p className="text-xs text-slate-500 font-medium">Next skill based on your recent practice</p>
            </div>

            <div className="p-2 bg-white rounded-full shadow-sm border border-slate-100">
              <MapIcon className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        {recommendedSkill && (
          <div className="mb-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="px-2 py-1 bg-white/20 rounded-lg text-xs font-bold text-white">
                  RECOMMENDED
                </div>
                {recommendedSkill.priority === 'high' && (
                  <div className="px-2 py-1 bg-amber-400 rounded-lg text-xs font-bold text-amber-900">
                    PRIORITY
                  </div>
                )}
              </div>
              
              <h3 className="text-white font-bold text-lg mb-1">{recommendedSkill.skill.name}</h3>
              <p className="text-blue-100 text-sm mb-4">{recommendedSkill.reason}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-100 text-xs">
                  <Clock className="w-4 h-4" />
                  <span>~{recommendedSkill.estimatedMinutes} min</span>
                </div>
                
                <button
                  onClick={() => onSelectSkill(recommendedSkill.skill)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 font-bold text-sm rounded-xl hover:bg-blue-50 transition-colors"
                >
                  Start <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-24 pt-2">

        {/* Progress Summary Card (Matched with MoreHub) */}
        <div className="mb-6 bg-white rounded-3xl p-5 shadow-sm border border-slate-100 relative overflow-hidden flex-shrink-0">
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-700 shadow-inner">
                {onboardingProfile.name?.[0]?.toUpperCase() || 'S'}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-amber-400 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white flex items-center gap-1 shadow-sm">
                <Crown className="w-3 h-3" />
                {userProgress.level}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-slate-800 truncate">{onboardingProfile.name || 'Student'}</h2>
              <div className="mt-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                  <span>Level Progress</span>
                  <span>{userProgress.xp} XP</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* Skill Selector Component */}
        <SkillSelector
          onSelectSkill={onSelectSkill}
          isLoading={isLoading}
          hideHeader
          initialSection={initialSection}
          userId={userId}
        />
      </div>
    </div>
  );
};
