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
const LazySettings = React.lazy(() => import('../components/Settings').then(m => ({ default: m.Settings })));
const LazyLearningPath = React.lazy(() => import('../components/LearningPath').then(m => ({ default: m.LearningPath })));
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

export const getRoutes = (deps: any): RouteConfig[] => {
    return [
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
                        'Written Expression': 'STRUCTURE',
                        'Listening': 'LISTENING',
                        'Reading': 'READING',
                        'listening': 'LISTENING',
                        'reading': 'READING',
                        'writing': 'STRUCTURE',
                        'speaking': 'SPEAKING'
                    };
                    const section = partToSection[skill.part || skill.category || ''] || 'STRUCTURE';
                    deps.handleStartSkill(skill.numeric_id ? String(skill.numeric_id) : (skill.id || skill.name), section);
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
};
