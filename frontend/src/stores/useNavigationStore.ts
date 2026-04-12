import { create } from 'zustand';

import { AppView, SectionType } from '../types';

interface NavigationStore {
    currentView: AppView;
    gymBackTarget: AppView;
    selectedLesson: Record<string, unknown> | null;
    selectedPostId: string | null;
    selectedSkillCategory: SectionType | null;
    selectedSkillId: string | null;
    sharedReportId: string | null;

    setCurrentView: (view: AppView) => void;
    setGymBackTarget: (view: AppView) => void;
    setSelectedLesson: (lesson: Record<string, unknown> | null) => void;
    setSelectedPostId: (id: string | null) => void;
    setSelectedSkillCategory: (cat: SectionType | null) => void;
    setSelectedSkillId: (id: string | null) => void;
    setSharedReportId: (id: string | null) => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
    currentView: window.location.search.includes('benchmark=true') ? AppView.TTS_BENCHMARK : AppView.DASHBOARD,
    gymBackTarget: AppView.DASHBOARD,
    selectedLesson: null,
    selectedPostId: null,
    selectedSkillCategory: null,
    selectedSkillId: null,
    sharedReportId: null,

    setCurrentView: (view) => set({ currentView: view }),
    setGymBackTarget: (view) => set({ gymBackTarget: view }),
    setSelectedLesson: (lesson) => set({ selectedLesson: lesson }),
    setSelectedPostId: (id) => set({ selectedPostId: id }),
    setSelectedSkillCategory: (cat) => set({ selectedSkillCategory: cat }),
    setSelectedSkillId: (id) => set({ selectedSkillId: id }),
    setSharedReportId: (id) => set({ sharedReportId: id }),
}));
