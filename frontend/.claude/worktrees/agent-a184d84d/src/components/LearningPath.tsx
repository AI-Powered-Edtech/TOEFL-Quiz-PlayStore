
import { ArrowLeft, Map as MapIcon, BookOpen, Crown } from 'lucide-react';
import React from 'react';

import { OnboardingProfile, OnboardingStatus, Skill, SectionType, UserProgress, AppView } from '../types';

import { Button } from './Button';
import { SkillSelector } from './SkillSelector';

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
  // Calculate Level Progress similar to MoreHub
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
              <p className="text-xs text-slate-500 font-medium">Master skills step-by-step</p>
            </div>

            <div className="p-2 bg-white rounded-full shadow-sm border border-slate-100">
              <MapIcon className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
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
