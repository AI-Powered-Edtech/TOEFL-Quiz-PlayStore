import { FileEdit, Send, Users, CheckCircle, Clock, ArrowLeft, BookOpen, Flag } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { useGuestPolicy } from '../../hooks/useGuestPolicy';
import { useTutorialState } from '../../hooks/useTutorialState';
import * as peerReviewService from '../../services/peerReviewService';
import { getQualificationStatus, isQualifiedToReview } from '../../services/qualificationService';
import { supabase } from '../../services/supabase';
import { AppView, PeerReviewSubmission, PeerReview, ReviewerStats } from '../../types';
import { estimateDifficulty, extractTopics } from '../../utils/contentModeration';
import { getUserId } from '../../utils/guestId';
import { Button } from '../Button';
import { useToast } from '../ui/Toast';

import { BandRubricModal } from './BandRubric';
import { EssaySubmissionForm } from './EssaySubmissionForm';
import { FeedbackCard } from './FeedbackCard';
import { SubmissionCardSkeleton, StatsCardSkeleton, ReviewQueueSkeleton } from './LoadingSkeletons';
import { OnboardingModal } from './OnboardingModal';
import { QueueFiltersComponent, QueueFilters } from './QueueFilters';
import { ReportModal } from './ReportModal';
import { ReviewInterface } from './ReviewInterface';

interface PeerReviewHubProps {
    onNavigate: (view: AppView) => void;
    userId?: string;
}

type TabType = 'my-submissions' | 'review-queue' | 'my-reviews';

export const PeerReviewHub: React.FC<PeerReviewHubProps> = ({ onNavigate, userId: authUserId }) => {
    const userId = getUserId(authUserId); // Always have a userId (auth or guest)
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<TabType>(() => {
        const savedTab = localStorage.getItem('peerReviewInitialTab');
        if (savedTab === 'my-submissions' || savedTab === 'review-queue' || savedTab === 'my-reviews') {
            localStorage.removeItem('peerReviewInitialTab'); // Clear it so it only applies once
            return savedTab as TabType;
        }
        return 'review-queue';
    });
    const [mySubmissions, setMySubmissions] = useState<PeerReviewSubmission[]>([]);
    const [reviewQueue, setReviewQueue] = useState<PeerReviewSubmission[]>([]);
    const [myReviews, setMyReviews] = useState<PeerReview[]>([]);
    const [reviewerStats, setReviewerStats] = useState<ReviewerStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showSubmissionForm, setShowSubmissionForm] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<PeerReviewSubmission | null>(null);
    const [selectedFeedback, setSelectedFeedback] = useState<{ submission: PeerReviewSubmission; review: PeerReview } | null>(null);

    // New state for production features
    const [filters, setFilters] = useState<QueueFilters>({
        search: '',
        taskType: 'all',
        sortBy: 'newest',
        difficulty: 'all'
    });
    const [totalResults, setTotalResults] = useState(0);
    const [showRubric, setShowRubric] = useState(false);
    const [reportingContent, setReportingContent] = useState<{ type: 'submission' | 'review'; id: string } | null>(null);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isQualified, setIsQualified] = useState(true);

    const { isGuest } = useGuestPolicy('peer_review');
    const { hasCompleted: hasTutorialCompleted, markCompleted: markTutorialCompleted } = useTutorialState('peer_review', userId);
    const handleLoginRequired = () => {
        toast.warning('Please sign in to use this feature');
    };

    // Realtime Subscription
    useEffect(() => {
        if (!userId) return;

        const subscription = supabase
            .channel(`peer-reviews-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'peer_review_submissions',
                    filter: `user_id=eq.${userId}`
                },
                (payload: any) => {
                    const newRecord = payload.new as PeerReviewSubmission;
                    const oldRecord = payload.old as PeerReviewSubmission;

                    // Only notify if status changed to completed
                    if (newRecord.status === 'completed' && oldRecord.status !== 'completed') {
                        toast.success('Your essay has been reviewed! 🎉');
                        loadData();
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [userId]);

    useEffect(() => {
        loadData();
    }, [userId, activeTab]);

    useEffect(() => {
        checkQualification();
    }, [userId]);

    // Check qualification status on mount
    const checkQualification = async () => {
        try {
            if (hasTutorialCompleted) {
                setIsQualified(true);
                return;
            }
            const hasSkipped = localStorage.getItem(`hasSkippedPeerReviewTutorial_${userId}`) === 'true';
            if (!hasSkipped) {
                setShowOnboarding(true);
            }
            const qualified = await isQualifiedToReview(userId);
            setIsQualified(qualified);
        } catch (error) {
            console.error('[PeerReviewHub] Check qualification failed:', error);
        }
    };

    const loadData = async () => {

        setIsLoading(true);
        try {
            // Load reviewer stats
            const stats = await peerReviewService.getReviewerStats(userId);
            setReviewerStats(stats);

            // Load data based on active tab
            if (activeTab === 'my-submissions') {
                const submissions = await peerReviewService.getMySubmissions(userId);
                setMySubmissions(submissions);
            } else if (activeTab === 'review-queue') {
                // Use filtered queue — dedup by id to prevent duplicate entries
                const result = await peerReviewService.getFilteredReviewQueue(userId, filters);
                const seen = new Set<string>();
                const deduped = result.submissions.filter(s => {
                    if (seen.has(s.id)) return false;
                    seen.add(s.id);
                    return true;
                });
                setReviewQueue(deduped);
                setTotalResults(result.total);
            } else if (activeTab === 'my-reviews') {
                const reviews = await peerReviewService.getMyReviews(userId);
                setMyReviews(reviews);
            }
        } catch (error) {
            console.error('[PeerReviewHub] Load data failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Reload queue when filters change
    useEffect(() => {
        if (activeTab === 'review-queue') {
            loadData();
        }
    }, [filters]);

    const getTierBadge = (tier: string) => {
        const badges = {
            'Novice': '🥉',
            'Helper': '🥈',
            'Mentor': '🥇',
            'Expert': '💎',
            'Master': '👑'
        };
        return badges[tier as keyof typeof badges] || '🥉';
    };

    const tabs = [
        { id: 'review-queue' as TabType, label: 'Review Queue', icon: Users, count: reviewQueue.length },
        { id: 'my-submissions' as TabType, label: 'My Submissions', icon: Send, count: mySubmissions.length },
        { id: 'my-reviews' as TabType, label: 'My Reviews', icon: CheckCircle, count: myReviews.length },
    ];

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-4 flex items-center justify-between shadow-sm z-20 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        onClick={() => onNavigate(AppView.MORE_HUB)}
                        size="sm"
                        className="bg-white hover:bg-slate-50 border-slate-200"
                    >
                        <ArrowLeft className="w-5 h-5 md:mr-2" />
                        <span className="hidden md:inline">Back</span>
                    </Button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
                    <h1 className="text-lg md:text-xl font-black flex items-center gap-2">
                        <FileEdit className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        Peer Review
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    {/* Rubric Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRubric(true)}
                        className="hidden md:flex"
                    >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Rubric
                    </Button>

                    {reviewerStats && (
                        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800">
                            <span className="text-lg">{getTierBadge(reviewerStats.tier)}</span>
                            <div className="text-xs">
                                <div className="font-bold text-amber-900 dark:text-amber-100">{reviewerStats.tier}</div>
                                <div className="text-amber-600 dark:text-amber-400">{reviewerStats.total_reviews} reviews</div>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Tab Navigation — Phase 3G: WCAG 2.1 AA role=tablist */}
            <div className="bg-slate-50 dark:bg-slate-950 px-4 md:px-6 py-4 flex justify-center">
                <div
                    role="tablist"
                    aria-label="Peer Review navigation"
                    className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full shadow-inner overflow-x-auto min-w-max"
                >
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={isActive}
                                aria-controls={`panel-${tab.id}`}
                                id={`tab-${tab.id}`}
                                data-testid={`peer-review-tab-${tab.id}`}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center justify-center gap-2 px-6 py-2.5 font-bold text-sm md:text-base rounded-full transition-all
                                    ${isActive
                                        ? 'bg-white text-purple-600 shadow-sm dark:bg-slate-900 dark:text-purple-400'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}
                                `}
                            >
                                <span className="text-center leading-tight">
                                    {tab.label.split(' ').map((word, i) => (
                                        <div key={i}>{word}</div>
                                    ))}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-4xl mx-auto">
                    {isLoading ? (
                        <ReviewQueueSkeleton />
                    ) : (
                        <>
                            {activeTab === 'review-queue' && (
                                <div className="space-y-4">
                                    {/* Filters */}
                                    <QueueFiltersComponent
                                        filters={filters}
                                        onFiltersChange={setFilters}
                                        onRefresh={loadData}
                                        isLoading={isLoading}
                                        resultCount={totalResults}
                                    />

                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                                            Essays Waiting for Review
                                        </h2>
                                        <Button onClick={() => isGuest ? handleLoginRequired() : setShowSubmissionForm(true)} size="sm">
                                            <Send className="w-4 h-4 mr-2" />
                                            Submit Essay
                                        </Button>
                                    </div>
                                    {reviewQueue.length === 0 ? (
                                        <div className="text-center py-12 text-slate-500">
                                            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                            <p>No essays in queue right now</p>
                                            <p className="text-sm mt-1">Check back later!</p>
                                        </div>
                                    ) : (
                                        reviewQueue.map((submission) => {
                                            const difficulty = estimateDifficulty(submission.essay_content);
                                            const topics = extractTopics(submission.essay_content);

                                            return (
                                                <div key={submission.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md transition-shadow">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-2 py-1 rounded">
                                                                {submission.task_type}
                                                            </span>
                                                            <span className="text-xs text-slate-500">
                                                                {submission.word_count} words
                                                            </span>
                                                            <span className={`text-xs px-2 py-1 rounded ${difficulty === 'beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                                                difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                                                                    'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                                                }`}>
                                                                {difficulty}
                                                            </span>
                                                        </div>
                                                        <Clock className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                    {submission.prompt && (
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                                                            {submission.prompt}
                                                        </p>
                                                    )}
                                                    {topics.length > 0 && (
                                                        <div className="flex gap-1 mb-3 flex-wrap">
                                                            {topics.map(topic => (
                                                                <span key={topic} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
                                                                    {topic}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            className="flex-1"
                                                            onClick={async () => {
                                                                if (isGuest) {
                                                                    handleLoginRequired();
                                                                    return;
                                                                }
                                                                if (!isQualified) {
                                                                    toast.warning('Please complete the tutorial first');
                                                                    setShowOnboarding(true);
                                                                    return;
                                                                }
                                                                const claimed = await peerReviewService.claimEssay(submission.id, userId);
                                                                if (claimed) {
                                                                    setSelectedSubmission(submission);
                                                                } else {
                                                                    toast.error('Essay already claimed by another user');
                                                                    loadData(); // Refresh queue
                                                                }
                                                            }}
                                                        >
                                                            Start Reviewing (+25 XP)
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setReportingContent({ type: 'submission', id: submission.id })}
                                                        >
                                                            <Flag className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}

                            {activeTab === 'my-submissions' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                                            My Submissions
                                        </h2>
                                        <Button onClick={() => isGuest ? handleLoginRequired() : setShowSubmissionForm(true)} size="sm">
                                            <Send className="w-4 h-4 mr-2" />
                                            Submit New Essay
                                        </Button>
                                    </div>
                                    {mySubmissions.length === 0 ? (
                                        <div className="text-center py-12 text-slate-500">
                                            <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                            <p>You haven't submitted any essays yet</p>
                                            <Button onClick={() => isGuest ? handleLoginRequired() : setShowSubmissionForm(true)} className="mt-4">
                                                Submit Your First Essay
                                            </Button>
                                        </div>
                                    ) : (
                                        mySubmissions.map((submission) => (
                                            <div key={submission.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-2 py-1 rounded">
                                                            {submission.task_type}
                                                        </span>
                                                        <span className={`text-xs font-bold px-2 py-1 rounded ${submission.status === 'completed'
                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                                            : submission.status === 'in_review'
                                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                                                : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                                                            }`}>
                                                            {submission.status.replace('_', ' ').toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-slate-500">
                                                        {new Date(submission.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                {submission.prompt && (
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                                                        {submission.prompt}
                                                    </p>
                                                )}
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs text-slate-500">{submission.word_count} words</p>
                                                    {submission.status === 'completed' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={async () => {
                                                                try {
                                                                    const reviews = await peerReviewService.getReviewsForSubmission(submission.id);
                                                                    if (reviews.length > 0) {
                                                                        setSelectedFeedback({ submission, review: reviews[0] });
                                                                    }
                                                                } catch (error) {
                                                                    console.error('[PeerReviewHub] Failed to load feedback:', error);
                                                                }
                                                            }}
                                                        >
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            View Feedback
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'my-reviews' && (
                                <div className="space-y-4">
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                                        Reviews I've Written
                                    </h2>
                                    {myReviews.length === 0 ? (
                                        <div className="text-center py-12 text-slate-500">
                                            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                            <p>You haven't written any reviews yet</p>
                                            <p className="text-sm mt-1">Help others by reviewing their essays!</p>
                                        </div>
                                    ) : (
                                        myReviews.map((review) => (
                                            <div key={review.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                                            Band {review.overall_band}
                                                        </span>
                                                        {review.helpfulness_rating && (
                                                            <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 px-2 py-1 rounded">
                                                                ⭐ {review.helpfulness_rating}/5
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-slate-500">
                                                        {new Date(review.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                                                    <div className="text-center">
                                                        <div className="text-slate-500">TR</div>
                                                        <div className="font-bold">{review.task_response_score}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-slate-500">CC</div>
                                                        <div className="font-bold">{review.coherence_score}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-slate-500">LR</div>
                                                        <div className="font-bold">{review.lexical_score}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-slate-500">GRA</div>
                                                        <div className="font-bold">{review.grammar_score}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Submission Form Modal */}
            {showSubmissionForm && userId && (
                <EssaySubmissionForm
                    userId={userId}
                    onClose={() => setShowSubmissionForm(false)}
                    onSuccess={() => {
                        loadData(); // Reload data after successful submission
                        setActiveTab('my-submissions'); // Switch to submissions tab
                    }}
                />
            )}

            {/* Review Interface Modal */}
            {selectedSubmission && userId && (
                <ReviewInterface
                    submission={selectedSubmission}
                    reviewerId={userId}
                    onClose={() => setSelectedSubmission(null)}
                    onSuccess={() => {
                        loadData(); // Reload data after successful review
                        setSelectedSubmission(null);
                        setActiveTab('my-reviews'); // Switch to my reviews tab
                    }}
                />
            )}

            {/* Feedback Card Modal */}
            {selectedFeedback && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <FeedbackCard
                            review={selectedFeedback.review}
                            essayContent={selectedFeedback.submission.essay_content}
                            onRate={() => loadData()}
                        />
                        <button
                            onClick={() => setSelectedFeedback(null)}
                            className="mt-4 w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Band Rubric Modal */}
            {showRubric && (
                <BandRubricModal onClose={() => setShowRubric(false)} />
            )}

            {/* Report Modal */}
            {reportingContent && (
                <ReportModal
                    contentType={reportingContent.type}
                    contentId={reportingContent.id}
                    onClose={() => setReportingContent(null)}
                    onSubmitted={() => {
                        setReportingContent(null);
                        toast.success('Report submitted successfully');
                    }}
                />
            )}

            {/* Onboarding Modal */}
            {showOnboarding && userId && (
                <OnboardingModal
                    userId={userId}
                    onComplete={() => {
                        setShowOnboarding(false);
                        setIsQualified(true);
                        markTutorialCompleted();
                        localStorage.removeItem(`hasSkippedPeerReviewTutorial_${userId}`);
                        loadData();
                    }}
                    onSkip={() => {
                        localStorage.setItem(`hasSkippedPeerReviewTutorial_${userId}`, 'true');
                        setShowOnboarding(false);
                    }}
                />
            )}
        </div>
    );
};
