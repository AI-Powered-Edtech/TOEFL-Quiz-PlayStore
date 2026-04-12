import React from 'react';
import { AppView } from '../types';

export interface RouteConfig {
    view: AppView;
    component: React.LazyExoticComponent<React.ComponentType<any>> | React.ComponentType<any>;
    props?: Record<string, any>;
}

export const getRoutes = (deps: any): RouteConfig[] => {
    return [
        {
            view: AppView.DASHBOARD,
            component: React.lazy(() => import('../components/Dashboard').then(m => ({ default: m.Dashboard }))),
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
            component: React.lazy(() => import('../components/PdfUploadView').then(m => ({ default: m.PdfUploadView }))),
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
            component: React.lazy(() => import('../components/ErrorJailView').then(m => ({ default: m.ErrorJailView }))),
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
            component: React.lazy(() => import('../components/BankView').then(m => ({ default: m.BankView }))),
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
            component: React.lazy(() => import('../components/PracticeHub').then(m => ({ default: m.PracticeHubView }))),
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
            component: React.lazy(() => import('../components/SimulationView').then(m => ({ default: m.SimulationView }))),
            props: {
                onNavigate: deps.setCurrentView
            }
        },
        {
            view: AppView.CEFR_SIMULATION,
            component: React.lazy(() => import('../components/CefrSimulationView').then(m => ({ default: m.CefrSimulationView }))),
            props: {
                onNavigate: deps.setCurrentView
            }
        },
        {
            view: AppView.SOCIAL_HUB,
            component: React.lazy(() => import('../components/SocialHub').then(m => ({ default: m.SocialHub }))),
            props: {
                onNavigate: deps.setCurrentView,
                currentUserName: deps.displayName,
                currentUserId: deps.user?.id
            }
        },

        {
            view: AppView.MORE_HUB,
            component: React.lazy(() => import('../components/MoreHub').then(m => ({ default: m.MoreHub }))),
            props: {
                onNavigate: deps.setCurrentView,
                onSignOut: deps.signOut,
                user: { id: deps.user?.id, name: deps.displayName, email: deps.displayEmail },
                progress: deps.progress
            }
        },

        {
            view: AppView.PROFILE,
            component: React.lazy(() => import('../components/Profile').then(m => ({ default: m.Profile }))),
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
            component: React.lazy(() => import('../components/Settings').then(m => ({ default: m.Settings }))),
            props: {
                onNavigate: deps.setCurrentView
            }
        },
        {
            view: AppView.LEARNING_PATH,
            component: React.lazy(() => import('../components/LearningPath').then(m => ({ default: m.LearningPath }))),
            props: {
                onSelectSkill: (skill: any) => {
                    const partToSection: Record<string, any> = {
                        'Structure': 'STRUCTURE',
                        'Written Expression': 'STRUCTURE',
                        'Listening': 'LISTENING',
                        'Reading': 'READING',
                    };
                    const section = partToSection[skill.part || ''] || 'STRUCTURE';
                    deps.handleStartSkill(skill.numeric_id ? String(skill.numeric_id) : skill.name, section);
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
            component: React.lazy(() => import('../components/writingGym/WritingGymHub').then(m => ({ default: m.WritingGymHub }))),
            props: {
                onNavigate: deps.setCurrentView,
                onBack: () => deps.setCurrentView(deps.gymBackTarget)
            }
        },
        {
            view: AppView.WRITING_GYM_HUB,
            component: React.lazy(() => import('../components/writingGym/WritingGymHub').then(m => ({ default: m.WritingGymHub }))),
            props: {
                onNavigate: deps.setCurrentView,
                onBack: () => deps.setCurrentView(deps.gymBackTarget)
            }
        },
        {
            view: AppView.WRITING_GYM_LEVEL_1,
            component: React.lazy(() => import('../components/writingGym/MasonLevel').then(m => ({ default: m.MasonLevel }))),
            props: {
                onNavigate: deps.setCurrentView
            }
        },
        {
            view: AppView.WRITING_GYM_LEVEL_2,
            component: React.lazy(() => import('../components/writingGym/LogicWeaverLevel').then(m => ({ default: m.LogicWeaverLevel }))),
            props: {
                onNavigate: deps.setCurrentView
            }
        },
        {
            view: AppView.WRITING_GYM_LEVEL_3,
            component: React.lazy(() => import('../components/writingGym/IELTSParagraphLevel').then(m => ({ default: m.IELTSParagraphLevel }))),
            props: {
                onNavigate: deps.setCurrentView
            }
        },
        {
            view: AppView.WRITING_GYM_TASK_1,
            component: React.lazy(() => import('../components/writingGym/IntegratedWritingTask').then(m => ({ default: m.IntegratedWritingTask }))),
            props: {
                onNavigate: deps.setCurrentView
            }
        },
        {
            view: AppView.WRITING_GYM_TASK_2,
            component: React.lazy(() => import('../components/writingGym/AcademicDiscussionTask').then(m => ({ default: m.AcademicDiscussionTask }))),
            props: {
                onNavigate: deps.setCurrentView
            }
        },
        {
            view: AppView.WRITING,
            component: React.lazy(() => import('../components/writingGym/IELTSWritingSim').then(module => ({ default: module.IELTSWritingSim }))),
            props: {
                onNavigate: deps.setCurrentView,
                onBack: () => deps.setCurrentView(AppView.PRACTICE_HUB)
            }
        },
        {
            view: AppView.MODEL_ESSAY_LIBRARY,
            component: React.lazy(() => import('../components/writingGym/ModelEssayLibrary').then(module => ({ default: module.ModelEssayLibrary }))),
            props: {
                onNavigate: deps.setCurrentView
            }
        },
        {
            view: AppView.BAND9_LIBRARY,
            component: React.lazy(() => import('../components/writingGym/band9Library/Band9LibraryHub').then(module => ({ default: module.Band9LibraryHub }))),
            props: {
                onNavigate: deps.setCurrentView
            }
        },
        {
            view: AppView.ESSAY_DOJO_HUB,
            component: React.lazy(() => import('../components/writingGym/EssayDojoHub').then(module => ({ default: module.EssayDojoHub }))),
            props: {
                onNavigate: deps.setCurrentView
            }
        },
        {
            view: AppView.COMPLEXITY_LADDER,
            component: React.lazy(() => import('../components/writingGym/ComplexityLadder').then(module => ({ default: module.ComplexityLadder }))),
            props: {
                onNavigate: deps.setCurrentView
            }
        },
        {
            view: AppView.PEER_REVIEW,
            component: React.lazy(() => import('../components/peerReview/PeerReviewHub').then(module => ({ default: module.PeerReviewHub }))),
            props: {
                onNavigate: deps.setCurrentView
            }
        },
        {
            view: AppView.DEVILS_ADVOCATE,
            component: React.lazy(() => import('../components/writingGym/DevilsAdvocateLevel').then(module => ({ default: module.DevilsAdvocateLevel }))),
            props: {
                onNavigate: deps.setCurrentView
            }
        },
        {
            view: AppView.MASON_LEADERBOARD,
            component: React.lazy(() => import('../components/writingGym/MasonLeaderboard').then(module => ({ default: module.MasonLeaderboard }))),
            props: {
                onNavigate: deps.setCurrentView
            }
        },

        {
            view: AppView.ORACLE,
            component: React.lazy(() => import('../components/ScoreOracleView').then(module => ({ default: module.ScoreOracleView }))),
            props: {
                onNavigate: deps.setCurrentView,
                userId: deps.user?.id || 'guest'
            }
        },
        {
            view: AppView.NOTIFICATIONS,
            component: React.lazy(() => import('../components/NotificationCenter').then(m => ({ default: m.NotificationCenter }))),
            props: {
                onNavigate: deps.setCurrentView,
                userId: deps.user?.id
            }
        },
        {
            view: AppView.REPORT,
            component: React.lazy(() => import('../components/ReportView').then(module => ({ default: module.ReportView }))),
            props: {
                reportId: deps.sharedReportId || undefined,
                onNavigate: deps.setCurrentView
            }
        },
        {
            view: AppView.BLOG,
            component: React.lazy(() => import('../components/blog/BlogListingView').then(m => ({ default: m.BlogListingView }))),
            props: {
                onNavigate: (view: AppView, params?: any) => {
                    if (params?.postId) {
                        deps.setSelectedPostId(params.postId);
                    }
                    if (params?.selectedSkillCategory) {
                        deps.setSelectedSkillCategory(params.selectedSkillCategory);
                    }
                    deps.setCurrentView(view);
                }
            }
        },
        {
            view: AppView.BLOG_POST,
            component: React.lazy(() => import('../components/blog/BlogPostView').then(m => ({ default: m.BlogPostView }))),
            props: {
                postId: deps.selectedPostId,
                onNavigate: deps.setCurrentView,
                onBack: () => deps.setCurrentView(AppView.BLOG),
                onStartSkill: deps.handleStartSkill
            }
        },
        {
            view: AppView.BLOG_SKILL_PICKER,
            component: React.lazy(() => import('../components/blog/BlogSkillPickerView').then(m => ({ default: m.BlogSkillPickerView }))),
            props: {
                section: deps.selectedSkillCategory,
                onNavigate: deps.setCurrentView,
                onBack: () => deps.setCurrentView(AppView.BLOG)
            }
        },
        {
            view: AppView.SKILL_MODULE_LIST,
            component: React.lazy(() => import('../components/modules/SkillModuleList').then(m => ({ default: m.SkillModuleList }))),
            props: {
                onNavigate: (view: AppView, params?: any) => {
                    if (params?.skillId) {
                        deps.setSelectedSkillId(params.skillId);
                    }
                    deps.setCurrentView(view);
                },
                completedSkillIds: [] // Can be filled from progress if needed
            }
        },
        {
            view: AppView.SKILL_MODULE_READER,
            component: React.lazy(() => import('../components/modules/SkillModuleReader').then(m => ({ default: m.SkillModuleReader }))),
            props: {
                skillId: deps.selectedSkillId || 'S01',
                onNavigate: deps.setCurrentView
            }
        }
    ];
};
