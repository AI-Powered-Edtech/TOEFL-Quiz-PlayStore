import React from 'react';

import { AppView } from '../types';

export interface RouteConfig {
    view: AppView;
    component: React.LazyExoticComponent<React.ComponentType<any>> | React.ComponentType<any>;
    props?: Record<string, any>;
}

// ─── Module-level lazy components (created ONCE, cached by React) ────────────
const LazyDashboard = React.lazy(() => import('../components/Dashboard').then(m => ({ default: m.Dashboard })));
const LazyPdfUploadView = React.lazy(() => import('../components/PdfUploadView').then(m => ({ default: m.PdfUploadView })));
const LazyErrorJailView = React.lazy(() => import('../components/ErrorJailView').then(m => ({ default: m.ErrorJailView })));
const LazyBankView = React.lazy(() => import('../components/BankView').then(m => ({ default: m.BankView })));
const LazyPracticeHubView = React.lazy(() => import('../components/PracticeHub').then(m => ({ default: m.PracticeHubView })));
const LazySimulationView = React.lazy(() => import('../components/SimulationView').then(m => ({ default: m.SimulationView })));
const LazyCefrSimulationView = React.lazy(() => import('../components/CefrSimulationView').then(m => ({ default: m.CefrSimulationView })));
const LazySocialHub = React.lazy(() => import('../components/SocialHub').then(m => ({ default: m.SocialHub })));
const LazyMoreHub = React.lazy(() => import('../components/MoreHub').then(m => ({ default: m.MoreHub })));
const LazyProfile = React.lazy(() => import('../components/Profile').then(m => ({ default: m.Profile })));
const LazyPublicProfileView = React.lazy(() => import('../components/PublicProfileView').then(m => ({ default: m.PublicProfileView })));
const LazySettings = React.lazy(() => import('../components/Settings').then(m => ({ default: m.Settings })));
const LazyLearningPath = React.lazy(() => import('../components/LearningPath').then(m => ({ default: m.LearningPath })));
const LazyLeaderboard = React.lazy(() => import('../components/LeaderboardView').then(m => ({ default: m.LeaderboardView })));
const LazyWritingGymHub = React.lazy(() => import('../components/writingGym/WritingGymHub').then(m => ({ default: m.WritingGymHub })));
const LazyMasonLevel = React.lazy(() => import('../components/writingGym/MasonLevel').then(m => ({ default: m.MasonLevel })));
const LazyLogicWeaverLevel = React.lazy(() => import('../components/writingGym/LogicWeaverLevel').then(m => ({ default: m.LogicWeaverLevel })));
const LazyIELTSParagraphLevel = React.lazy(() => import('../components/writingGym/IELTSParagraphLevel').then(m => ({ default: m.IELTSParagraphLevel })));
const LazyIntegratedWritingTask = React.lazy(() => import('../components/writingGym/IntegratedWritingTask').then(m => ({ default: m.IntegratedWritingTask })));
const LazyAcademicDiscussionTask = React.lazy(() => import('../components/writingGym/AcademicDiscussionTask').then(m => ({ default: m.AcademicDiscussionTask })));
const LazyIELTSWritingSim = React.lazy(() => import('../components/writingGym/IELTSWritingSim').then(m => ({ default: m.IELTSWritingSim })));
const LazyModelEssayLibrary = React.lazy(() => import('../components/writingGym/ModelEssayLibrary').then(m => ({ default: m.ModelEssayLibrary })));
const LazyBand9LibraryHub = React.lazy(() => import('../components/writingGym/band9Library/Band9LibraryHub').then(m => ({ default: m.Band9LibraryHub })));
const LazyEssayDojoHub = React.lazy(() => import('../components/writingGym/EssayDojoHub').then(m => ({ default: m.EssayDojoHub })));
const LazyComplexityLadder = React.lazy(() => import('../components/writingGym/ComplexityLadder').then(m => ({ default: m.ComplexityLadder })));
const LazyPeerReviewHub = React.lazy(() => import('../components/peerReview/PeerReviewHub').then(m => ({ default: m.PeerReviewHub })));
const LazyDevilsAdvocateLevel = React.lazy(() => import('../components/writingGym/DevilsAdvocateLevel').then(m => ({ default: m.DevilsAdvocateLevel })));
const LazyMasonLeaderboard = React.lazy(() => import('../components/writingGym/MasonLeaderboard').then(m => ({ default: m.MasonLeaderboard })));
const LazyScoreOracleView = React.lazy(() => import('../components/ScoreOracleView').then(m => ({ default: m.ScoreOracleView })));
const LazyNotificationCenter = React.lazy(() => import('../components/NotificationCenter').then(m => ({ default: m.NotificationCenter })));
const LazyReportView = React.lazy(() => import('../components/ReportView').then(m => ({ default: m.ReportView })));
const LazyBlogListingView = React.lazy(() => import('../components/blog/BlogListingView').then(m => ({ default: m.BlogListingView })));
const LazyBlogPostView = React.lazy(() => import('../components/blog/BlogPostView').then(m => ({ default: m.BlogPostView })));
const LazyBlogSkillPickerView = React.lazy(() => import('../components/blog/BlogSkillPickerView').then(m => ({ default: m.BlogSkillPickerView })));
const LazySkillModuleList = React.lazy(() => import('../components/modules/SkillModuleList').then(m => ({ default: m.SkillModuleList })));
const LazySkillModuleReader = React.lazy(() => import('../components/modules/SkillModuleReader').then(m => ({ default: m.SkillModuleReader })));
const LazyTtsBenchmark = React.lazy(() => import('../components/TtsBenchmark').then(m => ({ default: m.TtsBenchmark })));
const LazyAuthCallback = React.lazy(() => import('../components/AuthCallback').then(m => ({ default: m.AuthCallback })));

const DEV_ONLY_VIEWS = new Set<AppView>([AppView.TTS_BENCHMARK]);

export const isDevOnlyView = (view: AppView): boolean => DEV_ONLY_VIEWS.has(view);

export const isRouteAvailable = (view: AppView, includeDev = import.meta.env.DEV): boolean => {
    return includeDev || !isDevOnlyView(view);
};

export const PRIMARY_TAB_VIEWS: AppView[] = [
    AppView.DASHBOARD,
    AppView.PRACTICE_HUB,
    AppView.SOCIAL_HUB,
    AppView.MORE_HUB,
    AppView.BLOG,
    AppView.TTS_BENCHMARK,
];

export const getPrimaryTabViews = (includeDev = import.meta.env.DEV): AppView[] => {
    return PRIMARY_TAB_VIEWS.filter(view => isRouteAvailable(view, includeDev));
};

export const isPrimaryTabView = (view: AppView, includeDev = import.meta.env.DEV): boolean => {
    return getPrimaryTabViews(includeDev).includes(view);
};

const VIEW_PATHS: Partial<Record<AppView, string>> = {
    [AppView.DASHBOARD]: '/',
    [AppView.PRACTICE_HUB]: '/practice',
    [AppView.SOCIAL_HUB]: '/social',
    [AppView.MORE_HUB]: '/more',
    [AppView.BLOG]: '/blog',
    [AppView.BLOG_POST]: '/blog/post',
    [AppView.BLOG_SKILL_PICKER]: '/blog/skills',
    [AppView.PROFILE]: '/profile',
    [AppView.PUBLIC_PROFILE]: '/profile/public',
    [AppView.SETTINGS]: '/settings',
    [AppView.PDF_UPLOAD]: '/pdf-upload',
    [AppView.BANK]: '/question-bank',
    [AppView.ERROR_JAIL]: '/error-jail',
    [AppView.LEARNING_PATH]: '/learning-path',
    [AppView.LEADERBOARD]: '/leaderboard',
    [AppView.SIMULATION]: '/simulation',
    [AppView.CEFR_SIMULATION]: '/cefr-simulation',
    [AppView.WRITING_GYM]: '/writing-gym',
    [AppView.WRITING_GYM_HUB]: '/writing-gym',
    [AppView.WRITING]: '/writing',
    [AppView.WRITING_GYM_LEVEL_1]: '/writing-gym/mason',
    [AppView.WRITING_GYM_LEVEL_2]: '/writing-gym/logic-weaver',
    [AppView.WRITING_GYM_LEVEL_3]: '/writing-gym/paragraph-builder',
    [AppView.WRITING_GYM_TASK_1]: '/writing-gym/integrated',
    [AppView.WRITING_GYM_TASK_2]: '/writing-gym/academic-discussion',
    [AppView.MODEL_ESSAY_LIBRARY]: '/writing-gym/model-essays',
    [AppView.BAND9_LIBRARY]: '/writing-gym/band9',
    [AppView.ESSAY_DOJO_HUB]: '/writing-gym/essay-dojo',
    [AppView.COMPLEXITY_LADDER]: '/writing-gym/complexity-ladder',
    [AppView.MASON_LEADERBOARD]: '/writing-gym/mason-leaderboard',
    [AppView.PEER_REVIEW]: '/peer-review',
    [AppView.DEVILS_ADVOCATE]: '/devils-advocate',
    [AppView.ORACLE]: '/score-oracle',
    [AppView.NOTIFICATIONS]: '/notifications',
    [AppView.REPORT]: '/report',
    [AppView.AUTH_CALLBACK]: '/auth/callback',
    [AppView.SKILL_MODULE_LIST]: '/modules',
    [AppView.SKILL_MODULE_READER]: '/modules/reader',
    [AppView.TTS_BENCHMARK]: '/dev/tts-benchmark',
};

const PATH_VIEWS = new Map<string, AppView>(
    Object.entries(VIEW_PATHS).map(([view, path]) => [path, view as AppView])
);

export const getPathForView = (view: AppView): string | null => {
    const path = VIEW_PATHS[view] ?? null;
    if (!path || !isRouteAvailable(view)) return null;
    return path;
};

export const getViewForPath = (pathname: string): AppView | null => {
    const normalized = pathname === '' ? '/' : pathname.replace(/\/$/, '') || '/';
    const view = PATH_VIEWS.get(normalized) ?? null;
    if (!view || !isRouteAvailable(view)) return null;
    return view;
};

export const getBackTargetForView = (view: AppView, gymBackTarget: AppView): AppView | null => {
    if (isPrimaryTabView(view)) return null;

    const backTargets: Partial<Record<AppView, AppView>> = {
        [AppView.QUIZ]: AppView.DASHBOARD,
        [AppView.REPORT]: AppView.DASHBOARD,
        [AppView.SIMULATION]: AppView.DASHBOARD,
        [AppView.ANALYTICS]: AppView.MORE_HUB,
        [AppView.ERROR_JAIL]: AppView.MORE_HUB,
        [AppView.LEADERBOARD]: AppView.MORE_HUB,
        [AppView.BLOG_POST]: AppView.BLOG,
        [AppView.BLOG_SKILL_PICKER]: AppView.BLOG,
        [AppView.WRITING_GYM]: gymBackTarget,
        [AppView.WRITING_GYM_HUB]: gymBackTarget,
        [AppView.WRITING]: AppView.PRACTICE_HUB,
        [AppView.WRITING_GYM_TASK_1]: AppView.PRACTICE_HUB,
        [AppView.WRITING_GYM_TASK_2]: AppView.PRACTICE_HUB,
        [AppView.CEFR_SIMULATION]: AppView.PRACTICE_HUB,
        [AppView.WRITING_GYM_LEVEL_1]: AppView.WRITING_GYM_HUB,
        [AppView.WRITING_GYM_LEVEL_2]: AppView.WRITING_GYM_HUB,
        [AppView.WRITING_GYM_LEVEL_3]: AppView.WRITING_GYM_HUB,
        [AppView.SKILL_MODULE_READER]: AppView.SKILL_MODULE_LIST,
        [AppView.SKILL_MODULE_LIST]: AppView.DASHBOARD,
        [AppView.NOTIFICATIONS]: AppView.DASHBOARD,
        [AppView.PROFILE]: AppView.MORE_HUB,
        [AppView.PUBLIC_PROFILE]: AppView.SOCIAL_HUB,
        [AppView.SETTINGS]: AppView.MORE_HUB,
        [AppView.PDF_UPLOAD]: AppView.PRACTICE_HUB,
        [AppView.BANK]: AppView.PRACTICE_HUB,
        [AppView.LEARNING_PATH]: AppView.DASHBOARD,
        [AppView.ORACLE]: AppView.MORE_HUB,
        [AppView.PEER_REVIEW]: AppView.SOCIAL_HUB,
        [AppView.DEVILS_ADVOCATE]: AppView.PRACTICE_HUB,
        [AppView.MASON_LEADERBOARD]: AppView.WRITING_GYM_HUB,
        [AppView.MODEL_ESSAY_LIBRARY]: AppView.WRITING_GYM_HUB,
        [AppView.BAND9_LIBRARY]: AppView.WRITING_GYM_HUB,
        [AppView.ESSAY_DOJO_HUB]: AppView.WRITING_GYM_HUB,
        [AppView.COMPLEXITY_LADDER]: AppView.WRITING_GYM_HUB,
        [AppView.TTS_BENCHMARK]: AppView.DASHBOARD,
    };

    return backTargets[view] ?? AppView.DASHBOARD;
};

export const getRoutes = (deps: any): RouteConfig[] => {
    const routes: RouteConfig[] = [
        {
            view: AppView.DASHBOARD,
            component: LazyDashboard,
            props: {
                onStartTodayFocus: (skillType: string) => {
                    const section = skillType.toUpperCase() as any;
                    deps.handleStartSkill(`TOEFL ${skillType}`, section);
                },
                onStartSkillById: (skillId: string, section: any) => {
                    deps.handleStartSkill(`Skill ${skillId}`, section);
                },
                onNavigate: (view: AppView) => {
                    if (view === AppView.WRITING_GYM || view === AppView.WRITING_GYM_HUB) {
                        deps.setGymBackTarget(AppView.DASHBOARD);
                    }
                    deps.setCurrentView(view);
                },
                userProgress: deps.progress,
                userName: deps.displayName,
                streak: deps.progress.streak,
                isGuest: !deps.isAuthenticated,
                unreadNotifications: deps.unreadCount,
                onOpenNotifications: () => deps.setCurrentView(AppView.NOTIFICATIONS),
                userId: deps.user?.id
            }
        },
        {
            view: AppView.PDF_UPLOAD,
            component: LazyPdfUploadView,
            props: {
                onNavigate: deps.setCurrentView,
                onQuizReady: (data: any) => {
                    deps.setTopic('PDF Context Quiz');
                    deps.setCurrentView(AppView.QUIZ);
                    deps.startQuiz(data);
                }
            }
        },
        {
            view: AppView.ERROR_JAIL,
            component: LazyErrorJailView,
            props: {
                onNavigate: deps.setCurrentView,
                onStartReview: (data: any) => {
                    deps.setTopic('Error Review');
                    deps.setCurrentView(AppView.QUIZ);
                    deps.startQuiz(data);
                }
            }
        },
        {
            view: AppView.BANK,
            component: LazyBankView,
            props: {
                onNavigate: deps.setCurrentView,
                onStartQuizWithQuestions: (questions: any) => {
                    deps.setTopic('Selected Questions Quiz');
                    deps.setCurrentView(AppView.QUIZ);
                    const grouped = deps.groupReadingQuestionsByPassage(questions);
                    deps.startQuiz(grouped);
                }
            }
        },
        {
            view: AppView.PRACTICE_HUB,
            component: LazyPracticeHubView,
            props: {
                onNavigate: (view: AppView) => {
                    if (view === AppView.WRITING_GYM || view === AppView.WRITING_GYM_HUB) {
                        deps.setGymBackTarget(AppView.PRACTICE_HUB);
                    }
                    deps.setCurrentView(view);
                }
            }
        },
        {
            view: AppView.SIMULATION,
            component: LazySimulationView,
            props: { onNavigate: deps.setCurrentView }
        },
        {
            view: AppView.CEFR_SIMULATION,
            component: LazyCefrSimulationView,
            props: { onNavigate: deps.setCurrentView }
        },
        {
            view: AppView.SOCIAL_HUB,
            component: LazySocialHub,
            props: {
                onNavigate: deps.setCurrentView,
                currentUserName: deps.displayName,
                currentUserId: deps.user?.id
            }
        },
        {
            view: AppView.MORE_HUB,
            component: LazyMoreHub,
            props: {
                onNavigate: deps.setCurrentView,
                onSignOut: deps.signOut,
                user: { id: deps.user?.id, name: deps.displayName, email: deps.displayEmail },
                progress: deps.progress
            }
        },
        {
            view: AppView.PROFILE,
            component: LazyProfile,
            props: {
                user: { id: deps.user?.id, name: deps.displayName, email: deps.displayEmail, avatarUrl: deps.user?.user_metadata?.avatar_url },
                progress: deps.progress,
                onNavigate: deps.setCurrentView,
                onSignIn: deps.signInWithGoogle,
                onSignOut: deps.signOut,
                onUpdateProfile: deps.updateProfile,
                isAuthenticated: deps.isAuthenticated
            }
        },
        {
            view: AppView.PUBLIC_PROFILE,
            component: LazyPublicProfileView,
            props: { onNavigate: deps.setCurrentView }
        },
        {
            view: AppView.SETTINGS,
            component: LazySettings,
            props: { onNavigate: deps.setCurrentView }
        },
        {
            view: AppView.LEARNING_PATH,
            component: LazyLearningPath,
            props: {
                onSelectSkill: (skill: any) => {
                    const partToSection: Record<string, any> = {
                        'Structure': 'STRUCTURE',
                        'Written Expression': 'WRITTEN',
                        'Listening': 'LISTENING',
                        'Reading': 'READING',
                    };
                    const categoryToSection: Record<string, any> = {
                        listening: 'LISTENING',
                        reading: 'READING',
                        writing: 'WRITTEN',
                    };
                    const section = partToSection[skill.part || ''] || categoryToSection[String(skill.category || '').toLowerCase()] || 'STRUCTURE';
                    deps.handleStartSkill(skill.id || (skill.numeric_id ? String(skill.numeric_id) : skill.name), section);
                },
                onOpenOnboarding: () => console.log("Onboarding"),
                onboardingStatus: 'completed',
                onboardingProfile: { name: deps.user?.user_metadata?.full_name || 'Student', targetScore: 80 },
                userProgress: deps.progress,
                onBack: () => deps.setCurrentView(AppView.DASHBOARD),
                userId: deps.user?.id,
                onNavigate: deps.setCurrentView
            }
        },
        {
            view: AppView.LEADERBOARD,
            component: LazyLeaderboard,
            props: { onNavigate: deps.setCurrentView, currentUserName: deps.displayName }
        },
        {
            view: AppView.WRITING_GYM,
            component: LazyWritingGymHub,
            props: { onNavigate: deps.setCurrentView, onBack: () => deps.setCurrentView(deps.gymBackTarget) }
        },
        {
            view: AppView.WRITING_GYM_HUB,
            component: LazyWritingGymHub,
            props: { onNavigate: deps.setCurrentView, onBack: () => deps.setCurrentView(deps.gymBackTarget) }
        },
        {
            view: AppView.WRITING_GYM_LEVEL_1,
            component: LazyMasonLevel,
            props: { onNavigate: deps.setCurrentView }
        },
        {
            view: AppView.WRITING_GYM_LEVEL_2,
            component: LazyLogicWeaverLevel,
            props: { onNavigate: deps.setCurrentView }
        },
        {
            view: AppView.WRITING_GYM_LEVEL_3,
            component: LazyIELTSParagraphLevel,
            props: { onNavigate: deps.setCurrentView }
        },
        {
            view: AppView.WRITING_GYM_TASK_1,
            component: LazyIntegratedWritingTask,
            props: { onNavigate: deps.setCurrentView }
        },
        {
            view: AppView.WRITING_GYM_TASK_2,
            component: LazyAcademicDiscussionTask,
            props: { onNavigate: deps.setCurrentView }
        },
        {
            view: AppView.WRITING,
            component: LazyIELTSWritingSim,
            props: { onNavigate: deps.setCurrentView, onBack: () => deps.setCurrentView(AppView.PRACTICE_HUB) }
        },
        {
            view: AppView.MODEL_ESSAY_LIBRARY,
            component: LazyModelEssayLibrary,
            props: { onNavigate: deps.setCurrentView }
        },
        {
            view: AppView.BAND9_LIBRARY,
            component: LazyBand9LibraryHub,
            props: { onNavigate: deps.setCurrentView }
        },
        {
            view: AppView.ESSAY_DOJO_HUB,
            component: LazyEssayDojoHub,
            props: { onNavigate: deps.setCurrentView }
        },
        {
            view: AppView.COMPLEXITY_LADDER,
            component: LazyComplexityLadder,
            props: { onNavigate: deps.setCurrentView }
        },
        {
            view: AppView.PEER_REVIEW,
            component: LazyPeerReviewHub,
            props: { onNavigate: deps.setCurrentView }
        },
        {
            view: AppView.DEVILS_ADVOCATE,
            component: LazyDevilsAdvocateLevel,
            props: { onNavigate: deps.setCurrentView }
        },
        {
            view: AppView.MASON_LEADERBOARD,
            component: LazyMasonLeaderboard,
            props: { onNavigate: deps.setCurrentView }
        },
        {
            view: AppView.ORACLE,
            component: LazyScoreOracleView,
            props: { onNavigate: deps.setCurrentView, userId: deps.user?.id || 'guest' }
        },
        {
            view: AppView.NOTIFICATIONS,
            component: LazyNotificationCenter,
            props: { onNavigate: deps.setCurrentView, userId: deps.user?.id }
        },

        {
            view: AppView.AUTH_CALLBACK,
            component: LazyAuthCallback,
            props: { onNavigate: deps.setCurrentView }
        },
        {
            view: AppView.REPORT,
            component: LazyReportView,
            props: { reportId: deps.sharedReportId || undefined, onNavigate: deps.setCurrentView }
        },
        {
            view: AppView.BLOG,
            component: LazyBlogListingView,
            props: {
                onNavigate: (view: AppView, params?: any) => {
                    if (params?.postId) deps.setSelectedPostId(params.postId);
                    if (params?.selectedSkillCategory) deps.setSelectedSkillCategory(params.selectedSkillCategory);
                    deps.setCurrentView(view);
                }
            }
        },
        {
            view: AppView.BLOG_POST,
            component: LazyBlogPostView,
            props: {
                postId: deps.selectedPostId,
                onNavigate: deps.setCurrentView,
                onBack: () => deps.setCurrentView(AppView.BLOG),
                onStartSkill: deps.handleStartSkill
            }
        },
        {
            view: AppView.BLOG_SKILL_PICKER,
            component: LazyBlogSkillPickerView,
            props: {
                section: deps.selectedSkillCategory,
                onNavigate: deps.setCurrentView,
                onBack: () => deps.setCurrentView(AppView.BLOG)
            }
        },
        {
            view: AppView.SKILL_MODULE_LIST,
            component: LazySkillModuleList,
            props: {
                onNavigate: (view: AppView, params?: any) => {
                    if (params?.skillId) deps.setSelectedSkillId(params.skillId);
                    deps.setCurrentView(view);
                },
                completedSkillIds: []
            }
        },
        {
            view: AppView.SKILL_MODULE_READER,
            component: LazySkillModuleReader,
            props: { skillId: deps.selectedSkillId || 'S01', onNavigate: deps.setCurrentView }
        },
        {
            view: AppView.TTS_BENCHMARK,
            component: LazyTtsBenchmark,
            props: { onNavigate: deps.setCurrentView }
        }
    ];

    return routes.filter(route => isRouteAvailable(route.view));
};
